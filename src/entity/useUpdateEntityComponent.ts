import { ComponentId } from '@/component/useComponents';
import { EntityId } from './useEntity';
import { useStore } from '@/store';
import { useCallback } from 'react';

export function useUpdateEntityComponent(
  entity: EntityId,
  component: ComponentId
) {
  const sendMessage = useStore((state) => state.sendMessage);
  return useCallback(
    (value: any) => {
      sendMessage({
        method: 'update_component',
        params: {
          entity: entity,
          component: component,
          value: value,
        },
      });
    },
    [sendMessage, entity, component]
  );
}
