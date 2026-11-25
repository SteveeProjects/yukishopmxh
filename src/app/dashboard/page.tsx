'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { calculateVipTier } from '@/lib/vip-tier';
import {
  Wallet,
  Crown,
  Award,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  PlusCircle,
  Package,
  Layers,
  MessageSquare,
  Activity,
  Zap,
  User as UserIcon,
  LogIn,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, profile, role, wallet, membership, lifetimeDeposit, isLoading } = useAuth();
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoadingOrders(true);
    fetch('/api/orders')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.orders)) {
          setRecentOrders(data.orders.slice(0, 5));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingOrders(false));
  }, [user]);

  const formatVND = (amount: number) =>
    new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

  const totalTopup = Number(lifetimeDeposit || 0);
  const vipInfo = calculateVipTier(totalTopup);
  const nextRankTarget = vipInfo.nextTierThreshold || 500000;
  const rankProgressPercent = Math.min(100, Math.round((totalTopup / nextRankTarget) * 100));

  if (isLoading) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Đang tải trung tâm điều khiển...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <div className="p-8 rounded-2xl liquid-glass-card space-y-4">
          <Wallet className="w-10 h-10 text-[#0EA5E9] mx-auto" />
          <h1 className="text-xl font-black text-white">Trung Tâm Điều Khiển Tài Khoản</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Đăng nhập để quản lý số dư ví, thứ hạng Rank tích lũy và lịch sử đơn hàng theo thời gian thực.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/login"
              className="min-h-[44px] px-5 py-2.5 rounded-xl btn-ios-blue text-xs font-bold flex items-center gap-1.5"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng Nhập</span>
            </Link>
            <Link
              href="/register"
              className="min-h-[44px] px-5 py-2.5 rounded-xl btn-ios-secondary text-xs font-bold flex items-center gap-1.5"
            >
              <span>Đăng Ký</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto py-2">
      <div className="p-6 rounded-2xl liquid-glass-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-400 to-indigo-600 p-[2px] shadow-lg shadow-sky-500/20 shrink-0">
            <div className="w-full h-full rounded-2xl bg-[#07090E] flex items-center justify-center font-extrabold text-xl text-sky-300 uppercase">
              {profile?.fullName ? profile.fullName.charAt(0) : user?.email ? user.email.charAt(0) : 'Y'}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold font-display tracking-tight text-white">
                Xin chào, {profile?.fullName || user?.email?.split('@')[0] || 'Thành viên Yuki'}!
              </h1>
              {role === 'ADMIN' ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                  ADMIN
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                  MEMBER
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono">
              {user.email} • ID: {user.id.slice(0, 12)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Link
            href="/profile"
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] hover:border-sky-400/40 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <UserIcon className="w-3.5 h-3.5 text-sky-400" />
            <span>Hồ Sơ &amp; Đổi MK</span>
          </Link>
          <Link
            href="/wallet?action=topup"
            className="min-h-[44px] px-4 py-2 rounded-xl btn-ios-blue text-xs flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Nạp Ví VietQR</span>
          </Link>
          <Link
            href="/services"
            className="min-h-[44px] px-4 py-2 rounded-xl btn-ios-secondary text-xs flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Dịch Vụ</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-5 rounded-2xl liquid-glass-card space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="uppercase font-semibold tracking-wider">Số Dư Ví</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-emerald-400">
            {formatVND(wallet?.balance || 0)}
          </div>
          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Sổ cái bất biến</span>
            <Link href="/wallet" className="text-sky-400 hover:underline font-semibold flex items-center gap-0.5">
              Chi tiết <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D1526]/90 border border-amber-400/20 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold tracking-wide">Gói Hội Viên</span>
            <Crown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-300">
            {membership?.tier || 'Thành viên'}
          </div>
          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px]">
            <span className="text-amber-300/90 font-mono">Ưu tiên xử lý 24/7</span>
            <Link href="/membership" className="text-sky-400 hover:underline font-semibold">
              Nâng cấp
            </Link>
          </div>
        </div>

        <div className="p-5 rounded-2xl liquid-glass-card space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="uppercase font-semibold tracking-wider">Bậc Danh Vọng (Rank)</span>
            <Award className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-sky-300">
            {vipInfo.name} {vipInfo.discountPercent > 0 ? `(-${vipInfo.discountPercent}%)` : ''}
          </div>
          <div className="pt-2 border-t border-white/[0.08] space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Tiến trình Rank:</span>
              <span className="font-mono tabular-nums">{formatVND(totalTopup)} / {formatVND(nextRankTarget)}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-black/50 overflow-hidden">
              <div className="h-full bg-sky-400 rounded-full" style={{ width: `${rankProgressPercent}%` }} />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl liquid-glass-card space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="uppercase font-semibold tracking-wider">Điểm Hoàn Tiền</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-white">
            {formatVND(Number((profile as any)?.cashbackPoints || 0))}
          </div>
          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Hoàn 2% đơn hợp lệ</span>
            <Link href="/wallet" className="text-emerald-400 font-semibold hover:underline">
              Quy đổi
            </Link>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-sky-400">
          THAO TÁC TRUY CẬP NHANH
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <Link
            href="/services?tab=store"
            className="p-4 rounded-xl liquid-glass-card hover:border-sky-400/50 space-y-1.5 transition-all block"
          >
            <ShoppingBag className="w-5 h-5 text-sky-400" />
            <div className="font-bold text-white">Kho Bản Quyền Số</div>
            <p className="text-[11px] text-slate-400">Canva, ChatGPT, CapCut...</p>
          </Link>

          <Link
            href="/buff"
            className="p-4 rounded-xl liquid-glass-card hover:border-sky-400/50 space-y-1.5 transition-all block"
          >
            <Sparkles className="w-5 h-5 text-sky-400" strokeWidth={1.75} />
            <div className="font-bold text-white">Buff Mạng Xã Hội</div>
            <p className="text-[11px] text-slate-400">Đa nền tảng tốc độ cao</p>
          </Link>

          <Link
            href="/sms"
            className="p-4 rounded-xl liquid-glass-card hover:border-sky-400/50 space-y-1.5 transition-all block"
          >
            <MessageSquare className="w-5 h-5 text-amber-400" />
            <div className="font-bold text-white">Cổng Dịch Vụ SMS</div>
            <p className="text-[11px] text-slate-400">Kiểm soát an toàn OTP</p>
          </Link>

          <Link
            href="/orders"
            className="p-4 rounded-xl liquid-glass-card hover:border-sky-400/50 space-y-1.5 transition-all block"
          >
            <Package className="w-5 h-5 text-emerald-400" />
            <div className="font-bold text-white">Đơn Hàng Của Tôi</div>
            <p className="text-[11px] text-slate-400">Kiểm tra tiến độ giao hàng</p>
          </Link>
        </div>
      </div>

      <div className="p-5 rounded-2xl liquid-glass-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-sky-400" />
            <span>HOẠT ĐỘNG ĐƠN HÀNG GẦN ĐÂY</span>
          </div>
          <Link href="/orders" className="text-xs text-sky-400 hover:underline font-semibold">
            Xem tất cả →
          </Link>
        </div>

        {loadingOrders ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-white/[0.02] rounded-2xl border border-white/[0.08] space-y-2 text-xs">
            <Package className="w-8 h-8 text-slate-500 mx-auto stroke-[1.75]" />
            <div className="font-bold text-white">Chưa có đơn hàng nào</div>
            <p className="text-[11px] text-slate-400">Danh sách đơn hàng thực tế sẽ hiển thị tại đây sau khi bạn tạo đơn.</p>
            <Link href="/services" className="inline-flex items-center min-h-[44px] mt-2 px-4 py-2 rounded-xl btn-ios-white text-slate-950 font-bold text-xs transition">
              Khám Phá Dịch Vụ →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06] text-xs">
            {recentOrders.map((o) => (
              <div key={o.order_code || o.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-white truncate">{o.item_name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {o.order_code} • {new Date(o.created_at).toLocaleString('vi-VN')}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono tabular-nums font-bold text-sky-300">
                    {formatVND(Number(o.total_amount || 0))}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
