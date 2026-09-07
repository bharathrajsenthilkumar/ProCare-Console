import React from 'react';
import { LucideIcon } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  icon?: LucideIcon;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  icon: Icon,
  className = ''
}) => {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-12 flex flex-col items-center justify-center gap-3 animate-fade-in ${className}`}>
      {Icon ? (
        <Icon className="h-6 w-6 text-slate-800 dark:text-slate-200 animate-spin" />
      ) : (
        <svg className="animate-spin h-6 w-6 text-slate-800 dark:text-slate-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      <span className="text-xs text-slate-400 dark:text-slate-300 font-semibold tracking-wider uppercase">
        {message}
      </span>
    </div>
  );
};
