import type { TEnum, TypeName, TypeRegistry } from '@/type-registry/useTypeRegistry';
import { StructInput } from './StructInput';
import { OpaqueInput } from './OpaqueInput';
import { EnumInput } from './EnumInput';
import { TupleStructInput } from './TupleStructInput';
import { createContext } from 'react';
import { ArrayInput } from './ArrayInput';
import { MapInput } from './MapInput';
import { TupleInput } from './TupleInput';
import { bevyTypes } from '@/type-registry/types';
import { ColorInput } from './ColorInput/ColorInput';
import { EntityInput } from './EntityInput';

export type DynamicInputProps = {
  typeName: TypeName;
  path: string;
  registry: TypeRegistry;
};

export const DynamicInputContext = createContext({} as { readOnly: boolean });

export function getInputComponent({ typeName, path, registry }: DynamicInputProps) {
  const typeInfo = registry.get(typeName)!;
  if (typeName === bevyTypes.COLOR) {
    return <ColorInput path={path} typeInfo={typeInfo as TEnum} />;
  }

  if (typeName === bevyTypes.ENTITY) {
    return <EntityInput path={path} mode="single" />;
  }

  if (typeInfo.kind === 'struct') {
    return <StructInput typeInfo={typeInfo} path={path} />;
  }

  if (typeInfo.kind === 'opaque') {
    return <OpaqueInput typeInfo={typeInfo} path={path} typeName={typeName} />;
  }

  if (typeInfo.kind === 'enum') {
    return <EnumInput typeInfo={typeInfo} typeName={typeName} path={path} />;
  }

  if (typeInfo.kind === 'tuple_struct') {
    return <TupleStructInput typeInfo={typeInfo} path={path} />;
  }

  if (typeInfo.kind === 'array' || typeInfo.kind === 'set') {
    return <ArrayInput path={path} typeInfo={typeInfo} />;
  }

  if (typeInfo.kind === 'map') {
    return <MapInput path={path} typeInfo={typeInfo} />;
  }

  if (typeInfo.kind === 'tuple') {
    return <TupleInput path={path} typeInfo={typeInfo} />;
  }
}
