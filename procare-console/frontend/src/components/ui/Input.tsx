import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, icon, type = 'text', id, disabled, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            id={id}
            disabled={disabled}
            className={`block w-full border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2.5 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm placeholder-slate-400 dark:placeholder:text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-900 ${
              icon ? 'pl-10' : ''
            } ${
              error ? 'border-red-300 focus:ring-red-500' : ''
            } ${className}`}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-red-600 font-medium mt-0.5">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
