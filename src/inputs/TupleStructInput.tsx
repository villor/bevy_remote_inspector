import { TTupleStruct, useTypeRegistry } from '@/type-registry/useTypeRegistry';
import { ReactNode, useEffect } from 'react';
import { DynamicInput, RenderStack } from './DynamicInput';
import { useFormContext } from 'react-hook-form';

export type TupleStructInputProps = {
  typeInfo: TTupleStruct;
  renderStack: RenderStack[];
  path: string;
};
export function TupleStructInput({
  typeInfo,
  path,
  renderStack,
}: TupleStructInputProps) {
  let children: ReactNode = <span>tuple struct with more than 1 fields</span>;
  const registry = useTypeRegistry();

  if (typeInfo.fields.length === 1) {
    const typeName = typeInfo.fields[0];

    if (!typeName) {
      return <div>Unknown type {typeInfo.fields[0]}</div>;
    }

    children = (
      <div className="grid grid-cols-[auto_1fr] gap-x-4">
        <div className="pt-1.5 capitalize">
          {registry.get(typeName)?.short_name}
        </div>
        <DynamicInput
          typeName={typeName}
          path={path}
          renderStack={[
            ...renderStack,
            {
              from: 'tuple_struct',
              path: path,
              ctx: {
                ___TupleTypename: typeName,
              },
            },
          ]}
        />
      </div>
    );
  }

  return (
    <div
      data-input="tuple-struct"
      data-type={JSON.stringify(typeInfo)}
      data-render-stack={JSON.stringify([
        ...renderStack,
        {
          from: 'tuple_struct',
          parentPath: path,
          ctx: {
            ___typename: typeInfo.fields[0],
          },
        },
      ])}
      data-render-stack-simple={renderStack
        .concat([{ from: 'tuple_struct', path: path }])
        .map((r) => r.from)
        .join('>')}
    >
      {children}
    </div>
  );
}
