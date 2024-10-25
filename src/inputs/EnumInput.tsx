import {
  TEnum,
  TEnumVariant,
  TValueObject,
  TypeName,
  useTypeRegistry,
} from '@/type-registry/useTypeRegistry';
import { useCallback, useState } from 'react';
import { TupleStructInput } from './TupleStructInput';
import { StructFieldInput, StructInputLayout } from './StructInput';
import clsx from 'clsx';
import { useDynamicForm } from './DynamicForm';
import {
  isOptionType,
  resolveEnumVariantDefaultValue,
} from '@/type-registry/types';

export type EnumInputProps = {
  typeInfo: TEnum;
  typeName: TypeName;
  path: string;
};
import { memo } from 'react';
import { NativeSelect } from '../shared/ui/native-select';

export const EnumInput = memo(function EnumInput({
  typeInfo,
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
    <div className="w-full">
      {/* Need to use native select for performance reason */}
      <NativeSelect
        className={clsx({
          'mb-2': selectedVariant.kind !== 'unit',
        })}
        value={selectedVariantName}
        onChange={(e) => handleVariantChange(e.target.value)}
      >
        {typeInfo.variants.map((variant) => (
          <option key={variant.name} value={variant.name}>
            {variant.name}
          </option>
        ))}
      </NativeSelect>
      <EnumSubInput
        path={path}
        selectedVariant={selectedVariant}
        isOption={isOption}
      />
    </div>
  );
});

function EnumSubInput({
  path,
  selectedVariant,
  isOption,
}: {
  path: string;
  selectedVariant: TEnumVariant;
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
        path={newParentPath}
      />
    );
  }

  return <div>Unknown enum kind</div>;
}
