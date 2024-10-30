import { useCommand } from '@/websocket/useCommand';
import { useCallback } from 'react';
import { EntityId } from './useEntity';

export function useDespawnEntity(entity: EntityId) {
  const exec = useCommand();

  return useCallback(() => {
    exec({
      method: 'despawn_entity',
      params: {
        entity,
      },
    });
  }, [exec, entity]);
}
