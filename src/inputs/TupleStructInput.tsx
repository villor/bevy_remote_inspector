import { TTupleStruct, useTypeRegistry } from '@/type-registry/useTypeRegistry';
import { ReactNode } from 'react';
import { DynamicInput } from './DynamicInput';
import clsx from 'clsx';
import { InputLabel } from './InputLabel';

export type TupleStructInputProps = {
  typeInfo: TTupleStruct;
  path: string;
};
export function TupleStructInput({ typeInfo, path }: TupleStructInputProps) {
  let children: ReactNode = null;
  const registry = useTypeRegistry();

  if (typeInfo.fields.length === 1) {
    const typeName = typeInfo.fields[0];

    if (!typeName) {
      return <div>Unknown type {typeInfo.fields[0]}</div>;
    }
    const shortName = registry.get(typeName)?.short_name;
    children = (
      <div className={clsx('grid gap-x-4', 'grid-cols-[8rem_1fr]')}>
        <InputLabel>{shortName}</InputLabel>
        <DynamicInput typeName={typeName} path={path} />
      </div>
    );
  } else {
    children = typeInfo.fields.map((field, i) => {
      return <DynamicInput path={`${path}.${i}`} typeName={field} key={i} />;
    });
  }

  return <div>{children}</div>;
}
