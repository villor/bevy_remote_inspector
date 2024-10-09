import { useEntityTrees } from '@/entity/useEntitiesTrees';
import { EntityId, EntityTreeNode, useEntity } from '@/entity/useEntity';
import { useEntityName } from '@/entity/useEntityName';
import { Button, buttonVariants, IconButton } from '@/shared/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { useStore } from '@/store';
import clsx from 'clsx';
import { ChevronRight, CircleX } from 'lucide-react';
import { memo, useCallback, useContext, useState } from 'react';
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
export function EntitiesTreeView() {
  const entityTrees = useEntityTrees();
  const setInspectingEntity = useStore((state) => state.setInspectingEntity);
  const hanndleOnAction = (entityId: Key) => {
    setInspectingEntity(entityId as EntityId);
  };

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
}

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

const EntityTreeItemContent = memo(
  ({
    item,
    itemProps,
  }: {
    item: EntityTreeNode;
    itemProps: TreeItemContentRenderProps;
  }) => {
    const name = useEntityName(item.id);
    const { level, hasChildRows, isExpanded, isSelected } = itemProps;
    const isRoot = level === 1;
    return (
      <div
        className={clsx('gap-y-2 flex', {
          'pl-10': !isRoot && !hasChildRows,
          'pr-4': isRoot,
          'pl-6': isRoot && !hasChildRows,
        })}
      >
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
        <div className="flex flex-1">
          <Button
            asChild
            size="sm"
            variant={isSelected ? 'default' : 'ghost'}
            className={clsx('w-full justify-start py-1 px-1')}
          >
            <div>{name}</div>
          </Button>
        </div>
      </div>
    );
  }
);
