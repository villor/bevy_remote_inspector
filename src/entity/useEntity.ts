import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@/store';
import { ComponentId } from '@/component/useComponents';
import { EntityMutationChange } from '@/websocket/createWsSlice';
import { TValue } from '@/type-registry/useTypeRegistry';
import { useMemo } from 'react';

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
): { disabled: boolean; value: TValue | undefined } {
  const value = useStore(
    useShallow((state) => {
      const entity = state.entities.get(entityId);
      return entity?.get(componentId);
    })
  );

  return useMemo(() => {
    return value ?? { disabled: false, value: undefined };
  }, [value]);
}

export function findParentChange(
  changes: EntityMutationChange['changes'],
  parentComponentId: number | undefined
): EntityId | null | undefined {
  const changedParent = changes.find(
    ([componentId, _]) => componentId === parentComponentId
  );

  return changedParent?.[2] as EntityId | null | undefined;
}
