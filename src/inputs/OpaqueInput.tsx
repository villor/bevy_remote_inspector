import type { TOpaque } from '@/type-registry/useTypeRegistry';
import { DynamicInputContext } from './DynamicInput';
import { Input } from '@/shared/ui/input';
import clsx from 'clsx';
import { Checkbox } from '@/shared/ui/checkbox';
import { isNumberType, isUnsignedIntegerType } from '@/type-registry/types';
import { forwardRef, useContext } from 'react';
import { useDynamicForm } from './DynamicForm';

type OpaqueInputProps = {
  typeInfo: TOpaque;
  className?: string;
  path: string;
  typeName: string;
};

import { memo } from 'react';
import { useWatch } from 'react-hook-form';

export const OpaqueInput = memo(function OpaqueInput({
  typeInfo,
  className,
  path,
  typeName,
}: OpaqueInputProps) {
  return (
    <div className={clsx(className, 'flex h-9 w-full items-center')}>
      <OpaqueInputInner typeInfo={typeInfo} path={path} typeName={typeName}></OpaqueInputInner>
    </div>
  );
});

const OpaqueInputInner = memo(
  forwardRef<
    any,
    {
      typeInfo: TOpaque;
      path: string;
      typeName: string;
    }
  >(({ path, typeName }, ref) => {
    const { getValue, setValue, readOnly, allowUndefined, control } = useDynamicForm();
    useWatch({ control, name: path }); // force rerender to update newest value
    const value = getValue(path);
    const inputReadOnly = useContext(DynamicInputContext)?.readOnly;
    const isReadOnly = readOnly || inputReadOnly;
    if (value === undefined && !allowUndefined) {
      throw new Error(`Value is undefined for ${path}`);
    }

    if (typeName === 'bool') {
      const onChange = (checked: boolean) => {
        setValue(path, checked);
      };

      return (
        <Checkbox
          checked={value as boolean}
          ref={ref}
          disabled={isReadOnly}
          onCheckedChange={onChange}
        ></Checkbox>
      );
    }
    const type = isNumberType(typeName) ? 'number' : 'text';
    const onChange = (e: React.SyntheticEvent) => {
      const target = e.target as HTMLInputElement;
      if (type === 'number') {
        setValue(path, Number(target.value));
      } else {
        setValue(path, target.value);
      }
    };

    return (
      <Input
        value={value as string | number}
        onChange={onChange}
        className="bg-background"
        readOnly={isReadOnly}
        disabled={isReadOnly}
        step={typeName === 'f32' || typeName === 'f64' ? 0.1 : undefined}
        min={isUnsignedIntegerType(typeName) ? 0 : undefined}
        type={type}
        ref={ref}
      />
    );
  }),
);
