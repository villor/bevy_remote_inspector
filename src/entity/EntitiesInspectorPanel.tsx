import { type ComponentId, useComponentInfo, useComponents } from '@/component/useComponents';
import { type EntityId, useEntityComponentIds, useEntityComponentValue } from '@/entity/useEntity';
import { DynamicForm } from '@/inputs/DynamicForm';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { useStore } from '@/store';
import { ChevronRight, Copy, Ellipsis, Eye, EyeOff, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
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
      <div className="flex items-center justify-between px-4 py-2 font-bold text-lg">
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

  return (
    <div className="flex h-full w-full flex-col items-center overflow-hidden bg-background">
      {componentIds.length === 0 ? (
        <div className="flex w-full px-2">No components</div>
      ) : (
        <ScrollArea style={{ height: 'auto', width: '100%' }}>
          <div className="flex flex-col gap-y-4 px-2">
            {componentIds.map((id) => (
              <InspectorComponent entityId={entity} key={id} componentId={id} />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

const READ_ONLY_COMPONENTS = [
  bevyTypes.TEXT_LAYOUT_INFO,
  bevyTypes.COMPUTED_NODE,
  bevyTypes.GLOBAL_TRANSFORM,
  bevyTypes.PARENT,
  bevyTypes.CHILDREN,
  bevyTypes.VIEW_VISIBILITY,
];

function InspectorComponent({
  componentId,
  entityId,
}: {
  componentId: ComponentId;
  entityId: EntityId;
}) {
  const { value, disabled } = useEntityComponentValue(entityId, componentId);
  const { getComponentName } = useComponents();
  const { name, short_name } = getComponentName(componentId);

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
      <div className="hyphens-auto text-wrap break-all">
        Component <ComponentBadge>{name}</ComponentBadge> {message}
      </div>
    );
  } else {
    children = (
      <DynamicForm
        typeName={info.name}
        value={value}
        readOnly={READ_ONLY_COMPONENTS.includes(info.name || '')}
        onChange={updateEntityComponent}
      ></DynamicForm>
    );
  }

  const toggleComponent = useToggleComponent(entityId, componentId);
  const removeComponent = useRemoveComponent(entityId, componentId);
  const isOpen = useStore(
    (state) => state.entityComponentCollapseState.get(entityId)?.get(componentId) ?? false,
  );
  const setEntityComponentCollapseState = useStore(
    (state) => state.setEntityComponentCollapseState,
  );

  const handleOpenChange = (collapsed: boolean) => {
    setEntityComponentCollapseState(entityId, componentId, collapsed);
  };

  return (
    <div className="rounded bg-muted p-3">
      <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
        <div className="flex items-center">
          <CollapsibleTrigger asChild>
            <IconButton className="group transform hover:bg-primary-foreground/75 data-[state=open]:rotate-90">
              <ChevronRight className="size-4" />
            </IconButton>
          </CollapsibleTrigger>
          <div className="flex flex-grow items-center overflow-hidden text-wrap break-all font-medium">
            {short_name}
          </div>
          <IconButton
            onPress={toggleComponent}
            className="hover:bg-primary-foreground/75"
            tooltip={disabled ? 'Enable component' : 'Disable component'}
          >
            {disabled ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </IconButton>
          <MenuTrigger>
            <IconButton className="hover:bg-primary-foreground/75">
              <Ellipsis className="size-4" />
            </IconButton>
            <MenuPopover placement="bottom left" crossOffset={-60}>
              <Menu>
                {import.meta.env.DEV && (
                  <MenuItem
                    icon={Copy}
                    onAction={() => {
                      navigator.clipboard.writeText(name || '');
                      toast({
                        description: 'Copied component name to clipboard',
                      });
                    }}
                  >
                    Copy name
                  </MenuItem>
                )}
                <MenuItem onAction={removeComponent} variant="danger" icon={Trash2}>
                  Remove
                </MenuItem>
              </Menu>
            </MenuPopover>
          </MenuTrigger>
        </div>
        <CollapsibleContent className="w-full overflow-hidden">{children}</CollapsibleContent>
      </Collapsible>
    </div>
  );
}
