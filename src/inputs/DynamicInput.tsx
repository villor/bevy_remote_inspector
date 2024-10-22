import { TypeName, useTypeRegistry } from '@/type-registry/useTypeRegistry';
import { StructInput } from './StructInput';
import { OpaqueInput } from './OpaqueInput';
import { EnumInput } from './EnumInput';
import { TupleStructInput } from './TupleStructInput';
import { ErrorBoundary } from 'react-error-boundary';
import { useState } from 'react';

export type DynamicInputProps = {
  typeName: TypeName;
  path: string; // should be empty on first call
  renderStack?: RenderStack[];
  defaultValue?: any;
};

export type RenderStack = {
  from: string;
  path: string;
  ctx?: Record<string, any>;
};

export function DynamicInput(props: DynamicInputProps) {
  const [renderErrorMessage, setRenderErrorMessage] = useState<null | string>();

  return (
    <ErrorBoundary
      onError={(error) => {
        setRenderErrorMessage(error.message);
      }}
      onReset={() => setRenderErrorMessage(null)}
      fallback={
        <span className="text-red-500">{`Error while rendering ${props.typeName}. Error: ${renderErrorMessage}`}</span>
      }
    >
      <DynamicInputInner {...props} />
    </ErrorBoundary>
  );
}

function DynamicInputInner({
  typeName,
  renderStack = [],
  path,
}: DynamicInputProps) {
  console.log(`rerender ${path}`);

  const registry = useTypeRegistry();
  const typeInfo = registry.get(typeName);

  if (!typeInfo) {
    return null;
  }

  if (typeInfo.kind === 'struct') {
    return (
      <StructInput
        typeInfo={typeInfo}
        path={path}
        renderStack={[
          ...renderStack,
          {
            from: 'dynamic',
            // value: props.value,
            path: path,
          },
        ]}
      />
    );
  }

  if (typeInfo.kind === 'opaque') {
    return (
      <OpaqueInput
        typeInfo={typeInfo}
        renderStack={renderStack}
        path={path}
        typeName={typeName}
      />
    );
  }

  if (typeInfo.kind === 'enum') {
    return (
      <EnumInput
        typeInfo={typeInfo}
        typeName={typeName}
        path={path}
        renderStack={[
          ...renderStack,
          {
            from: 'dynamic',
            path: path,
          },
        ]}
      />
    );
  }

  if (typeInfo.kind === 'tuple_struct') {
    return (
      <TupleStructInput
        typeInfo={typeInfo}
        renderStack={[
          ...renderStack,
          {
            from: 'dynamic',
            path: path,
          },
        ]}
        path={path}
      />
    );
  }

  return (
    <>
      <div className="col-span-2">Unknown type {typeInfo.kind}</div>
    </>
  );
}
