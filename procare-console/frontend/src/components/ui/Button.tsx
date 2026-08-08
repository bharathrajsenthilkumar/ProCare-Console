import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';
    
    const variants = {
      primary: 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm focus-visible:ring-slate-950 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900',
      secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 focus-visible:ring-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200',
      outline: 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 focus-visible:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 dark:text-slate-300',
      ghost: 'hover:bg-slate-100 hover:text-slate-900 text-slate-600 focus-visible:ring-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 dark:text-slate-400',
      danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm focus-visible:ring-red-600 dark:bg-red-700 dark:hover:bg-red-800'
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2.5 text-sm gap-2',
      lg: 'px-5 py-3 text-base gap-2.5'
    };

    const currentVariant = variants[variant];
    const currentSize = sizes[size];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${currentVariant} ${currentSize} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
