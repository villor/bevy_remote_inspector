import { Badge, BadgeProps } from '@/shared/ui/badge';
import { cn } from '@/utils';

export function ComponentBadge({ className, ...props }: BadgeProps) {
  return (
    <Badge {...props} className={cn('px-1 font-medium', className)}></Badge>
  );
}
