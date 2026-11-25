'use client';

import React, { useRef, useState } from 'react';

interface Tilt3DCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  glare?: boolean;
  refraction?: boolean;
  disabled?: boolean;
}

export function Tilt3DCard({
  children,
  className = '',
  intensity = 2.5,
  glare = true,
  refraction = true,
  disabled = false,
  style,
  ...props
}: Tilt3DCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [coords, setCoords] = useState({ rx: 0, ry: 0, mx: 50, my: 20, active: false });

  const updateTilt = (clientX: number, clientY: number) => {
    if (disabled || !cardRef.current) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const rect = cardRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const px = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const py = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const ry = (px - 0.5) * intensity * 2;
    const rx = (0.5 - py) * intensity * 2;
    const mx = Math.round(px * 100);
    const my = Math.round(py * 100);

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setCoords({ rx, ry, mx, my, active: true });
    });
  };

  const resetTilt = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setCoords({ rx: 0, ry: 0, mx: 50, my: 20, active: false });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={(e) => updateTilt(e.clientX, e.clientY)}
      onMouseLeave={resetTilt}
      onTouchMove={(e) => {
        if (e.touches[0]) updateTilt(e.touches[0].clientX, e.touches[0].clientY);
      }}
      onTouchEnd={resetTilt}
      className={`relative will-change-transform ${glare && refraction ? 'glass-refraction' : ''} ${className}`}
      style={{
        ...style,
        ['--mx' as any]: `${coords.mx}%`,
        ['--my' as any]: `${coords.my}%`,
        transform:
          !disabled && coords.active
            ? `perspective(960px) rotateX(${coords.rx.toFixed(2)}deg) rotateY(${coords.ry.toFixed(2)}deg) translateZ(0)`
            : 'perspective(960px) rotateX(0deg) rotateY(0deg) translateZ(0)',
        transition: coords.active
          ? 'transform 0.08s linear'
          : 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      {...props}
    >
      {children}
      {glare && !disabled && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300 z-20"
          style={{
            opacity: coords.active ? 0.55 : 0.12,
            background: `radial-gradient(500px circle at ${coords.mx}% ${coords.my}%, rgba(125, 211, 252, 0.16), rgba(255, 255, 255, 0.04) 35%, transparent 65%)`,
          }}
        />
      )}
    </div>
  );
}
