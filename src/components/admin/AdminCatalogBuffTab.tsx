'use client';

import React, { useEffect, useState } from 'react';
import {
  Search,
  Eye,
  EyeOff,
  Save,
  Trash2,
} from 'lucide-react';
import { SkeletonTable } from '@/components/common/skeleton-shimmer';
import { BrandIcon } from '@/components/BrandIcon';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { BuffOriginBadge, BuffSpeedBadge } from '@/lib/catalog/buff-badges';
import {
  AdminProductsFolderManager,
  type AdminProductItem,
  type FolderCategoryItem,
} from '@/components/admin/AdminProductsFolderManager';

interface BuffServerItem {
  id: number;
  name: string;
  cleanName?: string;
  platform: string;
  serviceCode: string;
  serviceName: string;
  unit: string;
  retailPrice: number;
  status: 'ACTIVE' | 'HIDDEN';
  originBadge: BuffOriginBadge;
  speedBadge: BuffSpeedBadge;
  warrantyBadge: string;
  note?: string;
}

interface BuffDraftState {
  retailPrice?: number;
  originBadge?: BuffOriginBadge;
  speedBadge?: BuffSpeedBadge;
  warrantyBadge?: string;
  note?: string;
}

const WARRANTY_OPTIONS = [
  'KBH',
  'BH 7 ngày',
  'BH 10 ngày',
  'BH 15 ngày',
  'BH 30 ngày',
  'BH 60 ngày',
  'BH 180 ngày',
  'BH 365 ngày',
  'BH Trọn đời',
];

