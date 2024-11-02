import { useStore } from '@/store';
import { type TValue, type TypeName, useTypeRegistry } from '@/type-registry/useTypeRegistry';
import { useEntityComponentIds } from './useEntity';
import { type RefObject, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import { IconButton } from '@/shared/ui/icon-button';
import { ChevronDown, Plus } from 'lucide-react';
import { FieldGroup, FormDescription, Label } from '@/shared/ui/field';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Button } from '@/shared/ui/button';
import {
  Combobox,
  ComboboxInput,
  ComboboxPopover,
  ComboboxListBox,
  ComboboxItem,
} from '@/shared/ui/combobox';
import { useComponents, type ComponentId, type ComponentInfo } from '@/component/useComponents';
import type { Key } from 'react-aria-components';
import { resolveTypeDefaultValue } from '@/type-registry/types';
import { DynamicForm } from '@/inputs/DynamicForm';
import { EntityName } from './EntityName';
import { useAddComponent } from './useAddComponent';
import { toast } from '@/shared/hooks/use-toast';
import { ComponentBadge } from '@/component/ComponentBadge';
import { Badge } from '@/shared/ui/badge';

const IGNORED_COMPONENT_PREFIXES = [
  'bevy_ecs::system::system_registry::RegisteredSystem<',
  'bevy_ecs::world::component_constants::On',
];

export function AddComponentDialog() {
  const registry = useTypeRegistry();
  const { components } = useComponents();
  const inspectingEntity = useStore((state) => state.inspectingEntity)!;
  const existedComponents = useEntityComponentIds(inspectingEntity);
  const filteredComponents = useMemo(() => {
    return components
      .filter(
        ({ id, name }) =>
          !existedComponents.includes(id) &&
          !IGNORED_COMPONENT_PREFIXES.some((prefix) => name.startsWith(prefix)),
      )
      .map(({ id, name, reflected }) => {
        const typeInfo = registry.get(name);
        return {
          id,
          name: typeInfo?.short_name || name,
          reflected,
        };
      });
  }, [components, registry, existedComponents]);
  return (
    <>
      <DialogTrigger>
        <IconButton tooltip="Add new component">
          <Plus className="size-5"></Plus>
        </IconButton>
        <DialogOverlay>
          <AddComponentDialogContent
            components={filteredComponents}
            existedComponents={existedComponents}
          ></AddComponentDialogContent>
        </DialogOverlay>
      </DialogTrigger>
    </>
  );
}

