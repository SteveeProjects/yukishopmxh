'use client';

import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'vip' | 'svip' | 'rank';
}

export function Badge({ className = '', variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-slate-800 text-slate-300 border border-slate-700',
    success: 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50',
    warning: 'bg-amber-950/60 text-amber-400 border border-amber-800/50',
    danger: 'bg-red-950/60 text-red-400 border border-red-800/50',
    info: 'bg-blue-950/60 text-blue-400 border border-blue-800/50',
    vip: 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold',
    svip: 'bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 text-yellow-200 border border-amber-400/40 font-bold shadow-[0_0_12px_rgba(245,158,11,0.2)]',
    rank: 'bg-slate-800 text-sky-400 border border-sky-500/30',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
