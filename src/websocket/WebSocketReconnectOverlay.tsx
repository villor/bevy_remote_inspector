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
      <div className="data- [state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80 data-[state=closed]:animate-out data-[state=open]:animate-in">
        <div className="flex h-full flex-1 flex-col items-center justify-center">
          <span>Reconnecting...</span>
          <Button
            type="button"
            variant="link"
            className="mt-4"
            onPress={() => {
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
