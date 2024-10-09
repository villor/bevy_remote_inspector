import { EntityMutationChange } from '../websocket/useWs';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@/store';

export type EntityId = number;

export type EntityTreeNode = {
  id: EntityId;
  parent: EntityId | null;
  children: EntityTreeNode[];
};

export function useEntity(id: EntityId) {
  return useStore(useShallow((state) => state.entities.get(id)));
}

export function findParentChange(
  changes: EntityMutationChange['changes'],
  parentComponentId: number | undefined
): EntityId | null | undefined {
  const changedParent = changes.find(
    ([componentId, _]) => componentId === parentComponentId
  );

  return changedParent?.[1];
}
