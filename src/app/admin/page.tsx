'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  ShieldAlert,
  Settings,
  ArrowLeft,
  Moon,
  Radio,
} from 'lucide-react';
import { AdminOverviewTab } from '@/components/admin/AdminOverviewTab';
import { AdminOrdersTab } from '@/components/admin/AdminOrdersTab';
import { AdminCatalogBuffTab } from '@/components/admin/AdminCatalogBuffTab';
import { AdminWarrantyTab } from '@/components/admin/AdminWarrantyTab';
import { AdminSystemWalletTab } from '@/components/admin/AdminSystemWalletTab';

type AdminTabId = 'OVERVIEW' | 'ORDERS' | 'CATALOG_BUFF' | 'WARRANTY' | 'SYSTEM_WALLET';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<AdminTabId>('OVERVIEW');
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number | null>(null);
  const [sleepMode, setSleepMode] = useState(false);
  const [togglingSleep, setTogglingSleep] = useState(false);

  useEffect(() => {
    fetch('/api/settings/announcement', { cache: 'no-store', credentials: 'include' })
      .then((res) => res.json())
      .then((json) => {
        if (json?.systemConfig) {
          setSleepMode(Boolean(json.systemConfig.sleep_mode));
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleSleepMode = async () => {
    setTogglingSleep(true);
    const nextState = !sleepMode;
    try {
      const res = await fetch('/api/admin/settings/announcement', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemConfig: { sleep_mode: nextState } }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSleepMode(Boolean(json.systemConfig?.sleep_mode ?? nextState));
      }
    } finally {
      setTogglingSleep(false);
    }
  };

  const tabs: Array<{ id: AdminTabId; label: string; icon: React.ComponentType<any>; badge?: number | null }> = [
    { id: 'OVERVIEW', label: 'Tổng Quan', icon: LayoutDashboard },
    { id: 'ORDERS', label: 'Đơn Hàng', icon: ClipboardList, badge: pendingOrdersCount },
    { id: 'CATALOG_BUFF', label: 'Dịch Vụ & Buff', icon: Package },
    { id: 'WARRANTY', label: 'Bảo Hành 1 Chạm', icon: ShieldAlert },
    { id: 'SYSTEM_WALLET', label: 'Ví & Hệ Thống', icon: Settings },
  ];

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white">
            Quản Trị Hệ Thống YukiShopMXH
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Kiến trúc Obsidian Liquid Glass — Cập nhật tức thì, kiểm toán ví và điều khiển Sleep Mode 1 chạm.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            disabled={togglingSleep}
            onClick={handleToggleSleepMode}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition ${
              sleepMode
                ? 'bg-amber-500/18 border-amber-400/40 text-amber-200'
                : 'bg-emerald-500/12 border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/20'
            }`}
          >
            {sleepMode ? <Moon className="w-3.5 h-3.5" /> : <Radio className="w-3.5 h-3.5" />}
            <span>{togglingSleep ? 'Đang cập nhật...' : sleepMode ? 'Sleep Mode: ĐANG BẬT' : 'Trạng thái: Đang Mở Ca'}</span>
          </button>

          <Link
            href="/"
            className="px-3.5 py-2 rounded-xl btn-ios-secondary text-xs flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về Cửa Hàng</span>
          </Link>
        </div>
      </div>

      {/* 5 Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition ${
                isActive
                  ? 'bg-[#0EA5E9] text-[#07090E] font-bold shadow-[0_6px_20px_rgba(14,165,233,0.25)]'
                  : 'bg-white/[0.04] text-slate-300 border border-white/[0.08] hover:border-sky-400/35 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums font-bold ${
                    isActive
                      ? 'bg-[#060B16]/25 text-[#060B16]'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Lazy-Mounted Tab Content (Only fetches when tab is active) */}
      <div>
        {activeTab === 'OVERVIEW' && (
          <AdminOverviewTab
            onJumpTab={(target) => setActiveTab(target)}
          />
        )}
        {activeTab === 'ORDERS' && (
          <AdminOrdersTab onPendingChange={setPendingOrdersCount} />
        )}
        {activeTab === 'CATALOG_BUFF' && <AdminCatalogBuffTab />}
        {activeTab === 'WARRANTY' && <AdminWarrantyTab />}
        {activeTab === 'SYSTEM_WALLET' && <AdminSystemWalletTab />}
      </div>
    </div>
  );
}
