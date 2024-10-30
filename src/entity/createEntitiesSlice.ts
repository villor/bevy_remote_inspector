import { CreateSlice, SharedSlice } from '@/store';
import { bevyTypes } from '@/type-registry/types';
import { EntityId } from './useEntity';
import {
  ComponentId,
  ComponentInfo,
  ComponentValue,
} from '@/component/useComponents';
import {
  EntityMutaion,
  EntityMutationChange,
  WsEvent,
} from '@/websocket/createWsSlice';
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
    return;
  }

  const nameComponentId = componentNameToIdMap.get(bevyTypes.NAME);
  if (nameComponentId !== undefined) {
    const nameComponent = components.get(nameComponentId);
    if (nameComponent) {
      return nameComponent.value as string;
    }
  }

  for (const fallbackName in FALLBACK_NAMES) {
    const componentId = componentNameToIdMap.get(fallbackName);
    if (componentId === undefined) {
      continue;
    }

    if (components.has(componentId)) {
      try {
        return typeof FALLBACK_NAMES[fallbackName] === 'function'
          ? FALLBACK_NAMES[fallbackName](components.get(componentId)!.value)
          : FALLBACK_NAMES[fallbackName];
      } catch {
        break;
      }
    }
  }

  const firstComponent = Array.from(components.keys()).sort()[0];

  if (firstComponent === undefined) {
    return `Empty Entity`;
  }

  const { short_name } = getComponentName(firstComponent);

  return short_name;
}

const FALLBACK_NAMES: Record<string, string | ((value: TValue) => string)> = {
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
