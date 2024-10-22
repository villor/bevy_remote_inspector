use anyhow::anyhow;
use bevy::{
    ecs::component::ComponentId,
    prelude::*,
    reflect::{serde::TypedReflectDeserializer, ReflectFromPtr},
    remote::BrpRequest,
};
use serde::{de::DeserializeSeed, Deserialize, Serialize};
use serde_json::Value;

trait Execute {
    type Output: Serialize;

    fn execute(self, world: &mut World) -> anyhow::Result<Self::Output>;
}

#[derive(Debug)]
pub enum ClientRequest {
    UpdateComponent(UpdateComponentRequest),
}

macro_rules! try_deserialize_req {
    ($req:ident, $($method:literal, $kind:ident)*) => {
        match $req.method.as_str() {
            $(
                $method => {
                    let req = serde_json::from_value($req.params.ok_or(anyhow!("Missing param"))?)?;
                    return Ok(ClientRequest::$kind(req));
                },
            )*
            _ => Err(anyhow!("Unknown method")),
        }
    };
}

impl ClientRequest {
    pub fn try_from_brp(req: BrpRequest) -> anyhow::Result<Self> {
        try_deserialize_req!(req, "update_component", UpdateComponent)
    }

    pub fn execute(self, world: &mut World) -> anyhow::Result<Value> {
        fn map_result<T: Serialize>(r: T) -> anyhow::Result<Value> {
            serde_json::to_value(r).map_err(|_| anyhow!("Error while serizalizing result"))
        }

        let result = match self {
            ClientRequest::UpdateComponent(req) => req.execute(world).and_then(map_result),
        };
        result
    }
}

#[derive(Deserialize, Debug)]
pub struct UpdateComponentRequest {
    pub entity: Entity,
    pub component: usize,
    pub value: Value,
}

impl Execute for UpdateComponentRequest {
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
