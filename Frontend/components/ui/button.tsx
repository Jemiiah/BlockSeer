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
          'relative inline-flex items-center justify-center whitespace-nowrap rounded-lg font-semibold',
          'transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4b8cff]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0f13]',

          // Variants
          variant === 'default' && !isDisabled &&
            'bg-[#4b8cff] text-white hover:bg-[#3a7bf0]',
          variant === 'secondary' && !isDisabled &&
            'bg-[#1c1f2a] text-[#e8e9ed] border border-[#23262f] hover:bg-[#23262f] hover:border-[#2f3340]',
          variant === 'outline' && !isDisabled &&
            'border border-[#4b8cff]/30 bg-transparent text-[#4b8cff] hover:bg-[#4b8cff]/10 hover:border-[#4b8cff]/50',
          variant === 'ghost' && !isDisabled &&
            'text-[#8b8d97] bg-transparent hover:bg-[#1c1f2a] hover:text-white',

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
