'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface PortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  maxWidthClass?: string;
  className?: string;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
}

export function PortalModal({
  isOpen,
  onClose,
  title,
  children,
  maxWidthClass = 'sm:max-w-lg',
  className = '',
  showCloseButton = true,
  closeOnBackdropClick = true,
}: PortalModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle ESC key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const content = (
    <div
      className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
      data-lenis-prevent
      aria-modal="true"
      role="dialog"
    >
      <div
        className={`relative w-full ${maxWidthClass} max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[#07090E]/96 border border-white/[0.1] backdrop-blur-2xl p-5 pb-24 sm:pb-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            {title ? (
              <div className="text-base font-bold text-white tracking-wide">{title}</div>
            ) : (
              <div />
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition active:scale-90"
                aria-label="Đóng modal"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div>{children}</div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

export default PortalModal;
