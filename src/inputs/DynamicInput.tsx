import { TypeName, useTypeRegistry } from '@/type-registry/useTypeRegistry';
import { StructInput } from './StructInput';
import { OpaqueInput } from './OpaqueInput';
import { EnumInput } from './EnumInput';
import { TupleStructInput } from './TupleStructInput';

export type DynamicInputProps = {
  typeName: TypeName;
  value: any;
  parentPath: string; // should be empty on first call
  renderStack?: RenderStack[];
  defaultValue?: any;
};

export type RenderStack = {
  from: string;
  parentPath: string;
  ctx?: Record<string, any>;
};

export function DynamicInput({
  typeName,
  renderStack = [],
  parentPath,
  defaultValue,
  ...props
}: DynamicInputProps) {
  const registry = useTypeRegistry();
  const typeInfo = registry.get(typeName);

  if (!typeInfo) {
    return null;
  }

  if (typeInfo.kind === 'struct') {
    return (
      <StructInput
        typeInfo={typeInfo}
        parentPath={parentPath}
        {...props}
        renderStack={[
          ...renderStack,
          {
            from: 'dynamic',
            // value: props.value,
            parentPath: parentPath,
          },
        ]}
      />
    );
  }

  if (typeInfo.kind === 'opaque') {
    return (
      <OpaqueInput
        typeInfo={typeInfo}
        {...props}
        renderStack={renderStack}
        path={parentPath}
        defaultValue={defaultValue}
      />
    );
  }

  if (typeInfo.kind === 'enum') {
    return (
      <EnumInput
        typeInfo={typeInfo}
        parentPath={parentPath}
        {...props}
        renderStack={[
          ...renderStack,
          {
            from: 'dynamic',
            parentPath: parentPath,
          },
        ]}
      />
    );
  }

  if (typeInfo.kind === 'tuple_struct') {
    return (
      <TupleStructInput
        typeInfo={typeInfo}
        value={props.value}
        renderStack={[
          ...renderStack,
          {
            from: 'dynamic',
            parentPath: parentPath,
          },
        ]}
        parentPath={parentPath}
      />
    );
  }

  return (
    <>
      <div className="col-span-2">Unknown type {typeInfo.kind}</div>
      <div className="col-span-2">
        Unknown value {JSON.stringify(props.value)}
      </div>
    </>
  );
}
