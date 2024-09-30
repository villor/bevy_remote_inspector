use bevy::{
    ecs::component::{ComponentId, ComponentInfo},
    prelude::{EntityRef, World},
    reflect::{serde::TypedReflectSerializer, ReflectFromPtr, ReflectSerialize, TypeRegistry},
};
use serde::Serialize;
use serde_json::Value;

use crate::{InspectorEvent, TrackedData};

impl TrackedData {
    pub fn track_components(
        &mut self,
        events: &mut Vec<InspectorEvent>,
        world: &World,
        type_registry: &TypeRegistry,
    ) {
        let mut new_components = vec![];
        for info in world.components().iter() {
            if !self.components.contains(&info.id()) {
                self.components.insert(info.id());
                new_components.push(InspectorComponentInfo::new(info, &type_registry));
            }
        }

        if !new_components.is_empty() {
            events.push(InspectorEvent::Component {
                components: new_components,
            });
        }
    }
}

#[derive(Serialize)]
pub struct InspectorComponentInfo {
    name: String,
    reflected: bool,
    serializeable: bool,
}

impl InspectorComponentInfo {
    pub fn new(component_info: &ComponentInfo, type_registry: &TypeRegistry) -> Self {
        let (reflected, serializeable) = match type_registry.get(component_info.type_id().unwrap())
        {
            Some(type_registration) => {
                let serializeable = type_registration.data::<ReflectSerialize>().is_some();

                (true, serializeable)
            }
            None => (false, false),
        };

        Self {
            name: component_info.name().into(),
            reflected,
            serializeable,
        }
    }
}

pub fn serialize_component(
    component_id: ComponentId,
    entity_ref: &EntityRef,
    type_registry: &TypeRegistry,
    component_info: &ComponentInfo,
) -> Option<Value> {
    let component_ptr = entity_ref.get_by_id(component_id)?;
    let type_id = component_info.type_id()?;

    let reflect_from_ptr = type_registry.get_type_data::<ReflectFromPtr>(type_id)?;

    assert_eq!(
        reflect_from_ptr.type_id(),
        type_id,
        "Mismatch between Ptr's type_id and ReflectFromPtr's type_id",
    );

    let reflect = unsafe { reflect_from_ptr.as_reflect(component_ptr) };

    let serializer = TypedReflectSerializer::new(reflect.as_partial_reflect(), &type_registry);

    serde_json::to_value(serializer).ok()
}
