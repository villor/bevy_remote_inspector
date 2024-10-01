mod component;
mod entity;
mod type_registry;

use bevy::{
    ecs::{component::ComponentId, entity::EntityHashMap},
    prelude::*,
    remote::BrpResult,
    utils::{HashMap, HashSet},
};
use bevy_remote_stream::{RemoteStreamHandlers, StreamClientId, StreamHandlerInput, StreamMethods};
use component::InspectorComponentInfo;
use entity::EntityMutation;
use serde::{ser::SerializeMap, Serialize};
use serde_json::Value;
use type_registry::ZeroSizedTypes;
pub mod remote_stream {
    pub use bevy_remote_stream::*;
}

pub struct RemoteInspectorPlugin;

impl Plugin for RemoteInspectorPlugin {
    fn build(&self, app: &mut App) {
        let update = app.world_mut().register_system(stream);
        let on_connect = app.world_mut().register_system(on_connect);
        let on_disconnect = app.world_mut().register_system(on_disconnect);
        app.world_mut().resource_mut::<StreamMethods>().insert(
            "inspector/stream",
            RemoteStreamHandlers {
                on_update: update,
                on_disconnect: Some(on_disconnect),
                on_connect: Some(on_connect),
            },
        );
        app.init_resource::<TrackedDatas>();
    }
}

fn stream(
    In((client_id, _)): StreamHandlerInput,
    world: &mut World,
    mut events: Local<Vec<InspectorEvent>>,
    mut zsts: Local<ZeroSizedTypes>,
) -> Option<BrpResult> {
    world.resource_scope(|world, mut tracked: Mut<TrackedDatas>| {
        let tracked = tracked.entry(client_id).or_default();
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

fn on_disconnect(In((client_id, _)): StreamHandlerInput, mut tracked: ResMut<TrackedDatas>) {
    tracked.remove(&client_id);
    info!("Client {client_id:?} disconnected");
}

fn on_connect(In((client_id, _)): StreamHandlerInput) -> Option<BrpResult> {
    info!("Client {client_id:?} connected");
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

enum MutationResult<T: Serialize> {
    Ok(T),
    Err(String),
}

impl<T: Serialize> Serialize for MutationResult<T> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut s = serializer.serialize_map(Some(1))?;

        match self {
            MutationResult::Ok(value) => s.serialize_entry("value", &value)?,
            MutationResult::Err(error) => s.serialize_entry("error", error)?,
        };

        s.end()
    }
}

impl<T: Serialize> From<anyhow::Result<T>> for MutationResult<T> {
    fn from(result: anyhow::Result<T>) -> Self {
        match result {
            Ok(value) => MutationResult::Ok(value),
            Err(error) => MutationResult::Err(error.to_string()),
        }
    }
}
