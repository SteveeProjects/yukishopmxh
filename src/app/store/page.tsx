'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BRANDS_CATALOG, BrandInfo } from '@/lib/catalog/brands-data';
import { mergeLiveCatalog } from '@/lib/catalog/merge-live-catalog';
import { BrandIcon } from '@/components/BrandIcon';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Search, ArrowRight, Layers, Send } from 'lucide-react';

export default function StorePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 150);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [brands, setBrands] = useState<BrandInfo[]>(BRANDS_CATALOG);
  const [categories, setCategories] = useState<string[]>(() => [
    'ALL',
    ...Array.from(new Set(BRANDS_CATALOG.map((b) => b.category))),
  ]);

  useEffect(() => {
    fetch('/api/catalog')
      .then((res) => res.json())
      .then((data) => {
        if (data?.products && Array.isArray(data.products)) {
          const merged = mergeLiveCatalog(BRANDS_CATALOG, data);
          if (merged.brands.length > 0) {
            setBrands(merged.brands);
            setCategories(merged.categories);
          }
        }
      })
      .catch(() => {});
  }, []);

  const formatVND = (val: number) =>
    new Intl.NumberFormat('vi-VN').format(val) + 'đ';

  const filteredBrands = useMemo(() => {
    const q = debouncedSearchTerm.trim().toLowerCase();
    return brands.filter((b) => {
      const matchSearch =
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.shortDesc.toLowerCase().includes(q) ||
        b.packages.some((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
      const matchCategory = selectedCategory === 'ALL' || b.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [brands, debouncedSearchTerm, selectedCategory]);

  return (
    <div className="space-y-6 animate-page-enter">
      <div className="space-y-2">
        <nav className="flex items-center gap-1.5 text-xs text-slate-400">
          <Link href="/" className="hover:text-white transition-colors">
            Trang Chủ
          </Link>
          <span>/</span>
          <span className="text-[#0EA5E9] font-medium">Kho Sản Phẩm</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
              Kho Sản Phẩm Theo Thương Hiệu
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Chọn thương hiệu để xem đầy đủ các gói thời hạn và chính sách bảo hành.
            </p>
          </div>

          <span className="self-start sm:self-auto text-xs px-3 py-1.5 rounded-full bg-white/[0.04] border border-sky-400/25 text-sky-300 font-semibold flex items-center gap-1.5 tabular-nums">
            <Layers className="w-3.5 h-3.5 text-[#0EA5E9]" />
            <span>{brands.length} Thương Hiệu</span>
          </span>
        </div>
      </div>

      {/* Notice: Manual Processing & Direct Admin Contact */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="text-amber-400 text-base shrink-0 mt-0.5">⚠️</span>
          <p className="text-amber-200/90 leading-relaxed">
            <strong>Lưu ý:</strong> Hiện tại hệ thống chưa tích hợp API xử lý tự động. Sau khi đặt đơn thành công, vui lòng nhắn tin trực tiếp cho Admin để được kiểm tra và kích hoạt nhanh nhất.
          </p>
        </div>
        <a
          href="https://t.me/YukiIsMe2311"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-4 py-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-sky-300 font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm whitespace-nowrap"
        >
          <Send className="w-3.5 h-3.5" />
          <span>💬 Liên Hệ Admin Ngay (@YukiIsMe2311) ↗</span>
        </a>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm kiếm thương hiệu (Gemini, MB Bank, Canva, ChatGPT, YouTube...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#0EA5E9]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-[#0EA5E9] text-[#07090E] font-bold'
                  : 'bg-white/[0.04] text-slate-300 border border-white/[0.08] hover:border-sky-400/30'
              }`}
            >
              {cat === 'ALL' ? `Tất cả (${brands.length})` : cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {filteredBrands.map((brand) => {
          const minPrice = Math.min(...brand.packages.map((p) => p.price));
          return (
            <Link
              key={brand.slug}
              href={`/store/${brand.slug}`}
              className="group p-4 rounded-2xl liquid-glass-card glass-refraction hover:border-[#0EA5E9] transition-all flex flex-col justify-between gap-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#07090E] border border-white/[0.08] text-sky-300">
                  {brand.badgeLabel}
                </span>
                <span className="text-[10px] font-mono tabular-nums text-slate-400">
                  {brand.packages.length} gói
                </span>
              </div>

              <div className="flex items-center gap-3">
                <BrandIcon
                  slug={brand.slug}
                  name={brand.name}
                  iconPath={brand.iconPath}
                  size="lg"
                />
                <div className="min-w-0">
                  <h2 className="font-bold text-sm text-white group-hover:text-[#38BDF8] transition-colors truncate">
                    {brand.name}
                  </h2>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                    {brand.shortDesc}
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Giá từ</span>
                  <span className="font-bold font-mono tabular-nums text-[#38BDF8]">
                    {formatVND(minPrice)}
                  </span>
                </div>
                <div className="w-7 h-7 rounded-lg bg-[#07090E] border border-white/[0.1] group-hover:bg-[#0EA5E9] group-hover:text-[#07090E] text-slate-300 flex items-center justify-center transition-colors">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
