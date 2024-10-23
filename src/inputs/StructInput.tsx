import {
  TStruct,
  TValueArray,
  TValueObject,
  TypeName,
  useTypeRegistry,
} from '@/type-registry/useTypeRegistry';
import { cn, snakeToWords } from '@/utils';
import { DynamicInput } from './DynamicInput';
import { Fragment, HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import { TupleStructInput } from './TupleStructInput';
import { useDynamicForm } from './DynamicForm';
import { InputLabel } from './InputLabel';
type StructInputProps = {
  typeInfo: TStruct;
  path: string;
};

export function StructInput({ typeInfo, path }: StructInputProps) {
  const { getValue } = useDynamicForm();
  const value = getValue<TValueArray | TValueObject>(path);
  if (Array.isArray(value) && value.length === typeInfo.fields.length) {
    return (
      <StructInputInline
        parentPath={path}
        typeInfo={typeInfo}
      ></StructInputInline>
    );
  }

  return (
    <StructInputLayout>
      {typeInfo.fields.map((f, i) => {
        const fieldPath = Array.isArray(value) ? String(i) : f.name;
        const newPath = path ? `${path}.${fieldPath}` : fieldPath;

        return (
          <Fragment key={i}>
            <StructFieldInput
              typeName={f.type}
              fieldName={f.name}
              path={newPath}
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
  path: string;
};

export function StructFieldInput({
  typeName,
  fieldName,
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
    const inner = <StructInput typeInfo={info} path={path} />;
    children = shouldUnwrap ? (
      inner
    ) : (
      <div className="col-span-2 pl-6">{inner}</div>
    );
  } else if (info.kind === 'tuple_struct') {
    children = (
      <div className="col-span-2 pl-6">
        <TupleStructInput typeInfo={info} path={path} />
      </div>
    );
  } else {
    children = <DynamicInput typeName={typeName} path={path} />;
  }

  return (
    <>
      <InputLabel>{snakeToWords(fieldName)}</InputLabel>
      {children}
    </>
  );
}

export function StructInputLayout(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn('grid gap-y-2 grid-cols-[4rem,1fr]', props.className)}
    ></div>
  );
}

function StructInputInline({
  typeInfo,
  parentPath,
}: {
  typeInfo: TStruct;
  parentPath: string;
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
            />
          </div>
        );
      })}
    </div>
  );
}
