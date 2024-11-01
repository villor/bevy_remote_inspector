use bevy::{
    prelude::{AppTypeRegistry, In, Local, Res},
    remote::{BrpResult, RemotePlugin},
};
use serde_json::Value;

use crate::type_registry::{serialize_type_registry, ZeroSizedTypes};

/// The method path for a `inspector/ping` request.
const INSPECTOR_PING: &str = "inspector/ping";

/// The method path for a `inspector/type-registry` request.
const INSPECTOR_TYPE_REGISTRY: &str = "inspector/type-registry";

pub fn extend_brp(remote_plugin: RemotePlugin) -> RemotePlugin {
    remote_plugin
        .with_method(INSPECTOR_PING, process_ping)
        .with_method(INSPECTOR_TYPE_REGISTRY, process_type_registry)
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
