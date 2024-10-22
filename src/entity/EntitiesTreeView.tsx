import { useEntityTrees } from '@/entity/useEntitiesTrees';
import { EntityId, EntityTreeNode } from '@/entity/useEntity';
import { useEntityName } from '@/entity/useEntityName';
import { Button, buttonVariants } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { useStore } from '@/store';
import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  UNSTABLE_Tree as Tree,
  UNSTABLE_TreeItem as TreeItem,
  UNSTABLE_TreeItemContent as TreeItemContent,
  Collection,
  Key,
  TreeItemContentRenderProps,
  Button as AriaButton,
  Checkbox as AriaCheckbox,
} from 'react-aria-components';
import { cn } from '@/utils';
import { Badge } from '@/shared/ui/badge';
import { bevyTypes } from '@/type-registry/types';
export const EntitiesTreeView = memo(function EntitiesTreeView() {
  const entityTrees = useEntityTrees();
  const setInspectingEntity = useStore((state) => state.setInspectingEntity);
  const hanndleOnAction = useCallback((entityId: Key) => {
    setInspectingEntity(entityId as EntityId);
  }, []);

  const defaultExpandedKeys = useStore(
    useShallow((state) => Array.from(state.entities.keys()))
  );

  const inspectingEntity = useStore(
    useShallow((state) => {
      const inspectingEntity = state.inspectingEntity;
      return new Set(inspectingEntity ? [inspectingEntity] : []);
    })
  );

  const handleOnSelectionChange = useCallback((keys: any) => {
    setInspectingEntity(Array.from(keys)[0] as EntityId);
  }, []);

  if (entityTrees.length === 0) {
    return <div className="px-4 py-2">No entities</div>;
  }

  return (
    <ScrollArea style={{ height: '100%', width: '100%' }} className="w-full">
      <Tree
        selectionMode="single"
        items={entityTrees}
        aria-label="Entities"
        onAction={hanndleOnAction}
        selectedKeys={inspectingEntity}
        selectionBehavior="replace"
        disallowEmptySelection
        defaultExpandedKeys={defaultExpandedKeys}
        onSelectionChange={handleOnSelectionChange}
      >
        {renderItem}
      </Tree>
    </ScrollArea>
  );
});

const ignoreEntityNames = [bevyTypes.OBSERVER, bevyTypes.SYSTEM_ID_MARKER];

function renderItem(item: EntityTreeNode) {
  return (
    <TreeItem textValue={String(item.id)} className="w-full">
      <TreeItemContent>
        {(props) => <EntityTreeItemContent item={item} itemProps={props} />}
      </TreeItemContent>
      <Collection items={item.children}>{renderItem}</Collection>
    </TreeItem>
  );
}

const EntityTreeItemContent = ({
  item,
  itemProps,
}: {
  item: EntityTreeNode;
  itemProps: TreeItemContentRenderProps;
}) => {
  const name = useEntityName(item.id);
  const isHidden = useStore(
    useShallow((state) => {
      const componentIds = Array.from(
        state.entities.get(item.id)?.keys() || []
      );

      for (const id of componentIds) {
        const name = state.components.get(id)?.name;
        if (name && ignoreEntityNames.includes(name)) {
          return true;
        }
      }
      return false;
    })
  );

  if (isHidden) {
    return null;
  }

  const { level, hasChildRows, isExpanded, isSelected } = itemProps;
  const isRoot = level === 1;
  const childrenCount = countChildren(item);

  return (
    <div
      className={clsx('gap-y-2 flex', {
        // 'pr-4': isRoot,
      })}
      style={
        !isRoot
          ? {
              paddingLeft: `${(level - 1) * (hasChildRows ? 0.75 : 0.75)}rem`,
            }
          : {}
      }
    >
      <div className="w-6">
        {hasChildRows && (
          <>
            {/* TODO add back tooltip */}
            {/* <IconButton
            tooltip={{
              content: {
                side: 'top',
                children: isExpanded ? 'Hide children' : 'Expand children',
                },
                tooltip: {
                delayDuration: 150,
                },
                }}
                
          > */}
            <AriaButton
              className={cn(
                buttonVariants({
                  variant: 'ghost',
                  size: 'sm',
                  className: 'p-1',
                })
              )}
              slot="chevron"
            >
              <ChevronRight
                className={clsx('size-4', {
                  'transform rotate-90': isExpanded,
                })}
              />
            </AriaButton>
            <AriaCheckbox slot="selection" />
          </>
        )}
      </div>
      <div className="flex flex-1">
        <Button
          asChild
          size="sm"
          variant={isSelected ? 'default' : 'ghost'}
          className={clsx('w-full justify-start py-1 px-1')}
        >
          <div className="flex gap-x-2">
            <span>{name}</span>
            {!isExpanded && childrenCount > 0 && (
              <Badge variant="secondary" className="px-1.5 rounded-full">
                {childrenCount}
              </Badge>
            )}
          </div>
        </Button>
      </div>
    </div>
  );
};

function countChildren(item: EntityTreeNode): number {
  const q = [...item.children]; // clone to avoid mutate by `.pop()`
  let count = q.length;
  while (q.length > 0) {
    const node = q.pop()!;
    if (node.children.length === 0) {
      continue;
    }
    count += node.children.length;
    q.push(...node.children);
  }

  return count;
}
