mod component;
mod entity;
mod type_registry;

use bevy::{
    ecs::{component::ComponentId, entity::EntityHashMap},
    prelude::*,
    remote::BrpResult,
    utils::{HashMap, HashSet},
};
use bevy_remote_stream::{
    OnDataHandlerInput, RemoteStreamHandlers, StreamClientId, StreamHandlerInputRef, StreamMethods,
};
use component::InspectorComponentInfo;
use entity::EntityMutation;
use serde::Serialize;
use serde_json::{json, Value};
use type_registry::ZeroSizedTypes;
pub mod remote_stream {
    pub use bevy_remote_stream::*;
}

pub struct RemoteInspectorPlugin;

impl Plugin for RemoteInspectorPlugin {
    fn build(&self, app: &mut App) {
        let update = app.main_mut().world_mut().register_system(stream);
        let on_connect = app.main_mut().world_mut().register_system(on_connect);
        let on_disconnect = app.main_mut().world_mut().register_system(on_disconnect);
        let on_data = app.main_mut().world_mut().register_system(on_data);
        app.world_mut().resource_mut::<StreamMethods>().insert(
            "inspector/stream",
            RemoteStreamHandlers {
                update,
                on_disconnect: Some(on_disconnect),
                on_connect: Some(on_connect),
                on_data: Some(on_data),
            },
        );
        app.init_resource::<TrackedDatas>();
    }
}

fn stream(
    InRef(input): StreamHandlerInputRef,
    world: &mut World,
    mut events: Local<Vec<InspectorEvent>>,
    mut zsts: Local<ZeroSizedTypes>,
) -> Option<BrpResult> {
    world.resource_scope(|world, mut tracked: Mut<TrackedDatas>| {
        let tracked = tracked.entry(input.client_id).or_default();
        let type_registry = world.resource::<AppTypeRegistry>().read();
        tracked.track_type_registry(&mut events, &type_registry, &mut zsts);
        // let new_tables = world
        //     .archetypes()
        //     .iter()
        //     .filter(|archetype| !tracked.tables.contains(&archetype.table_id().as_usize()))
        //     .map(|archetype| archetype.table_id().as_usize())
        //     .collect::<Vec<_>>();

        // if !new_tables.is_empty() {
        //     tracked.tables.extend_from_slice(new_tables.as_slice());
        //     events.push(StreamEvent::NewTables { tables: new_tables });
        // }

        tracked.track_components(&mut events, world, &type_registry);
        tracked.track_entities(&mut events, world, &type_registry, &zsts);
    });

    if events.is_empty() {
        return None;
    }

    let serialized = serde_json::to_value(&*events).unwrap();

    events.clear();

    Some(BrpResult::Ok(serialized))
}

fn on_data(In((client_id, req)): OnDataHandlerInput) -> Option<BrpResult> {
    return Some(BrpResult::Ok(json!("pong")));
}

fn on_disconnect(InRef(input): StreamHandlerInputRef, mut tracked: ResMut<TrackedDatas>) {
    tracked.remove(&input.client_id);
    info!("Client {:?} disconnected", input.client_id);
}

fn on_connect(InRef(input): StreamHandlerInputRef) -> Option<BrpResult> {
    info!("Client {:?} connected", input.client_id);
    None
}

#[derive(Default)]
struct TrackedData {
    type_registry: bool,
    components: HashSet<ComponentId>,
    entities: EntityHashMap<HashSet<ComponentId>>,
    resources: HashSet<ComponentId>,
    tables: Vec<usize>,
}

#[derive(Resource, Default, Deref, DerefMut)]
struct TrackedDatas(HashMap<StreamClientId, TrackedData>);

#[derive(Serialize)]
#[serde(rename_all(serialize = "snake_case"))]
#[serde(tag = "kind")]
enum InspectorEvent {
    TypeRegistry {
        types: Vec<Value>,
    },
    Component {
        components: Vec<InspectorComponentInfo>,
    },
    Entity {
        entity: Entity,
        mutation: EntityMutation,
    },
    NewTables {
        tables: Vec<usize>,
    },
}
