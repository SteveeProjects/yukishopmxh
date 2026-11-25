'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, Crown, Gift, Ticket, Wallet, Sparkles, Check, ArrowRight, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';

interface MonthlyRewardNotification {
  id: string;
  userId: string;
  userEmail: string;
  month: string;
  rank: number;
  totalDeposit: number;
  tierName: string;
  rewardDescription: string;
  walletReward: number;
  voucherCode?: string;
  voucherPercent?: number;
  voucherMinOrder?: number;
  voucherMaxDiscount?: number;
  spinTickets: number;
  isSeen: boolean;
  createdAt: string;
}

export function MonthlyRewardModal() {
  const { user, refreshUserData } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [notification, setNotification] = useState<MonthlyRewardNotification | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check for unseen monthly rewards
  const checkUnseenReward = useCallback(async () => {
    if (!user) {
      setNotification(null);
      return;
    }
    try {
      const res = await fetch('/api/user/monthly-reward/unseen', { cache: 'no-store', credentials: 'include' });
      const data = await res.json();
      if (data.success && data.notification) {
        setNotification(data.notification);
      } else {
        setNotification(null);
      }
    } catch {}
  }, [user]);

  useEffect(() => {
    checkUnseenReward();
  }, [checkUnseenReward]);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (notification && mounted) {
      const originalStyle = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [notification, mounted]);

  const handleClaim = async () => {
    if (!notification || claiming) return;
    setClaiming(true);
    try {
      const res = await fetch('/api/user/monthly-reward/claim', {
        cache: 'no-store',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: notification.id }),
      });
      const data = await res.json();
      if (data.success) {
        setClaimed(true);
        if (refreshUserData) {
          refreshUserData();
        }
        setTimeout(() => {
          setNotification(null);
          setClaimed(false);
        }, 1800);
      }
    } catch {
      setNotification(null);
    } finally {
      setClaiming(false);
    }
  };

  const handleDismiss = async () => {
    if (!notification) return;
    try {
      await fetch('/api/user/monthly-reward/claim', {
        cache: 'no-store',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: notification.id }),
      });
    } catch {}
    setNotification(null);
  };

  if (!mounted || !notification) return null;

  const formatVND = (num: number) =>
    new Intl.NumberFormat('vi-VN').format(num) + 'đ';

  const modalContent = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div className="relative max-w-lg w-full p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#141b2d] via-[#090d18] to-[#04060c] border border-amber-400/40 shadow-[0_25px_70px_rgba(245,158,11,0.3)] text-center space-y-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
          title="Đóng"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Floating Crown / Trophy Badge */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 text-black flex items-center justify-center shadow-2xl shadow-amber-500/40">
          {notification.rank === 1 ? (
            <Crown className="w-10 h-10 fill-black stroke-black" />
          ) : (
            <Trophy className="w-10 h-10 stroke-black fill-yellow-200" />
          )}
          <div className="absolute -bottom-2 px-2.5 py-0.5 rounded-full bg-black text-amber-300 font-mono text-[10px] font-black border border-amber-400/50 uppercase tracking-wider">
            TOP #{notification.rank}
          </div>
        </div>

        {/* Title Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Vinh Danh Bảng Vàng Tháng {notification.month}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Chúc Mừng {notification.tierName}!
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Tổng nạp trong tháng: <strong className="text-amber-300 font-mono">{formatVND(notification.totalDeposit)}</strong>
          </p>
        </div>

        {/* Reward Showcase Cards */}
        <div className="grid grid-cols-1 gap-2.5 text-left">
          {notification.walletReward > 0 && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-sky-500/10 to-blue-500/5 border border-sky-400/25 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center font-bold shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-sky-300 font-bold uppercase">Số Dư Ví Mua Hàng</div>
                <div className="text-sm font-black text-white font-mono">
                  +{formatVND(notification.walletReward)}
                </div>
              </div>
            </div>
          )}

          {notification.voucherCode && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border border-amber-400/25 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold shrink-0">
                <Gift className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-amber-300 font-bold uppercase">Voucher Đặc Quyền VIP</div>
                <div className="text-xs font-black text-white">
                  Giảm {notification.voucherPercent}% • Mã: <span className="font-mono text-amber-300">{notification.voucherCode}</span>
                </div>
                {notification.voucherMinOrder && (
                  <div className="text-[10px] text-slate-400">
                    Áp dụng cho đơn từ {formatVND(notification.voucherMinOrder)}
                  </div>
                )}
              </div>
            </div>
          )}

          {notification.spinTickets > 0 && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-400/25 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold shrink-0">
                <Ticket className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-emerald-300 font-bold uppercase">Vé Quay May Mắn (Lucky Spin)</div>
                <div className="text-sm font-black text-white font-mono">
                  +{notification.spinTickets} Vé Quay Miễn Phí
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CTA Button */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={handleClaim}
            disabled={claiming || claimed}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-sm uppercase tracking-wider transition-all shadow-[0_10px_30px_rgba(245,158,11,0.35)] disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
          >
            {claimed ? (
              <>
                <Check className="w-5 h-5" />
                <span>ĐÃ NHẬN THÀNH CÔNG!</span>
              </>
            ) : claiming ? (
              <span>Đang nhận quà...</span>
            ) : (
              <>
                <Gift className="w-5 h-5" />
                <span>Nhận Quà & Dùng Ngay</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400">
            <Link href="/spin" onClick={handleDismiss} className="text-amber-400 hover:underline">
              Vào Vòng Quay May Mắn →
            </Link>
            <span>•</span>
            <Link href="/services" onClick={handleDismiss} className="text-sky-400 hover:underline">
              Mua sắm ngay →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
