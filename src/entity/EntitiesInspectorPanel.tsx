import { useComponentName } from '@/component/useComponentName';
import { ComponentId, ComponentValue } from '@/component/useComponents';
import { EntityId, useEntity } from '@/entity/useEntity';
import { Button } from '@/shared/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { useStore } from '@/store';
import { deepStringify } from '@/utils';
import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';

export function EntitiesInspectorPanel() {
  const inspectingEntity = useStore((state) => state.inspectingEntity);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="px-4 py-2 text-lg font-bold">Inspector</div>
      {inspectingEntity ? (
        <InspectorComponentList entity={inspectingEntity} />
      ) : (
        <div className="px-4 py-2">Select an entity to inspect</div>
      )}
    </div>
  );
}

function InspectorComponentList({ entity }: { entity: EntityId }) {
  const components = useEntity(entity) || new Map();

  if (!components) {
    return `No components`;
  }

  return (
    <div className="h-full w-full flex overflow-hidden">
      <ScrollArea style={{ height: '100%', width: '100%' }} className="gap-y-4">
        {Array.from(components.entries()).map(([id, value]) => (
          <InspectorComponent key={id} id={id} value={value} />
        ))}
      </ScrollArea>
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
  const name = useComponentName(id);
  const [open, setOpen] = useState(true);
  const info = use;
  console.log('value', value);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        asChild
        className="px-4 py-2 w-full flex justify-start"
      >
        <Button
          size="default"
          variant="ghost"
          className="w-full justify-start py-1 gap-x-2 px-2 text-base rounded-none bg-transparent"
        >
          <ChevronRight
            className={clsx('size-5', {
              'transform rotate-90': open,
            })}
          />
          <div>{name}</div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 bg-muted">
        <pre>{deepStringify(value, 2)}</pre>
      </CollapsibleContent>
    </Collapsible>
  );
}
