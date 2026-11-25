'use client';

import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Wallet,
  Clock,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import { AnimatedCounter } from '@/components/common/animated-counter';
import { SkeletonKpis } from '@/components/common/skeleton-shimmer';

interface StatsResponse {
  success: boolean;
  kpis: {
    completedRevenue: number;
    totalDeposits: number;
    pendingOrdersCount: number;
    pendingWarrantyCount: number;
    totalOrdersCount: number;
  };
  series: Array<{
    key: string;
    label: string;
    revenue: number;
    topups: number;
    ordersCount: number;
  }>;
}

export function AdminOverviewTab({
  onJumpTab,
}: {
  onJumpTab: (tab: 'ORDERS' | 'WARRANTY') => void;
}) {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatVND = (num: number) =>
    new Intl.NumberFormat('vi-VN').format(num) + 'đ';

  if (loading && !data) {
    return <SkeletonKpis />;
  }

  const kpis = data?.kpis || {
    completedRevenue: 0,
    totalDeposits: 0,
    pendingOrdersCount: 0,
    pendingWarrantyCount: 0,
    totalOrdersCount: 0,
  };
  const series = data?.series || [];
  const maxVal = Math.max(
    1,
    ...series.map((d) => Math.max(d.revenue, d.topups))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white">
            Tổng Quan &amp; Thống Kê Real-Time
          </h2>
          <p className="text-xs text-slate-400">
            Số liệu tổng hợp trực tiếp từ đơn hàng và lịch sử nạp ví thực tế.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchStats}
          className="px-3 py-2 rounded-xl btn-ios-secondary text-xs flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl liquid-glass-card space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Doanh thu hoàn tất</span>
            <TrendingUp className="w-4 h-4 text-[#0EA5E9]" strokeWidth={1.75} />
          </div>
          <div className="text-xl font-black font-mono tabular-nums text-white">
            <AnimatedCounter value={kpis.completedRevenue} suffix="đ" />
          </div>
          <div className="text-[11px] text-slate-400 tabular-nums">
            Tổng {kpis.totalOrdersCount} đơn hàng
          </div>
        </div>

        <div className="p-4 rounded-2xl liquid-glass-card space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Tổng tiền nạp đã duyệt</span>
            <Wallet className="w-4 h-4 text-emerald-400" strokeWidth={1.75} />
          </div>
          <div className="text-xl font-black font-mono tabular-nums text-emerald-300">
            <AnimatedCounter value={kpis.totalDeposits} suffix="đ" />
          </div>
          <div className="text-[11px] text-slate-400">VietQR &amp; MacroDroid</div>
        </div>

        <button
          type="button"
          onClick={() => onJumpTab('ORDERS')}
          className="p-4 rounded-2xl liquid-glass-card border-amber-400/25 hover:border-amber-400/50 text-left space-y-2 transition"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Đơn chờ duyệt</span>
            <Clock className="w-4 h-4 text-amber-400" strokeWidth={1.75} />
          </div>
          <div className="text-xl font-black font-mono tabular-nums text-amber-300">
            {kpis.pendingOrdersCount}
          </div>
          <div className="text-[11px] text-amber-400/80">Bấm để xử lý ngay</div>
        </button>

        <button
          type="button"
          onClick={() => onJumpTab('WARRANTY')}
          className="p-4 rounded-2xl liquid-glass-card border-rose-400/25 hover:border-rose-400/50 text-left space-y-2 transition"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Khiếu nại bảo hành</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" strokeWidth={1.75} />
          </div>
          <div className="text-xl font-black font-mono tabular-nums text-rose-300">
            {kpis.pendingWarrantyCount}
          </div>
          <div className="text-[11px] text-rose-400/80">Bấm để mở trung tâm BH</div>
        </button>
      </div>

      {/* 7-Day Real Data Chart */}
      <div className="p-5 rounded-2xl liquid-glass-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white">Biểu Đồ Doanh Thu &amp; Nạp Ví (7 Ngày)</h3>
            <p className="text-[11px] text-slate-400">
              Tính toán theo múi giờ Việt Nam từ dữ liệu thực tế
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#0EA5E9]" />
              <span>Doanh thu đơn</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
              <span>Tiền nạp ví</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 sm:gap-4 pt-2 items-end h-48">
          {series.map((day) => {
            const revHeight = Math.max(4, Math.round((day.revenue / maxVal) * 100));
            const topHeight = Math.max(4, Math.round((day.topups / maxVal) * 100));
            return (
              <div key={day.key} className="flex flex-col items-center justify-end h-full gap-2 group">
                <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-36">
                  <div
                    className="w-3 sm:w-4 rounded-t-md bg-[#0EA5E9] transition-all duration-300"
                    style={{ height: `${day.revenue > 0 ? revHeight : 4}%`, opacity: day.revenue > 0 ? 1 : 0.2 }}
                    title={`${day.label} • Doanh thu: ${formatVND(day.revenue)}`}
                  />
                  <div
                    className="w-3 sm:w-4 rounded-t-md bg-emerald-400 transition-all duration-300"
                    style={{ height: `${day.topups > 0 ? topHeight : 4}%`, opacity: day.topups > 0 ? 1 : 0.2 }}
                    title={`${day.label} • Nạp ví: ${formatVND(day.topups)}`}
                  />
                </div>
                <div className="text-[10px] font-mono tabular-nums text-slate-400 text-center">
                  {day.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
