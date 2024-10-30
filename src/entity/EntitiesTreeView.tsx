import { EntityTreeNode, useEntityTrees } from '@/entity/useEntitiesTrees';
import useResizeObserver from 'use-resize-observer';
import { EntityId } from '@/entity/useEntity';
import { Button, buttonVariants } from '@/shared/ui/button';
import { useStore } from '@/store';
import clsx from 'clsx';
import { ChevronRight, Ellipsis, Plus } from 'lucide-react';
import { CSSProperties, memo, ReactElement, useCallback } from 'react';
import { cn } from '@/utils';
import { bevyTypes } from '@/type-registry/types';
import { EntityName } from './EntityName';
import { IconButton } from '@/shared/ui/icon-button';
import { Menu, MenuItem, MenuPopover, MenuTrigger } from '@/shared/ui/menu';
import { useDespawnEntity } from './useDespawnEntity';
import { useToggleVisibility } from './useToggleVisibility';
import {
  CursorProps,
  DragPreviewProps,
  MoveHandler,
  NodeApi,
  NodeRendererProps,
  Tree,
} from 'react-arborist';
import { useReparent } from './useReparent';
import { useSpawnEntity } from './useSpawnEntity';

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
    [childParentMap, reparent]
  );

  if (entityTrees.length === 0) {
    return <div className="px-4 py-2">No entities</div>;
  }

  return (
    <div className="flex flex-col w-full h-full">
      <FillFlexParent>
        {(dimens) => (
          <Tree
            {...dimens}
            selection={inspectingEntity ? String(inspectingEntity) : undefined}
            disableMultiSelection
            openByDefault
            data={entityTrees}
            onMove={handleOnMove}
            renderCursor={Cursor}
            idAccessor="stringId"
            rowHeight={32}
            renderDragPreview={DragPreview}
            onActivate={handleOnActive}
          >
            {TreeNode}
          </Tree>
        )}
      </FillFlexParent>
      <SpawnNewEntityButton />
    </div>
  );
});

function DragPreview({ mouse, id }: DragPreviewProps) {
  if (!id || !mouse) {
    return null;
  }
  return (
    <div className="fixed pointer-events-none z-100 left-0 top-0 w-full h-full">
      <div
        className={cn(
          buttonVariants({
            size: 'sm',
            variant: 'default',
          }),
          'justify-start flex-grow py-1 px-1 translate-x-4 -translate-y-1/2 absolute'
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

const TreeNode = memo(function RenderItem({
  node,
  dragHandle,
}: NodeRendererProps<EntityTreeNode>) {
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
      <div className="w-6 flex items-center">
        {hasChildren && (
          <ChevronRight
            onClick={() => node.isInternal && node.toggle()}
            className={clsx('size-4', {
              'transform rotate-90': isExpanded,
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
            'justify-start flex-grow py-1 px-1'
          )}
          style={{ width: true ? 'fit-content' : '100%' }}
        >
          <EntityName id={nodeId}></EntityName>
        </div>
        <EntityActionMenu id={nodeId} />
      </div>
    </div>
  );
});

const EntityActionMenu = memo(function EntityActionMenu({
  id,
}: {
  id: EntityId;
}) {
  const despawn = useDespawnEntity(id);
  const visibilityComponentId = useStore((state) =>
    state.componentNameToIdMap.get(bevyTypes.VIEW_VISIBILITY)
  );

  const toggleVisibility = useToggleVisibility(id);
  const spawnEntity = useSpawnEntity(id);

  return (
    <MenuTrigger>
      <IconButton>
        <Ellipsis className="size-4"></Ellipsis>
      </IconButton>
      <MenuPopover>
        <Menu>
          <MenuItem
            isDisabled={visibilityComponentId === undefined}
            onAction={toggleVisibility}
          >
            Toggle visibility
          </MenuItem>
          <MenuItem onAction={spawnEntity}>Spawn new child</MenuItem>
          <MenuItem
            className="text-red-600 hover:text-red-700"
            onAction={despawn}
          >
            Despawn recursive
          </MenuItem>
        </Menu>
      </MenuPopover>
    </MenuTrigger>
  );
});

const Cursor = memo(function Cursor({ top, left, indent }: CursorProps) {
  const style: CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    top: top - 2 + 'px',
    left: left + 'px',
    right: indent + 'px',
  };
  return (
    <div className="flex items-center z-10" style={style}>
      <div className="w-2 h-2 rounded-full bg-primary"></div>
      <div className="flex-1 h-0.5 bg-primary rounded"></div>
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
    <div className="flex-1 w-full h-full min-h-0 min-w-0" ref={ref}>
      {width && height ? props.children({ width, height }) : null}
    </div>
  );
}

function SpawnNewEntityButton() {
  const spawnEntity = useSpawnEntity(null);
  return (
    <Button className="gap-x-1" onPress={spawnEntity}>
      <Plus className="size-4"></Plus>
      <span className="leading-3">Spawn New Entity</span>
    </Button>
  );
}
