use bevy::{
    ecs::component::ComponentInfo,
    prelude::{AppTypeRegistry, In, Mut, World},
    remote::BrpResult,
};
use serde::Serialize;
use serde_json::Value;

/// The method path for a `inspector/components` request.
pub const INSPECTOR_COMPONENTS_METHOD: &str = "inspector/components";

// TODO: Implement +watch version

pub fn process_components_request(In(_): In<Option<Value>>, world: &mut World) -> BrpResult {
    let result = world.resource_scope(|world, type_registry: Mut<AppTypeRegistry>| {
        let components = world.components();
        let type_registry = type_registry.read();
        world
            .components()
            .iter()
            .filter_map(|info| {
                let type_id = info.type_id()?;
                if components.get_resource_id(type_id).is_some() {
                    return None;
                }
                let reflected = type_registry.get_type_info(type_id).is_some();
                let required_components = info
                    .required_components()
                    .iter_ids()
                    .map(|id| id.index())
                    .collect::<Vec<_>>();
                Some(InspectorComponentInfo::new(
                    info,
                    reflected,
                    required_components,
                ))
            })
            .collect::<Vec<_>>()
    });
    let serialized = serde_json::to_value(&*result).unwrap();
    BrpResult::Ok(serialized)
}

#[derive(Serialize)]
pub struct InspectorComponentInfo {
    id: usize,
    name: String,
    reflected: bool,
    required_components: Vec<usize>,
}

impl InspectorComponentInfo {
    pub fn new(
        component_info: &ComponentInfo,
        reflected: bool,
        required_components: Vec<usize>,
    ) -> Self {
        Self {
            id: component_info.id().index(),
            name: component_info.name().into(),
            reflected,
            required_components,
        }
    }
}
