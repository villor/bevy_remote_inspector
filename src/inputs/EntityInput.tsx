import { Button } from '@/shared/ui/button';
import {
  Combobox,
  ComboboxInput,
  ComboboxItem,
  ComboboxListBox,
  ComboboxPopover,
} from '@/shared/ui/combobox';
import { FieldGroup } from '@/shared/ui/field';
import { ChevronDown } from 'lucide-react';
import { useDynamicForm } from './DynamicForm';

export type EntityInputProps = {
  path: string;
  mode: 'single' | 'multiple';
};
import { memo, useMemo } from 'react';
import { useStore } from '@/store';
import { EntityName } from '@/entity/EntityName';
import { isHiddenEntity } from '@/entity/entityUtils';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { useWatch } from 'react-hook-form';
import { useComponents } from '@/component/useComponents';

export const EntityInput = memo(function EntityInput({ path, mode }: EntityInputProps) {
  const { setValue, control, readOnly } = useDynamicForm();
  const value = useWatch({ control, name: path });
  const allEntities = useStore((state) => state.entities);
  const { componentsById: allComponents } = useComponents();
  const entityNames = useStore((state) => state.entityNames);
  const entities = useMemo(() => {
    return Array.from(allEntities.entries())
      .filter(([_, components]) => {
        return !isHiddenEntity(Array.from(components.keys()), allComponents);
      })
      .map(([id]) => ({
        id,
        textValue: entityNames.get(id) || '',
      }));
  }, [allEntities, allComponents, entityNames]);

  return (
    <Combobox
      aria-label="Entity"
      selectedKey={value as number}
      onSelectionChange={(k) => setValue(path, k as number)}
      isReadOnly={readOnly}
      isDisabled={readOnly}
    >
      <FieldGroup className="p-0">
        <ComboboxInput className="h-9" />
        <Button variant="ghost" size="icon" className="mr-1 size-6 p-1">
          <ChevronDown aria-hidden="true" className="size-4 opacity-50" />
        </Button>
      </FieldGroup>
      <ComboboxPopover>
        <ScrollArea style={{ height: '300px', maxHeight: '300px' }}>
          <ComboboxListBox selectionMode={mode} items={entities}>
            {renderItem}
          </ComboboxListBox>
        </ScrollArea>
      </ComboboxPopover>
    </Combobox>
  );
});

function renderItem(item: { id: number; textValue: string }) {
  return (
    <ComboboxItem {...item}>
      <EntityName id={item.id}></EntityName>
    </ComboboxItem>
  );
}
