import { TTupleStruct, useTypeRegistry } from '@/type-registry/useTypeRegistry';
import { ReactNode } from 'react';
import { DynamicInput, RenderStack } from './DynamicInput';

export type TupleStructInputProps = {
  typeInfo: TTupleStruct;
  value: any;
  renderStack: RenderStack[];
  parentPath: string;
};
export function TupleStructInput({
  typeInfo,
  value,
  parentPath,
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
          value={value}
          parentPath={parentPath}
          renderStack={[
            ...renderStack,
            {
              from: 'tuple_struct',
              parentPath: parentPath,
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
          parentPath: parentPath,
          ctx: {
            ___typename: typeInfo.fields[0],
          },
        },
      ])}
      data-render-stack-simple={renderStack
        .concat([{ from: 'tuple_struct', parentPath }])
        .map((r) => r.from)
        .join('>')}
    >
      {children}
    </div>
  );
}
