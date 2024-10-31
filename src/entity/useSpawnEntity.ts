import { useCallback } from 'react';
import type { EntityId } from './useEntity';
import { useCommand } from '@/websocket/useCommand';

export function useSpawnEntity(parent: EntityId | null, onSpawn?: (id: EntityId) => void) {
  const exec = useCommand();
  return useCallback(() => {
    exec({
      method: 'spawn_entity',
      params: {
        parent,
      },
      onSuccess(result) {
        if (typeof result === 'number') {
          onSpawn?.(result);
        }
      },
    });
  }, [parent, onSpawn]);
}
