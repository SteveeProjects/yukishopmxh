'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { BRANDS_CATALOG } from '@/lib/catalog/brands-data';
import { BrandIcon } from '@/components/BrandIcon';
import {
  Search,
  X,
  ArrowRight,
  ShoppingBag,
  Sparkles,
  Wallet,
  ShieldCheck,
  Clock,
  User,
} from 'lucide-react';

interface CommandSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_ROUTES = [
  { href: '/', label: 'Cửa Hàng Trang Chủ', hint: 'Danh mục nổi bật', icon: ShoppingBag },
  { href: '/services', label: 'Kho Bản Quyền', hint: 'Toàn bộ thương hiệu', icon: ShoppingBag },
  { href: '/buff', label: 'Buff Tương Tác MXH', hint: '6 nền tảng', icon: Sparkles },
  { href: '/wallet', label: 'Ví Tiền & Nạp VietQR', hint: 'Quản lý số dư', icon: Wallet },
  { href: '/orders', label: 'Lịch Sử Đơn Hàng', hint: 'Theo dõi & bảo hành', icon: Clock },
  { href: '/warranty', label: 'Trung Tâm Bảo Hành', hint: 'Tra cứu & khiếu nại', icon: ShieldCheck },
  { href: '/profile', label: 'Hồ Sơ & Affiliate 5%', hint: 'Cài đặt tài khoản', icon: User },
];

export function CommandSearchModal({ isOpen, onClose }: CommandSearchModalProps) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  const packageResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list: Array<{
      brandName: string;
      brandSlug: string;
      iconPath: string;
      sku: string;
      pkgName: string;
      price: number;
      warranty: string;
    }> = [];

    for (const brand of BRANDS_CATALOG) {
      for (const pkg of brand.packages) {
        if (
          !q ||
          brand.name.toLowerCase().includes(q) ||
          pkg.name.toLowerCase().includes(q) ||
          pkg.sku.toLowerCase().includes(q) ||
          brand.category.toLowerCase().includes(q)
        ) {
          list.push({
            brandName: brand.name,
            brandSlug: brand.slug,
            iconPath: brand.iconPath,
            sku: pkg.sku,
            pkgName: pkg.name,
            price: pkg.price,
            warranty: pkg.warranty,
          });
        }
      }
    }
    return list.slice(0, q ? 12 : 6);
  }, [query]);

  const routeResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return QUICK_ROUTES;
    return QUICK_ROUTES.filter(
      (r) => r.label.toLowerCase().includes(q) || r.hint.toLowerCase().includes(q)
    );
  }, [query]);

  if (!mounted || !isOpen) return null;

  const formatVND = (num: number) =>
    new Intl.NumberFormat('vi-VN').format(num) + 'đ';

  const handleNavigate = (href: string) => {
    onClose();
    router.push(href);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[150] bg-[#05070B]/85 backdrop-blur-md flex items-start justify-center p-3 sm:p-6 pt-14 sm:pt-20"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Tìm kiếm nhanh dịch vụ"
    >
      <div className="w-full max-w-xl rounded-2xl bg-[#07090E]/96 border border-white/[0.12] shadow-[0_24px_70px_rgba(2,6,18,0.85)] backdrop-blur-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-sky-200/[0.08]">
          <Search className="w-4 h-4 text-sky-400 shrink-0" strokeWidth={1.75} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm nhanh dịch vụ, SKU (VD: Gemini, MB Bank, YouTube, CapCut)..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
            aria-label="Đóng tìm kiếm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-3 space-y-4">
          {packageResults.length > 0 && (
            <div className="space-y-1.5">
              <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-sky-400/80">
                Dịch vụ & Gói bản quyền
              </div>
              <div className="divide-y divide-sky-200/[0.06] rounded-xl bg-[#060B16]/70 border border-sky-200/[0.07]">
                {packageResults.map((item) => (
                  <button
                    key={item.sku}
                    type="button"
                    onClick={() => handleNavigate(`/checkout?sku=${encodeURIComponent(item.sku)}`)}
                    className="w-full px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-sky-500/10 transition text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <BrandIcon
                        slug={item.brandSlug}
                        name={item.brandName}
                        iconPath={item.iconPath}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{item.pkgName}</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {item.brandName} • {item.warranty}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold font-mono tabular-nums text-sky-300">
                        {formatVND(item.price)}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {routeResults.length > 0 && (
            <div className="space-y-1.5">
              <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Điều hướng nhanh
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {routeResults.map((route) => {
                  const Icon = route.icon;
                  return (
                    <button
                      key={route.href}
                      type="button"
                      onClick={() => handleNavigate(route.href)}
                      className="px-3 py-2 rounded-xl bg-[#060B16]/60 hover:bg-sky-500/10 border border-sky-200/[0.06] hover:border-sky-400/30 flex items-center justify-between gap-2 text-left transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="w-4 h-4 text-sky-400 shrink-0" strokeWidth={1.75} />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{route.label}</div>
                          <div className="text-[10px] text-slate-400 truncate">{route.hint}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {packageResults.length === 0 && routeResults.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              Không tìm thấy kết quả phù hợp cho &quot;{query}&quot;.
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-sky-200/[0.06] bg-[#060B16]/80 flex items-center justify-between text-[10px] text-slate-400">
          <span>Chọn dịch vụ để mở trang thanh toán nhanh</span>
          <span className="font-mono">ESC để đóng</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
