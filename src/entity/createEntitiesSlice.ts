import { CreateSlice } from '@/store';
import { bevyTypes } from '@/type-registry/bevyTypes';
import { EntityId, findParentChange } from './useEntity';
import { ComponentId, ComponentValue } from '@/component/useComponents';
import { EntityMutaion } from '@/websocket/useWs';

export type EntitiesSlice = {
  entities: Map<EntityId, Map<ComponentId, ComponentValue>>;
  updateEntity: (id: EntityId, mutation: EntityMutaion) => void;
  childParentMap: Map<EntityId, EntityId | null>;
};

export const createEntitiesSlice: CreateSlice<EntitiesSlice> = (set, get) => ({
  entities: new Map(),
  childParentMap: new Map(),
  updateEntity: (entity, mutation) => {
    const childParentMap = get().childParentMap;
    const componentNameToIdMap = get().componentNameToIdMap;
    const parentComponentId = componentNameToIdMap.get(bevyTypes.PARENT);
    const entities = get().entities;
    if (mutation.kind === 'remove') {
      set(() => {
        entities.delete(entity);

        return { entities: new Map(entities) };
      });

      childParentMap.delete(entity);
      set({ childParentMap: new Map(childParentMap) });

      return;
    }

    if (mutation.kind === 'change') {
      const entityComponents = entities.get(entity);

      if (entityComponents) {
        for (const removedCommponentId of mutation.removes) {
          entityComponents.delete(removedCommponentId);
          if (removedCommponentId === parentComponentId) {
            childParentMap.delete(entity);
            set({ childParentMap: new Map(childParentMap) });
          }
        }

        for (const [componentId, value] of mutation.changes) {
          entityComponents.set(componentId, value);
          if (componentId === parentComponentId) {
            childParentMap.set(entity, value);
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
        const parent = findParentChange(mutation.changes, parentComponentId);
        childParentMap.set(entity, parent || null);
        entities.set(entity, new Map(mutation.changes));

        set({ childParentMap: new Map(childParentMap) });
      }

      // must create new Map to trigger reactivity
      set({ entities: new Map(entities) });

      return;
    }

    console.warn(`Unknow mutation: ${mutation}`);
  },
});
