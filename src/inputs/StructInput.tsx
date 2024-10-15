import {
  TStruct,
  TypeName,
  useTypeRegistry,
} from '@/type-registry/useTypeRegistry';
import { deepStringify, snakeToWords } from '@/utils';
import { DynamicInput, RenderStack } from './DynamicInput';
import { Fragment, HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import { isPlainObject } from 'es-toolkit';
import { TupleStructInput } from './TupleStructInput';
type StructInputProps = {
  typeInfo: TStruct;
  value: any;
  parentPath: string;
  renderStack: RenderStack[];
};

export function StructInput({
  typeInfo,
  value,
  parentPath,
  renderStack,
}: StructInputProps) {
  if (Array.isArray(value)) {
    return (
      <StructInputInline
        parentPath={parentPath}
        renderStack={renderStack}
        typeInfo={typeInfo}
        value={value}
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

        const fieldValue = value ? value[fieldPath] : null;

        const newParentPath = parentPath
          ? `${parentPath}.${fieldPath}`
          : fieldPath;

        return (
          <Fragment key={i}>
            <StructFieldInput
              typeName={f.type}
              value={fieldValue}
              fieldName={f.name}
              parentPath={newParentPath}
              renderStack={[
                ...renderStack,
                {
                  from: 'struct',
                  parentPath: newParentPath,
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
  value: any;
  fieldName: string;
  renderStack: RenderStack[];
  parentPath: string;
  defaultValue: any;
};

export function StructFieldInput({
  typeName,
  value,
  fieldName,
  renderStack,
  parentPath,
  defaultValue,
}: StructFieldInputProps) {
  const registry = useTypeRegistry();
  const info = registry.get(typeName);
  if (!info) {
    return <div>Unknown type {typeName}</div>;
  }

  let children: ReactNode = null;

  if (info.kind === 'struct') {
    const shouldUnwrap = Array.isArray(value);
    const inner = (
      <StructInput
        typeInfo={info}
        value={value}
        parentPath={parentPath}
        renderStack={[
          ...renderStack,
          {
            from: `struct-field`,
            parentPath: parentPath,
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
          value={value}
          parentPath={parentPath}
          renderStack={[
            ...renderStack,
            {
              from: 'struct-input-field-tuple-struct',
              parentPath,
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
        value={value}
        parentPath={parentPath}
        renderStack={[
          ...renderStack,
          {
            from: 'struct-input-field-dynamic',
            parentPath,
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
  value,
  typeInfo,
  parentPath,
  renderStack,
}: {
  value: any;
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
        const fieldValue = value[i];
        const newParentPath = `${parentPath}.${i}`;
        return (
          <div className="flex w-full" key={i}>
            <StructFieldInput
              typeName={f.type}
              value={fieldValue}
              fieldName={f.name}
              parentPath={newParentPath}
              renderStack={[
                ...renderStack,
                {
                  from: `struct-field-inline`,
                  parentPath,
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
