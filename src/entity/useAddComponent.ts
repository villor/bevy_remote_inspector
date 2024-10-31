import { useStore } from '@/store';
import { useCallback } from 'react';
import type { EntityId } from './useEntity';
import type { ComponentId } from '@/component/useComponents';
import type { TValue } from '@/type-registry/useTypeRegistry';
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
    [sendMessage, entity, exec],
  );
}
