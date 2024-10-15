import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import {
  TEnum,
  TEnumVariant,
  useTypeRegistry,
} from '@/type-registry/useTypeRegistry';
import { DynamicInput, RenderStack } from './DynamicInput';
import { FormField } from '@/shared/ui/form';
import {
  useFormContext,
  UseFormRegister,
  UseFormRegisterReturn,
  useWatch,
} from 'react-hook-form';
import { useEffect, useState } from 'react';
import { pick } from 'es-toolkit';
import { TupleStructInput } from './TupleStructInput';
import { StructFieldInput, StructInputLayout } from './StructInput';
import clsx from 'clsx';

export type EnumInputProps = {
  typeInfo: TEnum;
  value: any;
  renderStack: RenderStack[];
  parentPath: string;
};
export function EnumInput({
  typeInfo,
  value,
  renderStack,
  parentPath,
}: EnumInputProps) {
  const { register, unregister } = useFormContext();

  const [selectedVariantName, setSelectedVariantName] = useState(
    () =>
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

  const selectedVariant = typeInfo.variants.find(
    (v) => v.name === selectedVariantName
  )!;

  const [registerFields, setRegisterFields] =
    useState<UseFormRegisterReturn | null>(null);

  useEffect(() => {
    console.log(selectedVariant);
    if (selectedVariant.kind === 'unit') {
      setRegisterFields(register(parentPath));
    } else {
      unregister(parentPath);
    }
  }, [selectedVariant, setRegisterFields, register]);

  return (
    <div
      data-type={JSON.stringify(typeInfo)}
      data-value={JSON.stringify(value)}
      className="w-full"
    >
      <Select
        value={selectedVariantName}
        onValueChange={setSelectedVariantName}
        {...(registerFields
          ? pick(registerFields, ['name', 'onBlur', 'ref'])
          : {})}
      >
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
        parentPath={parentPath}
        selectedVariant={selectedVariant}
        rennderStack={renderStack}
        value={value}
      />
    </div>
  );
}

function EnumSubInput({
  parentPath,
  selectedVariant,
  rennderStack,
  value,
}: {
  parentPath: string;
  selectedVariant: TEnumVariant;
  rennderStack: RenderStack[];
  value: any;
}) {
  const registry = useTypeRegistry();
  if (selectedVariant.kind === 'unit') {
    return null;
  }

  if (selectedVariant.kind === 'struct') {
    const newParentPath = parentPath
      ? `${parentPath}.${selectedVariant.name}`
      : selectedVariant.name;
    const enumValue = Array.from(Object.values(value))[0] as any;
    return (
      <StructInputLayout>
        {selectedVariant.fields.map((field, i) => {
          const fieldValue = enumValue[field.name];
          const fieldPath = field.name;
          const fieldParentPath = `${newParentPath}.${fieldPath}`;
          return (
            <StructFieldInput
              key={i}
              parentPath={fieldParentPath}
              value={fieldValue}
              renderStack={[
                ...rennderStack,
                {
                  from: 'enum-sub-input-struct',
                  parentPath: fieldParentPath,
                },
              ]}
              typeName={field.type}
              fieldName={field.name}
              defaultValue={null}
            ></StructFieldInput>
          );
        })}
      </StructInputLayout>
    );
  }

  if (selectedVariant.kind === 'tuple') {
    const newParentPath = parentPath
      ? `${parentPath}.${selectedVariant.name}`
      : selectedVariant.name;
    const fieldLength = selectedVariant.fields.length;
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
            parentPath: newParentPath,
          },
        ]}
        parentPath={newParentPath}
        value={fieldLength === 1 ? Object.values(value) : Object.values(value)}
      />
    );
  }

  return <div>Unknown enum kind</div>;
}
