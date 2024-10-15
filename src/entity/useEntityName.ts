import { bevyTypes } from '@/type-registry/types';
import { EntityId, useEntity } from './useEntity';
import { useStore } from '@/store';

const FALLBACK_NAMES: Record<string, string> = {
  [bevyTypes.CAMERA_3D]: 'Camera3d',
  [bevyTypes.POINT_LIGHT]: 'PointLight',
  [bevyTypes.MESH_3D]: 'Mesh3d',
  [bevyTypes.OBSERVER]: 'Observer',
  [bevyTypes.WINDOW]: 'Window',
  [bevyTypes.PRIMARY_MONITOR]: 'PrimaryMonitor',
  [bevyTypes.MONITOR]: 'Monitor',
  [bevyTypes.POINTER_ID]: 'PointerId', // TODO support callback
};

export function useEntityName(id: EntityId) {
  const componentNameToIdMap = useStore((state) => state.componentNameToIdMap);

  const components = useEntity(id);

  if (!components) {
    return 'Unknown Entity (probaly bug)';
  }

  const componentId = componentNameToIdMap.get(bevyTypes.NAME);
  if (componentId !== undefined) {
    const nameComponent = components.get(componentId);
    if (nameComponent) {
      return nameComponent as string;
    }
  }

  let name: string = `Entity ${id}`;

  for (const fallbackName in FALLBACK_NAMES) {
    const componentId = componentNameToIdMap.get(fallbackName);
    if (componentId === undefined) {
      continue;
    }

    if (components.has(componentId)) {
      name = FALLBACK_NAMES[fallbackName];
      break;
    }
  }

  return name;
}
