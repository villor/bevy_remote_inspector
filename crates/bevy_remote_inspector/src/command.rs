use anyhow::{anyhow, bail};
use bevy::{
    ecs::component::ComponentId,
    prelude::*,
    reflect::{serde::TypedReflectDeserializer, ReflectFromPtr, TypeData},
    remote::BrpRequest,
};
use serde::{de::DeserializeSeed, Deserialize, Serialize};
use serde_json::Value;

use crate::DisabledComponents;

trait Execute {
    type Output: Serialize;

    fn execute(self, world: &mut World) -> anyhow::Result<Self::Output>;
}

macro_rules! try_deserialize_req {
    ($req:ident, $($method:literal, $kind:ident)*) => {
        match $req.method.as_str() {
            $(
                $method => {
                    let req = serde_json::from_value($req.params.ok_or(anyhow!("Missing param"))?)?;
                    return Ok(Command::$kind(req));
                },
            )*
            _ => Err(anyhow!("Unknown method")),
        }
    };
}

#[derive(Debug)]
pub enum Command {
    UpdateComponent(UpdateComponent),
    ToggleComponent(ToggleComponent),
}

impl Command {
    pub fn try_from_brp(req: BrpRequest) -> anyhow::Result<Self> {
        try_deserialize_req!(req,
            "update_component", UpdateComponent
            "toggle_component", ToggleComponent
        )
    }

    pub fn execute(self, world: &mut World) -> anyhow::Result<Value> {
        fn map_result<T: Serialize>(r: T) -> anyhow::Result<Value> {
            serde_json::to_value(r).map_err(|_| anyhow!("Error while serizalizing result"))
        }

        let result = match self {
            Command::UpdateComponent(command) => command.execute(world).and_then(map_result),
            Command::ToggleComponent(command) => command.execute(world).and_then(map_result),
        };
        result
    }
}

#[derive(Deserialize, Debug)]
pub struct UpdateComponent {
    pub entity: Entity,
    pub component: usize,
    pub value: Value,
}

impl Execute for UpdateComponent {
    type Output = ();

    fn execute(self, world: &mut World) -> anyhow::Result<Self::Output> {
        world.resource_scope(|world, registry: Mut<AppTypeRegistry>| {
            let registry = registry.read();
            let component_id = ComponentId::new(self.component);
            let type_id = world
                .components()
                .get_info(component_id)
                .and_then(|info| info.type_id())
                .ok_or(anyhow!("Component not found"))?;
            let registration = registry
                .get(type_id)
                .ok_or(anyhow!("Component is not registered"))?;

            let deserializer = TypedReflectDeserializer::new(registration, &registry);
            let deserialized = deserializer.deserialize(self.value)?;
            let mut entity = world.get_entity_mut(self.entity)?;
            let mut component_ptr = entity.get_mut_by_id(component_id)?;

            let reflect_from_ptr = registry
                .get_type_data::<ReflectFromPtr>(type_id)
                .ok_or(anyhow!("Component does not implement ReflectFromPtr"))?;

            assert_eq!(
                reflect_from_ptr.type_id(),
                type_id,
                "Mismatch between Ptr's type_id and ReflectFromPtr's type_id",
            );

            let reflect_mut = unsafe { reflect_from_ptr.as_reflect_mut(component_ptr.as_mut()) };

            reflect_mut
                .as_reflect_mut()
                .try_apply(deserialized.as_ref())?;

            Ok(())
        })
    }
}

#[derive(Deserialize, Debug)]
pub struct ToggleComponent {
    entity: Entity,
    component: usize,
}

impl Execute for ToggleComponent {
    type Output = ();

    fn execute(self, world: &mut World) -> anyhow::Result<Self::Output> {
        let component_id = ComponentId::new(self.component);
        let type_id = world
            .components()
            .get_info(component_id)
            .map(|info| info.type_id())
            .ok_or_else(|| anyhow!("Component not found"))?
            .ok_or_else(|| anyhow!("Component is not a Rust type"))?;

        world.resource_scope(|world, registry: Mut<AppTypeRegistry>| {
            let registry = registry.read();
            let type_registration = registry
                .get(type_id)
                .ok_or_else(|| anyhow!("Component is not registered in TypeRegistry"))?;
            let reflect_component = type_registration.data::<ReflectComponent>().ok_or_else(|| {
                anyhow!("Can not get ReflectComponent. Make sure you add [reflect(Component)] to your component")
            })?;

            world.resource_scope(|world, mut disbled_components: Mut<DisabledComponents>| {
                let entity_disabled_components = disbled_components.entry(self.entity).or_default();
                let mut entity_mut = world.get_entity_mut(self.entity)?;

                if entity_disabled_components.contains_key(&component_id) {
                    // enable
                    let component_exists = entity_mut.get_by_id(component_id).is_ok();
                    if component_exists {
                        entity_disabled_components.remove(&component_id);
                        bail!("Can not enable component that already exists. Probably bug");
                    }

                    let component_val = entity_disabled_components.remove(&component_id).unwrap();
                    reflect_component.insert(&mut entity_mut, component_val.as_partial_reflect(), &registry);
                } else {
                    // disable
                    let component_val = reflect_component
                    .reflect(entity_mut)
                    .ok_or_else(|| anyhow!("Component does not exits. Probaly bug"))?
                    .clone_value();
                    entity_disabled_components.insert(component_id, component_val);

                    let mut entity_mut = world.get_entity_mut(self.entity)?;
                    entity_mut.remove_by_id(component_id);
                };


                Ok(())
            })
        })
    }
}
