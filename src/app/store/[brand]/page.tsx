'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BRANDS_CATALOG, BrandInfo, PackageVariant } from '@/lib/catalog/brands-data';
import { ADMIN_TELEGRAM_URL, ADMIN_SUPPORT_LABEL } from '@/lib/constants';
import { BrandIcon } from '@/components/BrandIcon';
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Tag,
  Sparkles,
  Send,
  MessageCircle,
} from 'lucide-react';

export default function BrandDetailPage() {
  const params = useParams();
  const brandSlug = Array.isArray(params?.brand) ? params.brand[0] : params?.brand;

  const [brand, setBrand] = useState<BrandInfo | null>(() => {
    return BRANDS_CATALOG.find((b) => b.slug === brandSlug) || null;
  });
  const [loading, setLoading] = useState(!brand);

  useEffect(() => {
    if (!brandSlug) return;

    fetch('/api/catalog')
      .then((res) => res.json())
      .then((data) => {
        if (data.products && Array.isArray(data.products)) {
          // 1. Check if it's an existing brand in BRANDS_CATALOG
          const baseBrand = BRANDS_CATALOG.find((b) => b.slug === brandSlug);
          if (baseBrand) {
            const map = new Map<string, any>(data.products.map((p: any) => [p.sku, p]));
            const updatedPkgs = baseBrand.packages
              .filter((p) => {
                if (!map.has(p.sku)) return true;
                const m = map.get(p.sku);
                return m.status !== 'HIDDEN' && m.is_active !== false && m.is_hidden !== true;
              })
              .map((p) => {
                if (map.has(p.sku)) {
                  const m = map.get(p.sku);
                  return {
                    ...p,
                    name: m.name,
                    price: Number(m.sell_price),
                    originalPrice: Number(m.original_price || p.originalPrice || 0),
                    stock: Number(m.stock),
                    status: m.status,
                    warranty: m.description || p.warranty,
                  };
                }
                return p;
              });
            setBrand({ ...baseBrand, packages: updatedPkgs });
            setLoading(false);
            return;
          }

          // 2. Check if brandSlug matches custom product SKU
          const foundCustom = data.products.find(
            (p: any) =>
              p.sku.toLowerCase() === brandSlug.toLowerCase() &&
              p.status === 'ACTIVE'
          );

          if (foundCustom) {
            const customBrand: BrandInfo = {
              slug: foundCustom.sku.toLowerCase(),
              name: foundCustom.name,
              category: foundCustom.display_section || foundCustom.category || 'Dịch Vụ Số',
              badgeLabel: 'Mới Bổ Sung',
              iconPath: '/assets/images/logo.png',
              shortDesc: foundCustom.description || 'Gói tài khoản bản quyền chính thức.',
              fullDesc: foundCustom.description || foundCustom.name,
              gradient: 'from-sky-600 to-indigo-800',
              brandColor: '#0284c7',
              packages: [
                {
                  sku: foundCustom.sku,
                  name: foundCustom.name,
                  price: Number(foundCustom.sell_price),
                  originalPrice: Number(foundCustom.original_price || foundCustom.sell_price * 1.5),
                  duration: 'Theo Gói',
                  durationDays: 30,
                  status: foundCustom.status,
                  stock: Number(foundCustom.stock || 50),
                  warranty: foundCustom.description || 'Bảo hành đầy đủ kỳ hạn',
                  benefits: ['Bản quyền chính thức', 'Kích hoạt nhanh chóng', 'Hỗ trợ kỹ thuật 24/7'],
                  usageConditions: ['Tuân thủ điều khoản dịch vụ'],
                  fulfillmentMode: 'MANUAL',
                },
              ],
            };
            setBrand(customBrand);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [brandSlug]);

  const formatVND = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val) + 'đ';
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Đang tải thông tin dịch vụ...</p>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <h2 className="text-xl font-bold text-white">Không tìm thấy thương hiệu</h2>
        <p className="text-xs text-slate-400">Thương hiệu bạn yêu cầu không tồn tại hoặc đã tạm dừng cung cấp.</p>
        <Link href="/services?tab=store" className="inline-flex items-center gap-1.5 text-xs text-sky-400 font-semibold underline">
          <ArrowLeft className="w-3.5 h-3.5" />
          Quay lại kho sản phẩm
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto">
      {/* 1. Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link href="/" className="hover:text-white transition-colors">Trang Chủ</Link>
        <span>/</span>
        <Link href="/services?tab=store" className="hover:text-white transition-colors">Kho Sản Phẩm</Link>
        <span>/</span>
        <span className="text-sky-400 font-medium">{brand.name}</span>
      </nav>

      {/* 2. Brand Hero Banner */}
      <div className={`p-6 sm:p-8 rounded-2xl bg-gradient-to-br ${brand.gradient} text-white shadow-xl relative overflow-hidden`}>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between">
          <div className="flex items-center gap-4">
            <BrandIcon
              slug={brand.slug}
              name={brand.name}
              iconPath={brand.iconPath}
              size="lg"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-white/30 shadow-2xl"
              active
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 text-white">
                  {brand.category}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white">
                  {brand.badgeLabel}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white">
                {brand.name}
              </h1>
              <p className="text-xs text-white/90 max-w-xl leading-relaxed">
                {brand.fullDesc}
              </p>
            </div>
          </div>

          <Link
            href="/services?tab=store"
            className="touch-target px-3 py-1.5 rounded-xl bg-black/30 hover:bg-black/50 border border-white/20 text-xs font-semibold text-white flex items-center gap-1 self-start sm:self-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Đổi thương hiệu
          </Link>
        </div>
      </div>

      {/* Operational Notice Banner */}
      <div className="p-4 rounded-2xl bg-[#0D1526]/90 border border-sky-400/20 text-xs text-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-start md:items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-[#0EA5E9] shrink-0" />
          <p className="font-medium leading-relaxed">
            <strong className="text-white">Lưu ý vận hành:</strong> Website xử lý đơn hàng thủ công chuẩn xác. Sau khi tạo đơn, bạn có thể theo dõi tại Lịch Sử Đơn hoặc liên hệ kênh hỗ trợ chính thức.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://t.me/YukiIsMe2311"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl btn-ios-blue text-xs flex items-center gap-1.5 font-bold shadow-lg shadow-sky-500/20"
          >
            <span>💬 Liên Hệ Admin Ngay (@YukiIsMe2311) ↗</span>
          </a>
        </div>
      </div>

      {/* 3. Packages Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">
            Danh Sách Gói Tài Khoản / Thời Hạn ({brand.packages.length} gói)
          </h2>
          <span className="text-xs text-slate-500">Bảo hành 1 đổi 1 chính hãng</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {brand.packages.map((pkg: PackageVariant) => (
            <div
              key={pkg.sku}
              className="p-5 rounded-2xl liquid-glass-card hover:border-[#0EA5E9] shadow-sm flex flex-col justify-between space-y-4 transition"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.05] text-slate-300 border border-white/[0.1]">
                      {pkg.sku}
                    </span>
                    <h3 className="font-extrabold text-sm sm:text-base text-white">
                      {pkg.name}
                    </h3>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono tabular-nums font-black text-sky-400 text-base sm:text-lg">
                      {formatVND(pkg.price)}
                    </div>
                    {pkg.originalPrice && pkg.originalPrice > pkg.price ? (
                      <div className="text-[11px] text-slate-500 line-through font-mono tabular-nums">
                        {formatVND(pkg.originalPrice)}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <div className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Còn {pkg.stock} suất</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1 text-amber-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Thời hạn: {pkg.duration}</span>
                  </div>
                </div>

                {pkg.warranty && (
                  <p className="text-xs text-slate-300 leading-relaxed bg-[#07090E]/70 p-2.5 rounded-xl border border-white/[0.06]">
                    {pkg.warranty}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center gap-2">
                <Link
                  href={`/checkout?sku=${encodeURIComponent(pkg.sku)}`}
                  className="min-h-[44px] flex-1 py-2.5 px-4 rounded-xl btn-ios-blue text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <span>Mua Ngay</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
