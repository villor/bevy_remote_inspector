import { useStore } from '@/store';
import { useCallback } from 'react';
import type { EntityId } from './useEntity';

export function useToggleVisibility(entity: EntityId) {
  const sendMessage = useStore((state) => state.sendMessage);
  return useCallback(() => {
    sendMessage({
      method: 'toggle_visibility',
      params: {
        entity: entity,
      },
    });
  }, [sendMessage, entity]);
}
