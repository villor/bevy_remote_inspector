import type { ComponentId, ComponentInfo } from '@/component/useComponents';
import type { EntityId } from './useEntity';
import { bevyTypes } from '@/type-registry/types';

export const hiddenEntityNames = [bevyTypes.OBSERVER, bevyTypes.SYSTEM_ID_MARKER];

export function prettyEntityId(id: EntityId) {
  const bid = BigInt(id);
  const index = Number(bid & 0xffffffffn);
  const generation = Number(bid >> 32n);

  return `${index}v${generation}`;
}

export function getEntityIndex(id: EntityId) {
  const bid = BigInt(id);
  return Number(bid & 0xffffffffn);
}

export function isHiddenEntity(
  entityComponentIds: ComponentId[],
  allComponents: Map<ComponentId, ComponentInfo>,
) {
  for (const id of entityComponentIds) {
    const name = allComponents.get(id)?.name;
    if (name && hiddenEntityNames.includes(name)) {
      return true;
    }
  }
  return false;
}
