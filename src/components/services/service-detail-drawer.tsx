'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BrandInfo } from '@/lib/catalog/brands-data';
import { QuickCheckoutInspector } from './quick-checkout-inspector';
import { BrandLogo } from '@/components/common/brand-logo';
import { X } from 'lucide-react';

interface ServiceDetailDrawerProps {
  brand: BrandInfo | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ServiceDetailDrawer({
  brand,
  isOpen,
  onClose,
}: ServiceDetailDrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!mounted || !isOpen || !brand) return null;

  const drawerContent = (
    <div
      className="fixed inset-0 z-[120] overflow-hidden"
      data-lenis-prevent
      aria-modal="true"
      role="dialog"
    >
      <div
        className="fixed inset-0 bg-[#05070B]/85 backdrop-blur-md transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-0 pointer-events-none flex flex-col justify-end md:justify-center md:items-end">
        <div
          className="pointer-events-auto w-full md:max-w-md h-auto max-h-[92vh] md:max-h-screen md:h-full bg-[#07090E]/96 border-t md:border-t-0 md:border-l border-white/[0.1] shadow-2xl backdrop-blur-2xl flex flex-col rounded-t-[28px] md:rounded-t-none overflow-hidden"
          data-lenis-prevent
        >
          <div className="md:hidden flex justify-center pt-2.5 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          <div className="px-4 py-2.5 border-b border-white/[0.08] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <BrandLogo size="xs" />
              <span className="text-xs font-bold text-slate-300">Khay đặt nhanh</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="touch-target p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 pb-24 md:pb-6 no-scrollbar" data-lenis-prevent>
            <QuickCheckoutInspector brand={brand} compactHeader />
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
}
