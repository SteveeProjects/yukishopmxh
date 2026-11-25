'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Moon, Radio, ShieldCheck, ArrowUpRight } from 'lucide-react';
import type { SystemConfig } from '@/types/settings';

interface ServiceStatusBarProps {
  systemConfig?: SystemConfig | null;
  bannerText?: string | null;
  bannerActive?: boolean;
  supportTelegramUrl?: string | null;
}

export function ServiceStatusBar({
  systemConfig: propSysCfg,
  bannerText: propBannerText,
  bannerActive: propBannerActive,
  supportTelegramUrl: propTgUrl,
}: ServiceStatusBarProps) {
  const [sysCfg, setSysCfg] = useState<SystemConfig | null>(propSysCfg || null);
  const [bannerText, setBannerText] = useState<string>(propBannerText || '');
  const [bannerActive, setBannerActive] = useState<boolean>(Boolean(propBannerActive));
  const [supportUrl, setSupportUrl] = useState<string>(
    propTgUrl || process.env.NEXT_PUBLIC_ADMIN_TELEGRAM || 'https://t.me/yukismsnotice'
  );

  useEffect(() => {
    if (propSysCfg !== undefined) {
      setSysCfg(propSysCfg);
      if (propBannerText !== undefined) setBannerText(propBannerText || '');
      if (propBannerActive !== undefined) setBannerActive(Boolean(propBannerActive));
      if (propTgUrl) setSupportUrl(propTgUrl);
      return;
    }

    let cancelled = false;
    fetch('/api/settings/announcement')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.systemConfig) setSysCfg(data.systemConfig);
        if (data?.config) {
          setBannerText(data.config.banner_text || '');
          setBannerActive(Boolean(data.config.banner_active));
          if (data.config.support_telegram_url || data.config.cta_link) {
            setSupportUrl(data.config.support_telegram_url || data.config.cta_link);
          }
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [propSysCfg, propBannerText, propBannerActive, propTgUrl]);

  const isSleep = Boolean(sysCfg?.sleep_mode);

  return (
    <div
      className={`rounded-2xl border px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs transition-colors ${
        isSleep
          ? 'bg-amber-500/[0.07] border-amber-400/25 text-amber-100'
          : 'liquid-glass-card border-white/[0.08] text-slate-300'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {isSleep ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 font-semibold shrink-0">
            <Moon className="w-3.5 h-3.5" />
            <span>Tạm nghỉ duyệt tay</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/12 border border-emerald-400/25 text-emerald-300 font-semibold shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <Radio className="w-3 h-3 hidden sm:inline" />
            <span>Nạp Auto 24/7</span>
          </span>
        )}

        <p className="truncate text-slate-300">
          {isSleep
            ? sysCfg?.sleep_message ||
              'Nạp ví Auto 24/7 vẫn hoạt động; đơn xử lý thủ công sẽ được duyệt ngay khi mở ca.'
            : bannerActive && bannerText
              ? bannerText
              : 'VietQR nhận tiền tự động • Bảo hành minh bạch • Hoàn 2% đơn từ 20.000đ'}
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-auto">
        <Link
          href="/orders"
          className="text-[11px] font-medium text-sky-300 hover:text-sky-200 inline-flex items-center gap-1 transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Tra cứu đơn</span>
        </Link>
        <a
          href={supportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-medium text-slate-400 hover:text-white inline-flex items-center gap-0.5 transition-colors"
        >
          <span>Hỗ trợ</span>
          <ArrowUpRight className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
