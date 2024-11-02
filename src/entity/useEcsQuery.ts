import { useQuery } from '@tanstack/react-query';
import { callBrp } from '@/brp/client';
import { useSession } from '@/brp/useSession';
import type { ComponentName, ComponentValue } from '@/component/useComponents';
import type { EntityId } from './useEntity';

export interface EcsQueryParams {
  data?: {
    components?: ComponentName[] | null;
    option?: ComponentName[] | null;
    has?: ComponentName[] | null;
  } | null;
  filter?: {
    with?: ComponentName[] | null;
    without?: ComponentName[] | null;
  } | null;
}

export interface QueriedEntity {
  entity: EntityId;
  components: Record<ComponentName, ComponentValue>;
  has?: Record<ComponentName, boolean> | null;
}

export function useEcsQuery(params?: EcsQueryParams) {
  const { brpUrl } = useSession();
  return useQuery({
    queryKey: ['BEVY_QUERY', brpUrl, params],
    queryFn: () =>
      callBrp<QueriedEntity[]>(brpUrl, 'bevy/query', {
        data: {},
        ...params,
      }),
    refetchInterval: 500,
    refetchIntervalInBackground: true,
  });
}
