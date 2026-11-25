'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home, Send } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.warn('[YUKISHOPMXH Error Boundary]:', error?.message || error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-[#0B0F19]/95 border border-amber-500/20 shadow-2xl p-6 sm:p-8 text-center backdrop-blur-2xl">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-bold text-white tracking-tight mb-2">
          Đã Xảy Ra Sự Cố Tạm Thời
        </h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Hệ thống gặp sự cố trong quá trình xử lý yêu cầu. Vui lòng bấm thử lại hoặc liên hệ Admin để được hỗ trợ ngay.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-950 btn-ios-white hover:opacity-95 transition flex items-center justify-center gap-1.5 shadow"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Thử Lại</span>
          </button>
          <Link
            href="/"
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] transition flex items-center justify-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Trang Chủ</span>
          </Link>
        </div>

        <a
          href="https://t.me/YukiIsMe2311"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-sky-300 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 transition flex items-center justify-center gap-2 shadow-sm"
        >
          <Send className="w-3.5 h-3.5" />
          <span>💬 Liên Hệ Admin Ngay (@YukiIsMe2311) ↗</span>
        </a>
      </div>
    </div>
  );
}
