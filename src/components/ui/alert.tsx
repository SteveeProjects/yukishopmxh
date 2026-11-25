'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'destructive';
  title?: string;
  className?: string;
  children: React.ReactNode;
}

export function Alert({ variant = 'info', title, className = '', children }: AlertProps) {
  const icons = {
    info: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    destructive: <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />,
  };

  const styles = {
    info: 'bg-blue-950/40 border-blue-800/50 text-blue-200',
    success: 'bg-emerald-950/40 border-emerald-800/50 text-emerald-200',
    warning: 'bg-amber-950/40 border-amber-800/50 text-amber-200',
    destructive: 'bg-red-950/40 border-red-800/50 text-red-200',
  };

  return (
    <div className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${styles[variant]} ${className}`} role="alert">
      {icons[variant]}
      <div className="space-y-0.5">
        {title && <h5 className="font-semibold">{title}</h5>}
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-800/60 rounded-xl ${className}`} />;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="p-8 text-center flex flex-col items-center justify-center space-y-3 rounded-2xl border border-dashed border-surface-border bg-surface/40">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-muted-foreground">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h4 className="text-base font-semibold font-display text-foreground">{title}</h4>
      {description && <p className="text-xs text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
