import { type TTuple, useTypeRegistry } from '@/type-registry/useTypeRegistry';
import clsx from 'clsx';
import { Fragment } from 'react';
import { getInputComponent } from './DynamicInput';
import { InputLabel } from './InputLabel';

export type TupleInputProps = {
  path: string;
  typeInfo: TTuple;
};
import { memo } from 'react';

export const TupleInput = memo(function TupleInput({ path, typeInfo }: TupleInputProps) {
  const registry = useTypeRegistry();
  return (
    <>
      {typeInfo.fields.map((field, i) => {
        return (
          <Fragment key={i}>
            <div className={clsx('grid gap-x-4', 'grid-cols-[8rem_1fr] col-span-2')}>
              <InputLabel>{registry.get(field)?.short_name}</InputLabel>
              {getInputComponent({
                typeName: field,
                path: `${path}.${i}`,
                registry,
              })}
            </div>
          </Fragment>
        );
      })}
    </>
  );
});
