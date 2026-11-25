'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { AlertCircle, X } from 'lucide-react';
import { ADMIN_TELEGRAM_URL, ADMIN_SUPPORT_LABEL } from '@/lib/constants';

export interface WelcomeNoticeProps {
  customTelegramUrl?: string;
  onOpenStateChange?: (isOpen: boolean) => void;
}

export const DEFAULT_WELCOME_CONFIG = {
  title: 'CHÀO MỪNG ĐẾN VỚI YUKISHOPMXH',
  greeting: 'Chào mừng bạn đến với YukiShopMXH! YukiShopMXH là nền tảng tài khoản chính chủ và dịch vụ tương tác mạng xã hội uy tín.',
  notes: [
    'Website hiện không đấu nối API tự động cho toàn bộ đơn hàng. Tất cả đơn hàng đều được Admin kiểm tra và duyệt thủ công.',
    'Giá và tình trạng sản phẩm cần được xác nhận trước khi mua. Khách hàng vui lòng nhắn tin cho Admin trước khi đặt hàng hoặc thực hiện bất kỳ giao dịch nào.',
    'Không tự ý chuyển khoản khi chưa được Admin xác nhận thông tin thanh toán.',
    'Không cung cấp mật khẩu, OTP hoặc thông tin nhạy cảm cho bất kỳ ai.',
  ],
  process: [
    '1. Xem sản phẩm hoặc dịch vụ.',
    '2. Liên hệ Admin trước khi mua.',
    '3. Xác nhận giá và tình trạng.',
    '4. Tạo yêu cầu đặt hàng.',
    '5. Chờ Admin kiểm tra và duyệt thủ công.',
    '6. Nhận kết quả xử lý.',
  ],
  telegramUrl: ADMIN_TELEGRAM_URL,
  discordUrl: 'https://discord.com/users/1312037242331729971',
};

export default function WelcomeNotice({ customTelegramUrl, onOpenStateChange }: WelcomeNoticeProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const telegramUrl = customTelegramUrl || DEFAULT_WELCOME_CONFIG.telegramUrl;
  const discordUrl = DEFAULT_WELCOME_CONFIG.discordUrl;

  useEffect(() => {
    // Check if dismissed previously within 24h
    const dismissedAt = localStorage.getItem('yuki_welcome_notice_dismissed');
    if (!dismissedAt) {
      setIsOpen(true);
      onOpenStateChange?.(true);
    } else {
      const past = parseInt(dismissedAt, 10);
      const now = Date.now();
      // 24 hours expiry
      if (now - past > 24 * 60 * 60 * 1000) {
        setIsOpen(true);
        onOpenStateChange?.(true);
      }
    }

    // Expose window method to allow opening notice from anywhere (e.g. Menu)
    (window as any).openWelcomeNotice = () => {
      setIsOpen(true);
      onOpenStateChange?.(true);
    };
  }, [onOpenStateChange]);

  const handleDismiss = () => {
    localStorage.setItem('yuki_welcome_notice_dismissed', Date.now().toString());
    setIsOpen(false);
    onOpenStateChange?.(false);
  };

  const handleContactAdmin = () => {
    window.open(telegramUrl, '_blank', 'noopener,noreferrer');
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || !isOpen) return null;

  const noticeNode = (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in" data-lenis-prevent>
      <div 
        className="relative w-full max-w-lg bg-[#0E172E] border border-sky-500/30 rounded-3xl shadow-2xl text-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcomeNoticeTitle"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#0D1526] border-b border-sky-200/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h2 id="welcomeNoticeTitle" className="font-extrabold text-sm sm:text-base text-white tracking-wide">
                {DEFAULT_WELCOME_CONFIG.title}
              </h2>
              <p className="text-[10px] text-slate-400 font-medium">Quy trình vận hành & kiểm duyệt thủ công</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleDismiss} 
            className="w-8 h-8 rounded-full bg-white/[0.06] text-slate-400 hover:text-white flex items-center justify-center transition"
            aria-label="Đóng thông báo"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs leading-relaxed">
          <p className="text-slate-300 font-medium">
            {DEFAULT_WELCOME_CONFIG.greeting}
          </p>

          {/* Important Notes */}
          <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
            <div className="font-extrabold text-amber-400 text-xs flex items-center gap-1.5 uppercase tracking-wider">
              <span>LƯU Ý QUAN TRỌNG:</span>
            </div>
            <ul className="space-y-1.5 text-slate-300">
              {DEFAULT_WELCOME_CONFIG.notes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-amber-400 font-bold shrink-0">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Process Workflow */}
          <div className="p-3.5 rounded-2xl bg-sky-950/20 border border-sky-500/20 space-y-2">
            <div className="font-extrabold text-sky-400 text-xs uppercase tracking-wider">
              QUY TRÌNH ĐẶT HÀNG:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-300">
              {DEFAULT_WELCOME_CONFIG.process.map((step, idx) => (
                <div key={idx} className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  {step}
                </div>
              ))}
            </div>
          </div>

          <div className="text-center pt-1">
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-sky-400 hover:underline font-semibold"
            >
              Xem chi tiết Điều khoản dịch vụ & Chính sách bảo hành [BHF, BH24H, KBH] ➔
            </a>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 bg-[#0B1126] border-t border-slate-800 flex flex-col gap-2 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="touch-target py-2 px-3 rounded-2xl bg-[#229ED9] hover:bg-[#1E88C7] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 transition"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
              <span>Liên Hệ Telegram</span>
            </a>
            <a
              href={discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="touch-target py-2 px-3 rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 transition"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
              <span>Liên Hệ Discord</span>
            </a>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="touch-target w-full py-2.5 px-4 rounded-2xl btn-ios-white text-slate-950 font-bold text-xs flex items-center justify-center shadow transition"
          >
            <span>Đã Hiểu</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(noticeNode, document.body);
}
