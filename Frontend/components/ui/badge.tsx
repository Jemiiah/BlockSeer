import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'info' | 'live' | 'new' | 'trending';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'relative inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',

        variant === 'default' && 'border-white/[0.08] bg-white/[0.06] text-white/60',
        variant === 'success' && 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400',
        variant === 'warning' && 'border-amber-500/30 bg-amber-500/15 text-amber-400',
        variant === 'info' && 'border-blue-500/30 bg-blue-500/15 text-blue-400',
        variant === 'live' && 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300 font-bold',
        variant === 'new' && 'border-violet-400/30 bg-violet-500/15 text-violet-300 font-bold',
        variant === 'trending' && 'border-amber-400/40 bg-amber-500/15 text-amber-300 font-bold',

        className
      )}
      {...props}
    >
      {variant === 'live' && (
        <span className="relative mr-1.5 flex h-2 w-2">
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
      )}

      {variant === 'trending' && (
        <span className="mr-1 text-amber-400" style={{ fontSize: '9px', lineHeight: 1 }}>
          &#9650;
        </span>
      )}

      <span className="relative z-10">{props.children}</span>
    </span>
  );
}

export { Badge };
