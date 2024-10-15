import { useStore } from '@/store';

export function useTypeRegistry() {
  return useStore((state) => state.registry);
}

export type TType =
  | TStruct
  | TTupleStruct
  | TTuple
  | TArray
  | TMap
  | TSet
  | TEnum
  | TOpaque;

export type TypeName = string;

export type ShortTypeName = string;

export type TStruct = {
  kind: 'struct';
  fields: Array<{ name: string; type: TypeName }>;
  default: any;
  short_name: ShortTypeName;
};

export type TTupleStruct = {
  kind: 'tuple_struct';
  fields: Array<TypeName>;
  default: any;
  short_name: ShortTypeName;
};

export type TTuple = {
  kind: 'tuple';
  fields: Array<TypeName>;
  short_name: ShortTypeName;
};

export type TArray = {
  kind: 'array';
  item: TypeName;
  capacity: number | null; // null is `Vec<T>`
  default: any;
  short_name: ShortTypeName;
};

export type TMap = {
  kind: 'map';
  key: TypeName;
  value: TypeName;
  default: any;
  short_name: ShortTypeName;
};

export type TSet = {
  kind: 'set';
  item: TypeName;
  default: any;
  short_name: ShortTypeName;
};

export type TEnum = {
  kind: 'enum';
  name: string;
  variants: Array<TEnumVariant>;
  default: string;
  short_name: ShortTypeName;
};

export type TEnumVariant =
  | TEnumVariantStruct
  | TEnumVariantTuple
  | TEnumVariantUnit;

export type TEnumVariantStruct = {
  name: string;
  kind: 'struct';
  fields: Array<{ name: string; type: TypeName }>;
};

export type TEnumVariantTuple = {
  name: string;
  kind: 'tuple';
  fields: Array<TypeName>;
};

export type TEnumVariantUnit = {
  kind: 'unit';
  name: string;
};

export type TOpaque = {
  kind: 'opaque';
  name: string;
  default: string; // TODO maybe narrow type to string | number | null?
  short_name: ShortTypeName;
};
