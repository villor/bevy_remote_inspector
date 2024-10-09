import { ReadyState } from 'react-use-websocket';
import { useWs } from './useWs';
import { useStore } from '@/store';
import { Button } from '@/shared/ui/button';

export function WebSocketReconnectOverlay() {
  const { readyState } = useWs();
  const hasConnected = useStore((state) => state.hasConnected);
  if (readyState === ReadyState.OPEN || !hasConnected) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-
      [state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      >
        <div className="flex flex-1 justify-center items-center flex-col h-full">
          <span>Reconnecting...</span>
          <Button
            type="button"
            variant="link"
            className="mt-4"
            onClick={() => {
              useStore.setState({
                hasConnected: false,
                shouldReconnect: false,
              });
            }}
          >
            Cancle
          </Button>
        </div>
      </div>
    </>
  );
}
