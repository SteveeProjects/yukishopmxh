'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { BrandLogo } from '@/components/common/brand-logo';
import {
  X,
  ShoppingBag,
  Sparkles,
  Clock,
  CreditCard,
  User,
  ClipboardList,
  LogOut,
  ShieldCheck,
  BellRing,
  LogIn,
  UserPlus,
  Gift,
} from 'lucide-react';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SidebarDrawer({ isOpen, onClose }: SidebarDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, role, signOut } = useAuth();

  const isAdmin =
    role === 'ADMIN' ||
    (profile as any)?.role === 'admin' ||
    (user as any)?.role === 'admin';

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error(e);
    } finally {
      onClose();
      router.push('/login');
    }
  };

  if (!isOpen) return null;

  const handleOpenNotice = () => {
    onClose();
    if (typeof window !== 'undefined' && (window as any).openWelcomeNotice) {
      (window as any).openWelcomeNotice();
    }
  };

  const menuItems = [
    { href: '/', label: 'Cửa Hàng Trang Chủ', icon: ShoppingBag },
    { href: '/services', label: 'Kho Bản Quyền', icon: ShoppingBag },
    { href: '/buff', label: 'Buff MXH', icon: Sparkles },
    { href: '/wallet', label: 'Ví & Nạp Tiền', icon: CreditCard },
    { href: '/orders', label: 'Lịch Sử Đơn Hàng', icon: Clock },
    { href: '/warranty', label: 'Bảo Hành & Khiếu Nại', icon: ShieldCheck },
    { href: '/affiliate', label: 'Affiliate Hoa Hồng 5%', icon: Gift },
    { href: '/profile', label: 'Hồ Sơ Cá Nhân', icon: User },
    { href: '/terms', label: 'Điều Khoản & Bảo Hành', icon: ClipboardList },
  ];

  return (
    <div className="fixed inset-0 z-[110] flex" role="dialog" aria-modal="true" aria-label="Menu điều hướng">
      <div
        className="fixed inset-0 bg-[#05070B]/85 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-4/5 max-w-xs bg-[#07090E]/95 backdrop-blur-2xl text-slate-100 h-full shadow-2xl flex flex-col z-10 border-r border-white/[0.08]">
        {/* Header */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
          <BrandLogo size="sm" />
          <button
            type="button"
            onClick={onClose}
            className="touch-target w-8 h-8 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] flex items-center justify-center"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 text-xs font-semibold">
          <button
            type="button"
            onClick={handleOpenNotice}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-sky-500/10 border border-sky-400/25 text-sky-300 font-bold hover:bg-sky-500/15 transition text-left mb-2"
          >
            <BellRing className="w-4 h-4 shrink-0 text-[#0EA5E9]" strokeWidth={1.75} />
            <span className="truncate">Lưu Ý Vận Hành</span>
          </button>

          {menuItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(item.href + '/');
            const IconComp = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
                  isActive
                    ? 'bg-sky-500/15 border border-sky-400/30 text-white font-bold'
                    : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <IconComp
                  className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0EA5E9]' : 'text-slate-400'}`}
                  strokeWidth={1.75}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}

          {isAdmin && (
            <div className="pt-3 border-t border-sky-200/[0.08] mt-2 space-y-1">
              <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wider px-3">
                Quản trị hệ thống
              </div>
              <Link
                href="/admin"
                onClick={onClose}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-sky-500/12 border border-sky-400/30 text-sky-200 font-bold hover:bg-sky-500/20 transition"
              >
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#0EA5E9]" />
                <span>Bảng Điều Khiển Admin</span>
              </Link>
            </div>
          )}
        </div>

        {/* User Footer */}
        <div className="p-3.5 border-t border-white/[0.08] bg-[#07090E]/90 text-xs">
          {user ? (
            <div className="flex items-center justify-between gap-2">
              <Link
                href="/profile"
                onClick={onClose}
                className="flex items-center gap-2.5 truncate hover:opacity-85 transition"
              >
                <div className="w-8 h-8 rounded-xl bg-[#0EA5E9]/15 border border-sky-400/30 flex items-center justify-center font-bold text-sky-200 shrink-0">
                  {(profile?.fullName || user.email || 'Y').charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="font-bold text-white truncate">
                    {profile?.fullName || user.email || 'Tài khoản'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isAdmin ? 'Quản trị viên' : 'Thành viên'}
                  </div>
                </div>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-red-400 hover:bg-red-500/10 transition font-bold text-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Thoát</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/login"
                onClick={onClose}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl btn-ios-blue text-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng Nhập</span>
              </Link>
              <Link
                href="/register"
                onClick={onClose}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl btn-ios-secondary text-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Đăng Ký</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
