use bevy::{
    ecs::{
        component::{ComponentId, ComponentInfo},
        entity::EntityHashMap,
    },
    prelude::*,
    reflect::{serde::TypedReflectSerializer, ReflectFromPtr, TypeRegistry},
    utils::{HashMap, HashSet},
};
use bevy_remote_enhanced::{BrpResult, RemoteWatchingRequestId, RemoteWatchingSystemParams};
use serde::Serialize;
use serde_json::Value;

use crate::{
    type_registry::ZeroSizedTypes, DeepCompareComponents, DisabledComponents, RemovedEntities,
};

/// The method path for a `inspector/entity+watch` request.
pub const INSPECTOR_ENTITY_AND_WATCH_METHOD: &str = "inspector/entity+watch";

#[derive(Serialize)]
#[serde(rename_all(serialize = "snake_case"))]
#[serde(tag = "kind")]
pub enum EntityMutation {
    Remove,
    Change {
        // Both onAdd and onChange
        changes: Vec<EntityMutationChange>,
        removes: Vec<(usize, bool)>,
    },
}

#[derive(Serialize)]
pub struct EntityMutationChange(
    usize,
    bool,
    #[serde(skip_serializing_if = "Option::is_none")] Option<Value>,
);

#[derive(Serialize)]
#[serde(rename_all(serialize = "snake_case"))]
pub struct TrackedEntity {
    entity: Entity,
    mutation: EntityMutation,
}

#[derive(Resource, Default, Deref, DerefMut)]
pub struct EntitiesByWatcher(HashMap<RemoteWatchingRequestId, EntityHashMap<HashSet<ComponentId>>>);

pub fn process_entity_watching_request(
    In((watch_id, _)): In<RemoteWatchingSystemParams>,
    world: &mut World,
) -> BrpResult<Option<Value>> {
    let events = world.resource_scope(|world, mut entities_by_watcher: Mut<EntitiesByWatcher>| {
        let entities = entities_by_watcher.entry(watch_id).or_default();
        EntityContext::run(world, |ctx, world| track_entities(entities, world, ctx))
    });

    if events.is_empty() {
        BrpResult::Ok(None)
    } else {
        BrpResult::Ok(Some(serde_json::to_value(&*events).unwrap()))
    }
}

