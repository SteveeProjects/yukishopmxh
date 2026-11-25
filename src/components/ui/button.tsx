'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading = false, disabled, type = 'button', children, ...props }, ref) => {
    const baseStyles =
      'touch-target inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

    const variants = {
      primary: 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20',
      secondary: 'bg-surface-hover text-foreground hover:bg-slate-800 border border-surface-border',
      outline: 'bg-transparent text-foreground hover:bg-surface-hover border border-surface-border',
      ghost: 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-surface-hover',
      destructive: 'bg-financial-debit text-white hover:bg-red-600 shadow-lg shadow-red-500/20',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs min-h-[38px]',
      md: 'px-5 py-2.5 text-sm min-h-[44px]',
      lg: 'px-7 py-3.5 text-base min-h-[50px]',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
