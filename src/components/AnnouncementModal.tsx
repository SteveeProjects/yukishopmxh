'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BellRing, ArrowRight, Clock } from 'lucide-react';
import { PortalModal } from '@/components/PortalModal';
import { AnnouncementPopupConfig } from '@/types/settings';

const HIDE_UNTIL_KEY = 'hide_announcement_until';
const LAST_UPDATED_KEY = 'yuki_announcement_last_updated';
const SESSION_CLOSED_KEY = 'yuki_announcement_closed_session';

const DEFAULT_NOTICE_CONFIG: AnnouncementPopupConfig = {
  is_active: false,
  banner_active: true,
  title: 'Lưu Ý Vận Hành YukiShopMXH',
  content:
    '• Nạp ví ZaloPay VietQR theo đúng Mã Đơn Hàng (VD: YukiSp_000001) để hệ thống tự động cộng số dư trong 5–15 giây (tối đa 2.000.000đ/giao dịch).\n• Đơn hàng bản quyền & Buff MXH được kiểm duyệt chuẩn xác 24/7.\n• Cần hỗ trợ nhanh hoặc bảo hành? Nhắn trực tiếp Admin @YukiIsMe2311.',
  cta_text: 'Liên Hệ Hỗ Trợ Telegram',
  cta_link: 'https://t.me/YukiIsMe2311',
  banner_text: '',
  updated_at: '',
};

declare global {
  interface Window {
    openWelcomeNotice?: () => void;
  }
}

export default function AnnouncementModal() {
  const [config, setConfig] = useState<AnnouncementPopupConfig>(DEFAULT_NOTICE_CONFIG);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [forcedOpen, setForcedOpen] = useState<boolean>(false);

  useEffect(() => {
    window.openWelcomeNotice = () => {
      setForcedOpen(true);
      setIsOpen(true);
    };

    fetch('/api/settings/announcement')
      .then((res) => res.json())
      .then((json) => {
        if (!json.success || !json.data) return;
        const cfg: AnnouncementPopupConfig = {
          ...DEFAULT_NOTICE_CONFIG,
          ...json.data,
          content: json.data.content || DEFAULT_NOTICE_CONFIG.content,
        };
        setConfig(cfg);

        if (!cfg.is_active) return;

        const sessionDismissed = sessionStorage.getItem(SESSION_CLOSED_KEY);
        if (sessionDismissed === 'true') return;

        const hideUntil = localStorage.getItem(HIDE_UNTIL_KEY);
        const lastUpdated = localStorage.getItem(LAST_UPDATED_KEY);
        const isContentUpdated = cfg.updated_at && lastUpdated && cfg.updated_at !== lastUpdated;

        if (hideUntil && !isContentUpdated) {
          const expiry = parseInt(hideUntil, 10);
          if (Date.now() < expiry) return;
        }

        setIsOpen(true);
      })
      .catch(() => {});

    return () => {
      if (window.openWelcomeNotice) {
        delete window.openWelcomeNotice;
      }
    };
  }, []);

  const handleCloseSession = () => {
    setIsOpen(false);
    setForcedOpen(false);
    try {
      sessionStorage.setItem(SESSION_CLOSED_KEY, 'true');
    } catch {}
  };

  const handleSnooze3Hours = () => {
    setIsOpen(false);
    setForcedOpen(false);
    try {
      const threeHoursLater = Date.now() + 3 * 60 * 60 * 1000;
      localStorage.setItem(HIDE_UNTIL_KEY, threeHoursLater.toString());
      if (config?.updated_at) {
        localStorage.setItem(LAST_UPDATED_KEY, config.updated_at);
      }
    } catch {}
  };

  if (!isOpen && !forcedOpen) {
    return null;
  }

  return (
    <PortalModal
      isOpen={isOpen}
      onClose={handleCloseSession}
      maxWidthClass="sm:max-w-md"
      title={
        <span className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center shrink-0">
            <BellRing className="w-4 h-4 text-[#0EA5E9]" strokeWidth={1.75} />
          </span>
          <span>{config.title || 'Thông Báo Từ YukiShopMXH'}</span>
        </span>
      }
    >
      <div className="space-y-4">
        <div className="text-xs sm:text-sm text-slate-300 leading-relaxed max-h-[50vh] overflow-y-auto pr-1 whitespace-pre-wrap select-text">
          {config.content}
        </div>

        {config.cta_link && (() => {
          const rawLink = config.cta_link.trim();
          const isExternal = rawLink.startsWith('https://') || rawLink.startsWith('http://');
          const isInternal = rawLink.startsWith('/');
          if (!isExternal && !isInternal) return null;

          return isExternal ? (
            <a
              href={rawLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleCloseSession}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-bold btn-ios-blue transition flex items-center justify-center gap-1.5"
            >
              <span>{config.cta_text || 'Xem Chi Tiết'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          ) : (
            <Link
              href={rawLink}
              onClick={handleCloseSession}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-bold btn-ios-blue transition flex items-center justify-center gap-1.5"
            >
              <span>{config.cta_text || 'Xem Chi Tiết'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          );
        })()}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={handleSnooze3Hours}
            className="w-full min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition flex items-center justify-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Không hiện lại trong 3h</span>
          </button>
          <button
            type="button"
            onClick={handleCloseSession}
            className="w-full min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold btn-ios-secondary transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </PortalModal>
  );
}
