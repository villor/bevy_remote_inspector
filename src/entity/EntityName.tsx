import { Badge } from '@/shared/ui/badge';
import type { EntityId } from './useEntity';
import { useEntityName } from './useEntityName';
import { prettyEntityId } from './entityUtils';

export function EntityName({ id }: { id: EntityId }) {
  const name = useEntityName(id);
  return (
    <div className="flex items-center gap-x-2">
      <span className="hyphens-auto break-all">{name}</span>
      <Badge variant="secondary" className="rounded-full px-1.5">
        {prettyEntityId(id)}
      </Badge>
    </div>
  );
}
