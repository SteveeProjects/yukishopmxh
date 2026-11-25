'use client';

import React, { useEffect, useRef, useState } from 'react';

export function VfxBackdrop() {
  const [liteMode, setLiteMode] = useState(true);
  const orbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkPerf = () => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isSmallScreen = window.innerWidth < 768;
      const lowCores = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;
      setLiteMode(reducedMotion || isSmallScreen || lowCores);
    };

    checkPerf();
    window.addEventListener('resize', checkPerf, { passive: true });
    return () => window.removeEventListener('resize', checkPerf);
  }, []);

  useEffect(() => {
    if (liteMode) return;
    let rafId = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const onPointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 28;
      const ny = (e.clientY / window.innerHeight - 0.5) * 20;
      targetX = nx;
      targetY = ny;

      if (!rafId) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const tick = () => {
      rafId = 0;
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      if (orbRef.current) {
        orbRef.current.style.transform = `translate3d(${currentX.toFixed(1)}px, ${currentY.toFixed(1)}px, 0)`;
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [liteMode]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden select-none bg-[#07090E]"
    >
      {/* Primary Obsidian Base */}
      <div className="absolute inset-0 bg-[#07090E]" />

      {/* Optical Ambient Sky Blue Depth Layer (Synchronized with Hero Banner) */}
      <div
        ref={orbRef}
        className="absolute -top-44 left-1/2 -translate-x-1/2 w-[920px] h-[540px] rounded-full will-change-transform transition-opacity duration-500"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(14, 165, 233, 0.16) 0%, rgba(12, 18, 32, 0.32) 45%, rgba(7, 9, 14, 0) 75%)',
          filter: liteMode ? 'blur(40px)' : 'blur(72px)',
        }}
      />

      {/* Secondary lower ambient horizon glow — rendered only on desktop/high-perf */}
      {!liteMode && (
        <div
          className="absolute bottom-[-220px] right-[-120px] w-[620px] h-[420px] rounded-full"
          style={{
            background:
              'radial-gradient(circle at center, rgba(14, 165, 233, 0.08) 0%, rgba(13, 21, 38, 0) 70%)',
            filter: 'blur(64px)',
          }}
        />
      )}
    </div>
  );
}
