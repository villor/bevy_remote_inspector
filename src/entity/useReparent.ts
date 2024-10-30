import { useStore } from '@/store';
import { useCallback } from 'react';
import type { EntityId } from './useEntity';

export function useReparent() {
  const sendMessage = useStore((state) => state.sendMessage);
  return useCallback(
    (entity: EntityId, parent: EntityId | null) => {
      sendMessage({
        method: 'reparent_entity',
        params: {
          entity,
          parent,
        },
      });
    },
    [sendMessage],
  );
}
