use bevy::{
    prelude::{AppTypeRegistry, In, Local, Mut, Res, World},
    remote::{BrpResult, RemotePlugin},
};
use serde_json::Value;

use crate::{
    component::InspectorComponentInfo,
    type_registry::{serialize_type_registry, ZeroSizedTypes},
};

/// The method path for a `inspector/ping` request.
const INSPECTOR_PING: &str = "inspector/ping";

/// The method path for a `inspector/type-registry` request.
const INSPECTOR_TYPE_REGISTRY: &str = "inspector/type-registry";

/// The method path for a `inspector/components` request.
const INSPECTOR_COMPONENTS: &str = "inspector/components";

pub fn extend_brp(remote_plugin: RemotePlugin) -> RemotePlugin {
    remote_plugin
        .with_method(INSPECTOR_PING, process_ping)
        .with_method(INSPECTOR_TYPE_REGISTRY, process_type_registry)
        .with_method(INSPECTOR_COMPONENTS, process_components)
}

fn process_ping(In(_): In<Option<Value>>) -> BrpResult {
    BrpResult::Ok(serde_json::to_value(true).unwrap())
}

fn process_type_registry(
    In(_): In<Option<Value>>,
    app_type_registry: Res<AppTypeRegistry>,
    mut zsts: Local<ZeroSizedTypes>,
) -> BrpResult {
    let type_registry = app_type_registry.read();
    let result = serialize_type_registry(&type_registry, &mut zsts);
    let serialized = serde_json::to_value(&*result).unwrap();
    BrpResult::Ok(serialized)
}

fn process_components(In(_): In<Option<Value>>, world: &mut World) -> BrpResult {
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
