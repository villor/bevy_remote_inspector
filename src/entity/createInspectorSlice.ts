import type { ComponentId } from '@/component/useComponents';
import type { EntityId } from '@/entity/useEntity';
import type { CreateSlice } from '@/store';

export type InspectorSlice = {
  inspectingEntity: EntityId | null;
  setInspectingEntity: (entity: EntityId) => void;
  entityComponentCollapseState: Map<EntityId, Map<ComponentId, boolean>>;
  setEntityComponentCollapseState: (
    entity: EntityId,
    component: ComponentId,
    collapsed: boolean,
  ) => void;
  entitySearch?: string;
};

export const createInspectorSlice: CreateSlice<InspectorSlice> = (set, get) => ({
  inspectingEntity: null,
  setInspectingEntity: (entity) => set({ inspectingEntity: entity }),
  entityComponentCollapseState: new Map(),
  setEntityComponentCollapseState: (entity, component, collapsed) => {
    const components = get().entityComponentCollapseState.get(entity) || new Map();
    components.set(component, collapsed);

    set({
      entityComponentCollapseState: new Map(
        get().entityComponentCollapseState.set(entity, components),
      ),
    });
  },
});
