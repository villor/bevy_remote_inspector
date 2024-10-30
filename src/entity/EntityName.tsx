import { Badge } from '@/shared/ui/badge';
import type { EntityId } from './useEntity';
import { useEntityName } from './useEntityName';
import { prettyEntityId } from './createEntitiesSlice';

export function EntityName({ id }: { id: EntityId }) {
  const name = useEntityName(id);
  return (
    <div className="flex gap-x-2 items-center">
      <span className="break-all hyphens-auto">{name}</span>
      <Badge variant="secondary" className="px-1.5 rounded-full">
        {prettyEntityId(id)}
      </Badge>
    </div>
  );
}
