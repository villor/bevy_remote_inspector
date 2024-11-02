import type { EntityId } from './useEntity';
import { useMemo } from 'react';
import { getEntityIndex } from './entityUtils';
import { bevyTypes } from '@/type-registry/types';
import type { QueriedEntity } from './useEcsQuery';

export interface EntityTreeNode<T> {
  entity: T;
  id: EntityId;
  stringId: string;
  parent: EntityTreeNode<T> | null;
  children: EntityTreeNode<T>[];
}

function getParent(entity: QueriedEntity) {
  return (entity.components[bevyTypes.PARENT] ?? null) as EntityId | null;
}

function populateNode<T extends QueriedEntity>(
  allEntities: Map<EntityId, EntityTreeNode<T>>,
  id: EntityId,
  parent: EntityId | null,
): EntityTreeNode<T> {
  const children = [...allEntities.values()]
    .filter((e) => getParent(e.entity) === id)
    .map((e) => populateNode(allEntities, e.id, id))
    .sort((a, b) => getEntityIndex(a.id) - getEntityIndex(b.id));

  return {
    entity: allEntities.get(id)!.entity,
    id,
    stringId: id.toString(),
    parent: parent ? (allEntities.get(parent) ?? null) : null,
    children,
  };
}

/** Maps a list of queried entities to a tree hierarchy. Expects the Parent component to be (optionally) included in the query. */
export function useEntityTree<T extends QueriedEntity>(entities: T[]) {
  return useMemo(() => {
    const entitiesById = new Map<EntityId, EntityTreeNode<T>>(
      entities.map((e) => [
        e.entity,
        {
          entity: e,
          id: e.entity,
          stringId: e.entity.toString(),
          parent: null,
          children: [],
        },
      ]),
    );

    const tree = entities
      ?.filter((e) => !e.components[bevyTypes.PARENT])
      .map((e) => populateNode(entitiesById, e.entity, null))
      .sort((a, b) => getEntityIndex(a.id) - getEntityIndex(b.id));

    return { entitiesById, tree };
  }, [entities]);
}
