import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { TypeRegistryEvent } from "../WebSocket";

export type TypeRegistryContext = {
  registry: Map<TypeName, TType>;
  setRegistry: (types: TypeRegistryEvent["types"]) => void;
};

const ctx = createContext<TypeRegistryContext>({} as TypeRegistryContext);

export function TypeRegistryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [registry, setRegistry] = useState<Map<TypeName, TType>>(new Map());

  const setTypeRegistry = useCallback((types: TypeRegistryEvent["types"]) => {
    console.log("setRegistry", types);
    setRegistry(new Map(types));
  }, []);

  const value: TypeRegistryContext = useMemo(() => {
    return { registry, setRegistry: setTypeRegistry };
  }, [registry]);

  return <ctx.Provider value={value}>{children}</ctx.Provider>;
}

export function useTypeRegistry() {
  return useContext(ctx);
}

export type TType = TStruct | TTuple | TArray | TMap | TSet | TEnum;

export type TypeName = string;

export type TStruct = {
  kind: "struct";
  fields: Array<{ name: string; type: TypeName }>;
  default: any;
};

export type TTuple = {
  kind: "tuple";
  fields: Array<TypeName>;
};

export type TArray = {
  kind: "array";
  item: TypeName;
  capacity: number | null; // null is `Vec<T>`
  default: any;
};

export type TMap = {
  kind: "map";
  key: TypeName;
  value: TypeName;
  default: any;
};

export type TSet = {
  kind: "set";
  item: TypeName;
  default: any;
};

export type TEnum = {
  kind: "enum";
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
  kind: "struct";
  fields: Array<{ name: string; type: TypeName }>;
};

export type TEnumVariantTuple = {
  // maybe need name
  kind: "tuple";
  fields: Array<TypeName>;
};

export type TEnumVariantUnit = {
  kind: "unit";
  name: string;
};
