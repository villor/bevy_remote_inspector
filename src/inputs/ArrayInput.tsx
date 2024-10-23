import {
  TArray,
  TSet,
  TValue,
  TypeName,
  useTypeRegistry,
} from '@/type-registry/useTypeRegistry';
import { DynamicForm, useDynamicForm } from './DynamicForm';
import { DynamicInput, DynamicInputContext } from './DynamicInput';
import { Button } from '@/shared/ui/button';
import { resolveTypeDefaultValue } from '@/type-registry/types';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';
import clsx from 'clsx';
import { InputLabel } from './InputLabel';

export type ArrayInputProps = { typeInfo: TArray | TSet; path: string };
export function ArrayInput({ path, typeInfo }: ArrayInputProps) {
  const { getValue, setValue } = useDynamicForm();

  const value = getValue(path);
  const registry = useTypeRegistry();
  if (!Array.isArray(value)) {
    throw new Error(`Value is not an array for ${path}`);
  }

  const onAddItem = (item: TValue) => {
    const newPath = `${path}.${value.length}`;
    setValue(newPath, item);
    setIsEditting(false);
  };

  const onAddButtonClick = () => {
    const item = resolveTypeDefaultValue(typeInfo.item, registry);

    if (item === undefined || typeInfo.kind === 'set') {
      setIsEditting(true);
    } else {
      const newPath = `${path}.${value.length}`;
      setValue(newPath, item);
    }
  };

  const [isEditting, setIsEditting] = useState(false);
  const canAddItem = typeInfo.kind === 'array' && typeInfo.capacity === null;
  return (
    <div className="flex flex-col gap-4 w-full">
      <div
        className={clsx('grid items-center gap-4 w-full', {
          'grid-cols-[auto_1fr]': typeInfo.kind === 'array',
        })}
      >
        {value.map((item, i) => {
          const newPath = `${path}.${i}`;
          const key = typeInfo.kind === 'array' ? i : JSON.stringify(item);
          return (
            <>
              {typeInfo.kind === 'array' && <span>{i}</span>}
              <DynamicInputContext.Provider
                value={{ readOnly: typeInfo.kind === 'set' }}
              >
                <DynamicInput
                  key={key}
                  typeName={typeInfo.item}
                  path={newPath}
                ></DynamicInput>
              </DynamicInputContext.Provider>
            </>
          );
        })}
        {canAddItem && (
          <>
            {!isEditting && (
              <Button
                onClick={onAddButtonClick}
                type="button"
                className={clsx({
                  'col-span-2': typeInfo.kind === 'array',
                })}
              >
                Add new item
              </Button>
            )}
            {isEditting && (
              <div
                className={clsx({
                  'col-span-2': typeInfo.kind === 'array',
                })}
              >
                <InputLabel>Enter new item</InputLabel>
                <PendingArrayInput
                  itemType={typeInfo.item}
                  onAdd={onAddItem}
                ></PendingArrayInput>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PendingArrayInput({
  itemType,
  onAdd,
}: {
  itemType: TypeName;
  onAdd: (value: TValue) => void;
}) {
  const registry = useTypeRegistry();
  const [value, setValue] = useState(() =>
    resolveTypeDefaultValue(itemType, registry)
  );
  const handleOnAdd = () => {
    if (value === undefined) {
      toast({
        variant: 'destructive',
        description: `Invalid value`,
      });
      return;
    }

    onAdd(value);
  };
  return (
    <>
      <DynamicForm
        value={value}
        onChange={setValue}
        typeName={itemType}
        allowUndefined
      ></DynamicForm>
      <Button type="button" onClick={handleOnAdd} className="col-span-2 w-full">
        Add
      </Button>
    </>
  );
}
