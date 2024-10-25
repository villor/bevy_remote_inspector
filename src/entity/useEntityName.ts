import { bevyTypes } from '@/type-registry/types';
import { EntityId, useEntity } from './useEntity';
import { useStore } from '@/store';
import { TValue } from '@/type-registry/useTypeRegistry';

const FALLBACK_NAMES: Record<string, string | ((value: TValue) => string)> = {
  [bevyTypes.CAMERA_3D]: 'Camera3d',
  [bevyTypes.POINT_LIGHT]: 'PointLight',
  [bevyTypes.MESH_3D]: 'Mesh3d',
  [bevyTypes.OBSERVER]: 'Observer',
  [bevyTypes.WINDOW]: 'Window',
  [bevyTypes.PRIMARY_MONITOR]: 'PrimaryMonitor',
  [bevyTypes.MONITOR]: 'Monitor',
  [bevyTypes.POINTER_ID]: (val) => ` PointerId (${val as string})`,
  [bevyTypes.TEXT]: 'Text',
  [bevyTypes.NODE]: 'Node',
};

export function useEntityName(id: EntityId) {
  const componentNameToIdMap = useStore((state) => state.componentNameToIdMap);

  const components = useEntity(id);

  if (!components) {
    return 'Unknown Entity (probaly bug)';
  }

  const nameComponentId = componentNameToIdMap.get(bevyTypes.NAME);
  if (nameComponentId !== undefined) {
    const nameComponent = components.get(nameComponentId);
    if (nameComponent) {
      return nameComponent.value as string;
    }
  }

  for (const fallbackName in FALLBACK_NAMES) {
    const componentId = componentNameToIdMap.get(fallbackName);
    if (componentId === undefined) {
      continue;
    }

    if (components.has(componentId)) {
      try {
        return typeof FALLBACK_NAMES[fallbackName] === 'function'
          ? FALLBACK_NAMES[fallbackName](components.get(componentId)!.value)
          : FALLBACK_NAMES[fallbackName];
      } catch {
        break;
      }
    }
  }

  const firstComponent = components.keys().next().value;

  if (!firstComponent) {
    return `Entity ${prettyEntityId(id)}`;
  }

  const { short_name } = useStore((state) => state.getComponentName)(
    firstComponent
  );

  return short_name;
}

export function prettyEntityId(id: EntityId) {
  const bid = BigInt(id);
  const index = Number(bid & 0xffffffffn);
  const generation = Number(bid >> 32n);

  return `${index}v${generation}`;
}

export function getEntityIndex(id: EntityId) {
  const bid = BigInt(id);
  return Number(bid & 0xffffffffn);
}
