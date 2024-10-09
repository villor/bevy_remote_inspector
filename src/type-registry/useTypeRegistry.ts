import { useStore } from '@/store';

export function useTypeRegistry() {
  return useStore((state) => state.registry);
}

export type TType = TStruct | TTuple | TArray | TMap | TSet | TEnum;

export type TypeName = string;

export type TStruct = {
  kind: 'struct';
  fields: Array<{ name: string; type: TypeName }>;
  default: any;
};

export type TTuple = {
  kind: 'tuple';
  fields: Array<TypeName>;
};

export type TArray = {
  kind: 'array';
  item: TypeName;
  capacity: number | null; // null is `Vec<T>`
  default: any;
};

export type TMap = {
  kind: 'map';
  key: TypeName;
  value: TypeName;
  default: any;
};

export type TSet = {
  kind: 'set';
  item: TypeName;
  default: any;
};

export type TEnum = {
  kind: 'enum';
  name: string;
  variants: Array<TEnumVariant>;
  default: any;
};

export type TEnumVariant =
  | TEnumVariantStruct
  | TEnumVariantTuple
  | TEnumVariantUnit;

export type TEnumVariantStruct = {
  // maybe need name
  kind: 'struct';
  fields: Array<{ name: string; type: TypeName }>;
};

export type TEnumVariantTuple = {
  // maybe need name
  kind: 'tuple';
  fields: Array<TypeName>;
};

export type TEnumVariantUnit = {
  kind: 'unit';
  name: string;
};
