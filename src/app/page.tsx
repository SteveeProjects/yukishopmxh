'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { BRANDS_CATALOG, BrandInfo } from '@/lib/catalog/brands-data';
import { mergeLiveCatalog } from '@/lib/catalog/merge-live-catalog';
import { useAuth } from '@/contexts/auth-context';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { calculateVipTier } from '@/lib/vip-tier';
import { Tilt3DCard } from '@/components/common/tilt-3d-card';
import { ActivityTicker } from '@/components/common/activity-ticker';
import { ServiceStatusBar } from '@/components/common/service-status-bar';
import { ServiceDetailDrawer } from '@/components/services/service-detail-drawer';
import { QuickCheckoutInspector } from '@/components/services/quick-checkout-inspector';
import { BentoCatalogView } from '@/components/services/bento-catalog-view';
import { TopDepositorsCard } from '@/components/wallet/TopDepositorsCard';
import { WelcomeGateway } from '@/components/home/welcome-gateway';
import { TelegramChannelBanner } from '@/components/common/telegram-channel-banner';
import type { AnnouncementPopupConfig, SystemConfig } from '@/types/settings';
import { ADMIN_TELEGRAM_URL } from '@/lib/constants';
import {
  Search,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  Send,
  ArrowUpRight,
  Compass,
} from 'lucide-react';

const PINNED_STORAGE_KEY = 'yuki_bookmarked_brands';

