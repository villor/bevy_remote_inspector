import { useStore } from '@/store';
import { useCallback } from 'react';
import { EntityId } from './useEntity';
import { ComponentId } from '@/component/useComponents';

export function useToggleComponent(entity: EntityId, component: ComponentId) {
  const sendMessage = useStore((state) => state.sendMessage);
  return useCallback(() => {
    sendMessage({
      method: 'toggle_component',
      params: {
        entity: entity,
        component: component,
      },
    });
  }, [sendMessage, entity, component]);
}
