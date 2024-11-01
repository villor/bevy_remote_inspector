import { useStore } from '@/store';
import { callBrp } from './client';
import { useQuery } from '@tanstack/react-query';

export interface SessionInfo {
  brpUrl: string;
  hasPlugin: boolean;
}

export function useSession(): SessionInfo {
  const brpUrl = useStore((state) => state.brpUrl);

  const { data: pong } = useQuery({
    queryKey: ['PING_INSPECTOR', brpUrl],
    queryFn: () => callBrp<boolean>(brpUrl, 'inspector/ping'),
    refetchOnMount: false,
  });

  return { brpUrl, hasPlugin: !!pong };
}
