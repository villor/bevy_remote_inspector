import { bevyTypes } from '@/type-registry/types';
import type { EntityId } from './useEntity';
import type { EntityMutaion, EntityMutationChange } from '@/websocket/createWsSlice';
import {
  type ComponentInfo,
  type ComponentName,
  useComponents,
  type ComponentId,
} from '@/component/useComponents';
import { hiddenEntityNames, prettyEntityId } from './entityUtils';
import { useCallback } from 'react';
import { useStore } from '@/store';
import type { TValue } from '@/type-registry/useTypeRegistry';
import type { EntitiesMap } from './createEntitiesSlice';

export type EntityUpdates = {
  updateEntity: (id: EntityId, mutation: EntityMutaion) => void;
  updateEntityName: (id: EntityId) => void;
};

export function useEntityUpdates(): EntityUpdates {
  const { entities, childParentMap, entityNames, updateEntities } = useStore();
  const { componentsByName, componentsById } = useComponents();

  const updateEntityName = useCallback(
    (id: EntityId) => {
      const name = getEntityName(id, entities, componentsById, componentsByName);
      if (!name) {
        return;
      }
      entityNames.set(id, name);
      updateEntities({ entityNames: new Map(entityNames) });
    },
    [entities, entityNames, componentsById, componentsByName, updateEntities],
  );

  const updateEntity = useCallback(
    (entity: EntityId, mutation: EntityMutaion) => {
      const parentComponentId = componentsByName.get(bevyTypes.PARENT)?.id;
      if (mutation.kind === 'remove') {
        entities.delete(entity);
        childParentMap.delete(entity);
        entityNames.delete(entity);

        updateEntities({
          childParentMap: new Map(childParentMap),
          entityNames: new Map(entityNames),
          entities: new Map(entities),
        });

        return;
      }

      if (mutation.kind === 'change') {
        const entityComponents = entities.get(entity);
        let shouldUpdateName = false;
        if (entityComponents) {
          for (const [removedCommponentId, isDisabled] of mutation.removes) {
            if (removedCommponentId === parentComponentId) {
              childParentMap.set(entity, null);
              updateEntities({ childParentMap: new Map(childParentMap) });
            }

            const component = entityComponents.get(removedCommponentId);

            if (!component) {
              continue;
            }

            if (isDisabled) {
              entityComponents.set(removedCommponentId, {
                disabled: true,
                value: component.value,
              });
            } else {
              entityComponents.delete(removedCommponentId);
              shouldUpdateName = true;
            }
          }

          for (const [componentId, isDisabled, value] of mutation.changes) {
            shouldUpdateName = !entityComponents.has(componentId);
            entityComponents.set(componentId, {
              value: value,
              disabled: isDisabled,
            });

            if (
              componentId === parentComponentId &&
              !containsHiddenComponent(mutation, componentsByName)
            ) {
              childParentMap.set(entity, value as EntityId);
              updateEntities({ childParentMap: new Map(childParentMap) });
            }
          }
          entities.set(entity, new Map(entityComponents));
        } else {
          // new entity
          if (mutation.removes.length > 0) {
            console.error(
              `Receive removed component for untracked entity ${entity}: ${mutation.removes.join(
                ', ',
              )}`,
            );
          }
          entities.set(
            entity,
            new Map(
              mutation.changes.map(([componentId, disabled, value]) => [
                componentId,
                { value, disabled },
              ]),
            ),
          );
          if (!containsHiddenComponent(mutation, componentsByName)) {
            const parent = mutation.changes.find(
              ([componentId]) => componentId === parentComponentId,
            );

            if (parent) {
              childParentMap.set(entity, parent[1] ? null : (parent[2] as EntityId));
            } else {
              childParentMap.set(entity, null);
            }

            updateEntities({ childParentMap: new Map(childParentMap) });
          }

          shouldUpdateName = true;
        }

        updateEntities({ entities: entities });

        if (shouldUpdateName) {
          updateEntityName(entity);
        }

        return;
      }

      console.warn(`Unknow mutation: ${mutation}`);
    },
    [entities, childParentMap, entityNames, updateEntities, componentsByName, updateEntityName],
  );

  return { updateEntity, updateEntityName };
}

