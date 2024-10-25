import { useStore } from '@/store';
import { useCallback } from 'react';
import { EntityId } from './useEntity';
import { ComponentId } from '@/component/useComponents';

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
