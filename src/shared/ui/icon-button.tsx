import { Button, type ButtonProps, buttonVariants } from './button';
import { cn } from '@/utils';
import React, { type ReactNode } from 'react';
import { Tooltip, TooltipTrigger } from './tooltip';
import type { TooltipProps } from 'react-aria-components';

export const IconButton = React.forwardRef<
  HTMLButtonElement,
  ButtonProps & TooltipProps & { tooltip?: ReactNode }
>(({ className, variant = 'ghost', size = 'sm', placement, tooltip, ...props }, ref) => {
  const children = (
    <Button
      className={cn(buttonVariants({ variant, size, className }), 'size-8 p-0')}
      variant={variant}
      size={size}
      ref={ref}
      {...props}
    ></Button>
  );

  if (tooltip) {
    return (
      <TooltipTrigger>
        {children}
        <Tooltip placement={placement}>{tooltip}</Tooltip>
      </TooltipTrigger>
    );
  }

  return children;
});
