import {
  Tooltip as AriaTooltip,
  TooltipTrigger as AriaTooltipTrigger,
  composeRenderProps,
  type TooltipTriggerComponentProps,
  type TooltipProps as AriaTooltipProps,
} from 'react-aria-components';

import { cn } from '@/utils';

const TooltipTrigger = ({ delay = 100, ...props }: TooltipTriggerComponentProps) => (
  <AriaTooltipTrigger delay={delay} {...props} />
);

const Tooltip = ({ className, offset = 4, ...props }: AriaTooltipProps) => (
  <AriaTooltip
    offset={offset}
    className={composeRenderProps(className, (className) =>
      cn(
        'fade-in-0 zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 animate-in overflow-hidden rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-xs data-[state=closed]:animate-out',
        className,
      ),
    )}
    {...props}
  />
);

export { Tooltip, TooltipTrigger };
