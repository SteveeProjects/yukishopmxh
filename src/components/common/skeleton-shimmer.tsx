'use client';

import React from 'react';

export function SkeletonBox({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`relative overflow-hidden rounded-xl bg-slate-800/60 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-slate-700/40 before:to-transparent ${className}`}
    />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <SkeletonBox className="h-5 w-24 rounded-full" />
        <SkeletonBox className="h-4 w-16 rounded-full" />
      </div>
      <div className="space-y-2 py-1">
        <SkeletonBox className="h-5 w-3/4" />
        <SkeletonBox className="h-3 w-full" />
        <SkeletonBox className="h-3 w-5/6" />
      </div>
      <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
        <SkeletonBox className="h-6 w-28" />
        <SkeletonBox className="h-9 w-24 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 overflow-hidden p-4 space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <SkeletonBox className="h-5 w-40" />
        <SkeletonBox className="h-5 w-20 rounded-full" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <SkeletonBox className="h-4 w-28 shrink-0" />
          <SkeletonBox className="h-4 w-20 shrink-0" />
          <SkeletonBox className="h-4 w-24 shrink-0" />
          <SkeletonBox className="h-4 w-full" />
          <SkeletonBox className="h-4 w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonOrders({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-3xl border border-slate-800 bg-slate-900/90 space-y-3"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <SkeletonBox className="h-4 w-32" />
            <SkeletonBox className="h-5 w-24 rounded-full" />
          </div>
          <SkeletonBox className="h-5 w-1/2" />
          <SkeletonBox className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonKpis() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex justify-between">
            <SkeletonBox className="h-3 w-20" />
            <SkeletonBox className="h-4 w-4 rounded-full" />
          </div>
          <SkeletonBox className="h-8 w-24 mt-2" />
          <SkeletonBox className="h-2.5 w-16" />
        </div>
      ))}
    </div>
  );
}
