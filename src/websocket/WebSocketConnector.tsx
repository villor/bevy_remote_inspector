import { useToast } from '@/shared/hooks/use-toast';
import { useStore } from '@/store';
import { useCallback, useEffect } from 'react';
import useWebSocket from 'react-use-websocket';
import { WEB_SOCKET_MESSAGE_ID } from './useWs';
import type { WsEvent } from './createWsSlice';
import { useEntityUpdates } from '@/entity/useEntityUpdates';
import { useShallow } from 'zustand/react/shallow';

export function WebsocketConnector() {
  const url = useStore((state) => state.url) || null;
  const shouldReconnect = useStore((state) => state.shouldReconnect);
  const initSendMessage = useStore((state) => state.initSendMessage);
  const setReadyState = useStore((state) => state.setReadyState);
  const { toast } = useToast();

  const commandCallbacks = useStore((state) => state.commandCallbacks);
  const setCommandCallbacks = useStore(useShallow((state) => state.setCommandCallbacks));
  const { updateEntity } = useEntityUpdates();

  const onMessage = useCallback(
    (message: MessageEvent<any>) => {
      try {
        const event = JSON.parse(message.data) as WsEvent;
        if (event.id === null) {
          return;
        }

        if (event.id !== WEB_SOCKET_MESSAGE_ID) {
          const callback = commandCallbacks.get(event.id);
          if (typeof callback === 'function') {
            callback(event);
            commandCallbacks.delete(event.id);
            setCommandCallbacks(commandCallbacks);
          }

          if (event.error) {
            toast({
              title: 'Error',
              description: event.error.message,
              variant: 'destructive',
            });
          }
          return;
        }

        for (const item of event.result) {
          if (item.kind === 'entity') {
            updateEntity(item.entity, item.mutation);
          } else {
            console.log(item);
          }
        }
      } catch (e) {
        console.error(e);
      }
    },
    [commandCallbacks, setCommandCallbacks, updateEntity, toast],
  );

  const { readyState, sendJsonMessage } = useWebSocket(shouldReconnect ? url : null, {
    queryParams: {
      body: JSON.stringify({
        method: 'inspector/stream',
        jsonrpc: '2.0',
        id: WEB_SOCKET_MESSAGE_ID,
      }),
    },
    onError: (_e) => {
      const isManuallyConnect = useStore.getState().isManuallyConnect;
      if (isManuallyConnect) {
        toast({
          title: 'Failed to connect',
          variant: 'destructive',
        });
        useStore.setState({
          isManuallyConnect: false,
          shouldReconnect: false,
        });
      }
    },
    onMessage,
    shouldReconnect: () => true,
    reconnectInterval: 500,
    reconnectAttempts: 999999,
  });

  useEffect(() => {
    initSendMessage(sendJsonMessage);
  }, [sendJsonMessage]);

  useEffect(() => {
    setReadyState(readyState);
  }, [readyState]);

  return null;
}
