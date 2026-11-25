'use client';

import React from 'react';
import Link from 'next/link';
import { BrandInfo, PackageVariant } from '@/lib/catalog/brands-data';
import { BUFF_PLATFORMS, BUFF_SERVICES, BuffPlatformId } from '@/lib/catalog/buff-data';
import { calculateVipPrice } from '@/lib/vip-tier';
import { BrandIcon } from '@/components/BrandIcon';
import {
  Bookmark,
  LayoutGrid,
  List,
  ArrowRight,
  Coins,
} from 'lucide-react';

interface BentoCatalogViewProps {
  brands: BrandInfo[];
  allBrands: BrandInfo[];
  selectedBrandSlug?: string;
  vipDiscountPercent: number;
  onSelectBrand: (brand: BrandInfo) => void;
  showFeaturedAndCarousel?: boolean;
  viewMode: 'GRID' | 'LIST';
  onChangeViewMode: (mode: 'GRID' | 'LIST') => void;
  pinnedSlugs: string[];
  onTogglePin: (slug: string) => void;
  pinnedOnly: boolean;
  onTogglePinnedOnly: () => void;
  searchQuery: string;
  onResetFilters: () => void;
}

const BUFF_PLATFORM_ICONS: Record<BuffPlatformId, string> = {
  TIKTOK: '/assets/icons/platforms/tiktok.jpg',
  FACEBOOK: '/assets/icons/platforms/facebook.jpg',
  INSTAGRAM: '/assets/icons/platforms/instagram.jpg',
  YOUTUBE: '/assets/icons/platforms/youtube.jpg',
  TELEGRAM: '/assets/icons/platforms/telegram.jpg',
  THREADS: '/assets/icons/platforms/threads.jpg',
};

function formatVND(val: number): string {
  return new Intl.NumberFormat('vi-VN').format(val) + 'đ';
}

function getMinPackage(brand: BrandInfo): PackageVariant | undefined {
  if (!brand.packages?.length) return undefined;
  return brand.packages.reduce((min, p) => (p.price < min.price ? p : min), brand.packages[0]);
}

function getWarrantyBadge(pkg?: PackageVariant): { label: string; isNoWarranty: boolean } {
  if (!pkg) return { label: 'BH', isNoWarranty: false };
  const days = pkg.warrantyDays ?? pkg.warranty_days;
  const text = String(pkg.warranty || '').toLowerCase();
  if (days === 0 || text.includes('không bảo hành') || text.includes('kbh')) {
    return { label: 'KBH', isNoWarranty: true };
  }
  if (text.includes('trọn đời') || text.includes('vĩnh viễn')) {
    return { label: 'BH Trọn đời', isNoWarranty: false };
  }
  if (typeof days === 'number' && days > 0) {
    return { label: `BH ${days} ngày`, isNoWarranty: false };
  }
  return { label: pkg.warranty || 'Bảo hành', isNoWarranty: false };
}

