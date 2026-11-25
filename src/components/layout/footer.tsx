'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Send, ArrowUpRight } from 'lucide-react';
import { ADMIN_TELEGRAM_URL, ADMIN_SUPPORT_LABEL } from '@/lib/constants';

export function Footer() {
  const [supportUrl, setSupportUrl] = useState(ADMIN_TELEGRAM_URL);
  const [channelUrl, setChannelUrl] = useState(
    process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL || ADMIN_TELEGRAM_URL
  );

  useEffect(() => {
    fetch('/api/settings/announcement')
      .then((res) => res.json())
      .then((json) => {
        const customSupport = json?.data?.support_telegram_url || json?.data?.cta_link;
        if (typeof customSupport === 'string' && customSupport.startsWith('https://')) {
          setSupportUrl(customSupport);
        }
        const customChannel = json?.data?.channel_telegram_url;
        if (typeof customChannel === 'string' && customChannel.startsWith('https://')) {
          setChannelUrl(customChannel);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <footer className="w-full border-t border-white/[0.08] bg-[#050811]/95 backdrop-blur-2xl mt-12 pt-10 pb-28 md:pb-12 lg:pl-64 text-slate-300">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Main 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* CỘT 1 — Nhận Diện Thương Hiệu */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2.5">
              <span className="text-lg font-black tracking-wider text-white">
                YUKISHOP<span className="text-amber-400">MXH</span>
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Hệ thống tài khoản AI bản quyền chính chủ & dịch vụ mạng xã hội tự động 24/7.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span>Hệ thống nạp VietQR & xử lý đơn trực tuyến</span>
            </div>
          </div>

          {/* CỘT 2 — Chính Sách & Quy Định */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400/90">
              Chính Sách & Quy Định
            </div>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link
                  href="/terms"
                  className="text-slate-300 hover:text-amber-300 transition flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
                  <span>Điều khoản sử dụng dịch vụ</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-slate-300 hover:text-amber-300 transition flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
                  <span>Chính sách bảo mật thông tin</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/warranty-policy"
                  className="text-slate-300 hover:text-amber-300 transition flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
                  <span>Chính sách bảo hành & hoàn tiền</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 3 — Kênh Thông Tin & Hỗ Trợ */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400/90">
              Kênh Thông Tin & Hỗ Trợ
            </div>

            <div className="space-y-2.5">
              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-amber-400/30 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-400/30 text-sky-300 flex items-center justify-center shrink-0">
                    <Send className="w-3.5 h-3.5" strokeWidth={1.8} />
                  </span>
                  <span className="text-xs font-semibold text-white group-hover:text-amber-300 transition">
                    Kênh Telegram Update Tech & Shop
                  </span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-300 transition" />
              </a>

              <a
                href={supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-amber-400/30 transition flex items-center justify-between group"
              >
                <div className="text-xs text-slate-300">
                  <span className="text-slate-400">Admin hỗ trợ trực tiếp: </span>
                  <span className="font-bold text-amber-300">{ADMIN_SUPPORT_LABEL}</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-300 transition" />
              </a>
            </div>
          </div>
        </div>

        {/* Thanh bản quyền dưới cùng */}
        <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 text-center sm:text-left">
          <div>© 2026 YUKISHOPMXH. Mọi quyền được bảo lưu.</div>
          <div className="text-slate-600 font-mono text-[10px]">
            VietQR 24/7 • Multi-Tier Security • Zero AI Gimmicks
          </div>
        </div>
      </div>
    </footer>
  );
}