fn track_entities(
    entities: &mut EntityHashMap<HashSet<ComponentId>>,
    world: &mut World,
    ctx: &mut EntityContext,
) -> Vec<TrackedEntity> {
    let mut events = Vec::with_capacity(ctx.removed_entities.len());

    for (removed, _) in ctx.removed_entities.iter() {
        entities.remove(removed);
        events.push(TrackedEntity {
            entity: *removed,
            mutation: EntityMutation::Remove,
        });
    }

    let type_registry = ctx.app_type_registry.read();

    let this_run = world.change_tick();
    for entity_ref in world.iter_entities() {
        let id = entity_ref.id();
        let entity_disbled_components = ctx.disabled_components.get_mut(&entity_ref.id());
        if let Some(component_ids) = entities.get_mut(&id) {
            let mut changes: Vec<EntityMutationChange> = vec![];
            let archetype = entity_ref.archetype();
            let removed_component_ids = component_ids
                .extract_if(|id| {
                    !archetype
                        .components()
                        .any(|component_id| &component_id == id)
                })
                .map(|id| {
                    let is_disabled = entity_disbled_components
                        .as_ref()
                        .map(|disabled| disabled.contains_key(&id))
                        .unwrap_or_default();

                    (id.index(), is_disabled)
                })
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

                let is_disabled = entity_disbled_components
                    .as_ref()
                    .map(|disabled| disabled.contains_key(&component_id))
                    .unwrap_or_default();

                let is_tracked = component_ids.contains(&component_id);
                if ctx.zsts.contains_key(&component_info.type_id().unwrap()) {
                    // ZST are only serialized when they are added to the entity
                    if !is_tracked {
                        component_ids.insert(component_id);
                        changes.push(EntityMutationChange(
                            component_id.index(),
                            is_disabled,
                            None,
                        ));
                    }
                } else {
                    let serialized = serialize_component(
                        component_id,
                        &entity_ref,
                        &type_registry,
                        component_info,
                    );

                    if !is_tracked {
                        component_ids.insert(component_id);
                    }

                    // Only if the component is untracked or serializable
                    if !is_tracked || serialized.is_some() {
                        if let Some(serialized) = serialized.as_ref() {
                            if let Some(true) = ctx.deep_compare_components.is_eq(
                                entity_ref.id(),
                                component_id,
                                serialized,
                            ) {
                                continue;
                            }
                        }

                        changes.push(EntityMutationChange(
                            component_id.index(),
                            is_disabled,
                            serialized,
                        ));
                    }
                }
            }
            if !changes.is_empty() || !removed_component_ids.is_empty() {
                events.push(TrackedEntity {
                    entity: id,
                    mutation: EntityMutation::Change {
                        changes,
                        removes: removed_component_ids,
                    },
                });
            }
        } else {
            // Untracked entity, serialize all component
            entities.insert(id, entity_ref.archetype().components().collect());
            let disabled_componentsi = entity_disbled_components.map(|components| {
                let iter = components.iter().map(|(component_id, value)| {
                    let serialized = {
                        let reflect: &dyn PartialReflect = value.as_partial_reflect();
                        let serializer = TypedReflectSerializer::new(reflect, &type_registry);

                        serde_json::to_value(serializer).ok()
                    };
                    EntityMutationChange(component_id.index(), true, serialized)
                });

                Box::new(iter) as Box<dyn Iterator<Item = EntityMutationChange>>
            });

            let changes = entity_ref.archetype().components().map(|component_id| {
                let component_info = world.components().get_info(component_id).unwrap();
                let serialized =
                    serialize_component(component_id, &entity_ref, &type_registry, component_info);

                if let Some(serialized) = serialized.as_ref() {
                    ctx.deep_compare_components
                        .values
                        .entry(entity_ref.id())
                        .or_default()
                        .insert(component_id, serialized.clone());
                }

                EntityMutationChange(component_id.index(), false, serialized)
            });

            let changes = if let Some(disabled_components) = disabled_componentsi {
                changes.chain(disabled_components).collect::<Vec<_>>()
            } else {
                changes.collect()
            };

            events.push(TrackedEntity {
                entity: id,
                mutation: EntityMutation::Change {
                    changes,
                    removes: vec![],
                },
            });
        }
    }

    events
}

fn serialize_component(
    component_id: ComponentId,
    entity_ref: &EntityRef,
    type_registry: &TypeRegistry,
    component_info: &ComponentInfo,
) -> Option<Value> {
    let component_ptr = entity_ref.get_by_id(component_id).ok()?;
    let type_id = component_info.type_id()?;

    let reflect_from_ptr = type_registry.get_type_data::<ReflectFromPtr>(type_id)?;

    assert_eq!(
        reflect_from_ptr.type_id(),
        type_id,
        "Mismatch between Ptr's type_id and ReflectFromPtr's type_id",
    );

    let reflect = unsafe { reflect_from_ptr.as_reflect(component_ptr) };

    let serializer = TypedReflectSerializer::new(reflect.as_partial_reflect(), type_registry);

    serde_json::to_value(serializer).ok()
}

struct EntityContext<'a> {
    removed_entities: &'a mut RemovedEntities,
    disabled_components: &'a mut DisabledComponents,
    deep_compare_components: &'a mut DeepCompareComponents,
    zsts: &'a mut ZeroSizedTypes,
    app_type_registry: &'a mut AppTypeRegistry,
}

impl<'a> EntityContext<'a> {
    fn run<T>(world: &mut World, f: impl FnOnce(&mut EntityContext, &mut World) -> T) -> T {
        world.resource_scope(|world, mut removed_entities: Mut<RemovedEntities>| {
            world.resource_scope(|world, mut disabled_components: Mut<DisabledComponents>| {
                world.resource_scope(
                    |world, mut deep_compare_components: Mut<DeepCompareComponents>| {
                        world.resource_scope(|world, mut zsts: Mut<ZeroSizedTypes>| {
                            world.resource_scope(
                                |world, mut app_type_registry: Mut<AppTypeRegistry>| {
                                    let mut ctx = EntityContext {
                                        removed_entities: &mut removed_entities,
                                        disabled_components: &mut disabled_components,
                                        deep_compare_components: &mut deep_compare_components,
                                        zsts: &mut zsts,
                                        app_type_registry: &mut app_type_registry,
                                    };

                                    f(&mut ctx, world)
                                },
                            )
                        })
                    },
                )
            })
        })
    }
}
