'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { BRANDS_CATALOG, BrandInfo } from '@/lib/catalog/brands-data';
import { mergeLiveCatalog } from '@/lib/catalog/merge-live-catalog';
import { useAuth } from '@/contexts/auth-context';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { calculateVipTier } from '@/lib/vip-tier';
import { ServiceStatusBar } from '@/components/common/service-status-bar';
import { ServiceDetailDrawer } from '@/components/services/service-detail-drawer';
import { QuickCheckoutInspector } from '@/components/services/quick-checkout-inspector';
import { BentoCatalogView } from '@/components/services/bento-catalog-view';
import { ADMIN_TELEGRAM_URL } from '@/lib/constants';
import { ShoppingBag, Search, Send, ArrowRight } from 'lucide-react';

const PINNED_STORAGE_KEY = 'yuki_bookmarked_brands';

function ServicesContent() {
  const { lifetimeDeposit } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm, 150);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [pinnedSlugs, setPinnedSlugs] = useState<string[]>([]);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [brands, setBrands] = useState<BrandInfo[]>(BRANDS_CATALOG);
  const [liveCategories, setLiveCategories] = useState<string[]>(() => [
    'ALL',
    ...Array.from(new Set(BRANDS_CATALOG.map((b) => b.category))),
  ]);
  const [selectedBrand, setSelectedBrand] = useState<BrandInfo>(
    () => BRANDS_CATALOG.find((b) => b.slug === 'gemini') || BRANDS_CATALOG[0]
  );
  const [drawerBrand, setDrawerBrand] = useState<BrandInfo | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PINNED_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setPinnedSlugs(parsed.filter((s) => typeof s === 'string'));
      }
    } catch {}

    fetch('/api/catalog', { cache: 'no-store', credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.products && Array.isArray(data.products)) {
          const merged = mergeLiveCatalog(BRANDS_CATALOG, data);
          if (merged.brands.length > 0) {
            setBrands(merged.brands);
            setLiveCategories(merged.categories);
            setSelectedBrand(
              (prev) => merged.brands.find((b) => b.slug === prev.slug) || merged.brands[0]
            );
          }
        }
      })
      .catch(() => {});
  }, []);

  const togglePin = (slug: string) => {
    setPinnedSlugs((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [slug, ...prev];
      try {
        localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleSelectBrand = (brand: BrandInfo) => {
    setSelectedBrand(brand);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setDrawerBrand(brand);
      setIsDrawerOpen(true);
    }
  };

  const vipTier = calculateVipTier(lifetimeDeposit);

  const filteredBrands = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return brands.filter((b) => {
      if (pinnedOnly && !pinnedSlugs.includes(b.slug)) return false;
      const matchCat = selectedCategory === 'ALL' || b.category === selectedCategory;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.shortDesc.toLowerCase().includes(q) ||
        b.packages.some(
          (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
        )
      );
    });
  }, [brands, debouncedSearch, selectedCategory, pinnedOnly, pinnedSlugs]);

  const showFeatured =
    selectedCategory === 'ALL' && !searchTerm.trim() && !pinnedOnly;

  return (
    <div className="space-y-5 animate-page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-[#0EA5E9]" strokeWidth={1.75} />
            <span>Kho Tài Khoản &amp; Dịch Vụ Bản Quyền</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Toàn bộ {brands.length} thương hiệu bản quyền chính chủ, hoàn điểm 2% và bảo hành theo gói.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/buff"
            className="px-3.5 py-2 rounded-xl btn-ios-secondary text-xs flex items-center gap-1.5"
          >
            <span>Buff MXH</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <a
            href={ADMIN_TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl btn-ios-blue text-xs flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Hỗ Trợ Admin</span>
          </a>
        </div>
      </div>

      <ServiceStatusBar />

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

      {/* Split Workspace */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        <div className="flex-1 min-w-0 w-full space-y-5">
          {/* Search & Dynamic Category Tabs */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên dịch vụ, thương hiệu hoặc mã SKU..."
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#0EA5E9]"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {liveCategories.map((cat) => (
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

          <BentoCatalogView
            brands={filteredBrands}
            allBrands={brands}
            selectedBrandSlug={selectedBrand?.slug}
            vipDiscountPercent={vipTier.discountPercent}
            onSelectBrand={handleSelectBrand}
            showFeaturedAndCarousel={showFeatured}
            viewMode={viewMode}
            onChangeViewMode={setViewMode}
            pinnedSlugs={pinnedSlugs}
            onTogglePin={togglePin}
            pinnedOnly={pinnedOnly}
            onTogglePinnedOnly={() => setPinnedOnly((p) => !p)}
            searchQuery={searchTerm}
            onResetFilters={() => {
              setSearchTerm('');
              setSelectedCategory('ALL');
              setPinnedOnly(false);
            }}
          />
        </div>

        {/* PC Right Sticky Quick Checkout Inspector */}
        <aside className="hidden lg:block w-80 shrink-0 sticky top-16">
          <QuickCheckoutInspector brand={selectedBrand} />
        </aside>
      </div>

      <ServiceDetailDrawer
        brand={drawerBrand}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Đang tải danh mục...</div>}>
      <ServicesContent />
    </Suspense>
  );
}
