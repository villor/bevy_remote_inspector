import { useStore } from '@/store';
import { useCallback } from 'react';
import { EntityId } from './useEntity';

export function useSpawnEntity(parent: EntityId | null) {
  const sendMessage = useStore((state) => state.sendMessage);
  return useCallback(() => {
    sendMessage({
      method: 'spawn_entity',
      params: {
        parent,
      },
    });
  }, [sendMessage, parent]);
}
