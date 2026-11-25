'use client';

import React from 'react';

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<BrandLogoProps['size']>, string> = {
  xs: 'h-8 w-auto',
  sm: 'h-9 w-auto',
  md: 'h-10 w-auto',
  lg: 'h-12 w-auto',
};

export function BrandLogo({ size = 'sm', className = '' }: BrandLogoProps) {
  const heightCls = SIZE_CLASSES[size];

  return (
    <span className={`inline-flex items-center shrink-0 select-none ${className}`}>
      <img
        src="/assets/images/logo-fx.gif"
        alt="YukiShopMXH"
        onError={(e) => {
          e.currentTarget.src = '/assets/images/logo.png';
        }}
        className={`${heightCls} object-contain select-none block`}
        draggable={false}
      />
    </span>
  );
}
