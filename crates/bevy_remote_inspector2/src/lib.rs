mod components;
mod entity;
mod type_registry;

use bevy::{
    ecs::{component::ComponentId, entity::EntityHashMap, schedule::IntoSystemSetConfigs},
    prelude::*,
    utils::{HashMap, HashSet},
};
use bevy_remote_enhanced::{RemoteLast, RemotePlugin, RemoteSet};
use entity::{
    clean_up_closed_entity_watcher, process_entity_watching_request, EntitiesByWatcher,
    INSPECTOR_ENTITY_AND_WATCH_METHOD,
};
use serde_json::Value;

use components::{process_components_request, INSPECTOR_COMPONENTS_METHOD};
use type_registry::{
    process_type_registry_request, update_zero_sized_types, ZeroSizedTypes,
    INSPECTOR_TYPE_REGISTRY_METHOD,
};

pub struct RemoteInspectorPlugin;

impl Plugin for RemoteInspectorPlugin {
    fn build(&self, app: &mut App) {
        if app.is_plugin_added::<RemotePlugin>() {
            panic!("Can not modify already added RemotePlugin?");
        }
        app.add_plugins(extend_brp_methods(RemotePlugin::default()));

        let mut deep_compare_components = DeepCompareComponents::default();

        #[cfg(feature = "bevy_render")]
        {
            let id = app
                .world_mut()
                .register_component::<bevy::render::view::ViewVisibility>(); // this component changed every frame and very cheep to compare
            deep_compare_components.ids.insert(id);
        }

        app.init_resource::<DisabledComponents>()
            .init_resource::<EntityVisibilities>()
            .init_resource::<RemovedEntities>()
            .init_resource::<EntitiesByWatcher>()
            .init_resource::<ZeroSizedTypes>()
            .insert_resource(deep_compare_components);

        app.configure_sets(
            RemoteLast,
            (
                InspectorPrepare.before(RemoteSet::ProcessRequests),
                InspectorCleanup
                    .after(RemoteSet::ProcessRequests)
                    .before(RemoteSet::Cleanup),
            ),
        )
        .add_systems(
            RemoteLast,
            (
                (update_zero_sized_types, detect_removed_entities).in_set(InspectorPrepare),
                clean_up_closed_entity_watcher.in_set(InspectorCleanup),
            ),
        );
    }
}

/// System set that runs before BRP request processing.
#[derive(Debug, Hash, PartialEq, Eq, Clone, SystemSet)]
pub struct InspectorPrepare;

/// System set that runs between BRP request processing and cleanup.
#[derive(Debug, Hash, PartialEq, Eq, Clone, SystemSet)]
pub struct InspectorCleanup;

fn extend_brp_methods(remote_plugin: RemotePlugin) -> RemotePlugin {
    remote_plugin
        .with_method(
            INSPECTOR_TYPE_REGISTRY_METHOD,
            process_type_registry_request,
        )
        .with_method(INSPECTOR_COMPONENTS_METHOD, process_components_request)
        .with_watching_method(
            INSPECTOR_ENTITY_AND_WATCH_METHOD,
            process_entity_watching_request,
        )
}

#[derive(Resource, Default, DerefMut, Deref)]
struct DisabledComponents(EntityHashMap<HashMap<ComponentId, Box<dyn PartialReflect>>>);

#[derive(Resource, Default, Deref, DerefMut)]
struct EntityVisibilities(EntityHashMap<Visibility>);

#[derive(Resource, Default)]
struct DeepCompareComponents {
    ids: HashSet<ComponentId>,
    values: HashMap<Entity, HashMap<ComponentId, Value>>,
}

impl DeepCompareComponents {
    /// Compare the component with the previous value and return None if the component should not be deep compared
    fn is_eq(
        &mut self,
        entity: Entity,
        component_id: ComponentId,
        new_value: &Value,
    ) -> Option<bool> {
        if !self.ids.contains(&component_id) {
            return None;
        }
        let entry = self.values.entry(entity).or_default();

        let old_value = entry.get(&component_id);
        if let Some(old_value) = old_value {
            if old_value == new_value {
                return Some(true);
            }
        }

        entry.insert(component_id, new_value.clone());

        Some(false)
    }
}

#[derive(Resource, Default, Deref, DerefMut)]
pub struct RemovedEntities(EntityHashMap<()>);

/// System to track and perform clean up for removed entities
fn detect_removed_entities(
    mut removed_entities: ResMut<RemovedEntities>,
    mut disabled_components: ResMut<DisabledComponents>,
    mut entity_visibilities: ResMut<EntityVisibilities>,
    mut deep_compare_components: ResMut<DeepCompareComponents>,
    query: Query<Entity>,
    mut previous_entities: Local<EntityHashMap<()>>,
) {
    removed_entities.clear();

    for (removed_entity, _) in previous_entities.extract_if(|e, _| query.get(*e).is_err()) {
        removed_entities.insert(removed_entity, ());
        disabled_components.remove(&removed_entity);
        entity_visibilities.remove(&removed_entity);
        deep_compare_components.values.remove(&removed_entity);
    }

    previous_entities.extend(query.iter().map(|e| (e, ())));
}
