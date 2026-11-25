'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Wallet,
  PlusCircle,
  ShieldCheck,
  Coins,
  Users,
  Copy,
  Check,
  Sparkles,
  ArrowRightLeft,
  ChevronRight,
  Disc,
} from 'lucide-react';

interface DigitalWalletCardProps {
  balance: number;
  userName?: string;
  userContact?: string;
  compact?: boolean;
  onRefresh?: () => void;
  className?: string;
  vipName?: string;
  vipDiscountPercent?: number;
  cashbackPoints?: number;
  affiliateBalance?: number;
  spinTickets?: number;
  withdrawableBalance?: number;
  referralLink?: string;
  onRedeemPoints?: () => void;
  redeemingPoints?: boolean;
}

export function DigitalWalletCard({
  balance = 0,
  userName = 'THÀNH VIÊN YUKISHOPMXH',
  userContact = 'YUKI-BLACK-CARD',
  compact = false,
  className = '',
  vipName,
  vipDiscountPercent = 0,
  cashbackPoints = 0,
  affiliateBalance = 0,
  spinTickets = 0,
  withdrawableBalance = 0,
  referralLink,
  onRedeemPoints,
  redeemingPoints = false,
}: DigitalWalletCardProps) {
  const [displayBalance, setDisplayBalance] = useState<number>(balance);
  const [copiedRef, setCopiedRef] = useState(false);
  const prevBalanceRef = useRef<number>(balance);

  // Smooth numerical spring easing on balance change
  useEffect(() => {
    const start = prevBalanceRef.current;
    const end = balance;
    if (start === end) {
      setDisplayBalance(end);
      return;
    }

    const duration = 850;
    const startTime = performance.now();

    function update(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayBalance(Math.round(start + (end - start) * ease));
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        prevBalanceRef.current = end;
      }
    }

    requestAnimationFrame(update);
  }, [balance]);

  const formatVND = (v: number) => new Intl.NumberFormat('vi-VN').format(v);
  const formattedBalance = formatVND(displayBalance);

  const handleCopyRef = async () => {
    if (!referralLink || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch {}
  };

  if (compact) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl p-4 bg-[#080b12] border border-amber-400/35 shadow-xl select-none transition-all duration-300 ${className}`}
        style={{
          backgroundImage: `
            repeating-linear-gradient(90deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 4px),
            radial-gradient(circle at 15% 15%, rgba(251,191,36,0.18) 0%, transparent 55%),
            linear-gradient(135deg, #111524 0%, #080a12 50%, #030407 100%)
          `,
        }}
      >
        <div className="flex items-center justify-between text-xs pb-1">
          <div className="flex items-center gap-1.5 text-amber-300 font-black uppercase tracking-wider text-[10px]">
            <Wallet className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Visa Black Yuki</span>
          </div>
          <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Active
          </span>
        </div>

        <div className="my-2">
          <div className="font-mono tabular-nums text-2xl font-black text-amber-300 tracking-tight flex items-baseline gap-1.5 drop-shadow-[0_2px_10px_rgba(245,158,11,0.3)]">
            <span>{formattedBalance}</span>
            <span className="text-xs font-sans font-bold text-amber-400">đ</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/wallet"
            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-md shadow-amber-500/20"
          >
            <PlusCircle className="w-3.5 h-3.5" strokeWidth={2} />
            <span>Nạp Tiền</span>
          </Link>
          <Link
            href="/spin"
            className="py-2 px-2.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-bold flex items-center gap-1"
            title="Vòng Quay May Mắn"
          >
            <Disc className="w-3.5 h-3.5 text-amber-400" />
            <span>{spinTickets}</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-5 sm:p-7 border border-amber-400/50 shadow-[0_25px_60px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,215,0,0.5),inset_0_0_20px_rgba(245,158,11,0.08),0_0_35px_rgba(245,158,11,0.12)] select-none ${className}`}
      style={{
        backgroundColor: '#070910',
        backgroundImage: `
          repeating-linear-gradient(90deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 4px),
          radial-gradient(circle at 15% 15%, rgba(251,191,36,0.24) 0%, transparent 55%),
          linear-gradient(135deg, #141a29 0%, #090c15 50%, #030408 100%)
        `,
      }}
    >
      {/* Gold Sheen Sweeping Animation */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-full bg-gradient-to-r from-transparent via-amber-300/[0.08] to-transparent -rotate-45 animate-[shimmer_7s_infinite_linear]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-amber-500/15 blur-3xl"
      />

      {/* Top Header: Logo & 3D Chip EMV & True Contactless Wave */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* 3D Golden EMV Chip */}
          <div className="relative w-12 h-8 rounded-md overflow-hidden shadow-[0_3px_10px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.7)] border border-amber-500/70 shrink-0">
            <svg className="w-full h-full" viewBox="0 0 48 32" fill="none">
              <rect width="48" height="32" fill="url(#chip-3d-gold)" />
              <rect x="1" y="1" width="46" height="30" rx="2" stroke="#fef08a" strokeWidth="0.6" fill="none" opacity="0.6" />
              <path d="M0 16h48M16 0v32M32 0v32M16 10h16M16 22h16" stroke="#78350f" strokeWidth="1.2" />
              <circle cx="24" cy="16" r="4" fill="#ca8a04" stroke="#78350f" strokeWidth="1" />
              <defs>
                <linearGradient id="chip-3d-gold" x1="0" y1="0" x2="48" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#fffbeb" />
                  <stop offset="0.25" stopColor="#fef08a" />
                  <stop offset="0.6" stopColor="#eab308" />
                  <stop offset="1" stopColor="#92400e" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Correct Contactless / NFC 3 Wave Arcs */}
          <div className="p-1 text-amber-300 drop-shadow-[0_1px_6px_rgba(245,158,11,0.6)]" title="Contactless Payment">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M8 7.5a6.5 6.5 0 0 1 0 9" />
              <path d="M12 5a10 10 0 0 1 0 14" />
              <path d="M16 2.5a14 14 0 0 1 0 19" />
            </svg>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-[11px] font-black tracking-widest uppercase text-amber-300 drop-shadow-[0_1px_6px_rgba(245,158,11,0.35)]">
              YUKISHOPMXH
            </span>
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40">
              BLACK PASS
            </span>
          </div>
          <div className="text-[11px] font-bold text-slate-200 mt-1 truncate max-w-[170px] sm:max-w-[240px]">
            {userName}
          </div>
        </div>
      </div>

      {/* Main Balance */}
      <div className="relative z-10 mt-6 pb-4 border-b border-amber-400/25">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-200/80">
            Số Dư Ví Mua Hàng
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-[10px] font-bold text-amber-300">
            <ShieldCheck className="w-3 h-3 text-amber-400" />
            <span>{vipName || 'VIP Member'}{vipDiscountPercent > 0 ? ` (-${vipDiscountPercent}%)` : ''}</span>
          </span>
        </div>

        <div className="font-mono tabular-nums text-3xl sm:text-4xl lg:text-5xl font-black text-amber-300 tracking-tight mt-1.5 flex items-baseline gap-2 drop-shadow-[0_3px_16px_rgba(245,158,11,0.35)]">
          <span>{formattedBalance}</span>
          <span className="text-base sm:text-lg font-bold text-amber-400">VND</span>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2">
          <span className="tracking-widest">•••• •••• •••• 2311</span>
          <span className="text-amber-300 font-black tracking-wider drop-shadow-sm">VISA SIGNATURE</span>
        </div>
      </div>

      {/* 3 Dark Glass Stat Pills: Vé Quay + Hoàn Điểm 2% + Rút Tiền Hoa Hồng */}
      <div className="relative z-10 grid grid-cols-3 gap-2 sm:gap-2.5 mt-4">
        {/* Vé quay -> Direct link to /spin */}
        <Link
          href="/spin"
          className="p-2.5 rounded-2xl bg-black/45 hover:bg-black/60 border border-amber-400/25 hover:border-amber-400/40 transition-all group block text-left"
        >
          <div className="flex items-center justify-between text-[10px] font-semibold text-amber-300">
            <span className="flex items-center gap-1">
              <Disc className="w-3 h-3 text-amber-400 group-hover:rotate-180 transition-transform duration-500" />
              <span>Vé Quay</span>
            </span>
            <ChevronRight className="w-3 h-3 text-amber-400/70 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="font-mono tabular-nums text-sm sm:text-base font-black text-amber-300 mt-1">
            {spinTickets} <span className="text-[10px] font-sans font-bold">vé</span>
          </div>
          <div className="text-[9px] text-amber-200/70 mt-0.5 truncate">Quay thưởng ngay</div>
        </Link>

        {/* Hoàn điểm 2% */}
        <div className="p-2.5 rounded-2xl bg-black/45 border border-amber-400/20 text-left">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
            <Coins className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="truncate">Điểm 2%</span>
          </div>
          <div className="font-mono tabular-nums text-sm sm:text-base font-black text-emerald-300 mt-1 truncate">
            {formatVND(cashbackPoints)}đ
          </div>
          <div className="text-[9px] text-slate-500 mt-0.5 truncate">Đổi ví từ 5k</div>
        </div>

        {/* Hoa hồng 5% / Rút tiền */}
        <Link
          href="/affiliate"
          className="p-2.5 rounded-2xl bg-black/45 hover:bg-black/60 border border-amber-400/20 hover:border-sky-400/40 transition-all text-left block"
        >
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
            <span className="flex items-center gap-1 truncate">
              <Users className="w-3 h-3 text-sky-400 shrink-0" />
              <span>Rút được</span>
            </span>
            <ChevronRight className="w-3 h-3 text-slate-500" />
          </div>
          <div className="font-mono tabular-nums text-sm sm:text-base font-black text-sky-300 mt-1 truncate">
            {formatVND(affiliateBalance || withdrawableBalance || 0)}đ
          </div>
          <div className="text-[9px] text-sky-400 mt-0.5 truncate">Rút về Bank</div>
        </Link>
      </div>

      {/* 3 Action Buttons on Exact 1 Line (No Wrap, No Break) */}
      <div className="relative z-10 grid grid-cols-3 gap-2 mt-4">
        {/* Nút 1: Đổi điểm 2% */}
        {onRedeemPoints ? (
          <button
            type="button"
            onClick={onRedeemPoints}
            disabled={redeemingPoints || cashbackPoints < 5000}
            className="h-9 px-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-[11px] font-bold text-emerald-200 flex items-center justify-center gap-1 disabled:opacity-40 transition active:scale-[0.98] whitespace-nowrap overflow-hidden"
            title="Đổi điểm hoàn 2% sang Ví mua hàng"
          >
            <ArrowRightLeft className="w-3 h-3 shrink-0" />
            <span className="truncate">{redeemingPoints ? 'Đang đổi...' : 'Đổi điểm 2%'}</span>
          </button>
        ) : (
          <Link
            href="/wallet#inline-deposit-section"
            className="h-9 px-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-[11px] font-bold text-emerald-200 flex items-center justify-center gap-1 transition active:scale-[0.98] whitespace-nowrap overflow-hidden"
          >
            <PlusCircle className="w-3 h-3 shrink-0" />
            <span className="truncate">Nạp Tiền</span>
          </Link>
        )}

        {/* Nút 2: Vòng Quay May Mắn (Vàng ánh kim nổi bật) */}
        <Link
          href="/spin"
          className="h-9 px-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black text-[11px] font-black flex items-center justify-center gap-1 transition shadow-lg shadow-amber-500/30 active:scale-[0.98] whitespace-nowrap overflow-hidden"
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">✨ Quay Thưởng</span>
        </Link>

        {/* Nút 3: Copy ID hoặc Link 5% */}
        {referralLink ? (
          <button
            type="button"
            onClick={handleCopyRef}
            className="h-9 px-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-amber-400/20 text-[11px] font-bold text-slate-200 flex items-center justify-center gap-1 transition active:scale-[0.98] whitespace-nowrap overflow-hidden"
            title="Sao chép link giới thiệu 5%"
          >
            {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Copy className="w-3 h-3 text-amber-300 shrink-0" />}
            <span className="truncate">{copiedRef ? 'Đã chép' : 'Link 5%'}</span>
          </button>
        ) : (
          <div className="h-9 px-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-slate-300 flex items-center justify-center gap-1 whitespace-nowrap overflow-hidden">
            <span className="truncate">{userContact}</span>
          </div>
        )}
      </div>
    </div>
  );
}
