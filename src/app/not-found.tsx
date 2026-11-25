import React from 'react';
import Link from 'next/link';
import { Home, Compass, Send } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-[#0B0F19]/95 border border-amber-500/20 shadow-2xl p-6 sm:p-8 text-center backdrop-blur-2xl">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
          <Compass className="w-8 h-8 stroke-1.75 animate-pulse" />
        </div>

        <div className="text-5xl font-black font-mono tracking-tighter text-amber-300 mb-2">
          404
        </div>

        <h2 className="text-xl font-bold text-white tracking-tight mb-2">
          Không Tìm Thấy Trang
        </h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Đường dẫn bạn yêu cầu không tồn tại, đã được di dời hoặc tạm thời ngừng hoạt động trên hệ thống YukiShopMXH.
        </p>

        <div className="space-y-2.5">
          <Link
            href="/"
            className="w-full py-3 px-4 rounded-xl text-xs font-bold text-slate-950 btn-ios-white hover:opacity-95 transition flex items-center justify-center gap-2 shadow"
          >
            <Home className="w-4 h-4" />
            <span>Quay Về Trang Chủ</span>
          </Link>

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
    </div>
  );
}
