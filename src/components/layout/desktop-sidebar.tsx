'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { calculateVipTier } from '@/lib/vip-tier';
import { BrandLogo } from '@/components/common/brand-logo';
import {
  Home,
  ShoppingBag,
  Sparkles,
  Wallet,
  Clock,
  ShieldCheck,
  User,
  LogOut,
  ChevronRight,
  Search,
  Gift,
} from 'lucide-react';

interface DesktopSidebarProps {
  onOpenSearch?: () => void;
}

export function DesktopSidebar({ onOpenSearch }: DesktopSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, role, wallet, lifetimeDeposit, signOut } = useAuth();

  const isAdmin =
    role === 'ADMIN' ||
    (profile as any)?.role === 'admin' ||
    (user as any)?.role === 'admin';

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      // Ignore network errors
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      router.push('/login');
    }
  };

  const navItems = useMemo(
    () => [
      { href: '/', label: 'Cửa Hàng', icon: Home, matchExact: true },
      { href: '/services', label: 'Kho Bản Quyền', icon: ShoppingBag, matchExact: false },
      { href: '/buff', label: 'Buff MXH', icon: Sparkles, matchExact: false },
      { href: '/wallet', label: 'Ví Tiền', icon: Wallet, matchExact: false },
      { href: '/spin', label: 'Vòng Quay May Mắn', icon: Gift, matchExact: false },
      { href: '/orders', label: 'Lịch Sử Đơn', icon: Clock, matchExact: false },
      { href: '/warranty', label: 'Bảo Hành', icon: ShieldCheck, matchExact: false },
      { href: '/profile', label: 'Hồ Sơ & Affiliate', icon: User, matchExact: false },
    ],
    []
  );

  const activeNavIndex = useMemo(() => {
    return navItems.findIndex((item) => {
      if (item.matchExact) return pathname === item.href;
      if (item.href === '/services') {
        return (
          pathname === '/services' ||
          pathname.startsWith('/services/') ||
          (pathname.startsWith('/store') && !pathname.includes('api-tool-sms'))
        );
      }
      return pathname === item.href || pathname.startsWith(item.href + '/');
    });
  }, [navItems, pathname]);

  const formatVND = (num: number) =>
    new Intl.NumberFormat('vi-VN').format(num) + 'đ';

  const vipInfo = calculateVipTier(lifetimeDeposit);

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-60 bg-[#07090E]/88 backdrop-blur-2xl border-r border-white/[0.08] z-40 select-none">
      {/* Brand Logo Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-white/[0.08] shrink-0">
        <Link href="/" className="flex items-center group min-w-0">
          <BrandLogo size="sm" />
        </Link>

        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-sky-500/10 transition"
            title="Tìm kiếm nhanh (Ctrl+K)"
            aria-label="Tìm kiếm nhanh"
          >
            <Search className="w-4 h-4" strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Wallet & VIP Card */}
      <div className="p-3 shrink-0">
        <Link
          href="/wallet"
          className="block rounded-2xl bg-white/[0.035] hover:bg-white/[0.06] border border-white/[0.08] hover:border-sky-400/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] p-3 transition-all group"
        >
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Wallet className="w-3.5 h-3.5 text-[#0EA5E9]" strokeWidth={1.75} />
              <span>Số Dư Ví</span>
            </span>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${vipInfo.badgeClass}`}>
              {vipInfo.badge}
            </span>
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-base font-black font-mono tabular-nums tracking-tight text-white group-hover:text-sky-300 transition-colors">
              {formatVND(wallet?.balance || 0)}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#0EA5E9] group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>
      </div>

      {/* Navigation Links with Spring Pill Indicator */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 text-xs relative">
        <div className="relative space-y-1">
          {activeNavIndex >= 0 && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-0 right-0 h-10 rounded-xl bg-[#0EA5E9]/14 border border-sky-400/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_4px_16px_rgba(14,165,233,0.14)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                transform: `translate3d(0, ${activeNavIndex * 44}px, 0)`,
              }}
            />
          )}

          {navItems.map((item, idx) => {
            const isActive = idx === activeNavIndex;
            const IconComponent = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative z-10 h-10 flex items-center gap-3 px-3 rounded-xl transition-colors ${
                  isActive
                    ? 'text-sky-200 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <IconComponent
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#0EA5E9]' : 'text-slate-400'
                  }`}
                  strokeWidth={1.75}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Admin Navigation Item */}
        {isAdmin && (
          <div className="pt-3 border-t border-sky-200/[0.08] mt-3">
            <Link
              href="/admin"
              className={`h-10 flex items-center gap-3 px-3 rounded-xl transition-all ${
                pathname.startsWith('/admin')
                  ? 'bg-[#0EA5E9]/15 border border-sky-400/35 text-sky-200 font-bold'
                  : 'text-sky-400 hover:text-sky-200 hover:bg-sky-500/10'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#0EA5E9]" strokeWidth={1.75} />
              <span>Quản Trị Admin</span>
            </Link>
          </div>
        )}
      </nav>

      {/* Bottom User Area */}
      <div className="p-3 border-t border-white/[0.08] bg-[#07090E]/75 shrink-0 text-xs">
        {user ? (
          <div className="flex items-center justify-between gap-2">
            <Link href="/profile" className="flex items-center gap-2.5 truncate hover:opacity-85 transition">
              <div className="w-8 h-8 rounded-xl bg-[#0EA5E9]/15 border border-sky-400/30 flex items-center justify-center font-bold text-sky-200 shrink-0 text-xs">
                {(profile?.fullName || user.email || 'Y').charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <div className="font-bold text-white truncate text-xs">
                  {profile?.fullName || user.email?.split('@')[0] || 'Thành viên'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {isAdmin ? 'Quản trị viên' : 'Thành viên'}
                </div>
              </div>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
              title="Đăng xuất"
              aria-label="Đăng xuất"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="flex-1 py-2 text-center rounded-xl btn-ios-blue text-xs"
            >
              Đăng Nhập
            </Link>
            <Link
              href="/register"
              className="px-3 py-2 text-center rounded-xl btn-ios-secondary text-xs"
            >
              Đăng Ký
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
