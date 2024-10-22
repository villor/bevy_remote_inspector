import { useComponentName } from '@/component/useComponentName';
import { ComponentId, useComponentInfo } from '@/component/useComponents';
import {
  EntityId,
  useEntityComponentIds,
  useEntityComponentValue,
} from '@/entity/useEntity';
import { DynamicForm } from '@/inputs/DynamicForm';
import { Button } from '@/shared/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { useStore } from '@/store';
import clsx from 'clsx';
import { ChevronRight, Plus } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { useUpdateEntityComponent } from './useUpdateEntityComponent';
import { memo } from 'react';
import { useTypeRegistry } from '@/type-registry/useTypeRegistry';

export const EntitiesInspectorPanel = memo(function EntitiesInspectorPanel() {
  const inspectingEntity = useStore((state) => state.inspectingEntity);

  return (
    <div className="flex h-full w-full flex-col pt-4">
      <div className="px-4 text-lg font-bold">Inspector</div>
      {inspectingEntity ? (
        <InspectorComponentList entity={inspectingEntity} />
      ) : (
        <div className="px-4 py-2">Select an entity to inspect</div>
      )}
    </div>
  );
});

function InspectorComponentList({ entity }: { entity: EntityId }) {
  const componentIds = useEntityComponentIds(entity);
  console.log(`compoents rerender`);

  if (!componentIds) {
    return `No components`;
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden items-center">
      <ScrollArea style={{ height: 'auto', width: '100%' }} className="gap-y-4">
        {componentIds.map((id) => (
          <InspectorComponent entityId={entity} key={id} componentId={id} />
        ))}
      </ScrollArea>
      <div className="py-2">
        <Button size="sm" className="max-w-48">
          <Plus></Plus>
          <span>Add new components</span>
        </Button>
      </div>
    </div>
  );
}

function InspectorComponent({
  componentId,
  entityId,
}: {
  componentId: ComponentId;
  entityId: EntityId;
}) {
  const [open, setOpen] = useState(true);
  const value = useEntityComponentValue(entityId, componentId);
  const { name, short_name } = useComponentName(componentId);
  const info = useComponentInfo(componentId)!;
  const updateEntityComponent = useUpdateEntityComponent(entityId, componentId);

  const registry = useTypeRegistry();

  let children: ReactNode = null;
  if (value === undefined) {
    const typeInfo = registry.get(info.name);
    const message =
      typeInfo === undefined
        ? 'is not registered in type registry'
        : 'is not serializable';
    children = (
      <div>
        Component {name} is {message}
      </div>
    );
  } else {
    children = (
      <DynamicForm
        typeName={info.name}
        value={value}
        onChange={updateEntityComponent}
      ></DynamicForm>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        asChild
        className="px-4 py-2 w-full flex flex-wrap justify-start"
      >
        <Button
          size="default"
          variant="ghost"
          className="w-full flex-wrap justify-start py-1 gap-x-2 px-2 text-base rounded-none bg-transparent"
        >
          <ChevronRight
            className={clsx('size-5', {
              'transform rotate-90': open,
            })}
          />
          <div className="text-wrap overflow-hidden break-all">
            {short_name}
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 bg-muted py-2 overflow-hidden w-full">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
