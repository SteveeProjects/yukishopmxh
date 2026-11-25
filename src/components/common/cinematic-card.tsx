'use client';

import React, { useRef, useCallback } from 'react';

interface CinematicCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'cyan' | 'indigo' | 'amber' | 'emerald' | 'violet';
  spotlight?: boolean;
}

export function CinematicCard({
  children,
  className = '',
  glowColor = 'cyan',
  spotlight = true,
  ...props
}: CinematicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);

  const glowMap = {
    cyan: {
      spotlight: 'rgba(14, 165, 233, 0.16)',
      border: 'hover:border-sky-400/35',
    },
    indigo: {
      spotlight: 'rgba(14, 165, 233, 0.16)',
      border: 'hover:border-sky-400/35',
    },
    amber: {
      spotlight: 'rgba(245, 158, 11, 0.16)',
      border: 'hover:border-amber-400/35',
    },
    emerald: {
      spotlight: 'rgba(16, 185, 129, 0.16)',
      border: 'hover:border-emerald-400/35',
    },
    violet: {
      spotlight: 'rgba(56, 189, 248, 0.16)',
      border: 'hover:border-sky-400/35',
    },
  }[glowColor];

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!spotlight || !cardRef.current || !spotRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      spotRef.current.style.opacity = '1';
      spotRef.current.style.background = `radial-gradient(340px circle at ${x.toFixed(0)}px ${y.toFixed(0)}px, ${glowMap.spotlight}, transparent 70%)`;
    },
    [spotlight, glowMap.spotlight]
  );

  const handlePointerLeave = () => {
    if (spotRef.current) spotRef.current.style.opacity = '0';
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`group relative rounded-2xl bg-[#0D1526]/85 border border-sky-200/[0.1] backdrop-blur-xl transition-all duration-200 ${glowMap.border} ${className}`}
      {...props}
    >
      {spotlight && (
        <div
          ref={spotRef}
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 z-0"
        />
      )}
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
}
