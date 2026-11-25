'use client';

import React, { useRef } from 'react';

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}

export function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(14, 165, 233, 0.16)',
  ...props
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!divRef.current || !spotRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    spotRef.current.style.opacity = '1';
    spotRef.current.style.background = `radial-gradient(360px circle at ${x.toFixed(0)}px ${y.toFixed(0)}px, ${spotlightColor}, transparent 65%)`;
  };

  const handlePointerLeave = () => {
    if (spotRef.current) spotRef.current.style.opacity = '0';
  };

  return (
    <div
      ref={divRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`relative overflow-hidden rounded-2xl border border-sky-200/[0.1] bg-[#0D1526]/85 backdrop-blur-2xl transition-colors duration-200 hover:border-sky-400/35 ${className}`}
      {...props}
    >
      <div
        ref={spotRef}
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300"
      />
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
}
