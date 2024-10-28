import { Badge } from '@/shared/ui/badge';
import { EntityId } from './useEntity';
import { prettyEntityId, useEntityName } from './useEntityName';

export function EntityName({ id }: { id: EntityId }) {
  const name = useEntityName(id);
  return (
    <div className="flex gap-x-2 items-center">
      <span>{name}</span>
      <Badge variant="secondary" className="px-1.5 rounded-full">
        {prettyEntityId(id)}
      </Badge>
    </div>
  );
}
