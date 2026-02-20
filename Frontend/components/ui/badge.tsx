import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'info' | 'live' | 'new' | 'trending';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'group/badge relative inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-all duration-300 backdrop-blur-sm',
        'hover:scale-105',
        {
          // Default
          'border-white/[0.08] bg-white/[0.06] text-white/60 hover:bg-white/[0.1] hover:text-white/80':
            variant === 'default',

          // Success: Neon green with glow
          [cn(
            'border-emerald-500/30 bg-emerald-500/15 text-emerald-400',
            'shadow-[0_0_8px_rgba(52,211,153,0.15)]',
            'hover:shadow-[0_0_14px_rgba(52,211,153,0.25)] hover:border-emerald-400/40 hover:bg-emerald-500/20',
          )]: variant === 'success',

          // Warning: Amber with subtle pulse
          [cn(
            'border-amber-500/30 bg-amber-500/15 text-amber-400',
            'shadow-[0_0_8px_rgba(251,191,36,0.1)]',
            'hover:shadow-[0_0_14px_rgba(251,191,36,0.2)] hover:border-amber-400/40 hover:bg-amber-500/20',
          )]: variant === 'warning',

          // Info: Blue glow
          [cn(
            'border-blue-500/30 bg-blue-500/15 text-blue-400',
            'shadow-[0_0_8px_rgba(96,165,250,0.1)]',
            'hover:shadow-[0_0_14px_rgba(96,165,250,0.2)] hover:border-blue-400/40 hover:bg-blue-500/20',
          )]: variant === 'info',

          // Live: Neon green gradient with pulse + expanding rings
          [cn(
            'border-emerald-400/40 text-emerald-300 font-bold',
            'bg-gradient-to-r from-emerald-500/20 via-green-400/20 to-emerald-500/20',
            'shadow-[0_0_12px_rgba(52,211,153,0.2)]',
            'hover:shadow-[0_0_20px_rgba(52,211,153,0.35)] hover:border-emerald-300/50',
            'badge-glow-breathe',
          )]: variant === 'live',

          // New: Holographic shimmer + bounce
          [cn(
            'border-violet-400/30 text-violet-300 font-bold',
            'badge-holographic-bg',
            'badge-bounce',
          )]: variant === 'new',

          // Trending: Gold gradient with electric pulse
          [cn(
            'border-amber-400/40 text-amber-300 font-bold',
            'bg-gradient-to-r from-amber-500/20 via-yellow-400/20 to-orange-500/20',
            'shadow-[0_0_10px_rgba(251,191,36,0.15)]',
            'hover:shadow-[0_0_18px_rgba(251,191,36,0.3)] hover:border-amber-300/50',
            'badge-electric-pulse',
          )]: variant === 'trending',
        },
        className
      )}
      {...props}
    >
      {/* Live indicator dot with expanding rings */}
      {variant === 'live' && (
        <span className="relative mr-1.5 flex h-2 w-2">
          <span className="absolute inset-0 rounded-full bg-emerald-400 badge-live-ring" />
          <span className="absolute inset-0 rounded-full bg-emerald-400 badge-live-ring" style={{ animationDelay: '0.5s' }} />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
      )}

      {/* Holographic background for "new" variant */}
      {variant === 'new' && (
        <span
          className="absolute inset-0 rounded-full opacity-20 badge-holographic-bg"
          style={{
            background: 'linear-gradient(135deg, #a78bfa, #ec4899, #06b6d4, #a78bfa)',
            backgroundSize: '200% 200%',
          }}
        />
      )}

      {/* Trending fire icon */}
      {variant === 'trending' && (
        <span className="mr-1 text-amber-400" style={{ fontSize: '9px', lineHeight: 1 }}>
          &#9650;
        </span>
      )}

      {/* Badge content */}
      <span className="relative z-10">{props.children}</span>
    </span>
  );
}

export { Badge };
