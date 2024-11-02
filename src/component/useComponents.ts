import { useTypeRegistry, type TValue, type TypeName } from '../type-registry/useTypeRegistry';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { callBrp } from '@/brp/client';
import { useSession } from '@/brp/useSession';

export type ComponentName = TypeName;
export type ComponentValue = TValue;
export type ComponentId = number;

export type ComponentInfo = {
  id: ComponentId;
  name: ComponentName;
  reflected: boolean;
  required_components: ComponentId[];
  short_name?: string;
};

export function useComponentInfo(id: ComponentId) {
  const { componentsById } = useComponents();
  return componentsById.get(id);
}

export interface UseComponents {
  components: ComponentInfo[];
  componentsById: Map<ComponentId, ComponentInfo>;
  componentsByName: Map<ComponentName, ComponentInfo>;
}

export function useComponents(): UseComponents {
  const registry = useTypeRegistry();

  const { brpUrl, hasPlugin } = useSession();
  const { data: componentList } = useQuery({
    queryKey: ['COMPONENTS', brpUrl],
    queryFn: () => callBrp<Array<ComponentInfo>>(brpUrl, 'inspector/components'),
    refetchOnMount: false,
    enabled: hasPlugin,
  });

  // TODO: Cache this memo globally?
  const { components, componentsById, componentsByName } = useMemo(() => {
    const components =
      componentList?.map((info) => {
        const registeredInfo = registry.get(info.name);
        return {
          ...info,
          short_name: registeredInfo?.short_name || info.name,
        };
      }) ?? [];

    return {
      components: components,
      componentsById: new Map(components?.map((info) => [info.id, info])),
      componentsByName: new Map(components?.map((info) => [info.name, info])),
    };
  }, [componentList, registry]);

  return { components, componentsById, componentsByName };
}
