'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  loading?: boolean;
  success?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', loading, success, children, disabled, ...props }, ref) => {
    const buttonRef = React.useRef<HTMLButtonElement | null>(null);
    const [ripples, setRipples] = React.useState<Array<{ id: number; x: number; y: number }>>([]);
    const [isPressed, setIsPressed] = React.useState(false);
    const [showSuccess, setShowSuccess] = React.useState(false);
    const rippleId = React.useRef(0);

    React.useEffect(() => {
      if (success) {
        setShowSuccess(true);
        const timer = setTimeout(() => setShowSuccess(false), 2000);
        return () => clearTimeout(timer);
      }
    }, [success]);

    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return;
      setIsPressed(true);

      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = ++rippleId.current;

      setRipples((prev) => [...prev, { id, x, y }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 600);

      props.onMouseDown?.(e);
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
      setIsPressed(false);
      props.onMouseUp?.(e);
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      setIsPressed(false);
      props.onMouseLeave?.(e);
    };

    const mergedRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        buttonRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
      },
      [ref]
    );

    const isDisabled = disabled || loading;

    return (
      <button
        className={cn(
          'group relative inline-flex items-center justify-center whitespace-nowrap rounded-xl font-semibold overflow-hidden',
          'transition-all duration-300 ease-out',
          'focus-visible:outline-none',
          {
            // Default: Electric gradient (blue -> purple) with shimmer
            [cn(
              'bg-gradient-to-r from-blue-500 via-violet-500 to-purple-600 text-white shadow-lg',
              'shadow-blue-500/25',
              'hover:shadow-blue-500/40 hover:shadow-xl hover:scale-[1.02]',
              'hover:from-blue-400 hover:via-violet-400 hover:to-purple-500',
              'focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )]: variant === 'default' && !isDisabled && !showSuccess,

            // Secondary
            [cn(
              'bg-white/[0.06] text-white/90 border border-white/[0.08]',
              'hover:bg-white/[0.1] hover:border-white/[0.15] hover:scale-[1.02] hover:shadow-lg hover:shadow-white/[0.05]',
              'focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )]: variant === 'secondary' && !isDisabled,

            // Outline
            [cn(
              'border border-blue-500/30 bg-transparent text-blue-400',
              'hover:bg-blue-500/10 hover:border-blue-400/50 hover:text-blue-300 hover:scale-[1.02]',
              'hover:shadow-lg hover:shadow-blue-500/10',
              'focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )]: variant === 'outline' && !isDisabled,

            // Ghost
            [cn(
              'text-white/70 bg-transparent',
              'hover:bg-white/[0.06] hover:text-white hover:scale-[1.02]',
              'focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )]: variant === 'ghost' && !isDisabled,

            // Disabled
            'pointer-events-none opacity-40 saturate-0': isDisabled && !loading,

            // Loading
            [cn(
              'pointer-events-none',
              variant === 'default'
                ? 'bg-gradient-to-r from-blue-500/60 via-violet-500/60 to-purple-600/60 text-white/70'
                : 'bg-white/[0.04] text-white/50 border border-white/[0.06]',
            )]: !!loading,

            // Success morph
            'bg-gradient-to-r from-emerald-500 to-green-400 text-white shadow-lg shadow-emerald-500/30 scale-[1.02]': showSuccess,
          },

          // Press scale
          isPressed && !isDisabled && 'scale-[0.97] transition-transform duration-100',

          // Sizes
          {
            'h-10 px-5 py-2 text-sm gap-2': size === 'default',
            'h-8 px-3.5 text-xs gap-1.5': size === 'sm',
            'h-12 px-7 text-base gap-2.5': size === 'lg',
            'h-9 w-9': size === 'icon',
          },
          className
        )}
        ref={mergedRef}
        disabled={isDisabled}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {/* Shimmer overlay for default variant */}
        {variant === 'default' && !isDisabled && !showSuccess && (
          <span className="btn-shimmer-overlay absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        )}

        {/* Loading shimmer wave */}
        {loading && (
          <span className="btn-loading-shimmer absolute inset-0" />
        )}

        {/* Ripple effects */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="btn-ripple absolute rounded-full pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
            }}
          />
        ))}

        {/* Content */}
        <span className={cn('relative z-10 inline-flex items-center justify-center', loading && 'opacity-0')}>
          {showSuccess ? (
            <svg
              className="btn-check-icon w-5 h-5"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="4,10 8,14 16,6" />
            </svg>
          ) : (
            children
          )}
        </span>

        {/* Loading spinner */}
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center z-10">
            <span className="btn-spinner w-4 h-4 rounded-full border-2 border-current border-t-transparent" />
          </span>
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button };
