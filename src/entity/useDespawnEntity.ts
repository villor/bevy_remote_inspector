import { useCommand } from '@/websocket/useCommand';
import { useCallback } from 'react';
import { EntityId } from './useEntity';

export function useDespawnEntity() {
  const exec = useCommand();

  return useCallback(
    (entity: EntityId) => {
      exec({
        method: 'despawn_entity',
        params: {
          entity,
        },
      });
    },
    [exec]
  );
}