function getEntityName(
  id: EntityId,
  entities: EntitiesMap,
  componentsById: Map<ComponentId, ComponentInfo>,
  componentsByName: Map<ComponentName, ComponentInfo>,
) {
  const components = entities.get(id);

  if (!components) {
    console.warn(`Entity ${prettyEntityId(id)} does not exist`);
    return 'Non existent entity (BUG)';
  }

  const nameComponentId = componentsByName.get(bevyTypes.NAME)?.id;
  if (nameComponentId !== undefined) {
    const nameComponent = components.get(nameComponentId);
    if (nameComponent?.value) {
      return nameComponent.value as string;
    }
  }

  // Search for common component
  for (const commonName in COMMON_NAMES) {
    const componentId = componentsByName.get(commonName)?.id;
    if (componentId === undefined) {
      continue;
    }

    if (components.has(componentId)) {
      try {
        return typeof COMMON_NAMES[commonName] === 'function'
          ? COMMON_NAMES[commonName](components.get(componentId)!.value)
          : COMMON_NAMES[commonName];
      } catch {
        break;
      }
    }
  }

  // Search for non bevy types first
  for (const componentId of components.keys()) {
    const { short_name, name } = componentsById.get(componentId) ?? {};
    let isBevyType = false;
    for (const bevyCrate of bevyCrates) {
      if (name?.startsWith(`${bevyCrate}::`)) {
        isBevyType = true;
        break;
      }
    }
    if (short_name && !isBevyType) {
      return short_name;
    }
  }

  // search for first suitable component
  for (const componentId of Array.from(components.keys()).sort()) {
    const { short_name, name } = componentsById.get(componentId) ?? {};

    // Skip `Parent` and `Children` as they are not confusing
    if (short_name && name !== bevyTypes.PARENT && name !== bevyTypes.CHILDREN) {
      return short_name;
    }
  }

  return 'Entity';
}

function containsHiddenComponent(
  mutation: EntityMutationChange,
  componentsByName: Map<string, ComponentInfo>,
) {
  for (const [id] of mutation.changes) {
    for (const name of hiddenEntityNames) {
      if (componentsByName.get(name)?.id === id) {
        return true;
      }
    }
  }
  return false;
}

// Copied from https://github.com/bevyengine/bevy/blob/main/tools/publish.sh
export const bevyCrates = [
  'bevy_utils',
  'bevy_ptr',
  'bevy_macro_utils',
  'bevy_derive',
  'bevy_math',
  'bevy_color',
  'bevy_tasks',
  'bevy_reflect',
  'bevy_ecs',
  'bevy_state',
  'bevy_app',
  'bevy_time',
  'bevy_log',
  'bevy_asset',
  'bevy_audio',
  'bevy_core',
  'bevy_diagnostic',
  'bevy_hierarchy',
  'bevy_transform',
  'bevy_window',
  'bevy_render',
  'bevy_mikktspace',
  'bevy_image',
  'bevy_mesh',
  'bevy_core_pipeline',
  'bevy_input',
  'bevy_gilrs',
  'bevy_animation',
  'bevy_pbr',
  'bevy_gltf',
  'bevy_remote',
  'bevy_scene',
  'bevy_picking',
  'bevy_sprite',
  'bevy_gizmos',
  'bevy_text',
  'bevy_a11y',
  'bevy_ui',
  'bevy_winit',
  'bevy_dev_tools',
  'bevy_internal',
  'bevy_dylib',
];

const COMMON_NAMES: Record<string, string | ((value: TValue) => string)> = {
  [bevyTypes.CAMERA_3D]: 'Camera3d',
  [bevyTypes.POINT_LIGHT]: 'PointLight',
  [bevyTypes.MESH_3D]: 'Mesh3d',
  [bevyTypes.OBSERVER]: 'Observer',
  [bevyTypes.WINDOW]: 'Window',
  [bevyTypes.PRIMARY_MONITOR]: 'PrimaryMonitor',
  [bevyTypes.MONITOR]: 'Monitor',
  [bevyTypes.POINTER_ID]: (val) => ` PointerId (${val as string})`,
  [bevyTypes.TEXT]: 'Text',
  [bevyTypes.NODE]: 'Node',
};