function AddComponentDialogContent({
  components,
  existedComponents,
}: {
  components: { name: string; id: number; reflected: boolean }[];
  existedComponents: ComponentId[];
}) {
  const [selectedComponent, setSelectedComponent] = useState<{
    id: ComponentId;
    info: ComponentInfo;
  } | null>(null);

  const { componentsById: allComponents } = useComponents();

  const formRef = useRef<FormRef>(null);

  const registry = useTypeRegistry();
  const handleSelect = useCallback(
    (componentId: Key | null) => {
      if (componentId === null) {
        return;
      }

      const info = allComponents.get(componentId as number)!;

      setSelectedComponent({
        id: componentId as ComponentId,
        info,
      });

      const value = resolveTypeDefaultValue(info.name, registry);
      formRef.current?.setValue(value!);
    },
    [formRef],
  );

  const inspectingEntity = useStore((state) => state.inspectingEntity)!;

  const addComponent = useAddComponent(inspectingEntity);
  const { componentsById } = useComponents();
  const comboboxRef = useRef<HTMLInputElement>(null);
  const handleAddComponent = useCallback(
    (value: TValue) => {
      if (selectedComponent === null) {
        return;
      }
      addComponent({
        component: selectedComponent.id,
        value,
        onSuccess: () => {
          const { name, short_name } = componentsById.get(selectedComponent.id) ?? {};

          toast({
            description: `Added component ${short_name || name}`,
          });
          setSelectedComponent(null);
          if (comboboxRef.current) {
            comboboxRef.current.value = '';
          }
        },
      });
    },
    [selectedComponent],
  );
  return (
    <DialogContent className="flex max-w-xl flex-col justify-between">
      <DialogHeader>
        <DialogTitle className="inline-flex items-center gap-x-1">
          {'Insert new component to '}
          <EntityName id={inspectingEntity}></EntityName>
        </DialogTitle>
      </DialogHeader>
      <Combobox
        selectedKey={selectedComponent?.id}
        onSelectionChange={handleSelect}
        ref={comboboxRef}
      >
        <Label>Select Component</Label>
        <FieldGroup className="mt-2 p-0">
          <ComboboxInput placeholder="Search" autoFocus />
          <Button variant="ghost" size="icon" className="mr-1 size-6 p-1">
            <ChevronDown aria-hidden="true" className="size-4 opacity-50" />
          </Button>
        </FieldGroup>
        {selectedComponent !== null && (
          <RequiredComponentsMessage
            existedComponents={existedComponents}
            selectedComponentInfo={selectedComponent.info}
          />
        )}

        <ComboboxPopover className="w-[calc(var(--trigger-width)+28px)]" placement="bottom">
          <ScrollArea style={{ height: '300px' }}>
            <ComboboxListBox items={components}>{renderItem}</ComboboxListBox>
          </ScrollArea>
        </ComboboxPopover>
      </Combobox>
      {selectedComponent !== null && (
        <ComponentForm
          formRef={formRef}
          typeName={selectedComponent.info.name}
          onSubmit={handleAddComponent}
        ></ComponentForm>
      )}
    </DialogContent>
  );
}

type FormRef = {
  setValue: (value: TValue) => void;
};

function ComponentForm({
  typeName,
  onSubmit,
  formRef,
}: {
  onSubmit: (value: TValue) => void;
  typeName: TypeName;
  formRef: RefObject<FormRef>;
}) {
  const registry = useTypeRegistry();

  const [value, setValue] = useState<TValue | undefined>(() => {
    return resolveTypeDefaultValue(typeName, registry);
  });

  useImperativeHandle(
    formRef,
    () => {
      return {
        setValue: (v: TValue) => {
          setValue(v);
        },
      };
    },
    [setValue],
  );

  const handleAdd = () => {
    onSubmit(value!);
  };

  return (
    <>
      <ScrollArea style={{ height: '100%', maxHeight: '20rem' }}>
        <div className="mr-2">
          <DynamicForm
            key={typeName}
            value={value}
            typeName={typeName}
            allowUndefined
            onChange={setValue}
          ></DynamicForm>
        </div>
      </ScrollArea>
      <Button type="button" onPress={handleAdd}>
        Add
      </Button>
    </>
  );
}

function renderItem(item: { name: string; id: number; reflected: boolean }) {
  return (
    <ComboboxItem
      id={item.id}
      textValue={item.name}
      isDisabled={!item.reflected}
      className="inline-flex w-full gap-x-1 hyphens-auto break-all"
    >
      {item.name}
      {!item.reflected && <Badge className="px-1">Not reflected</Badge>}
    </ComboboxItem>
  );
}

function RequiredComponentsMessage({
  existedComponents,
  selectedComponentInfo,
}: {
  selectedComponentInfo: ComponentInfo;
  existedComponents: ComponentId[];
}) {
  const displayComponents = selectedComponentInfo.required_components.filter(
    (id) => !existedComponents.includes(id),
  );
  const { componentsById } = useComponents();
  if (displayComponents.length === 0) {
    return null;
  }

  return (
    <FormDescription className="mt-2 flex flex-wrap gap-1">
      <span>Insert this component will also insert</span>
      {displayComponents.map((id) => {
        const { name, short_name } = componentsById.get(id) ?? {};
        return <ComponentBadge key={id}>{short_name || name}</ComponentBadge>;
      })}
    </FormDescription>
  );
}
