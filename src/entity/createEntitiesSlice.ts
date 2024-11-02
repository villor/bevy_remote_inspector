import type { CreateSlice } from '@/store';
import type { EntityId } from './useEntity';
import type { ComponentId, ComponentValue } from '@/component/useComponents';

export type EntitiesMap = Map<
  EntityId,
  Map<
    ComponentId,
    {
      value: ComponentValue;
      disabled: boolean;
    }
  >
>;

export type EntitiesSlice = {
  entities: EntitiesMap;
  childParentMap: Map<EntityId, EntityId | null>;
  entityNames: Map<EntityId, string>;
  updateEntities: (data: {
    entities?: EntitiesMap;
    childParentMap?: Map<EntityId, EntityId | null>;
    entityNames?: Map<EntityId, string>;
  }) => void;
};

export const createEntitiesSlice: CreateSlice<EntitiesSlice> = (set) => ({
  entities: new Map(),
  childParentMap: new Map(),
  entityNames: new Map(),
  updateEntities: (data: {
    entities?: EntitiesMap;
    childParentMap?: Map<EntityId, EntityId | null>;
    entityNames?: Map<EntityId, string>;
  }) => set(() => data),
});
