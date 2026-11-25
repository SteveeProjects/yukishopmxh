'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Send,
  ExternalLink,
} from 'lucide-react';
import { PortalModal } from '@/components/PortalModal';
import { Button } from '@/components/ui/button';
import { ADMIN_TELEGRAM_URL } from '@/lib/constants';

interface PreOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  orderType?: 'PRODUCT' | 'BUFF' | 'SMS';
  title?: string;
  orderSummary?: {
    name: string;
    price: number;
    quantity?: number;
    details?: string;
  };
  isSubmitting?: boolean;
}

export function PreOrderModal({
  isOpen,
  onClose,
  onConfirm,
  orderType = 'PRODUCT',
  title = 'Xác Nhận & Lưu Ý Đơn Hàng',
  orderSummary,
  isSubmitting = false,
}: PreOrderModalProps) {
  const [agreed, setAgreed] = useState(false);

  const formatVND = (amount: number) =>
    new Intl.NumberFormat('vi-VN').format(amount);

  const handleConfirm = () => {
    if (!agreed) return;
    onConfirm();
  };

  return (
    <PortalModal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      closeOnBackdropClick={!isSubmitting}
      maxWidthClass="sm:max-w-md"
      title={
        <span className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" strokeWidth={1.75} />
          </span>
          <span>{title}</span>
        </span>
      }
    >
      <div className="space-y-3.5 text-xs">
        {orderSummary && (
          <div className="p-3.5 rounded-2xl bg-[#07090E]/90 border border-white/[0.08] space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Gói dịch vụ đã chọn
            </div>
            <div className="font-bold text-white text-xs sm:text-sm">
              {orderSummary.name}
            </div>
            {orderSummary.details && (
              <div className="text-[11px] text-slate-400">
                {orderSummary.details}
              </div>
            )}
            <div className="flex items-center justify-between pt-1.5 text-xs">
              <span className="text-slate-400">Thành tiền:</span>
              <span className="font-mono tabular-nums font-bold text-[#38BDF8] text-sm">
                {formatVND(orderSummary.price)} VNĐ
              </span>
            </div>
          </div>
        )}

        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-100 space-y-2">
          <div className="font-bold text-xs flex items-center gap-1.5 text-amber-300">
            <Clock className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
            <span>Lưu Ý Xử Lý Đơn Hàng</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Lưu ý: Hiện tại hệ thống chưa tích hợp API xử lý tự động. Sau khi đặt đơn thành công, vui lòng nhắn tin trực tiếp cho Admin để được kiểm tra và kích hoạt nhanh nhất.
          </p>
        </div>

        <a
          href="https://t.me/YukiIsMe2311"
          target="_blank"
          rel="noopener noreferrer"
          className="py-2.5 px-3 rounded-xl bg-sky-500/15 border border-sky-400/35 text-sky-300 hover:bg-sky-500/25 font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
        >
          <Send className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
          <span>💬 Liên Hệ Admin Ngay (@YukiIsMe2311) ↗</span>
        </a>

        <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none p-2.5 rounded-xl bg-[#07090E]/80 border border-white/[0.08] hover:border-sky-400/40 transition">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 rounded border-slate-600 text-[#0EA5E9] focus:ring-[#0EA5E9] h-4 w-4 shrink-0 bg-[#07090E]"
          />
          <span className="text-slate-200 font-semibold leading-snug">
            Tôi đã kiểm tra thông tin nhận hàng và đồng ý xác nhận đặt đơn
          </span>
        </label>

        <div className="pt-2 border-t border-white/[0.08] flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs font-semibold px-3 py-2 rounded-xl text-slate-300 hover:text-white"
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!agreed || isSubmitting}
            isLoading={isSubmitting}
            className={`text-xs font-bold px-4 py-2 rounded-xl transition ${
              agreed
                ? 'btn-ios-blue'
                : 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-400'
            }`}
          >
            {orderType === 'BUFF' ? 'Xác Nhận Thuê Dịch Vụ' : 'Xác Nhận Mua Hàng'}
          </Button>
        </div>
      </div>
    </PortalModal>
  );
}
