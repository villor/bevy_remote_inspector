import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/store';
import { useEffect } from 'react';
import useWebSocket from 'react-use-websocket';
import { WEB_SOCKET_MESSAGE_ID } from './useWs';

export function WebsocketConnector() {
  const url = useStore((state) => state.url);
  const initSendMessage = useStore((state) => state.initSendMessage);
  const setReadyState = useStore((state) => state.setReadyState);
  const onMessage = useStore((state) => state.onMessage);
  const { toast } = useToast();
  const { lastMessage, readyState, sendJsonMessage } = useWebSocket(
    url || null,
    {
      queryParams: {
        body: JSON.stringify({
          method: 'inspector/stream',
          jsonrpc: '2.0',
          id: WEB_SOCKET_MESSAGE_ID,
        }),
      },
      onError: (e) => {
        const isManuallyConnect = useStore.getState().isManuallyConnect;
        if (isManuallyConnect) {
          toast({
            title: 'Failed to connect',
            variant: 'destructive',
          });
          useStore.setState({
            isManuallyConnect: false,
          });
        }
      },
      shouldReconnect: () => true,
      reconnectInterval: 500,
      reconnectAttempts: 999999,
    }
  );

  useEffect(() => {
    initSendMessage(sendJsonMessage);
  }, [sendJsonMessage]);

  useEffect(() => {
    if (lastMessage !== null) {
      onMessage(lastMessage);
    }
  }, [lastMessage, onMessage]);

  useEffect(() => {
    setReadyState(readyState);
  }, [readyState]);

  return null;
}