import { useStore } from '@/store';
import { useTypeRegistry, type TValue, type TypeName } from '../type-registry/useTypeRegistry';
import { useCallback } from 'react';

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

export function useComponents() {
  const components = useStore((state) => state.components);
  const registry = useTypeRegistry();

  const getComponentName = useCallback(
    (componentId: ComponentId) => {
      const info = components.get(componentId);

      if (!info) {
        return {
          name: undefined,
          short_name: undefined,
        };
      }

      const registeredInfo = registry.get(info.name);

      return {
        name: info.name,
        short_name: registeredInfo?.short_name || info.name,
      };
    },
    [components, registry],
  );

  return { getComponentName };
}
