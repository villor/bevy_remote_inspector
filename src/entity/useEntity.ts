import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@/store';
import { ComponentId } from '@/component/useComponents';
import { EntityMutationChange } from '@/websocket/createWsSlice';

export type EntityId = number;

export type EntityTreeNode = {
  id: EntityId;
  parent: EntityId | null;
  children: EntityTreeNode[];
};

export function useEntity(id: EntityId) {
  return useStore(useShallow((state) => state.entities.get(id)));
}

export function useEntityComponentIds(id: EntityId): ComponentId[] | undefined {
  return useStore(
    useShallow((state) => {
      const entity = state.entities.get(id);
      return entity ? Array.from(entity.keys()) : undefined;
    })
  );
}

export function useEntityComponentValue(
  entityId: EntityId,
  componentId: ComponentId
): any | undefined {
  return useStore(
    useShallow((state) => {
      const entity = state.entities.get(entityId);
      return entity?.get(componentId);
    })
  );
}

export function findParentChange(
  changes: EntityMutationChange['changes'],
  parentComponentId: number | undefined
): EntityId | null | undefined {
  const changedParent = changes.find(
    ([componentId, _]) => componentId === parentComponentId
  );

  return changedParent?.[1] as EntityId | null | undefined;
}
