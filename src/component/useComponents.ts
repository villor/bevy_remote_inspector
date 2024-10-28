import { useStore } from '@/store';
import { TValue, TypeName } from '../type-registry/useTypeRegistry';

export type ComponentName = TypeName;
export type ComponentValue = TValue;
export type ComponentId = number;

export type ComponentInfo = {
  name: ComponentName;
  reflected: boolean;
  required_components: ComponentId[];
};

export function useComponentInfo(id: ComponentId) {
  return useStore((state) => state.components.get(id));
}
