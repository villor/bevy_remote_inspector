import { bevyTypes } from '@/type-registry/types';
import { type EcsQueryParams, type QueriedEntity, useEcsQuery } from './useEcsQuery';
import { useMemo } from 'react';
import { type TypeRegistry, useTypeRegistry, type TValue } from '@/type-registry/useTypeRegistry';
import type { ComponentName } from '@/component/useComponents';

export interface TaggedEntity extends QueriedEntity {
  /**
   * Computed name of this entity. Uses the Name component if present, otherwise a list of common components.
   *
   * If no name can be generated it will be 'Entity'
   */
  name: string;
  /** The type of the "main" component on this entity. */
  type?: ComponentName;
}

/** Subscribe to a an entity query. Adds additional tagging data (name and type). */
export function useEntityQuery(queryParams?: EcsQueryParams) {
  const params = useMemo(
    () => ({
      ...queryParams,
      data: {
        ...queryParams?.data,
        option: [...new Set([...(queryParams?.data?.option ?? []), ...OPTION_COMPONENTS])],
        has: [...new Set([...(queryParams?.data?.has ?? []), ...MAIN_COMPONENTS])],
      },
    }),
    [queryParams],
  );

  const { data, isFetching, error } = useEcsQuery(params);

  const registry = useTypeRegistry();
  const taggedEntities: TaggedEntity[] | undefined = useMemo(
    () =>
      data?.map((entity) => {
        const type = getEntityType(entity);
        const name = getEntityName(entity, registry, type);
        return { ...entity, type, name };
      }),
    [data, registry],
  );

  return { data: taggedEntities, isFetching, error };
}

function getEntityType(entity: QueriedEntity): ComponentName | undefined {
  if (entity.has) {
    for (const path of MAIN_COMPONENTS) {
      if (entity.has[path]) return path;
    }
  }
}

function getEntityName(entity: QueriedEntity, registry: TypeRegistry, type?: ComponentName) {
  if (entity.components[bevyTypes.NAME]) {
    return entity.components[bevyTypes.NAME] as string;
  }

  if (type) {
    const custom = CUSTOM_NAMES[type];
    if (custom) {
      if (typeof custom === 'string') return custom;
      return custom(entity.components[type]);
    }

    const { short_name } = registry.get(type) ?? {};
    if (short_name) return short_name;

    return type;
  }

  return 'Entity';
}

const MAIN_COMPONENTS = [
  bevyTypes.CAMERA_3D,
  bevyTypes.POINT_LIGHT,
  bevyTypes.MESH_3D,
  bevyTypes.WINDOW,
  //bevyTypes.PRIMARY_MONITOR,
  //bevyTypes.MONITOR,
  bevyTypes.POINTER_ID,
  bevyTypes.TEXT,
  bevyTypes.NODE,
];

const CUSTOM_NAMES: Record<string, string | ((value: TValue) => string)> = {
  [bevyTypes.POINTER_ID]: (val) => ` PointerId (${val as string})`,
};

const OPTION_COMPONENTS = [bevyTypes.NAME, ...Object.keys(CUSTOM_NAMES)];
