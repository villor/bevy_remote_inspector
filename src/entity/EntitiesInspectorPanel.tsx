import { ComponentId, useComponentInfo } from '@/component/useComponents';
import {
  EntityId,
  useEntityComponentIds,
  useEntityComponentValue,
} from '@/entity/useEntity';
import { DynamicForm } from '@/inputs/DynamicForm';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { useStore } from '@/store';
import { ChevronRight, Ellipsis, Eye, EyeOff } from 'lucide-react';
import { ReactNode } from 'react';
import { useUpdateComponent } from './useUpdateComponent';
import { memo } from 'react';
import { useTypeRegistry } from '@/type-registry/useTypeRegistry';
import { toast } from '@/shared/hooks/use-toast';
import { bevyTypes } from '@/type-registry/types';
import { useToggleComponent } from './useToggleComponent';
import { IconButton } from '@/shared/ui/icon-button';
import { Menu, MenuItem, MenuPopover, MenuTrigger } from '@/shared/ui/menu';
import { useRemoveComponent } from './useRemoveComponent';
import { AddComponentDialog } from './AddComponentDialog';
import { ComponentBadge } from '@/component/ComponentBadge';
export const EntitiesInspectorPanel = memo(function EntitiesInspectorPanel() {
  const inspectingEntity = useStore((state) => state.inspectingEntity);

  return (
    <div className="flex h-full w-full flex-col pt-4">
      <div className="px-4 text-lg font-bold py-2 flex items-center justify-between">
        Inspector
        {inspectingEntity !== null && <AddComponentDialog />}
      </div>
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
        <div className="flex flex-col gap-y-4 px-2">
          {componentIds.map((id) => (
            <InspectorComponent entityId={entity} key={id} componentId={id} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

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
      <div className="text-wrap break-all hyphens-auto">
        Component <ComponentBadge>{name}</ComponentBadge> {message}
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
  const removeComponent = useRemoveComponent(entityId, componentId);

  return (
    <div className="bg-muted rounded p-3">
      <Collapsible>
        <div className="flex items-center">
          <CollapsibleTrigger asChild>
            <IconButton className="hover:bg-primary-foreground/75 group transform data-[state=open]:rotate-90">
              <ChevronRight className="size-4" />
            </IconButton>
          </CollapsibleTrigger>
          <div className="text-wrap overflow-hidden break-all flex items-center font-medium flex-grow">
            {short_name}
          </div>
          <IconButton
            onPress={toggleComponent}
            className="hover:bg-primary-foreground/75"
            tooltip={disabled ? 'Enable component' : 'Disable component'}
          >
            {disabled ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </IconButton>
          <MenuTrigger>
            <IconButton className="hover:bg-primary-foreground/75">
              <Ellipsis className="size-4" />
            </IconButton>
            <MenuPopover placement="bottom left" crossOffset={-60}>
              <Menu>
                <MenuItem onAction={removeComponent}>Remove</MenuItem>
                <MenuItem
                  onAction={() => {
                    navigator.clipboard.writeText(name || '');
                    toast({
                      description: `Copied component name to clipboard`,
                    });
                  }}
                >
                  Copy name
                </MenuItem>
              </Menu>
            </MenuPopover>
          </MenuTrigger>
        </div>
        <CollapsibleContent className="overflow-hidden w-full">
          {children}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