export function AdminCatalogBuffTab() {
  const [subTab, setSubTab] = useState<'PRODUCTS' | 'BUFF' | 'COUPONS'>('PRODUCTS');
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Categories & Products (delegated to AdminProductsFolderManager)
  const [categories, setCategories] = useState<FolderCategoryItem[]>([]);
  const [products, setProducts] = useState<AdminProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Buff
  const [buffs, setBuffs] = useState<BuffServerItem[]>([]);
  const [loadingBuff, setLoadingBuff] = useState(false);
  const [buffLoaded, setBuffLoaded] = useState(false);
  const [buffSearch, setBuffSearch] = useState('');
  const [buffDrafts, setBuffDrafts] = useState<Record<number, BuffDraftState>>({});
  const debouncedBuffSearch = useDebouncedValue(buffSearch, 150);

  // Coupons
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponsLoaded, setCouponsLoaded] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [newCouponVal, setNewCouponVal] = useState(10);
  const [newCouponMinOrder, setNewCouponMinOrder] = useState(10000);
  const [newCouponLimit, setNewCouponLimit] = useState(100);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const [catRes, catListRes] = await Promise.all([
        fetch('/api/admin/catalog', { cache: 'no-store', credentials: 'include' }),
        fetch('/api/admin/categories', { cache: 'no-store', credentials: 'include' }),
      ]);
      const data = await catRes.json().catch(() => ({}));
      const listData = await catListRes.json().catch(() => ({}));
      if (Array.isArray(data.products)) setProducts(data.products);
      if (Array.isArray(listData.categories) && listData.categories.length > 0) {
        setCategories(listData.categories);
      } else if (Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadBuffs = async () => {
    setLoadingBuff(true);
    try {
      const res = await fetch('/api/admin/buff', { cache: 'no-store', credentials: 'include' });
      const data = await res.json();
      if (Array.isArray(data.servers)) {
        setBuffs(data.servers);
        setBuffLoaded(true);
      }
    } finally {
      setLoadingBuff(false);
    }
  };

  const loadCoupons = async () => {
    try {
      const res = await fetch('/api/admin/coupons', { cache: 'no-store', credentials: 'include' });
      const data = await res.json();
      if (Array.isArray(data.coupons)) {
        setCoupons(data.coupons);
        setCouponsLoaded(true);
      }
    } catch {}
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (subTab === 'BUFF' && !buffLoaded) loadBuffs();
    if (subTab === 'COUPONS' && !couponsLoaded) loadCoupons();
  }, [subTab, buffLoaded, couponsLoaded]);

  const formatVND = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

  const handleSaveBuff = async (srv: BuffServerItem, nextStatus?: 'ACTIVE' | 'HIDDEN') => {
    const draft = buffDrafts[srv.id] || {};
    const price = draft.retailPrice ?? srv.retailPrice;
    const originBadge = draft.originBadge ?? srv.originBadge ?? 'Tây';
    const speedBadge = draft.speedBadge ?? srv.speedBadge ?? 'Ổn định';
    const warrantyBadge = draft.warrantyBadge ?? srv.warrantyBadge ?? 'KBH';
    const note = draft.note !== undefined ? draft.note : (srv.note || '');
    const status = nextStatus || srv.status;

    const prev = [...buffs];
    setBuffs((list) =>
      list.map((item) =>
        item.id === srv.id
          ? { ...item, retailPrice: price, status, originBadge, speedBadge, warrantyBadge, note }
          : item
      )
    );
    try {
      const res = await fetch('/api/admin/buff/update-price', {
        cache: 'no-store',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: srv.id,
          retailPrice: price,
          status,
          originBadge,
          speedBadge,
          warrantyBadge,
          note,
          platform: srv.platform,
          serviceCode: srv.serviceCode,
          name: srv.cleanName || srv.name,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setNotice({
        type: 'ok',
        text: `Đã lưu cấu hình server #${srv.id} (${originBadge} • ${speedBadge} • ${warrantyBadge}).`,
      });
    } catch {
      setBuffs(prev);
      setNotice({ type: 'err', text: `Lỗi lưu server #${srv.id}.` });
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;
    try {
      const res = await fetch('/api/admin/coupons', {
        cache: 'no-store',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCouponCode.trim().toUpperCase(),
          discount_type: newCouponType,
          discount_value: newCouponVal,
          min_order_amount: Math.max(0, Number(newCouponMinOrder || 0)),
          usage_limit: newCouponLimit > 0 ? Number(newCouponLimit) : null,
          is_active: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setNotice({ type: 'err', text: data.error || 'Tạo mã giảm giá thất bại.' });
        return;
      }
      setNewCouponCode('');
      setNotice({ type: 'ok', text: `Đã tạo mã giảm giá ${data.coupon?.code || ''}.` });
      loadCoupons();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message || 'Lỗi tạo mã giảm giá.' });
    }
  };

  const handleToggleCoupon = async (coupon: any) => {
    const nextActive = !coupon.is_active;
    const prev = [...coupons];
    setCoupons((list) => list.map((c) => (c.code === coupon.code ? { ...c, is_active: nextActive } : c)));
    try {
      const res = await fetch('/api/admin/coupons', {
        cache: 'no-store',
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: coupon.code, is_active: nextActive }),
      });
      if (!res.ok) throw new Error('Cập nhật mã thất bại.');
      setNotice({
        type: 'ok',
        text: `Đã ${nextActive ? 'bật' : 'tạm tắt'} mã ${coupon.code}.`,
      });
    } catch (err: any) {
      setCoupons(prev);
      setNotice({ type: 'err', text: err.message || 'Lỗi bật/tắt mã.' });
    }
  };

  const handleDeleteCoupon = async (code: string) => {
    const prev = [...coupons];
    setCoupons((list) => list.filter((c) => c.code !== code));
    try {
      const res = await fetch('/api/admin/coupons', {
        cache: 'no-store',
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) throw new Error('Xóa mã giảm giá thất bại.');
      setNotice({ type: 'ok', text: `Đã xóa mã ${code}.` });
    } catch (err: any) {
      setCoupons(prev);
      setNotice({ type: 'err', text: err.message || 'Lỗi xóa mã.' });
    }
  };

  const filteredBuffs = buffs.filter((b) => {
    const q = debouncedBuffSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      b.name.toLowerCase().includes(q) ||
      (b.cleanName || '').toLowerCase().includes(q) ||
      b.platform.toLowerCase().includes(q) ||
      String(b.id).includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {[
            { id: 'PRODUCTS', label: `Sản Phẩm & Thư Mục (${products.length})` },
            { id: 'BUFF', label: 'Buff MXH (Servers)' },
            { id: 'COUPONS', label: 'Mã Giảm Giá' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                subTab === t.id
                  ? 'bg-[#0EA5E9] text-[#07090E] font-bold'
                  : 'bg-white/[0.04] text-slate-300 border border-white/[0.08]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold border ${
            notice.type === 'err'
              ? 'bg-red-500/12 border-red-400/30 text-red-200'
              : 'bg-sky-500/12 border-sky-400/25 text-sky-200'
          }`}
        >
          {notice.text}
        </div>
      )}

      {subTab === 'PRODUCTS' && (
        <AdminProductsFolderManager
          categories={categories}
          products={products}
          loading={loadingProducts}
          onRefresh={loadProducts}
          onNotice={setNotice}
        />
      )}

      {subTab === 'BUFF' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={buffSearch}
              onChange={(e) => setBuffSearch(e.target.value)}
              placeholder="Tìm server Buff MXH theo nền tảng hoặc ID..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#0D1526] border border-sky-200/[0.1] text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#0EA5E9]"
            />
          </div>

          {loadingBuff && buffs.length === 0 ? (
            <SkeletonTable />
          ) : (
            <div className="rounded-2xl liquid-glass-card divide-y divide-white/[0.06]">
              {filteredBuffs.map((srv) => {
                const draft = buffDrafts[srv.id] || {};
                const curOrigin = draft.originBadge ?? srv.originBadge ?? 'Tây';
                const curSpeed = draft.speedBadge ?? srv.speedBadge ?? 'Ổn định';
                const curWarranty = draft.warrantyBadge ?? srv.warrantyBadge ?? 'KBH';
                const curNote = draft.note !== undefined ? draft.note : (srv.note || '');
                const curPrice = draft.retailPrice ?? srv.retailPrice;
                const warrantyChoices = WARRANTY_OPTIONS.includes(curWarranty)
                  ? WARRANTY_OPTIONS
                  : [curWarranty, ...WARRANTY_OPTIONS];

                return (
                  <div key={srv.id} className="p-3.5 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <BrandIcon
                          slug={srv.platform.toLowerCase()}
                          name={srv.platform}
                          size="sm"
                          laser={false}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            [{srv.platform}] #{srv.id} — {srv.cleanName || srv.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {srv.serviceName} ({srv.unit})
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="number"
                          value={curPrice}
                          onChange={(e) =>
                            setBuffDrafts((prev) => ({
                              ...prev,
                              [srv.id]: {
                                ...(prev[srv.id] || {}),
                                retailPrice: Number(e.target.value),
                              },
                            }))
                          }
                          aria-label={`Giá bán server ${srv.id}`}
                          className="w-24 h-8 px-2.5 rounded-lg bg-[#07090E] border border-white/[0.12] font-mono tabular-nums text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveBuff(srv)}
                          className="h-8 px-2.5 rounded-lg btn-ios-blue text-[11px] flex items-center gap-1"
                        >
                          <Save className="w-3 h-3" />
                          <span>Lưu</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleSaveBuff(srv, srv.status === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE')
                          }
                          className={`h-8 px-2.5 rounded-lg text-[11px] font-bold border ${
                            srv.status === 'ACTIVE'
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {srv.status === 'ACTIVE' ? 'Bật' : 'Ẩn'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-[11px]">
                      <select
                        value={curOrigin}
                        onChange={(e) =>
                          setBuffDrafts((prev) => ({
                            ...prev,
                            [srv.id]: {
                              ...(prev[srv.id] || {}),
                              originBadge: e.target.value as BuffOriginBadge,
                            },
                          }))
                        }
                        aria-label={`Nguồn server ${srv.id}`}
                        className="sm:col-span-2 h-8 px-2 rounded-lg bg-[#07090E] border border-white/[0.1] text-slate-200"
                      >
                        <option value="Việt">Việt</option>
                        <option value="Tây">Tây</option>
                      </select>

                      <select
                        value={curSpeed}
                        onChange={(e) =>
                          setBuffDrafts((prev) => ({
                            ...prev,
                            [srv.id]: {
                              ...(prev[srv.id] || {}),
                              speedBadge: e.target.value as BuffSpeedBadge,
                            },
                          }))
                        }
                        aria-label={`Tốc độ server ${srv.id}`}
                        className="sm:col-span-2 h-8 px-2 rounded-lg bg-[#07090E] border border-white/[0.1] text-slate-200"
                      >
                        <option value="Tức thì">Tức thì</option>
                        <option value="Nhanh">Nhanh</option>
                        <option value="Ổn định">Ổn định</option>
                        <option value="Chậm">Chậm</option>
                      </select>

                      <select
                        value={curWarranty}
                        onChange={(e) =>
                          setBuffDrafts((prev) => ({
                            ...prev,
                            [srv.id]: {
                              ...(prev[srv.id] || {}),
                              warrantyBadge: e.target.value,
                            },
                          }))
                        }
                        aria-label={`Bảo hành server ${srv.id}`}
                        className="sm:col-span-3 h-8 px-2 rounded-lg bg-[#07090E] border border-white/[0.1] text-slate-200"
                      >
                        {warrantyChoices.map((wOpt) => (
                          <option key={wOpt} value={wOpt}>
                            {wOpt}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={curNote}
                        onChange={(e) =>
                          setBuffDrafts((prev) => ({
                            ...prev,
                            [srv.id]: {
                              ...(prev[srv.id] || {}),
                              note: e.target.value,
                            },
                          }))
                        }
                        placeholder="Chú thích riêng của máy chủ..."
                        aria-label={`Chú thích riêng server ${srv.id}`}
                        className="sm:col-span-5 h-8 px-2.5 rounded-lg bg-[#07090E] border border-white/[0.1] text-white placeholder-slate-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {subTab === 'COUPONS' && (
        <div className="space-y-4">
          <form
            onSubmit={handleCreateCoupon}
            className="p-4 rounded-2xl bg-[#0D1526]/90 border border-sky-200/[0.1] grid grid-cols-1 sm:grid-cols-6 gap-2.5 text-xs"
          >
            <input
              type="text"
              value={newCouponCode}
              onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
              placeholder="Mã (VD: YUKI10)"
              className="sm:col-span-2 h-10 px-3 rounded-xl bg-[#060B16] border border-sky-200/[0.12] font-mono text-white"
            />
            <select
              value={newCouponType}
              onChange={(e) => setNewCouponType(e.target.value as 'PERCENT' | 'FIXED')}
              aria-label="Loại giảm giá"
              className="h-10 px-2.5 rounded-xl bg-[#060B16] border border-sky-200/[0.12] text-white"
            >
              <option value="PERCENT">Giảm (%)</option>
              <option value="FIXED">Giảm (VNĐ)</option>
            </select>
            <input
              type="number"
              min={1}
              max={newCouponType === 'PERCENT' ? 90 : 1000000}
              value={newCouponVal}
              onChange={(e) => setNewCouponVal(Number(e.target.value))}
              aria-label="Giá trị giảm"
              placeholder={newCouponType === 'PERCENT' ? '%' : 'VNĐ'}
              className="h-10 px-3 rounded-xl bg-[#060B16] border border-sky-200/[0.12] font-mono tabular-nums text-white"
            />
            <input
              type="number"
              min={0}
              step={5000}
              value={newCouponMinOrder}
              onChange={(e) => setNewCouponMinOrder(Number(e.target.value))}
              aria-label="Đơn tối thiểu"
              placeholder="Đơn tối thiểu"
              title="Đơn tối thiểu (VNĐ)"
              className="h-10 px-3 rounded-xl bg-[#060B16] border border-sky-200/[0.12] font-mono tabular-nums text-white"
            />
            <button type="submit" className="h-10 px-4 rounded-xl btn-ios-blue font-bold">
              Tạo mã
            </button>
          </form>

          <div className="rounded-2xl bg-[#0D1526]/90 border border-sky-200/[0.1] divide-y divide-sky-200/[0.06]">
            {coupons.map((c) => (
              <div key={c.code} className="p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-mono font-bold text-[#38BDF8]">{c.code}</span>
                  <span className="ml-2 text-slate-300 tabular-nums">
                    Giảm {c.discount_value}
                    {c.discount_type === 'PERCENT' ? '%' : 'đ'}
                  </span>
                  <span className="ml-2 text-[11px] text-slate-400 tabular-nums">
                    • Đơn từ {formatVND(Number(c.min_order_amount || 0))} • Dùng: {c.used_count || 0}
                    {c.usage_limit ? `/${c.usage_limit}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleCoupon(c)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                      c.is_active
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {c.is_active ? 'Đang bật' : 'Đã tắt'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCoupon(c.code)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"
                    aria-label="Xóa mã"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
