use bevy::{prelude::*, reflect::TypeRegistry};
use serde::Serialize;
use serde_json::Value;

use crate::{
    component::serialize_component, type_registry::ZeroSizedTypes, InspectorEvent, TrackedData,
};

#[derive(Serialize)]
#[serde(rename_all(serialize = "snake_case"))]
#[serde(tag = "kind")]
pub enum EntityMutation {
    Remove,
    // Both onadd and onchange, by component name and it value
    Change {
        changes: Vec<(usize, Option<Value>)>,
        removes: Vec<usize>,
    },
}

impl TrackedData {
    pub fn track_entities(
        &mut self,
        events: &mut Vec<InspectorEvent>,
        world: &World,
        type_registry: &TypeRegistry,
        zsts: &ZeroSizedTypes,
    ) {
        let removed_entities = self
            .entities
            .extract_if(|k, _| world.get_entity(*k).is_ok())
            .map(|entry| InspectorEvent::Entity {
                entity: entry.0,
                mutation: EntityMutation::Remove,
            });

        events.extend(removed_entities);

        let this_run = world.read_change_tick();
        for entity_ref in world.iter_entities() {
            let id = entity_ref.id();
            if let Some(component_ids) = self.entities.get_mut(&id) {
                let mut changes = vec![];
                let archetype = entity_ref.archetype();
                let removed_component_ids = component_ids
                    .extract_if(|id| {
                        archetype
                            .components()
                            .find(|component_id| component_id == id)
                            .is_none()
                    })
                    .map(|id| id.index())
                    .collect::<Vec<_>>();

                for component_id in entity_ref.archetype().components() {
                    let Some(ticks) = entity_ref.get_change_ticks_by_id(component_id) else {
                        continue;
                    };

                    let Some(component_info) = world.components().get_info(component_id) else {
                        continue;
                    };

                    if !ticks.is_changed(world.last_change_tick(), this_run) {
                        continue;
                    }

                    let is_tracked = component_ids.contains(&component_id);
                    if zsts.contains_key(&component_info.type_id().unwrap()) {
                        // ZST are only serialized when they are added to the entity
                        if !is_tracked {
                            component_ids.insert(component_id);
                            changes.push((component_id.index(), None));
                        }
                    } else {
                        let serialized = serialize_component(
                            component_id,
                            &entity_ref,
                            type_registry,
                            component_info,
                        );

                        if !is_tracked {
                            component_ids.insert(component_id);
                        }

                        if !is_tracked || serialized.is_some() {
                            // Only if the component is untracked or serializable
                            changes.push((component_id.index(), serialized));
                        }
                    }
                }
                if changes.len() > 0 || removed_component_ids.len() > 0 {
                    events.push(InspectorEvent::Entity {
                        entity: id,
                        mutation: EntityMutation::Change {
                            changes,
                            removes: removed_component_ids,
                        },
                    });
                }
            } else {
                // Untracked entity, serialize all component
                self.entities
                    .insert(id, entity_ref.archetype().components().collect());
                let changes = entity_ref
                    .archetype()
                    .components()
                    .map(|component_id| {
                        let component_info = world.components().get_info(component_id).unwrap();
                        let serialized = serialize_component(
                            component_id,
                            &entity_ref,
                            type_registry,
                            component_info,
                        );

                        (component_id.index(), serialized)
                    })
                    .collect::<Vec<_>>();

                if changes.len() > 0 {
                    events.push(InspectorEvent::Entity {
                        entity: id,
                        mutation: EntityMutation::Change {
                            changes,
                            removes: vec![],
                        },
                    });
                }
            }
        }
    }
}
