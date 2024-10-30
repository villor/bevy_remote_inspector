import { CreateSlice, SharedSlice } from '@/store';
import { bevyTypes } from '@/type-registry/types';
import { EntityId } from './useEntity';
import {
  ComponentId,
  ComponentInfo,
  ComponentValue,
} from '@/component/useComponents';
import { EntityMutaion, EntityMutationChange } from '@/websocket/createWsSlice';
import { TValue } from '@/type-registry/useTypeRegistry';

export type EntitiesSlice = {
  entities: Map<
    EntityId,
    Map<
      ComponentId,
      {
        value: ComponentValue;
        disabled: boolean;
      }
    >
  >;
  updateEntity: (id: EntityId, mutation: EntityMutaion) => void;
  childParentMap: Map<EntityId, EntityId | null>;
  entityNames: Map<EntityId, string>;
  updateEntityName: (id: EntityId) => void;
};

export const createEntitiesSlice: CreateSlice<EntitiesSlice> = (set, get) => ({
  entities: new Map(),
  childParentMap: new Map(),
  entityNames: new Map(),
  updateEntity: (entity, mutation) => {
    const childParentMap = get().childParentMap;
    const componentNameToIdMap = get().componentNameToIdMap;
    const parentComponentId = componentNameToIdMap.get(bevyTypes.PARENT);
    const entities = get().entities;
    if (mutation.kind === 'remove') {
      entities.delete(entity);
      childParentMap.delete(entity);
      const entityNames = get().entityNames;
      entityNames.delete(entity);

      set({
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
            set({ childParentMap: new Map(childParentMap) });
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
            !containsHiddenComponent(mutation, componentNameToIdMap)
          ) {
            childParentMap.set(entity, value as EntityId);
            set({ childParentMap: new Map(childParentMap) });
          }
        }
        entities.set(entity, new Map(entityComponents));
      } else {
        // new entity
        if (mutation.removes.length > 0) {
          console.error(
            `Receive removed component for untracked entity ${entity}: ${mutation.removes.join(
              ', '
            )}`
          );
        }
        entities.set(
          entity,
          new Map(
            mutation.changes.map(([componentId, disabled, value]) => [
              componentId,
              { value, disabled },
            ])
          )
        );
        if (!containsHiddenComponent(mutation, componentNameToIdMap)) {
          const parent = mutation.changes.find(
            ([componentId]) => componentId === parentComponentId
          );

          if (parent) {
            childParentMap.set(
              entity,
              parent[1] ? null : (parent[2] as EntityId)
            );
          } else {
            childParentMap.set(entity, null);
          }

          set({ childParentMap: new Map(childParentMap) });
        }

        shouldUpdateName = true;
      }

      set({ entities: entities });

      if (shouldUpdateName) {
        get().updateEntityName(entity);
      }

      return;
    }

    console.warn(`Unknow mutation: ${mutation}`);
  },
  updateEntityName: (id) => {
    const name = getEntityName(get(), id);
    if (!name) {
      return;
    }
    set((state) => {
      const entityNames = state.entityNames;
      entityNames.set(id, name);
      return { entityNames: new Map(entityNames) };
    });
  },
});

function getEntityName(state: SharedSlice, id: EntityId) {
  const componentNameToIdMap = state.componentNameToIdMap;

  const getComponentName = state.getComponentName;
  const components = state.entities.get(id);

  if (!components) {
    console.warn(`Entity ${prettyEntityId(id)} does not exist`);
    return `Non existent entity (BUG)`;
  }

  const nameComponentId = componentNameToIdMap.get(bevyTypes.NAME);
  if (nameComponentId !== undefined) {
    const nameComponent = components.get(nameComponentId);
    if (nameComponent && nameComponent.value) {
      return nameComponent.value as string;
    }
  }

  // Search for common component
  for (const commonName in COMMON_NAMES) {
    const componentId = componentNameToIdMap.get(commonName);
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
    const { short_name, name } = getComponentName(componentId);
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
    const { short_name, name } = getComponentName(componentId);

    // Skip `Parent` and `Children` as they are not confusing
    if (
      short_name &&
      name !== bevyTypes.PARENT &&
      name !== bevyTypes.CHILDREN
    ) {
      return short_name;
    }
  }

  return `Entity`;
}

// Copied from https://github.com/bevyengine/bevy/blob/main/tools/publish.sh
const bevyCrates = [
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

export function prettyEntityId(id: EntityId) {
  const bid = BigInt(id);
  const index = Number(bid & 0xffffffffn);
  const generation = Number(bid >> 32n);

  return `${index}v${generation}`;
}

export function getEntityIndex(id: EntityId) {
  const bid = BigInt(id);
  return Number(bid & 0xffffffffn);
}

const hiddenEntityNames = [bevyTypes.OBSERVER, bevyTypes.SYSTEM_ID_MARKER];

function containsHiddenComponent(
  mutation: EntityMutationChange,
  nameToIdMap: Map<string, ComponentId>
) {
  for (const [id] of mutation.changes) {
    for (const name of hiddenEntityNames) {
      if (nameToIdMap.get(name) === id) {
        return true;
      }
    }
  }
  return false;
}

export function isHiddenEntity(
  entityComponentIds: ComponentId[],
  allComponents: Map<ComponentId, ComponentInfo>
) {
  for (const id of entityComponentIds) {
    const name = allComponents.get(id)?.name;
    if (name && hiddenEntityNames.includes(name)) {
      return true;
    }
  }
  return false;
}
