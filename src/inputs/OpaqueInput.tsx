import {
  TOpaque,
  TStruct,
  useTypeRegistry,
} from '@/type-registry/useTypeRegistry';
import { deepStringify } from '@/utils';
import { DynamicInput, RenderStack } from './DynamicInput';
import { Input } from '@/shared/ui/input';
import clsx from 'clsx';
import { Checkbox } from '@/shared/ui/checkbox';
import { isNumberType } from '@/type-registry/types';
import { FormControl, FormField, FormItem, FormLabel } from '@/shared/ui/form';
import { ControllerRenderProps, useFormContext } from 'react-hook-form';
import { forwardRef } from 'react';

type OpaqueInputProps = {
  typeInfo: TOpaque;
  value: any;
  className?: string;
  path: string;
  renderStack: RenderStack[];
  defaultValue?: any;
};

export function OpaqueInput({
  typeInfo,
  className,
  value,
  path,
  renderStack,
  defaultValue,
}: OpaqueInputProps) {
  const { control } = useFormContext();
  const resolvedDefaultValue = defaultValue ?? typeInfo.default;
  return (
    <>
      <div
        className={clsx(className, 'w-full')}
        data-final-name={path}
        data-render-stack-simple={renderStack.map((r) => r.from).join('>')}
        data-render-stack={deepStringify(renderStack)}
        data-default-value={JSON.stringify(resolvedDefaultValue ?? 'null')}
      >
        <FormField
          control={control}
          name={path}
          shouldUnregister
          defaultValue={resolvedDefaultValue}
          render={({ field }) => (
            <FormItem>
              {/* <FormLabel>{path}</FormLabel> */}
              <FormControl>
                <OpaqueInputInner
                  typeInfo={typeInfo}
                  {...field}
                ></OpaqueInputInner>
              </FormControl>
            </FormItem>
          )}
        ></FormField>
      </div>
    </>
  );
}

const OpaqueInputInner = forwardRef<
  any,
  { typeInfo: TOpaque } & ControllerRenderProps<any>
>(({ typeInfo, ...props }, ref) => {
  console.log(props);
  if (typeInfo.name === 'bool') {
    return <Checkbox {...props} ref={ref}></Checkbox>;
  } else {
    const type = isNumberType(typeInfo.name) ? 'number' : 'text';
    return <Input {...props} className="bg-background" type={type} ref={ref} />;
  }
});

OpaqueInputInner.displayName = 'OpaqueInputInner';
