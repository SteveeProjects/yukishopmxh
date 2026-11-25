'use client';

import React from 'react';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-transition-wrapper animate-page-enter">
      {/* Top Navigation Progress Bar - Clean iOS Blue Minimal */}
      <div className="fixed top-0 left-0 right-0 h-[2px] z-50 bg-[#0A84FF] pointer-events-none opacity-80" />
      {children}
    </div>
  );
}
