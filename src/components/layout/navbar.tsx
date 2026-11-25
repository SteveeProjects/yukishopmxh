'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import {
  Menu,
  Bell,
  LogIn,
  Search,
  Plus,
} from 'lucide-react';
import { AnimatedCounter } from '@/components/common/animated-counter';
import { BrandLogo } from '@/components/common/brand-logo';

interface NavbarProps {
  onOpenDrawer?: () => void;
  onOpenSearch?: () => void;
}

export function Navbar({ onOpenDrawer, onOpenSearch }: NavbarProps) {
  const { user, wallet } = useAuth();
  const [hasUnreadNotice, setHasUnreadNotice] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 18);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!user) {
      setHasUnreadNotice(false);
      return;
    }
    fetch('/api/orders', { cache: 'no-store', credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.orders)) {
          const hasActive = data.orders.some(
            (o: any) => o.status === 'pending' || o.status === 'waiting_confirm'
          );
          setHasUnreadNotice(hasActive);
        }
      })
      .catch(() => setHasUnreadNotice(false));
  }, [user]);

  return (
    <header
      className={`sticky top-0 z-30 w-full h-14 transition-all duration-300 lg:pl-60 ${
        isScrolled
          ? 'bg-[#07090E]/85 backdrop-blur-2xl border-b border-white/[0.08] shadow-[inset_0_-1px_0_rgba(255,255,255,0.06),0_12px_32px_rgba(0,0,0,0.45)]'
          : 'bg-[#07090E]/20 backdrop-blur-md border-b border-transparent'
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 h-full flex items-center justify-between gap-2">
        {/* Left: Mobile Drawer Trigger + Brand Identity */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenDrawer}
            className="touch-target p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors lg:hidden"
            aria-label="Mở menu điều hướng"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/" className="flex items-center shrink-0 group lg:hidden">
            <BrandLogo size="sm" />
          </Link>
        </div>

        {/* Center/Left on PC: Quick Command Search Trigger */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="hidden sm:flex items-center justify-between gap-4 w-full max-w-sm h-9 px-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-sky-400/35 text-xs text-slate-400 transition-colors"
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-sky-400 shrink-0" strokeWidth={1.75} />
            <span className="truncate">Tìm nhanh dịch vụ, SKU...</span>
          </span>
          <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded bg-[#07090E] border border-white/[0.08] text-[10px] font-mono text-slate-400">
            Ctrl K
          </kbd>
        </button>

        {/* Right: Mobile Search + Notification + Compact Balance Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenSearch}
            className="sm:hidden touch-target w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-300 hover:text-sky-400 transition"
            aria-label="Tìm kiếm dịch vụ"
          >
            <Search className="w-4 h-4" strokeWidth={1.75} />
          </button>

          <Link
            href="/notifications"
            className="touch-target w-9 h-9 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-slate-300 hover:text-white relative transition active:scale-95"
            aria-label="Thông báo"
            title="Thông báo"
          >
            <Bell className="w-4 h-4" strokeWidth={1.75} />
            {hasUnreadNotice && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#0EA5E9]" />
            )}
          </Link>

          {user ? (
            <Link
              href="/wallet"
              className="h-9 px-3 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-sky-400/25 flex items-center gap-1.5 font-mono tabular-nums text-xs transition-all active:scale-95"
              title="Nạp tiền vào ví"
            >
              <span className="text-white font-bold tracking-tight whitespace-nowrap">
                <AnimatedCounter value={wallet?.balance || 0} suffix="đ" />
              </span>
              <span className="w-4 h-4 rounded-full bg-[#0EA5E9] text-[#07090E] flex items-center justify-center shrink-0">
                <Plus className="w-3 h-3" strokeWidth={2.5} />
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="h-9 px-3.5 rounded-full text-xs font-bold btn-ios-blue flex items-center gap-1.5 active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Đăng nhập</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
