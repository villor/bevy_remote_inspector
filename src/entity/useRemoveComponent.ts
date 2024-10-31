import { useStore } from '@/store';
import { useCallback } from 'react';
import type { EntityId } from './useEntity';
import type { ComponentId } from '@/component/useComponents';

export function useRemoveComponent(entity: EntityId, component: ComponentId) {
  const sendMessage = useStore((state) => state.sendMessage);
  return useCallback(() => {
    sendMessage({
      method: 'remove_component',
      params: {
        entity: entity,
        component: component,
      },
    });
  }, [sendMessage, entity, component]);
}
