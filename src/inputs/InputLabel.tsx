import { cn } from '@/utils';
import type { HTMLAttributes } from 'react';

export function InputLabel(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn('flex text-wrap pt-[8px] font-medium text-sm capitalize', props.className)}
    ></div>
  );
}
