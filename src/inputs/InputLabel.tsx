import { cn } from '@/utils';
import { HTMLAttributes } from 'react';

export function InputLabel(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'pt-[8px] capitalize text-sm text-wrap font-medium',
        props.className
      )}
    ></div>
  );
}