export const BentoCatalogView = React.memo(function BentoCatalogView({
  brands,
  allBrands,
  selectedBrandSlug,
  vipDiscountPercent,
  onSelectBrand,
  showFeaturedAndCarousel = false,
  viewMode,
  onChangeViewMode,
  pinnedSlugs,
  onTogglePin,
  pinnedOnly,
  onTogglePinnedOnly,
  searchQuery,
  onResetFilters,
}: BentoCatalogViewProps) {
  const pinnedBrands = pinnedSlugs
    .map((slug) => allBrands.find((b) => b.slug === slug))
    .filter((b): b is BrandInfo => Boolean(b));

  const geminiBrand = allBrands.find((b) => b.slug === 'gemini');
  const featuredSlugs = ['chatgpt', 'claude', 'mb-bank', 'youtube'];
  const secondaryFeatured = featuredSlugs
    .map((slug) => allBrands.find((b) => b.slug === slug))
    .filter((b): b is BrandInfo => Boolean(b));

  const getPriceInfo = (brand: BrandInfo) => {
    const minPkg = getMinPackage(brand);
    if (!minPkg) return { final: 0, original: 0, discounted: false, minPkg: undefined };
    const calc = calculateVipPrice(
      minPkg.price,
      vipDiscountPercent,
      brand.category,
      minPkg.sku,
      minPkg.name
    );
    return {
      final: calc.finalPrice,
      original: minPkg.price,
      discounted: calc.isApplied,
      minPkg,
    };
  };

  const handleCardKeyDown = (e: React.KeyboardEvent, brand: BrandInfo) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectBrand(brand);
    }
  };

  return (
    <div className="space-y-6">
      {/* PINNED ROW: Hàng "Đã Ghim" mua lại 1 chạm */}
      {showFeaturedAndCarousel && pinnedBrands.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              <Bookmark className="w-4 h-4 text-sky-400" fill="currentColor" />
              <span>Đã Ghim</span>
            </h2>
            <span className="text-[11px] font-mono tabular-nums text-slate-400">
              {pinnedBrands.length} dịch vụ
            </span>
          </div>

          <div className="flex gap-2.5 overflow-x-auto no-scrollbar snap-x pb-1">
            {pinnedBrands.map((brand) => {
              const info = getPriceInfo(brand);
              const isSelected = selectedBrandSlug === brand.slug;
              return (
                <div
                  key={`pinned_${brand.slug}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectBrand(brand)}
                  onKeyDown={(e) => handleCardKeyDown(e, brand)}
                  className={`snap-start shrink-0 w-[188px] liquid-glass-card glass-refraction rounded-2xl p-3 cursor-pointer flex items-center gap-2.5 text-left ${
                    isSelected ? 'lg:border-[#0EA5E9] lg:bg-sky-500/[0.08]' : ''
                  }`}
                >
                  <BrandIcon
                    slug={brand.slug}
                    name={brand.name}
                    iconPath={brand.iconPath}
                    size="md"
                    active={isSelected}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs text-white truncate">{brand.name}</div>
                    <div className="font-mono tabular-nums text-[11px] font-bold text-sky-300 mt-0.5">
                      {formatVND(info.final)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TIER 2: Dịch Vụ Nổi Bật (Asymmetric Bento Grid) */}
      {showFeaturedAndCarousel && (geminiBrand || secondaryFeatured.length > 0) && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Dịch Vụ Nổi Bật
            </h2>
            <span className="text-[11px] text-slate-400">
              Hoàn 2% đơn từ 20.000đ
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {/* Full-width Col-Span-2 Flagship Card: Google Gemini (5 KBH packages) */}
            {geminiBrand && (() => {
              const info = getPriceInfo(geminiBrand);
              const isSelected = selectedBrandSlug === geminiBrand.slug;
              const isPinned = pinnedSlugs.includes(geminiBrand.slug);
              return (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectBrand(geminiBrand)}
                  onKeyDown={(e) => handleCardKeyDown(e, geminiBrand)}
                  className={`col-span-2 liquid-glass-card glass-refraction rounded-2xl p-4 cursor-pointer text-left transition-all ${
                    isSelected ? 'lg:border-[#0EA5E9] lg:bg-sky-500/[0.08]' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <BrandIcon
                        slug={geminiBrand.slug}
                        name={geminiBrand.name}
                        iconPath={geminiBrand.iconPath}
                        size="lg"
                        active={isSelected}
                      />
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/12 border border-emerald-400/25 text-[10px] font-semibold text-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>Sẵn sàng</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/12 border border-amber-400/25 text-[10px] font-semibold text-amber-300">
                            KBH
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/12 border border-sky-400/25 text-[10px] font-semibold text-sky-300">
                            <Coins className="w-2.5 h-2.5" />
                            <span>Hoàn 2%</span>
                          </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-white truncate">
                          {geminiBrand.name} ({geminiBrand.packages.length} Gói Chính Thức)
                        </h3>
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {geminiBrand.packages.map((p) => `${p.name} (${formatVND(p.price)})`).join(' • ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePin(geminiBrand.slug);
                        }}
                        aria-label={isPinned ? 'Bỏ ghim' : 'Ghim dịch vụ'}
                        className={`p-2 rounded-xl border transition ${
                          isPinned
                            ? 'bg-sky-500/15 border-sky-400/40 text-sky-300'
                            : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white'
                        }`}
                      >
                        <Bookmark className="w-3.5 h-3.5" fill={isPinned ? 'currentColor' : 'none'} />
                      </button>

                      <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-sky-500/15 border border-sky-400/35 font-mono tabular-nums text-xs sm:text-sm font-bold text-sky-200">
                        Từ {formatVND(info.final)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Secondary Featured 2-Column Row: ChatGPT, Claude, MB Bank, YouTube */}
            {secondaryFeatured.map((brand) => {
              const info = getPriceInfo(brand);
              const badge = getWarrantyBadge(info.minPkg);
              const isSelected = selectedBrandSlug === brand.slug;
              const isPinned = pinnedSlugs.includes(brand.slug);
              return (
                <div
                  key={`feat_${brand.slug}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectBrand(brand)}
                  onKeyDown={(e) => handleCardKeyDown(e, brand)}
                  className={`liquid-glass-card glass-refraction rounded-2xl p-3 sm:p-3.5 cursor-pointer flex flex-col justify-between gap-2.5 text-left ${
                    isSelected ? 'lg:border-[#0EA5E9] lg:bg-sky-500/[0.08]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <BrandIcon
                      slug={brand.slug}
                      name={brand.name}
                      iconPath={brand.iconPath}
                      size="md"
                      active={isSelected}
                    />
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 font-mono tabular-nums text-[11px] font-bold text-sky-200 shrink-0">
                      {formatVND(info.final)}
                    </span>
                  </div>

                  <div className="flex items-end justify-between gap-1.5">
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-white truncate">
                        {brand.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                            badge.isNoWarranty
                              ? 'bg-amber-500/10 border-amber-400/25 text-amber-300'
                              : 'bg-emerald-500/10 border-emerald-400/25 text-emerald-300'
                          }`}
                        >
                          {badge.label}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate">
                          {brand.packages.length} gói
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(brand.slug);
                      }}
                      aria-label={isPinned ? 'Bỏ ghim' : 'Ghim'}
                      className={`p-1.5 rounded-lg border transition shrink-0 ${
                        isPinned
                          ? 'bg-sky-500/15 border-sky-400/35 text-sky-300'
                          : 'bg-white/[0.03] border-white/[0.08] text-slate-500 hover:text-white'
                      }`}
                    >
                      <Bookmark className="w-3 h-3" fill={isPinned ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Horizontal Snap Carousel: Buff MXH Nhanh với Icon nền tảng thật + tia laser */}
      {showFeaturedAndCarousel && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Buff MXH Tốc Độ Cao
            </h2>
            <Link
              href="/buff"
              className="text-[11px] font-semibold text-sky-300 hover:text-white inline-flex items-center gap-1 transition"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex gap-2.5 overflow-x-auto no-scrollbar snap-x pb-1">
            {BUFF_PLATFORMS.map((plat) => {
              const iconSrc = BUFF_PLATFORM_ICONS[plat.id] || '/assets/icons/platforms/tiktok.jpg';
              const platServices = BUFF_SERVICES.filter((s) => s.platform === plat.id);
              const minRate = platServices.reduce((acc, svc) => {
                const srvMin = svc.servers.reduce(
                  (m, srv) => (srv.retailPrice < m ? srv.retailPrice : m),
                  Infinity
                );
                return Math.min(acc, srvMin);
              }, Infinity);
              const startingRate = Number.isFinite(minRate) ? minRate : 1000;

              return (
                <Link
                  key={plat.id}
                  href={`/buff?platform=${plat.id}`}
                  className="snap-start shrink-0 w-[166px] sm:w-[180px] liquid-glass-card rounded-2xl p-3 flex flex-col justify-between gap-2.5 hover:border-sky-400/35 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <BrandIcon
                      slug={plat.id.toLowerCase()}
                      name={plat.name}
                      iconPath={iconSrc}
                      size="sm"
                    />
                    <span className="text-[10px] font-mono tabular-nums text-slate-400">
                      {plat.serverCount} SV
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white truncate">{plat.name}</div>
                    <div className="text-[11px] font-mono tabular-nums text-sky-300 mt-0.5">
                      Từ {formatVND(startingRate)}/1k
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* TIER 3: Kho Dịch Vụ 2 Cột + Grid / List Switcher */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Kho Dịch Vụ
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] font-mono tabular-nums text-[10px] text-slate-300">
              {brands.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePinnedOnly}
              className={`h-8 px-2.5 rounded-xl border text-[11px] font-semibold inline-flex items-center gap-1.5 transition ${
                pinnedOnly
                  ? 'bg-sky-500/18 border-sky-400/40 text-sky-200'
                  : 'bg-white/[0.04] border-white/[0.08] text-slate-300 hover:text-white'
              }`}
            >
              <Bookmark className="w-3 h-3" fill={pinnedOnly ? 'currentColor' : 'none'} />
              <span>Đã ghim</span>
              {pinnedSlugs.length > 0 && (
                <span className="font-mono tabular-nums text-[10px] text-sky-300">
                  ({pinnedSlugs.length})
                </span>
              )}
            </button>

            <div className="inline-flex items-center p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <button
                type="button"
                onClick={() => onChangeViewMode('GRID')}
                aria-label="Xem dạng lưới"
                className={`h-7 px-2.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition ${
                  viewMode === 'GRID'
                    ? 'bg-[#0EA5E9] text-[#07090E]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lưới</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeViewMode('LIST')}
                aria-label="Xem dạng danh sách"
                className={`h-7 px-2.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition ${
                  viewMode === 'LIST'
                    ? 'bg-[#0EA5E9] text-[#07090E]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Danh sách</span>
              </button>
            </div>
          </div>
        </div>

        {brands.length === 0 ? (
          <div className="liquid-glass-card rounded-2xl p-8 text-center space-y-2">
            <p className="text-xs text-slate-400">
              {pinnedOnly
                ? 'Bạn chưa ghim dịch vụ nào. Bấm biểu tượng đánh dấu trên thẻ dịch vụ để ghim nhanh.'
                : `Không tìm thấy dịch vụ phù hợp với từ khóa "${searchQuery}".`}
            </p>
            <button
              type="button"
              onClick={onResetFilters}
              className="text-xs font-semibold text-sky-400 hover:underline"
            >
              Hiển thị lại tất cả
            </button>
          </div>
        ) : viewMode === 'GRID' ? (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {brands.map((brand) => {
              const info = getPriceInfo(brand);
              const badge = getWarrantyBadge(info.minPkg);
              const isSelected = selectedBrandSlug === brand.slug;
              const isPinned = pinnedSlugs.includes(brand.slug);

              return (
                <div
                  key={brand.slug}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectBrand(brand)}
                  onKeyDown={(e) => handleCardKeyDown(e, brand)}
                  className={`liquid-glass-card glass-refraction rounded-2xl p-3 sm:p-3.5 cursor-pointer flex flex-col justify-between gap-2.5 text-left ${
                    isSelected ? 'lg:border-[#0EA5E9] lg:bg-sky-500/[0.08]' : ''
                  }`}
                >
                  {/* Top Row: 40x40px Laser Icon + Pill Price */}
                  <div className="flex items-start justify-between gap-2">
                    <BrandIcon
                      slug={brand.slug}
                      name={brand.name}
                      iconPath={brand.iconPath}
                      size="md"
                      active={isSelected}
                    />
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 font-mono tabular-nums text-[11px] font-bold text-sky-200">
                        {formatVND(info.final)}
                      </span>
                      {info.discounted && (
                        <div className="font-mono tabular-nums text-[10px] text-slate-500 line-through mt-0.5 pr-1">
                          {formatVND(info.original)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Name + Warranty + Pin */}
                  <div className="flex items-end justify-between gap-1.5">
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-white truncate">
                        {brand.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                            badge.isNoWarranty
                              ? 'bg-amber-500/10 border-amber-400/25 text-amber-300'
                              : 'bg-emerald-500/10 border-emerald-400/25 text-emerald-300'
                          }`}
                        >
                          {badge.label}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate">
                          {brand.packages.length} gói
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(brand.slug);
                      }}
                      aria-label={isPinned ? 'Bỏ ghim' : 'Ghim dịch vụ'}
                      className={`p-1.5 rounded-lg border transition shrink-0 ${
                        isPinned
                          ? 'bg-sky-500/15 border-sky-400/35 text-sky-300'
                          : 'bg-white/[0.03] border-white/[0.08] text-slate-500 hover:text-white'
                      }`}
                    >
                      <Bookmark className="w-3 h-3" fill={isPinned ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="liquid-glass-card rounded-2xl divide-y divide-white/[0.06] overflow-hidden">
            {brands.map((brand) => {
              const info = getPriceInfo(brand);
              const badge = getWarrantyBadge(info.minPkg);
              const isSelected = selectedBrandSlug === brand.slug;
              const isPinned = pinnedSlugs.includes(brand.slug);

              return (
                <div
                  key={`list_${brand.slug}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectBrand(brand)}
                  onKeyDown={(e) => handleCardKeyDown(e, brand)}
                  className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition ${
                    isSelected ? 'lg:bg-sky-500/[0.09]' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <BrandIcon
                      slug={brand.slug}
                      name={brand.name}
                      iconPath={brand.iconPath}
                      size="md"
                      active={isSelected}
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-white truncate">
                        {brand.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                        <span className={badge.isNoWarranty ? 'text-amber-300 font-semibold' : 'text-emerald-300 font-semibold'}>
                          {badge.label}
                        </span>
                        <span>•</span>
                        <span>{brand.packages.length} gói</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(brand.slug);
                      }}
                      aria-label={isPinned ? 'Bỏ ghim' : 'Ghim'}
                      className={`p-1.5 rounded-lg border transition ${
                        isPinned
                          ? 'bg-sky-500/15 border-sky-400/35 text-sky-300'
                          : 'bg-white/[0.03] border-white/[0.08] text-slate-500 hover:text-white'
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5" fill={isPinned ? 'currentColor' : 'none'} />
                    </button>
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 font-mono tabular-nums text-xs font-bold text-sky-200">
                      {formatVND(info.final)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
});
