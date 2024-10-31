import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@/store';

export const WEB_SOCKET_MESSAGE_ID = '1';

export function useWs() {
  return useStore(
    useShallow((state) => ({
      url: state.url,
      readyState: state.readyState,
      sendMessage: state.sendMessage,
    })),
  );
}
