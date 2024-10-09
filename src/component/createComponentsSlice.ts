import { CreateSlice } from '@/store';
import { ComponentsEvent } from '@/websocket/useWs';
import { ComponentId, ComponentInfo, ComponentName } from './useComponents';

export type ComponentsSlice = {
  components: Map<ComponentId, ComponentInfo>;
  componentNameToIdMap: Map<ComponentName, ComponentId>;
  updateComponents: (components: ComponentsEvent['components']) => void;
};

export const createComponentsSlice: CreateSlice<ComponentsSlice> = (
  set,
  get
) => ({
  components: new Map(),
  componentNameToIdMap: new Map(),
  updateComponents: (newComponents) => {
    set((state) => {
      const components = state.components;
      const componentNameToIdMap = state.componentNameToIdMap;
      for (const { id, ...info } of newComponents) {
        components.set(id, info);
        componentNameToIdMap.set(info.name, id);
      }

      return {
        components: new Map(components),
        componentNameToIdMap: new Map(componentNameToIdMap),
      };
    });
  },
});
