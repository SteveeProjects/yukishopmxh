'use client';

// ==============================================================================
// YUKISHOPMXH — CUSTOM MODAL / DIALOG SYSTEM (100% NO WINDOW.ALERT / CONFIRM)
// ==============================================================================

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  XCircle, 
  HelpCircle,
  X 
} from 'lucide-react';

export type DialogType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

export interface DialogOptions {
  title?: string;
  message: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
}

interface DialogContextValue {
  showDialog: (options: DialogOptions) => Promise<boolean>;
  showAlert: (message: string, title?: string, type?: DialogType) => Promise<boolean>;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

export function CustomDialogProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    options: DialogOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const showDialog = useCallback((options: DialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const showAlert = useCallback((message: string, title: string = 'Thông Báo', type: DialogType = 'info'): Promise<boolean> => {
    return showDialog({ message, title, type });
  }, [showDialog]);

  const showConfirm = useCallback((message: string, title: string = 'Xác Nhận Hành Động'): Promise<boolean> => {
    return showDialog({ message, title, type: 'confirm' });
  }, [showDialog]);

  const handleClose = (confirmed: boolean) => {
    if (dialogState) {
      dialogState.resolve(confirmed);
      setDialogState(null);
    }
  };

  const getIcon = (type: DialogType = 'info') => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />;
      case 'error':
        return <XCircle className="w-8 h-8 text-rose-500 shrink-0" />;
      case 'confirm':
        return <HelpCircle className="w-8 h-8 text-sky-400 shrink-0" />;
      default:
        return <Info className="w-8 h-8 text-sky-400 shrink-0" />;
    }
  };

  const getHeaderBadge = (type: DialogType = 'info') => {
    switch (type) {
      case 'success':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'warning':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'error':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'confirm':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      default:
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
    }
  };

  return (
    <DialogContext.Provider value={{ showDialog, showAlert, showConfirm }}>
      {children}

      {mounted && dialogState?.isOpen && createPortal(
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => handleClose(false)}
          data-lenis-prevent
        >
          <div 
            className="w-full max-w-sm sm:max-w-md rounded-3xl bg-white dark:bg-[#0E172E] border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 text-slate-900 dark:text-slate-100 relative animate-in zoom-in-95 duration-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  {getIcon(dialogState.options.type)}
                </div>
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${getHeaderBadge(dialogState.options.type)}`}>
                    YukiShopMXH
                  </span>
                  <h3 className="text-base sm:text-lg font-black mt-1 leading-snug">
                    {dialogState.options.title || 'Thông Báo'}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => handleClose(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed pl-1">
              {dialogState.options.message}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              {dialogState.options.type === 'confirm' && (
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="touch-target px-4 py-2.5 rounded-2xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                >
                  {dialogState.options.cancelText || 'Hủy bỏ'}
                </button>
              )}
              <button
                type="button"
                autoFocus
                onClick={() => handleClose(true)}
                className="touch-target px-5 py-2.5 rounded-2xl text-xs font-black bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-lg shadow-sky-500/25 transition active:scale-95"
              >
                {dialogState.options.confirmText || (dialogState.options.type === 'confirm' ? 'Xác Nhận' : 'Đồng Ý')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </DialogContext.Provider>
  );
}

export function useCustomDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    // Graceful fallback if used outside provider
    return {
      showDialog: async () => true,
      showAlert: async (msg: string) => { console.log(msg); return true; },
      showConfirm: async (msg: string) => { console.log(msg); return true; },
    };
  }
  return ctx;
}
