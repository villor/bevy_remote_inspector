import { useStore } from '@/store';
import { useCallback } from 'react';
import { EntityId } from './useEntity';
import { ComponentId } from '@/component/useComponents';
import { TValue } from '@/type-registry/useTypeRegistry';
import { useCommand } from '@/websocket/useCommand';

export function useAddComponent(entity: EntityId) {
  const exec = useCommand();
  const sendMessage = useStore((state) => state.sendMessage);
  return useCallback(
    ({
      component,
      value,
      onSuccess,
    }: {
      component: ComponentId;
      value: TValue;
      onSuccess: () => void;
    }) => {
      exec({
        method: 'insert_component',
        params: {
          entity,
          component,
          value,
        },
        onSuccess,
      });
    },
    [sendMessage, entity, exec]
  );
}
