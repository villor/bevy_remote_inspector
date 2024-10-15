import { useComponentName } from '@/component/useComponentName';
import {
  ComponentId,
  ComponentValue,
  useComponentInfo,
} from '@/component/useComponents';
import { EntityId, useEntity } from '@/entity/useEntity';
import { DynamicForm } from '@/inputs/DynamicForm';
import { DynamicInput } from '@/inputs/DynamicInput';
import { Button } from '@/shared/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { useStore } from '@/store';
import { useTypeRegistry } from '@/type-registry/useTypeRegistry';
import { deepStringify } from '@/utils';
import clsx from 'clsx';
import { ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

export function EntitiesInspectorPanel() {
  const inspectingEntity = useStore(
    useShallow((state) => state.inspectingEntity)
  );

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
}

function InspectorComponentList({ entity }: { entity: EntityId }) {
  const components = useEntity(entity);

  if (!components) {
    return `No components`;
  }

  console.log(`compoents rerender`);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden items-center">
      <ScrollArea style={{ height: 'auto', width: '100%' }} className="gap-y-4">
        {Array.from(components.entries()).map(([id, value]) => (
          <InspectorComponent key={id} id={id} value={value} />
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
  id,
  value,
}: {
  id: ComponentId;
  value: ComponentValue;
}) {
  const { name, short_name } = useComponentName(id);
  const info = useComponentInfo(id)!;
  const [open, setOpen] = useState(true);
  const onChange = (value: any) => {
    console.log(`component ${short_name} changed`, value);
  };
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
        {/* <pre>{deepStringify(value, 2)}</pre> */}
        <DynamicForm typeName={info!.name} value={value}></DynamicForm>
        {/* <DynamicInput
          typeName={info!.name}
          value={value}
          onChange={onChange}
        ></DynamicInput> */}
      </CollapsibleContent>
    </Collapsible>
  );
}
