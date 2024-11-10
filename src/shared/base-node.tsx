import React from 'react';
import { cn } from '@/utils';

export const BaseNode = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { selected?: boolean }
>(({ className, selected, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-md border p-5 text-card-foreground',
      className,
      selected ? 'border-muted-foreground shadow-lg' : '',
    )}
    {...props}
  />
));
BaseNode.displayName = 'BaseNode';
