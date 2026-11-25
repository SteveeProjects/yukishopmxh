'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { BRANDS_CATALOG } from '@/lib/catalog/brands-data';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Truck,
  AlertTriangle,
  Wallet,
  ShoppingBag,
  Info,
} from 'lucide-react';

export default function PackageDetailPage() {
  const params = useParams();
  const router = useRouter();

  const brandSlug = Array.isArray(params?.brand) ? params.brand[0] : params?.brand;
  const sku = Array.isArray(params?.sku) ? params.sku[0] : params?.sku;

  const [quantity, setQuantity] = useState(1);

  const brand = BRANDS_CATALOG.find((b) => b.slug === brandSlug);
  const pkg = brand?.packages.find((p) => p.sku === sku);

  const formatVND = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val) + 'đ';
  };

  if (!brand || !pkg) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <h2 className="text-xl font-bold text-white">Không tìm thấy sản phẩm</h2>
        <p className="text-xs text-slate-400">Gói sản phẩm này không tồn tại hoặc đã ngừng kinh doanh.</p>
        <Link href="/store" className="inline-flex items-center gap-1.5 text-xs text-sky-400 font-semibold underline">
          <ArrowLeft className="w-3.5 h-3.5" />
          Quay lại kho thương hiệu
        </Link>
      </div>
    );
  }

  const subtotal = pkg.price * quantity;
  const isAbnormal = pkg.status === 'NEEDS_REVIEW';

  const handleProceedCheckout = () => {
    router.push(`/checkout?sku=${pkg.sku}&qty=${quantity}`);
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto">
      {/* 1. Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link href="/" className="hover:text-white transition-colors">Trang Chủ</Link>
        <span>/</span>
        <Link href="/store" className="hover:text-white transition-colors">Kho Sản Phẩm</Link>
        <span>/</span>
        <Link href={`/store/${brand.slug}`} className="hover:text-white transition-colors">{brand.name}</Link>
        <span>/</span>
        <span className="text-sky-400 font-medium truncate">{pkg.name}</span>
      </nav>

      {/* 2. Main Product Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Product Overview & Terms */}
        <div className="md:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-[#0F172E] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-slate-400">SKU: {pkg.sku}</span>
              {isAbnormal ? (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-amber-950/80 border border-amber-700 text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Đang Thẩm Định (NEEDS_REVIEW)
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-800 text-emerald-400">
                  ✓ Sẵn Sàng Bán
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white">
              {pkg.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-sky-400" />
                <span>Thời hạn: <strong className="text-white">{pkg.duration}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-400" />
                <span>Hình thức: <strong className="text-white">{pkg.fulfillmentMode === 'AUTO' ? 'Tự Động (Auto)' : 'Thủ Công (Manual)'}</strong></span>
              </div>
              {pkg.isTrial && (
                <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 text-[10px] font-bold">
                  Bản Dùng Thử (Trial)
                </span>
              )}
            </div>

            {/* Benefits Section */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400">
                QUYỀN LỢI CHI TIẾT
              </h3>
              <ul className="space-y-2 text-xs text-slate-300">
                {pkg.benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Conditions Section */}
            <div className="space-y-2.5 pt-4 border-t border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                ĐIỀU KIỆN SỬ DỤNG
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-400 list-disc list-inside">
                {pkg.usageConditions.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>

            {/* Warranty Policy */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
              <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-white mb-0.5">Chính Sách Bảo Hành</div>
                <div className="text-slate-400 leading-relaxed">{pkg.warranty}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Price & Order Action Card */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#0F172E] border border-slate-800 space-y-5 sticky top-20">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Đơn Giá Bản Quyền</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold font-mono text-sky-400">
                  {formatVND(pkg.price)}
                </span>
                {pkg.originalPrice && pkg.originalPrice > 0 ? (
                  <span className="text-sm font-mono text-slate-500 line-through">
                    {formatVND(pkg.originalPrice)}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Số lượng đặt mua
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="touch-target w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-base hover:bg-slate-800"
                >
                  -
                </button>
                <div className="flex-1 text-center font-mono font-bold text-base py-2 rounded-xl bg-slate-900 border border-slate-800 text-white">
                  {quantity}
                </div>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="touch-target w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-base hover:bg-slate-800"
                >
                  +
                </button>
              </div>
            </div>

            {/* Subtotal Calculation */}
            <div className="pt-3 border-t border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Tạm tính ({quantity} gói):</span>
                <span className="font-mono text-white font-bold">{formatVND(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Chiết khấu Rank:</span>
                <span>Áp dụng tại bước Checkout</span>
              </div>
            </div>

            {/* Checkout Action */}
            {isAbnormal ? (
              <div className="p-3.5 rounded-xl bg-amber-950/50 border border-amber-600/50 text-amber-300 text-xs font-semibold text-center leading-relaxed">
                <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                Sản phẩm đang được quản trị viên đối soát bảng giá chính thức. Tạm thời chưa mở bán.
              </div>
            ) : (
              <button
                onClick={handleProceedCheckout}
                className="touch-target w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 font-extrabold text-xs text-slate-950 shadow-lg shadow-sky-500/25 transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Tiến Hành Đặt Đơn Ngay</span>
              </button>
            )}

            <div className="text-[11px] text-slate-500 text-center leading-relaxed">
              Hệ thống tự động trừ số dư ví khả dụng và ghi vết sổ cái an toàn.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