export default function HomePage() {
  const { lifetimeDeposit } = useAuth();
  const [showGateway, setShowGateway] = useState<boolean>(false);
  const [isGatewayReady, setIsGatewayReady] = useState<boolean>(false);
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
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 150);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [pinnedSlugs, setPinnedSlugs] = useState<string[]>([]);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [announcement, setAnnouncement] = useState<AnnouncementPopupConfig | null>(null);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [channelUrl, setChannelUrl] = useState<string>(
    process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL || ADMIN_TELEGRAM_URL
  );

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('gateway') === '1') {
        setShowGateway(true);
      } else if (params.get('store') === '1') {
        setShowGateway(false);
        sessionStorage.setItem('yuki_gateway_entered', 'true');
      } else {
        const entered = sessionStorage.getItem('yuki_gateway_entered');
        setShowGateway(entered !== 'true');
      }
    } catch {
      setShowGateway(false);
    } finally {
      setIsGatewayReady(true);
    }
  }, []);

  const handleEnterStore = (category?: string) => {
    try {
      sessionStorage.setItem('yuki_gateway_entered', 'true');
    } catch {}
    if (category) {
      setSelectedCategory(category);
    }
    setShowGateway(false);
  };

  const handleReopenGateway = () => {
    try {
      sessionStorage.removeItem('yuki_gateway_entered');
    } catch {}
    setShowGateway(true);
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PINNED_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setPinnedSlugs(parsed.filter((s) => typeof s === 'string'));
      }
    } catch {}

    fetch('/api/settings/announcement', { cache: 'no-store', credentials: 'include' })
      .then((res) => res.json())
      .then((json) => {
        if (json?.config) setAnnouncement(json.config);
        if (json?.systemConfig) setSystemConfig(json.systemConfig);
        const customChannel = json?.config?.channel_telegram_url;
        if (typeof customChannel === 'string' && customChannel.startsWith('https://')) {
          setChannelUrl(customChannel);
        }
      })
      .catch(() => {});

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
        b.category.toLowerCase().includes(q) ||
        b.packages.some(
          (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
        )
      );
    });
  }, [brands, debouncedSearch, selectedCategory, pinnedOnly, pinnedSlugs]);

  const supportUrl =
    announcement?.support_telegram_url && announcement.support_telegram_url.startsWith('https://')
      ? announcement.support_telegram_url
      : ADMIN_TELEGRAM_URL;

  const showFeatured =
    selectedCategory === 'ALL' && !searchQuery.trim() && !pinnedOnly;

  if (showGateway) {
    return <WelcomeGateway onEnterStore={handleEnterStore} />;
  }

  return (
    <div className="space-y-5 sm:space-y-6 animate-page-enter">
      {/* PC Split-Workspace (>=1024px) */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        <div className="flex-1 min-w-0 w-full space-y-5 sm:space-y-6">
          {/* TẦNG 1: Clean Hero Banner GIF (No text or overlay on top of GIF) */}
          <Tilt3DCard
            intensity={2.5}
            glare={false}
            refraction={false}
            className="w-full"
          >
            <img
              src="/assets/images/hero-banner.gif"
              alt="YukiShopMXH"
              className="w-full h-auto object-cover rounded-3xl border border-sky-400/20 shadow-[0_20px_50px_-15px_rgba(14,165,233,0.22)] block"
              draggable={false}
            />
          </Tilt3DCard>

          {/* 2x2 Liquid Glass Quick Bento Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Link
              href="/services"
              className="liquid-glass-card glass-refraction rounded-2xl p-3.5 flex items-center gap-3 hover:border-sky-400/35 transition"
            >
              <span className="w-9 h-9 rounded-xl bg-sky-500/12 border border-sky-400/25 text-sky-300 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-4 h-4" strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">Kho Bản Quyền</div>
                <div className="text-[10px] text-slate-400 truncate">Hoàn điểm 2%</div>
              </div>
            </Link>

            <Link
              href="/buff"
              className="liquid-glass-card glass-refraction rounded-2xl p-3.5 flex items-center gap-3 hover:border-sky-400/35 transition"
            >
              <span className="w-9 h-9 rounded-xl bg-sky-500/12 border border-sky-400/25 text-sky-300 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">Buff MXH</div>
                <div className="text-[10px] text-slate-400 truncate">6 Nền Tảng</div>
              </div>
            </Link>

            <Link
              href="/warranty"
              className="liquid-glass-card glass-refraction rounded-2xl p-3.5 flex items-center gap-3 hover:border-sky-400/35 transition"
            >
              <span className="w-9 h-9 rounded-xl bg-emerald-500/12 border border-emerald-400/25 text-emerald-300 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">Bảo Hành</div>
                <div className="text-[10px] text-slate-400 truncate">Tra cứu nhanh</div>
              </div>
            </Link>

            <a
              href={channelUrl || supportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="liquid-glass-card glass-refraction rounded-2xl p-3.5 flex items-center gap-3 hover:border-amber-400/35 transition"
            >
              <span className="w-9 h-9 rounded-xl bg-amber-500/12 border border-amber-400/25 text-amber-300 flex items-center justify-center shrink-0">
                <Send className="w-4 h-4" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                  <span>Kênh Telegram</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-400 shrink-0" />
                </div>
                <div className="text-[10px] text-slate-400 truncate">Update Tech & Shop</div>
              </div>
            </a>
          </div>

          {/* Telegram Tech & Shop Official Channel Banner */}
          <TelegramChannelBanner channelUrl={channelUrl} />

          {/* Live Service & Sleep Mode Status Bar */}
          <ServiceStatusBar
            systemConfig={systemConfig}
            bannerText={announcement?.banner_text}
            bannerActive={announcement?.banner_active}
            supportTelegramUrl={supportUrl}
          />

          {/* Real Activity Ticker (hidden if empty) */}
          <ActivityTicker />

          {/* Main Store Header with Re-open Gateway option */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                Menu Cửa Hàng & Bảng Giá Dịch Vụ
              </h2>
            </div>
            <button
              type="button"
              onClick={handleReopenGateway}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-amber-400/30 text-[11px] font-semibold text-slate-300 hover:text-amber-300 transition"
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>Trang Cổng Chào</span>
            </button>
          </div>

          {/* Search & Dynamic Category Pills */}
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm dịch vụ, tài khoản, SKU (VD: Gemini, MB Bank, YouTube)..."
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#0EA5E9] transition"
                />
              </div>
              {vipTier.discountPercent > 0 && (
                <div className="px-3 py-2 rounded-xl bg-sky-500/12 border border-sky-400/30 text-sky-200 text-xs font-semibold whitespace-nowrap">
                  Áp dụng giá {vipTier.name} (-{vipTier.discountPercent}%)
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {liveCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-[#0EA5E9] text-[#07090E] font-bold shadow-[0_6px_18px_rgba(14,165,233,0.25)]'
                      : 'bg-white/[0.04] text-slate-300 border border-white/[0.08] hover:border-sky-400/30 hover:text-white'
                  }`}
                >
                  {cat === 'ALL' ? `Tất cả (${brands.length})` : cat}
                </button>
              ))}
            </div>
          </section>

          {/* TẦNG 2 & 3: Pinned Row, Featured Asymmetric Bento, Buff Carousel, 2-Col Bento Grid */}
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
            searchQuery={searchQuery}
            onResetFilters={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
              setPinnedOnly(false);
            }}
          />

          {/* Real Top Depositors Leaderboard */}
          <TopDepositorsCard />
        </div>

        {/* PC Sticky Right Quick Checkout Inspector */}
        <aside className="hidden lg:block w-80 shrink-0 sticky top-16">
          <QuickCheckoutInspector brand={selectedBrand} />
        </aside>
      </div>

      {/* Mobile Bottom Sheet Drawer */}
      <ServiceDetailDrawer
        brand={drawerBrand}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
}
