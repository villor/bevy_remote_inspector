import { useStore } from '@/store';
import {
  TValue,
  TypeName,
  useTypeRegistry,
} from '@/type-registry/useTypeRegistry';
import { useEntityComponentIds } from './useEntity';
import {
  RefObject,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import { IconButton } from '@/shared/ui/icon-button';
import { ChevronDown, Plus } from 'lucide-react';
import { FieldGroup, Label } from '@/shared/ui/field';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Button } from '@/shared/ui/button';
import {
  Combobox,
  ComboboxInput,
  ComboboxPopover,
  ComboboxListBox,
  ComboboxItem,
} from '@/shared/ui/combobox';
import { ComponentId, ComponentName } from '@/component/useComponents';
import { Key } from 'react-aria-components';
import { resolveTypeDefaultValue } from '@/type-registry/types';
import { DynamicForm } from '@/inputs/DynamicForm';
import { EntityName } from './EntityName';
import { useAddComponent } from './useAddComponent';
import { toast } from '@/shared/hooks/use-toast';

export function AddComponentDialog() {
  const registry = useTypeRegistry();
  const stateComponents = useStore((state) => state.components);
  const inspectingEntity = useStore((state) => state.inspectingEntity)!;
  const existedComponents = useEntityComponentIds(inspectingEntity);
  const components = useMemo(() => {
    return Array.from(stateComponents.entries())
      .filter(
        ([id, { reflected }]) =>
          reflected &&
          (existedComponents === undefined || !existedComponents.includes(id))
      )
      .map(([id, { name }]) => {
        const typeInfo = registry.get(name);
        return {
          id,
          name: typeInfo?.short_name || name,
        };
      });
  }, [stateComponents, registry, existedComponents]);
  return (
    <>
      <DialogTrigger>
        <IconButton tooltip="Add new component">
          <Plus className="size-5"></Plus>
        </IconButton>
        <DialogOverlay>
          <AddComponentDialogContent
            components={components}
          ></AddComponentDialogContent>
        </DialogOverlay>
      </DialogTrigger>
    </>
  );
}

function AddComponentDialogContent({
  components,
}: {
  components: { name: string; id: number }[];
}) {
  const [selectedComponent, setSelectedComponent] = useState<{
    id: ComponentId;
    name: ComponentName;
  } | null>(null);

  const allComponents = useStore((state) => state.components);

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
        name: info.name,
      });

      const value = resolveTypeDefaultValue(info.name, registry);
      formRef.current?.setValue(value!);
    },
    [formRef]
  );

  const inspectingEntity = useStore((state) => state.inspectingEntity)!;

  const addComponent = useAddComponent(inspectingEntity);
  const getComponetName = useStore((state) => state.getComponentName);
  const handleAddComponent = useCallback(
    (value: TValue) => {
      if (selectedComponent === null) {
        return;
      }
      addComponent({
        component: selectedComponent.id,
        value,
        onSuccess: () => {
          const { name, short_name } = getComponetName(selectedComponent.id);

          toast({
            description: `Added component ${short_name || name}`,
          });
          setSelectedComponent(null);
        },
      });
    },
    [selectedComponent]
  );
  return (
    <DialogContent className="flex flex-col justify-between">
      <DialogHeader>
        <DialogTitle className="inline-flex items-center gap-x-1">
          {`Insert new component to `}
          <EntityName id={inspectingEntity}></EntityName>
        </DialogTitle>
      </DialogHeader>
      <Combobox
        selectedKey={selectedComponent?.id}
        onSelectionChange={handleSelect}
      >
        <Label>Select Component</Label>
        <FieldGroup className="p-0 mt-2">
          <ComboboxInput placeholder="Search" autoFocus />
          <Button variant="ghost" size="icon" className="mr-1 size-6 p-1">
            <ChevronDown aria-hidden="true" className="size-4 opacity-50" />
          </Button>
        </FieldGroup>
        <ComboboxPopover
          className="w-[calc(var(--trigger-width)+28px)]"
          placement="bottom"
        >
          <ScrollArea style={{ height: '300px' }}>
            <ComboboxListBox items={components}>{renderItem}</ComboboxListBox>
          </ScrollArea>
        </ComboboxPopover>
      </Combobox>
      {selectedComponent !== null && (
        <ComponentForm
          formRef={formRef}
          typeName={selectedComponent.name}
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
    [setValue]
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

function renderItem(item: { name: string; id: number }) {
  return (
    <ComboboxItem
      id={item.id}
      textValue={item.name}
      className="break-all hyphens-auto w-full"
    >
      {item.name}
    </ComboboxItem>
  );
}
