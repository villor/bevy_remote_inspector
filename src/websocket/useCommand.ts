import { useStore } from '@/store';
import { useCallback } from 'react';

export function useCommand() {
  const sendMessage = useStore((state) => state.sendMessage);
  return useCallback(
    ({
      method,
      params,
      onError,
      onSuccess,
    }: {
      method: string;
      params: Record<string, any>;
      onSuccess?: () => void;
      onError?: (message: string) => void;
    }) => {
      sendMessage({
        method,
        params,
        callback: (data) => {
          if (data.error) {
            onError?.(data.error.message);
          } else {
            onSuccess?.();
          }
        },
      });
    },
    [sendMessage]
  );
}
