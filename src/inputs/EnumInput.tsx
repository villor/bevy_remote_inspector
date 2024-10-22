import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import {
  TEnum,
  TEnumVariant,
  TEnumVariantStruct,
  TEnumVariantTuple,
  TType,
  TValue,
  TValueArray,
  TValueObject,
  TValuePrimitive,
  TypeName,
  TypeRegistry,
  useTypeRegistry,
} from '@/type-registry/useTypeRegistry';
import { RenderStack } from './DynamicInput';
import { useCallback, useState } from 'react';
import { TupleStructInput } from './TupleStructInput';
import { StructFieldInput, StructInputLayout } from './StructInput';
import clsx from 'clsx';
import { useDynamicForm } from './DynamicForm';
import {
  isOptionType,
  resolveEnumVariantDefaultValue,
  resolveTypeDefaultValue,
} from '@/type-registry/types';
import { TypeIcon } from 'lucide-react';

export type EnumInputProps = {
  typeInfo: TEnum;
  typeName: TypeName;
  renderStack: RenderStack[];
  path: string;
};
export function EnumInput({
  typeInfo,
  renderStack,
  path,
  typeName,
}: EnumInputProps) {
  const registry = useTypeRegistry();
  const { unregister, setValue, getValue } = useDynamicForm();
  const value = getValue<TValueObject | string>(path);
  const isOption = isOptionType(typeName);

  const [selectedVariantName, setSelectedVariantName] = useState(() => {
    if (isOption) {
      return value === null ? 'None' : 'Some';
    }

    return (
      typeInfo.variants.find((v) => {
        if (v.kind === 'unit') {
          return v.name === value;
        }

        if (v.kind === 'tuple') {
          return v.name === Object.keys(value)[0];
        }

        if (v.kind === 'struct') {
          return v.name === Object.keys(value)[0];
        }
      })?.name || typeInfo.variants[0].name
    );
  });

  const handleVariantChange = useCallback(
    (newVariantName: string) => {
      const selectedVariant = typeInfo.variants.find(
        (v) => v.name === newVariantName
      )!;

      setSelectedVariantName(newVariantName);
      unregister(path);

      if (selectedVariant.kind === 'unit') {
        setValue(`${path}`, isOption ? null : selectedVariant.name);
        return;
      }

      const value = resolveEnumVariantDefaultValue(selectedVariant, registry);
      console.log(value);
      if (value === undefined) {
        throw new Error(
          `Failed to resolve value for enum ${typeName} at path ${path}`
        );
      }
      if (isOption) {
        setValue(`${path}`, value);
      } else {
        setValue(`${path}.${selectedVariant.name}`, value);
      }
    },
    [setValue]
  );

  const selectedVariant = typeInfo.variants.find(
    (v) => v.name === selectedVariantName
  )!;

  return (
    <div
      data-type={JSON.stringify(typeInfo)}
      data-value={JSON.stringify(value)}
      className="w-full"
    >
      <Select value={selectedVariantName} onValueChange={handleVariantChange}>
        <SelectTrigger
          className={clsx('w-full bg-background', {
            'mb-2': selectedVariant.kind !== 'unit',
          })}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {typeInfo.variants.map((variant) => (
            <SelectItem key={variant.name} value={variant.name}>
              {variant.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <EnumSubInput
        path={path}
        selectedVariant={selectedVariant}
        rennderStack={renderStack}
        isOption={isOption}
      />
    </div>
  );
}

function EnumSubInput({
  path,
  selectedVariant,
  rennderStack,
  isOption,
}: {
  path: string;
  selectedVariant: TEnumVariant;
  rennderStack: RenderStack[];
  isOption: boolean;
}) {
  if (selectedVariant.kind === 'unit') {
    return null;
  }

  if (selectedVariant.kind === 'struct') {
    const newPath = path
      ? `${path}.${selectedVariant.name}`
      : selectedVariant.name;
    return (
      <StructInputLayout>
        {selectedVariant.fields.map((field, i) => {
          const path = `${newPath}.${field.name}`;
          return (
            <StructFieldInput
              key={i}
              path={path}
              renderStack={[
                ...rennderStack,
                {
                  from: 'enum-sub-input-struct',
                  path: path,
                },
              ]}
              typeName={field.type}
              fieldName={field.name}
            ></StructFieldInput>
          );
        })}
      </StructInputLayout>
    );
  }

  if (selectedVariant.kind === 'tuple') {
    const newParentPath = isOption
      ? path
      : path
      ? `${path}.${selectedVariant.name}`
      : selectedVariant.name;
    return (
      <TupleStructInput
        typeInfo={{
          kind: 'tuple_struct',
          fields: selectedVariant.fields,
          short_name: selectedVariant.name,
          default: null,
        }}
        renderStack={[
          ...rennderStack,
          {
            from: 'enum-sub-input-tuple',
            path: newParentPath,
          },
        ]}
        path={newParentPath}
      />
    );
  }

  return <div>Unknown enum kind</div>;
}
