import type { EntityId } from './useEntity';
import { useStore } from '@/store';

export function useEntityName(id: EntityId) {
  return useStore((state) => state.entityNames.get(id));
}
