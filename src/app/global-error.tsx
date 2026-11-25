'use client';

import React, { useEffect } from 'react';
import { RotateCcw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.warn('[YUKISHOPMXH Global Error]:', error?.message || error);
  }, [error]);

  return (
    <html lang="vi" className="dark">
      <body className="bg-[#090B0E] text-slate-100 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-[#12151C]/90 border border-white/[0.08] shadow-2xl p-6 sm:p-8 text-center backdrop-blur-2xl">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-white flex items-center justify-center shadow">
            <RotateCcw className="w-6 h-6 stroke-[1.75]" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mb-2">
            Hệ Thống Đang Tự Động Phục Hồi
          </h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            YukiShopMXH đang xử lý yêu cầu. Vui lòng bấm làm mới ứng dụng để tiếp tục.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-950 btn-ios-white hover:opacity-95 transition"
            >
              Làm Mới
            </button>
            <a
              href="/"
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] transition flex items-center justify-center"
            >
              Về Trang Chủ
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
