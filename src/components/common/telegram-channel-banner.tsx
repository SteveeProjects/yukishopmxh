'use client';

import React from 'react';
import { Send, ArrowUpRight, Bell, Sparkles } from 'lucide-react';
import { ADMIN_TELEGRAM_URL } from '@/lib/constants';

interface TelegramChannelBannerProps {
  className?: string;
  channelUrl?: string;
}

export function TelegramChannelBanner({
  className = '',
  channelUrl,
}: TelegramChannelBannerProps) {
  const targetUrl =
    channelUrl ||
    process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL ||
    ADMIN_TELEGRAM_URL;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0c1324] via-[#080d19] to-[#05070e] border border-amber-400/25 p-4 sm:p-6 shadow-[0_12px_32px_rgba(0,0,0,0.45)] ${className}`}
    >
      {/* Background ambient gold & sky glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Info */}
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-sky-500/20 via-amber-500/15 to-transparent border border-sky-400/30 flex items-center justify-center shrink-0 shadow-[0_4px_16px_rgba(14,165,233,0.2)]">
            <Send className="w-5 h-5 sm:w-6 sm:h-6 text-sky-300 -translate-x-0.5 translate-y-0.5" strokeWidth={1.8} />
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/12 border border-amber-400/30 text-[10px] font-bold text-amber-300">
                <Bell className="w-2.5 h-2.5" />
                <span>Kênh Thông Báo Chính Thức</span>
              </span>
            </div>

            <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate">
              Kênh Telegram Update Tech & Shop
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              Cập nhật thủ thuật công nghệ, công cụ AI mới, thông báo bảo trì server và mã ưu đãi độc quyền của YUKISHOPMXH.
            </p>
          </div>
        </div>

        {/* Right CTA */}
        <div className="shrink-0 flex items-center sm:self-center">
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-[#07090E] font-black text-xs uppercase tracking-wider transition-all shadow-[0_6px_20px_rgba(245,158,11,0.28)] active:scale-[0.98]"
          >
            <span>Tham Gia Kênh Update</span>
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
          </a>
        </div>
      </div>
    </div>
  );
}
