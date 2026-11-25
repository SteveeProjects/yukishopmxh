'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, FileText, Shield, RefreshCw } from 'lucide-react';

interface PolicyTabsProps {
  currentTab: 'terms' | 'privacy' | 'warranty-policy';
}

export function PolicyTabs({ currentTab }: PolicyTabsProps) {
  const pathname = usePathname();

  const tabs = [
    {
      id: 'terms',
      href: '/terms',
      label: 'Điều khoản dịch vụ',
      icon: FileText,
    },
    {
      id: 'privacy',
      href: '/privacy',
      label: 'Chính sách bảo mật',
      icon: Shield,
    },
    {
      id: 'warranty-policy',
      href: '/warranty-policy',
      label: 'Bảo hành & Hoàn tiền',
      icon: RefreshCw,
    },
  ];

  return (
    <div className="space-y-4 mb-8">
      {/* Nút quay lại */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-300 transition group px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08]"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Quay lại Cửa Hàng</span>
        </Link>

        <span className="text-[11px] font-mono text-slate-500">
          Hiệu lực: <span className="text-amber-300 font-bold">11/2026</span>
        </span>
      </div>

      {/* Thanh 3 Tabs chính sách */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
        {tabs.map((tab) => {
          const isActive = tab.id === currentTab || pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 py-2.5 rounded-xl text-xs font-bold transition text-center ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
              <span className="truncate">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
