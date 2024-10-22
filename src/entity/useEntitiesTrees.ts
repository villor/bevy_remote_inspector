import { useStore } from '@/store';
import { EntityId, EntityTreeNode } from './useEntity';
import { useMemo } from 'react';

export function useEntityTrees() {
  const childParentMap = useStore((state) => state.childParentMap);

  return useMemo(() => {
    const trees: EntityTreeNode[] = [];
    const parentChildrenMap = new Map<EntityId, EntityId[]>();
    for (const [child, parent] of childParentMap) {
      if (parent === null) {
        trees.push({
          id: child,
          parent: null,
          children: [],
        });
        continue;
      }
      const children = parentChildrenMap.get(parent) || [];
      children.push(child);
      parentChildrenMap.set(parent, children);
    }

    function recur(curr: EntityTreeNode) {
      const children = parentChildrenMap.get(curr.id);
      if (!children) {
        return curr;
      }

      curr.children = children.map((child) =>
        recur({ id: child, parent: curr.id, children: [] })
      );

      return curr;
    }

    for (const tree of trees) {
      recur(tree);
    }

    return trees;
  }, [childParentMap]);
}
