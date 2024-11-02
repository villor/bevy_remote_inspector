import { Badge } from '@/shared/ui/badge';
import { prettyEntityId } from './entityUtils';
import type { EntityId } from './useEntity';

export function EntityName({ id, name }: { id: EntityId; name: string }) {
  return (
    <div className="flex items-center gap-x-2">
      <span className="hyphens-auto break-all">{name}</span>
      <Badge variant="secondary" className="rounded-full px-1.5">
        {prettyEntityId(id)}
      </Badge>
    </div>
  );
}
