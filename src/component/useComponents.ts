import { useStore } from '@/store';
import { TypeName } from '../type-registry/useTypeRegistry';
import { useShallow } from 'zustand/react/shallow';

export type ComponentName = TypeName;
export type ComponentValue = any | null;
export type ComponentId = number;

export type ComponentInfo = {
  name: ComponentName;
  reflected: boolean;
  serializable: boolean;
};

export function useComponentInfo(id: ComponentId) {
  return useStore(useShallow((state) => state.components.get(id)));
}
