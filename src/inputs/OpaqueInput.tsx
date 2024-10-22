import { TOpaque } from '@/type-registry/useTypeRegistry';
import { deepStringify } from '@/utils';
import { RenderStack } from './DynamicInput';
import { Input } from '@/shared/ui/input';
import clsx from 'clsx';
import { Checkbox } from '@/shared/ui/checkbox';
import { isNumberType, isUnsignedInteger } from '@/type-registry/types';
import { forwardRef } from 'react';
import { useDynamicForm } from './DynamicForm';

type OpaqueInputProps = {
  typeInfo: TOpaque;
  className?: string;
  path: string;
  renderStack: RenderStack[];
  typeName: string;
};

export function OpaqueInput({
  typeInfo,
  className,
  path,
  renderStack,
  typeName,
}: OpaqueInputProps) {
  return (
    <>
      <div
        className={clsx(className, 'w-full')}
        data-final-name={path}
        data-render-stack-simple={renderStack.map((r) => r.from).join('>')}
        data-render-stack={deepStringify(renderStack)}
      >
        {/* <span>{path}</span> */}
        <OpaqueInputInner
          typeInfo={typeInfo}
          path={path}
          renderStack={renderStack}
          typeName={typeName}
        ></OpaqueInputInner>
      </div>
    </>
  );
}

const OpaqueInputInner = forwardRef<
  any,
  {
    typeInfo: TOpaque;
    path: string;
    renderStack?: RenderStack[];
    typeName: string;
  }
>(({ typeInfo, path, renderStack, typeName }, ref) => {
  const { getValue, setValue, readOnly } = useDynamicForm();
  const value = getValue(path);

  if (value === undefined) {
    throw new Error(
      `Value is undefined for ${path} Render Stack: ${JSON.stringify(
        renderStack
      )}`
    );
  }

  if (typeInfo.short_name === 'bool') {
    const onChange = (e: React.SyntheticEvent) => {
      setValue(path, (e.target as HTMLInputElement).checked);
    };

    return (
      <Checkbox
        checked={value as boolean}
        ref={ref}
        onChange={onChange}
      ></Checkbox>
    );
  } else {
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
        readOnly={readOnly}
        min={isUnsignedInteger(typeName) ? 0 : undefined}
        type={type}
        data-type={typeInfo.short_name ?? JSON.stringify(typeInfo)}
        ref={ref}
      />
    );
  }
});

OpaqueInputInner.displayName = 'OpaqueInputInner';
