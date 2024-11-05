mod components;
mod type_registry;

use bevy::{
    ecs::{component::ComponentId, entity::EntityHashMap},
    prelude::*,
    remote::RemotePlugin,
    utils::{HashMap, HashSet},
};
use serde_json::Value;

use components::{process_components_request, INSPECTOR_COMPONENTS_METHOD};
use type_registry::{process_type_registry_request, INSPECTOR_TYPE_REGISTRY_METHOD};

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
            .insert_resource(deep_compare_components);
    }
}

pub fn extend_brp_methods(remote_plugin: RemotePlugin) -> RemotePlugin {
    remote_plugin
        .with_method(
            INSPECTOR_TYPE_REGISTRY_METHOD,
            process_type_registry_request,
        )
        .with_method(INSPECTOR_COMPONENTS_METHOD, process_components_request)
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

        return Some(false);
    }
}
