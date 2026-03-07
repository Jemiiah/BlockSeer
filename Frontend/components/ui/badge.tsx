import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'info' | 'live' | 'new' | 'trending';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'relative inline-flex items-center rounded-lg border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',

        variant === 'default' && 'border-[#23262f] bg-[#1c1f2a] text-[#8b8d97]',
        variant === 'success' && 'border-[#00c278]/30 bg-[#00c278]/10 text-[#00c278]',
        variant === 'warning' && 'border-amber-500/30 bg-amber-500/10 text-amber-400',
        variant === 'info' && 'border-[#4b8cff]/30 bg-[#4b8cff]/10 text-[#4b8cff]',
        variant === 'live' && 'border-[#00c278]/40 bg-[#00c278]/10 text-[#00c278] font-bold',
        variant === 'new' && 'border-violet-400/30 bg-violet-500/10 text-violet-300 font-bold',
        variant === 'trending' && 'border-amber-400/40 bg-amber-500/10 text-amber-300 font-bold',

        className
      )}
      {...props}
    >
      {variant === 'live' && (
        <span className="relative mr-1.5 flex h-2 w-2">
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00c278]" />
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
