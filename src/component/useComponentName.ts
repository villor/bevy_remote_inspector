import { useShallow } from 'zustand/react/shallow';
import { ComponentId } from './useComponents';
import { useStore } from '@/store';

export function useComponentName(componentId: ComponentId) {
  return useStore(
    useShallow((state) => {
      const info = state.components.get(componentId);

      if (!info) {
        return {
          name: undefined,
          short_name: undefined,
        };
      }

      const registeredInfo = state.registry.get(info.name);

      return {
        name: info.name,
        short_name: registeredInfo?.short_name || info.name,
      };
    })
  );
}
