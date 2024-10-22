import {
  TStruct,
  TValueArray,
  TValueObject,
  TypeName,
  useTypeRegistry,
} from '@/type-registry/useTypeRegistry';
import { snakeToWords } from '@/utils';
import { DynamicInput, RenderStack } from './DynamicInput';
import { Fragment, HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import { TupleStructInput } from './TupleStructInput';
import { useDynamicForm } from './DynamicForm';
type StructInputProps = {
  typeInfo: TStruct;
  path: string;
  renderStack: RenderStack[];
};

export function StructInput({ typeInfo, path, renderStack }: StructInputProps) {
  const { getValue } = useDynamicForm();
  const value = getValue<TValueArray | TValueObject>(path);
  if (Array.isArray(value)) {
    // TODO verify length
    return (
      <StructInputInline
        parentPath={path}
        renderStack={renderStack}
        typeInfo={typeInfo}
      ></StructInputInline>
    );
  }

  return (
    <StructInputLayout
      data-input="struct"
      data-render-stack-simple={renderStack.map((r) => r.from).join('>')}
    >
      {typeInfo.fields.map((f, i) => {
        const fieldPath = Array.isArray(value) ? String(i) : f.name;
        const newPath = path ? `${path}.${fieldPath}` : fieldPath;

        return (
          <Fragment key={i}>
            <StructFieldInput
              typeName={f.type}
              fieldName={f.name}
              path={newPath}
              renderStack={[
                ...renderStack,
                {
                  from: 'struct',
                  path: newPath,
                },
              ]}
            />
          </Fragment>
        );
      })}
    </StructInputLayout>
  );
}

type StructFieldInputProps = {
  typeName: TypeName;
  fieldName: string;
  renderStack: RenderStack[];
  path: string;
};

export function StructFieldInput({
  typeName,
  fieldName,
  renderStack,
  path,
}: StructFieldInputProps) {
  const registry = useTypeRegistry();
  const info = registry.get(typeName);
  const { getValue } = useDynamicForm();
  if (!info) {
    return <div>Unknown type {typeName}</div>;
  }

  let children: ReactNode = null;

  if (info.kind === 'struct') {
    const value = getValue(path);
    const shouldUnwrap = Array.isArray(value);
    const inner = (
      <StructInput
        typeInfo={info}
        path={path}
        renderStack={[
          ...renderStack,
          {
            from: `struct-field`,
            path: path,
          },
        ]}
      />
    );
    children = shouldUnwrap ? (
      inner
    ) : (
      <div className="col-span-2 pl-6">{inner}</div>
    );
  } else if (info.kind === 'tuple_struct') {
    children = (
      <div className="col-span-2 pl-6">
        <TupleStructInput
          typeInfo={info}
          path={path}
          renderStack={[
            ...renderStack,
            {
              from: 'struct-input-field-tuple-struct',
              path: path,
              ctx: {
                fieldName,
              },
            },
          ]}
        />
      </div>
    );
  } else {
    children = (
      <DynamicInput
        typeName={typeName}
        path={path}
        renderStack={[
          ...renderStack,
          {
            from: 'struct-input-field-dynamic',
            path: path,
            ctx: {
              fieldName,
            },
          },
        ]}
      />
    );
  }

  return (
    <>
      <StructFieldInputLabel>{fieldName}</StructFieldInputLabel>
      {children}
    </>
  );
}

export function StructInputLayout(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="grid gap-y-2 grid-cols-[max-content,1fr]" {...props}></div>
  );
}

function StructInputInline({
  typeInfo,
  parentPath,
  renderStack,
}: {
  typeInfo: TStruct;
  parentPath: string;
  renderStack: RenderStack[];
}) {
  return (
    <div
      className={clsx('grid', {
        'grid-cols-2': typeInfo.fields.length === 2,
        'grid-cols-3': typeInfo.fields.length === 3,
        'grid-cols-4': typeInfo.fields.length === 4,
      })}
    >
      {typeInfo.fields.map((f, i) => {
        const newParentPath = `${parentPath}.${i}`;
        return (
          <div className="flex w-full" key={i}>
            <StructFieldInput
              typeName={f.type}
              fieldName={f.name}
              path={newParentPath}
              renderStack={[
                ...renderStack,
                {
                  from: `struct-field-inline`,
                  path: parentPath,
                },
              ]}
            />
          </div>
        );
      })}
    </div>
  );
}

function StructFieldInputLabel(props: { children: string }) {
  return (
    <label
      htmlFor=""
      className={clsx('flex pt-2 capitalize px-4 text-sm font-medium')}
    >
      {snakeToWords(props.children)}
    </label>
  );
}
