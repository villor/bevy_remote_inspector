import {
  TMap,
  TValue,
  TValueObject,
  TypeName,
  useTypeRegistry,
} from '@/type-registry/useTypeRegistry';
import { StructInputLayout } from './StructInput';
import { DynamicForm, useDynamicForm } from './DynamicForm';
import { Fragment, useState } from 'react';
import { DynamicInput, DynamicInputContext } from './DynamicInput';
import {
  isNumberType,
  isStringType,
  resolveTypeDefaultValue,
} from '@/type-registry/types';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/shared/ui/button';
export type MapInputProps = {
  typeInfo: TMap;
  path: string;
};
export function MapInput({ path, typeInfo }: MapInputProps) {
  const { getValue, setValue } = useDynamicForm();
  const value = getValue<TValueObject>(path);

  const isString = isStringType(typeInfo.key);
  const isNumber = isNumberType(typeInfo.key);
  const [isEditting, setIsEditting] = useState(false);

  const editSlot = isEditting ? (
    <PendingMapInput
      keyType={typeInfo.key}
      valueType={typeInfo.value}
      onAdd={(key, value) => {
        const newPath = `${path}.${key}`;
        if (getValue(newPath) === undefined) {
          setValue(newPath, value);
          setIsEditting(false);
        } else {
          toast({
            variant: 'destructive',
            description: `Key ${key} already exists`,
          });
        }
      }}
    />
  ) : (
    <Button
      type="button"
      onClick={() => setIsEditting(true)}
      size="sm"
      className="col-span-2 mt-2"
    >
      Add new item
    </Button>
  );

  return (
    <StructInputLayout className="gap-x-4 grid-cols-[8rem_1fr]">
      <div>Key</div>
      <div>Value</div>
      {Object.entries(value).map(([k], i) => {
        const key = isString || isNumber ? k : JSON.stringify(k);
        return (
          <Fragment key={i}>
            <span className="pt-1.5">{key}</span>
            <DynamicInputContext.Provider
              value={{ readOnly: !isString && !isNumber }}
            >
              <DynamicInput typeName={typeInfo.value} path={`${path}.${k}`} />
            </DynamicInputContext.Provider>
          </Fragment>
        );
      })}
      {(isString || isNumber) && editSlot}
    </StructInputLayout>
  );
}
function PendingMapInput({
  valueType: valueType,
  keyType,
  onAdd,
}: {
  valueType: TypeName;
  keyType: TypeName;
  onAdd: (key: string | number, value: TValue) => void;
}) {
  const registry = useTypeRegistry();
  const [key, setKey] = useState(() =>
    resolveTypeDefaultValue(keyType, registry)
  );
  const [value, setValue] = useState(() =>
    resolveTypeDefaultValue(valueType, registry)
  );
  const handleOnAdd = () => {
    if (value === undefined) {
      toast({
        variant: 'destructive',
        description: `Invalid value`,
      });
      return;
    }

    onAdd(key as string | number, value);
  };
  return (
    <>
      <div>
        <DynamicForm
          value={key}
          onChange={setKey}
          typeName={keyType}
          allowUndefined
        ></DynamicForm>
      </div>
      <div>
        <DynamicForm
          value={value}
          onChange={setValue}
          typeName={valueType}
          allowUndefined
        ></DynamicForm>
      </div>
      <Button type="button" onClick={handleOnAdd} className="col-span-2">
        Add
      </Button>
    </>
  );
}
