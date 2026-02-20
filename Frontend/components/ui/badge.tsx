import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'info';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors backdrop-blur-sm',
        {
          'border-white/[0.06] bg-white/[0.06] text-white/60': variant === 'default',
          'border-emerald-500/30 bg-emerald-500/15 text-emerald-400': variant === 'success',
          'border-amber-500/30 bg-amber-500/15 text-amber-400': variant === 'warning',
          'border-blue-500/30 bg-blue-500/15 text-blue-400': variant === 'info',
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
