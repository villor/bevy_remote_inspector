import { useCommand } from '@/websocket/useCommand';
import { useCallback } from 'react';
import { EntityId } from './useEntity';

export function useDespawnEntity(
  entity: EntityId,
  kind: 'recursive' | 'descendant'
) {
  const exec = useCommand();

  return useCallback(() => {
    exec({
      method: 'despawn_entity',
      params: {
        entity,
        kind,
      },
    });
  }, [exec, entity, kind]);
}
