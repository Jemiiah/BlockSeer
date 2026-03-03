'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', loading, children, disabled, ...props }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <button
        className={cn(
          'relative inline-flex items-center justify-center whitespace-nowrap rounded-xl font-semibold',
          'transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(230,15%,5%)]',

          // Variants
          variant === 'default' && !isDisabled &&
            'bg-gradient-to-r from-blue-500 to-violet-500 text-white hover:from-blue-400 hover:to-violet-400',
          variant === 'secondary' && !isDisabled &&
            'bg-white/[0.06] text-white/90 border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/[0.15]',
          variant === 'outline' && !isDisabled &&
            'border border-blue-500/30 bg-transparent text-blue-400 hover:bg-blue-500/10 hover:border-blue-400/50',
          variant === 'ghost' && !isDisabled &&
            'text-white/70 bg-transparent hover:bg-white/[0.06] hover:text-white',

          // Disabled
          isDisabled && !loading && 'pointer-events-none opacity-40',

          // Loading
          loading && 'pointer-events-none opacity-70',

          // Sizes
          size === 'default' && 'h-10 px-5 py-2 text-sm gap-2',
          size === 'sm' && 'h-8 px-3.5 text-xs gap-1.5',
          size === 'lg' && 'h-12 px-7 text-base gap-2.5',
          size === 'icon' && 'h-9 w-9',

          className
        )}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button };
