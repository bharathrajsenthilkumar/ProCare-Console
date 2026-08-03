import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState = ({ icon: Icon, title, description, actionText, onAction }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-slate-200/80 shadow-sm max-w-md mx-auto my-6 animate-fade-in">
      <div className="p-4 bg-slate-50 text-slate-400 rounded-full mb-4">
        <Icon className="h-8 w-8 stroke-[1.5]" />
      </div>
      <h3 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h3>
      <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">{description}</p>
      {actionText && onAction && (
        <Button variant="outline" size="sm" onClick={onAction} className="mt-5">
          {actionText}
        </Button>
      )}
    </div>
  );
};
