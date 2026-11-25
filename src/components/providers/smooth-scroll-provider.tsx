'use client';

import React from 'react';
import { ReactLenis } from 'lenis/react';
import 'lenis/dist/lenis.css';

interface SmoothScrollProps {
  children: React.ReactNode;
}

export function SmoothScrollProvider({ children }: SmoothScrollProps) {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.08,             // Smooth inertia
        duration: 1.2,          // Natural transition duration
        smoothWheel: true,      // Buttery smooth mouse wheel
        syncTouch: false,       // Preserve native mobile touch momentum
        wheelMultiplier: 1.0,   // Standard sensitivity
        touchMultiplier: 1.5,
        infinite: false,
      }}
    >
      {children}
    </ReactLenis>
  );
}
