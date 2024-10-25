import { ComponentId, useComponentInfo } from '@/component/useComponents';
import {
  EntityId,
  useEntityComponentIds,
  useEntityComponentValue,
} from '@/entity/useEntity';
import { DynamicForm } from '@/inputs/DynamicForm';
import { Button, IconButton } from '@/shared/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { useStore } from '@/store';
import clsx from 'clsx';
import { ChevronRight, Copy, Eye, EyeOff, Plus } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { useUpdateComponent } from './useUpdateComponent';
import { memo } from 'react';
import { useTypeRegistry } from '@/type-registry/useTypeRegistry';
import { toast } from '@/hooks/use-toast';
import { bevyTypes } from '@/type-registry/types';
import { useToggleComponent } from './useToggleComponent';

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

  if (!componentIds) {
    return `No components`;
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden items-center bg-background">
      <ScrollArea style={{ height: 'auto', width: '100%' }}>
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

const DEFAULT_HIDDEN_COMPONENTS = [bevyTypes.TEXT_LAYOUT_INFO];
const READ_ONLY_COMPONENTS = [
  bevyTypes.TEXT_LAYOUT_INFO,
  bevyTypes.COMPUTED_NODE,
  bevyTypes.GLOBAL_TRANSFORM,
];

function InspectorComponent({
  componentId,
  entityId,
}: {
  componentId: ComponentId;
  entityId: EntityId;
}) {
  const { value, disabled } = useEntityComponentValue(entityId, componentId);
  const { name, short_name } = useStore((state) => state.getComponentName)(
    componentId
  );
  const [open, setOpen] = useState(
    !DEFAULT_HIDDEN_COMPONENTS.includes(name || '')
  );
  const info = useComponentInfo(componentId)!;
  const updateEntityComponent = useUpdateComponent(entityId, componentId);

  const registry = useTypeRegistry();

  let children: ReactNode = null;
  if (value === undefined) {
    const typeInfo = registry.get(info.name);
    const message =
      typeInfo === undefined
        ? 'is not registered in type registry'
        : 'is not serializable or zero sized type';
    children = (
      <div>
        Component {name} {message}
      </div>
    );
  } else {
    children = (
      <DynamicForm
        typeName={info.name}
        value={value}
        readOnly={READ_ONLY_COMPONENTS.includes(name || '')}
        onChange={updateEntityComponent}
      ></DynamicForm>
    );
  }

  const toggleComponent = useToggleComponent(entityId, componentId);

  return (
    <div className="bg-muted rounded p-2 mt-4 mx-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center">
          <CollapsibleTrigger
            asChild
            className="px-4 py-2 w-full flex flex-wrap justify-start"
          >
            <div className="flex items-center">
              <ChevronRight
                className={clsx('size-5', {
                  'transform rotate-90': open,
                })}
              />
              <div className="text-wrap overflow-hidden break-all flex items-center ml-2">
                {short_name}
              </div>
            </div>
          </CollapsibleTrigger>
          {/* <IconButton
          icon={<Copy className="size-4" />}
          className="px-2"
          onClick={() => {
            navigator.clipboard.writeText(name || '');
            toast({
              description: `Copied component name to clipboard`,
              });
              }}
              ></IconButton> */}
          <IconButton
            tooltip={{
              content: {
                side: 'top',
                children: disabled ? 'Enable component' : 'Disable component',
              },
            }}
            icon={
              disabled ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )
            }
            className="px-2"
            onClick={toggleComponent}
          ></IconButton>
        </div>
        <CollapsibleContent className="px-4 overflow-hidden w-full">
          {children}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
