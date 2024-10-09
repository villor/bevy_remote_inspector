import { TypeName } from '../type-registry/useTypeRegistry';

export type ComponentName = TypeName;
export type ComponentValue = any | null;
export type ComponentId = number;

export type ComponentInfo = {
  name: ComponentName;
  reflected: boolean;
  serializable: boolean;
};

export function useComponentInfo () => {}
