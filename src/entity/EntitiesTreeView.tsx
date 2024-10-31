import { type EntityTreeNode, useEntityTrees } from '@/entity/useEntitiesTrees';
import useResizeObserver from 'use-resize-observer';
import { type EntityId, useEntity } from '@/entity/useEntity';
import { Button, buttonVariants } from '@/shared/ui/button';
import { useStore } from '@/store';
import clsx from 'clsx';
import { ChevronRight, Ellipsis, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import {
  createContext,
  type CSSProperties,
  memo,
  type ReactElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '@/utils';
import { bevyTypes } from '@/type-registry/types';
import { EntityName } from './EntityName';
import { IconButton } from '@/shared/ui/icon-button';
import { Menu, MenuItem, MenuPopover, MenuTrigger } from '@/shared/ui/menu';
import { useDespawnEntity } from './useDespawnEntity';
import { useToggleVisibility } from './useToggleVisibility';
import {
  type CursorProps,
  type DragPreviewProps,
  type MoveHandler,
  type NodeApi,
  type NodeRendererProps,
  Tree,
  type TreeApi,
} from 'react-arborist';
import { useReparent } from './useReparent';
import { useSpawnEntity } from './useSpawnEntity';

const entityTreeCtx = createContext<{
  setNewlySpawnedEntity: (id: EntityId) => void;
}>({} as any);

export const EntitiesTreeView = memo(function EntitiesTreeView() {
  const entityTrees = useEntityTrees();
  const setInspectingEntity = useStore((state) => state.setInspectingEntity);

  const inspectingEntity = useStore((state) => state.inspectingEntity);

  const handleOnActive = useCallback((node: NodeApi<EntityTreeNode>) => {
    setInspectingEntity(node.data.id);
  }, []);

  const childParentMap = useStore((state) => state.childParentMap);
  const reparent = useReparent();
  const handleOnMove: MoveHandler<EntityTreeNode> = useCallback(
    ({ dragNodes, parentNode: newParentNode }) => {
      const node = dragNodes[0];

      if (!node) {
        return;
      }

      const oldParentId = childParentMap.get(node.data.id) ?? null;
      const newParentId = newParentNode?.data.id ?? null;
      if (oldParentId === newParentId || newParentId === node.data.id) {
        return;
      }
      reparent(node.data.id, newParentId);
    },
    [childParentMap, reparent],
  );

  const tree = useRef<TreeApi<EntityTreeNode> | null>(null);
  const [newlySpawnedEntity, setNewlySpawnedEntity] = useState<EntityId | null>(null);
  const ctxValue = useMemo(() => {
    return {
      setNewlySpawnedEntity,
    };
  }, [setNewlySpawnedEntity]);

  useEffect(() => {
    if (newlySpawnedEntity && childParentMap.has(newlySpawnedEntity)) {
      setInspectingEntity(newlySpawnedEntity);
      setNewlySpawnedEntity(null);
    }
  }, [newlySpawnedEntity, childParentMap]);

  if (entityTrees.length === 0) {
    return <div className="px-4 py-2">No entities</div>;
  }

  return (
    <div className="flex h-full w-full flex-col">
      <entityTreeCtx.Provider value={ctxValue}>
        <FillFlexParent>
          {(dimens) => (
            <Tree
              {...dimens}
              ref={tree}
              selection={inspectingEntity ? String(inspectingEntity) : undefined}
              disableMultiSelection
              openByDefault
              data={entityTrees}
              onMove={handleOnMove}
              renderCursor={Cursor}
              idAccessor="stringId"
              rowHeight={32}
              paddingBottom={20}
              renderDragPreview={DragPreview}
              onActivate={handleOnActive}
            >
              {TreeNode}
            </Tree>
          )}
        </FillFlexParent>
        <SpawnNewEntityButton />
      </entityTreeCtx.Provider>
    </div>
  );
});

function DragPreview({ mouse, id }: DragPreviewProps) {
  if (!id || !mouse) {
    return null;
  }
  return (
    <div className="pointer-events-none fixed top-0 left-0 z-100 h-full w-full">
      <div
        className={cn(
          buttonVariants({
            size: 'sm',
            variant: 'default',
          }),
          '-translate-y-1/2 absolute flex-grow translate-x-4 justify-start px-1 py-1',
        )}
        style={{
          left: mouse.x,
          top: mouse.y,
        }}
      >
        <EntityName id={Number(id)}></EntityName>
      </div>
    </div>
  );
}

const TreeNode = memo(function TreeNode({ node, dragHandle }: NodeRendererProps<EntityTreeNode>) {
  const nodeId = node.data.id;
  const { level, isSelected, isRoot } = node;
  const hasChildren = !!node.children && node.children.length > 0;
  const isExpanded = node.isOpen;

  return (
    <div
      className={clsx('flex')}
      style={
        !isRoot
          ? {
              paddingLeft: `${level * 0.75}rem`,
            }
          : {}
      }
    >
      <div className="flex w-6 items-center">
        {hasChildren && (
          <ChevronRight
            onClick={() => node.isInternal && node.toggle()}
            className={clsx('size-4', {
              'rotate-90 transform': isExpanded,
            })}
          />
        )}
      </div>
      <div className="flex w-full justify-between">
        <div
          ref={dragHandle}
          className={cn(
            buttonVariants({
              size: 'sm',
              variant: isSelected ? 'default' : 'ghost',
            }),
            'flex-grow justify-start px-1 py-1',
          )}
          style={{ width: 'fit-content' }}
        >
          <EntityName id={nodeId}></EntityName>
        </div>
        <EntityActionMenu id={nodeId} hasChildren={hasChildren} />
      </div>
    </div>
  );
});

const EntityActionMenu = memo(function EntityActionMenu({
  id,
  hasChildren,
}: {
  id: EntityId;
  hasChildren: boolean;
}) {
  const despawnRecursive = useDespawnEntity(id, 'recursive');
  const despawnDescendant = useDespawnEntity(id, 'descendant');
  const components = useEntity(id);
  const visibilityComponentId = useStore((state) =>
    state.componentNameToIdMap.get(bevyTypes.VIEW_VISIBILITY),
  );
  const viewVisibility = components?.get(visibilityComponentId ?? -1);
  const ctx = useContext(entityTreeCtx);

  const toggleVisibility = useToggleVisibility(id);
  const spawnEntity = useSpawnEntity(id, (id) => ctx.setNewlySpawnedEntity(id));

  return (
    <MenuTrigger>
      <IconButton>
        <Ellipsis className="size-4"></Ellipsis>
      </IconButton>
      <MenuPopover>
        <Menu>
          <MenuItem
            icon={viewVisibility?.value ? EyeOff : Eye}
            isDisabled={viewVisibility === undefined}
            onAction={toggleVisibility}
          >
            Toggle visibility
          </MenuItem>
          <MenuItem onAction={spawnEntity} icon={Plus}>
            Spawn new child
          </MenuItem>
          <MenuItem variant="danger" onAction={despawnRecursive} icon={Trash2}>
            Despawn recursive
          </MenuItem>
          <MenuItem
            isDisabled={!hasChildren}
            variant="danger"
            onAction={despawnDescendant}
            icon={Trash2}
          >
            Despawn descendants
          </MenuItem>
        </Menu>
      </MenuPopover>
    </MenuTrigger>
  );
});

const Cursor = memo(function Cursor({ top, left, indent }: CursorProps) {
  const style: CSSProperties = {
    top: `${top - 2}px`,
    left: `${left}px`,
    right: `${indent}px`,
  };
  return (
    <div className="pointer-events-none absolute z-10 flex items-center" style={style}>
      <div className="h-2 w-2 rounded-full bg-primary"></div>
      <div className="h-0.5 flex-1 rounded bg-primary"></div>
    </div>
  );
});

// function countChildren(item: EntityTreeNode): number {
//   const q = [...item.children]; // clone to avoid mutate by `.pop()`
//   let count = q.length;
//   while (q.length > 0) {
//     const node = q.pop()!;
//     if (node.children.length === 0) {
//       continue;
//     }
//     count += node.children.length;
//     q.push(...node.children);
//   }

//   return count;
// }
function FillFlexParent(props: {
  children: (dimens: { width: number; height: number }) => ReactElement;
}) {
  const { ref, width, height } = useResizeObserver();

  return (
    <div className="h-full min-h-0 w-full min-w-0 flex-1" ref={ref}>
      {width && height ? props.children({ width, height }) : null}
    </div>
  );
}

function SpawnNewEntityButton() {
  const ctx = useContext(entityTreeCtx);

  const spawnEntity = useSpawnEntity(null, (id) => {
    ctx.setNewlySpawnedEntity(id);
  });

  return (
    <Button className="gap-x-1" onPress={spawnEntity}>
      <Plus className="size-4"></Plus>
      <span className="leading-3">Spawn New Entity</span>
    </Button>
  );
}
