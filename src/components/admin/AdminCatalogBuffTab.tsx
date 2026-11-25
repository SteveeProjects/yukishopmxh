'use client';

import React, { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Edit3,
  Eye,
  EyeOff,
  Save,
  Trash2,
  FolderPlus,
  Check,
  X,
} from 'lucide-react';
import { PortalModal } from '@/components/PortalModal';
import { IconUploaderField } from '@/components/admin/IconUploaderField';
import { SkeletonTable } from '@/components/common/skeleton-shimmer';
import { BrandIcon } from '@/components/BrandIcon';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { BuffOriginBadge, BuffSpeedBadge } from '@/lib/catalog/buff-badges';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface ProductItem {
  sku: string;
  name: string;
  category: string;
  sell_price: number;
  original_price?: number;
  stock: number;
  sort_order?: number;
  status: 'ACTIVE' | 'HIDDEN';
  description?: string;
  icon?: string;
  warranty_days?: number;
  input_type?: string;
  allow_voucher?: boolean;
}

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
  const [savingProduct, setSavingProduct] = useState(false);

  // Categories Management
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [savingCatEdit, setSavingCatEdit] = useState(false);

  // Products
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [prodSearch, setProdSearch] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [form, setForm] = useState<ProductItem>({
    sku: '',
    name: '',
    category: 'AI & Công Nghệ',
    sell_price: 50000,
    original_price: 100000,
    stock: 99,
    status: 'ACTIVE',
    description: '',
    icon: '/assets/icons/products/chatgpt.jpg',
    warranty_days: 30,
    input_type: 'none',
    allow_voucher: true,
  });

  // Buff
  const [buffs, setBuffs] = useState<BuffServerItem[]>([]);
  const [loadingBuff, setLoadingBuff] = useState(false);
  const [buffLoaded, setBuffLoaded] = useState(false);
  const [buffSearch, setBuffSearch] = useState('');
  const [buffDrafts, setBuffDrafts] = useState<Record<number, BuffDraftState>>({});
  const debouncedProdSearch = useDebouncedValue(prodSearch, 150);
  const debouncedBuffSearch = useDebouncedValue(buffSearch, 150);

  // Coupons
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponsLoaded, setCouponsLoaded] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [newCouponVal, setNewCouponVal] = useState(10);
  const [newCouponMinOrder, setNewCouponMinOrder] = useState(10000);
  const [newCouponLimit, setNewCouponLimit] = useState(100);

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
    } catch {}
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/admin/catalog', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data.products)) setProducts(data.products);
      if (Array.isArray(data.categories)) setCategories(data.categories);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadBuffs = async () => {
    setLoadingBuff(true);
    try {
      const res = await fetch('/api/admin/buff', { cache: 'no-store' });
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
      const res = await fetch('/api/admin/coupons', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data.coupons)) {
        setCoupons(data.coupons);
        setCouponsLoaded(true);
      }
    } catch {}
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  useEffect(() => {
    if (subTab === 'BUFF' && !buffLoaded) loadBuffs();
    if (subTab === 'COUPONS' && !couponsLoaded) loadCoupons();
  }, [subTab, buffLoaded, couponsLoaded]);

  const formatVND = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCatName.trim();
    if (!clean) return;
    setCreatingCat(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clean }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Tạo danh mục thất bại');
      if (Array.isArray(data.categories)) setCategories(data.categories);
      setNewCatName('');
      setNotice({ type: 'ok', text: `Đã tạo mục mới "${clean}".` });
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message || 'Lỗi tạo danh mục.' });
    } finally {
      setCreatingCat(false);
    }
  };

  const handleSaveCategoryEdit = async (catId: string) => {
    const clean = editingCatName.trim();
    if (!clean) return;
    setSavingCatEdit(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: catId, name: clean }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Sửa danh mục thất bại');
      if (Array.isArray(data.categories)) setCategories(data.categories);
      setEditingCatId(null);
      setNotice({ type: 'ok', text: `Đã đổi tên mục thành "${clean}".` });
      loadProducts();
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message || 'Lỗi cập nhật danh mục.' });
    } finally {
      setSavingCatEdit(false);
    }
  };

  const handleDeleteCategory = async (cat: CategoryItem) => {
    try {
      const res = await fetch(`/api/admin/categories?id=${encodeURIComponent(cat.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Xóa danh mục thất bại');
      if (Array.isArray(data.categories)) setCategories(data.categories);
      setNotice({ type: 'ok', text: `Đã xóa mục "${cat.name}".` });
    } catch (err: any) {
      setNotice({ type: 'err', text: err.message || 'Lỗi xóa danh mục.' });
    }
  };

  // Optimistic toggle status
  const handleToggleProductStatus = async (p: ProductItem) => {
    const nextStatus = p.status === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE';
    const prev = [...products];
    setProducts((list) =>
      list.map((item) => (item.sku === p.sku ? { ...item, status: nextStatus } : item))
    );
    try {
      const res = await fetch('/api/admin/catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...p, status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Cập nhật trạng thái thất bại');
      setNotice({ type: 'ok', text: `Đã ${nextStatus === 'ACTIVE' ? 'hiển thị' : 'ẩn'} gói ${p.sku}.` });
    } catch (err: any) {
      setProducts(prev);
      setNotice({ type: 'err', text: err.message || 'Lỗi cập nhật trạng thái sản phẩm.' });
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setNotice({ type: 'err', text: 'Tên sản phẩm không được để trống.' });
      return;
    }
    if (!Number.isFinite(form.sell_price) || form.sell_price <= 0) {
      setNotice({ type: 'err', text: 'Giá bán phải lớn hơn 0đ.' });
      return;
    }

    const method = isNewProduct ? 'POST' : 'PUT';
    const prev = [...products];
    setSavingProduct(true);
    if (!isNewProduct) {
      setProducts((list) => list.map((i) => (i.sku === form.sku ? { ...i, ...form } : i)));
    }
    try {
      const res = await fetch('/api/admin/catalog', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lưu sản phẩm thất bại.');
      }
      setEditModalOpen(false);
      setNotice({ type: 'ok', text: `Đã lưu sản phẩm ${form.name}.` });
      loadProducts();
    } catch (err: any) {
      setProducts(prev);
      setNotice({ type: 'err', text: err.message || 'Lỗi lưu sản phẩm.' });
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (p: ProductItem) => {
    if (typeof window !== 'undefined' && !window.confirm(`Xác nhận xóa sản phẩm ${p.name} (${p.sku})?`)) {
      return;
    }
    const prev = [...products];
    setProducts((list) => list.filter((i) => i.sku !== p.sku));
    try {
      const res = await fetch('/api/admin/catalog', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku: p.sku }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Xóa sản phẩm thất bại.');
      setNotice({ type: 'ok', text: `Đã xóa sản phẩm ${p.sku}.` });
    } catch (err: any) {
      setProducts(prev);
      setNotice({ type: 'err', text: err.message || 'Lỗi xóa sản phẩm.' });
    }
  };

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

  const filteredProducts = products.filter((p) => {
    const q = debouncedProdSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

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
            { id: 'PRODUCTS', label: `Sản Phẩm (${products.length})` },
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

        {subTab === 'PRODUCTS' && (
          <button
            type="button"
            onClick={() => {
              setIsNewProduct(true);
              setForm({
                sku: `YUKI-${Date.now().toString().slice(-4)}`,
                name: '',
                category: categories[0]?.name || 'AI & Công Nghệ',
                sell_price: 50000,
                original_price: 100000,
                stock: 99,
                status: 'ACTIVE',
                description: '',
                icon: '/assets/icons/products/chatgpt.jpg',
                warranty_days: 30,
                input_type: 'none',
                allow_voucher: true,
              });
              setEditModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl btn-ios-blue text-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm sản phẩm</span>
          </button>
        )}
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
        <div className="space-y-4">
          {/* Category Management Block ("Tạo Mục Mới") directly above product list */}
          <div className="p-4 rounded-2xl liquid-glass-card space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-[#0EA5E9]" strokeWidth={1.75} />
                  <span>Quản Lý Danh Mục ({categories.length})</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tạo mục mới, sửa tên hoặc xóa danh mục — tự động đồng bộ sang form Thêm sản phẩm, Trang Chủ và /services.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateCategory} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Tên mục mới (VD: Tài Khoản Lập Trình, Key Bản Quyền...)"
                className="flex-1 h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.1] text-white placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9]"
              />
              <button
                type="submit"
                disabled={creatingCat || !newCatName.trim()}
                className="h-9 px-4 rounded-xl btn-ios-blue font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{creatingCat ? 'Đang tạo...' : 'Tạo mục mới'}</span>
              </button>
            </form>

            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const isEditing = editingCatId === cat.id;
                  return (
                    <div
                      key={cat.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#07090E]/90 border border-white/[0.1] text-xs"
                    >
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={editingCatName}
                            onChange={(e) => setEditingCatName(e.target.value)}
                            className="w-36 h-7 px-2 rounded-lg bg-white/[0.06] border border-sky-400/40 text-white text-[11px] focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            disabled={savingCatEdit}
                            onClick={() => handleSaveCategoryEdit(cat.id)}
                            aria-label="Lưu tên mục"
                            className="p-1 rounded-md text-emerald-300 hover:bg-emerald-500/15"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCatId(null)}
                            aria-label="Hủy sửa"
                            className="p-1 rounded-md text-slate-400 hover:bg-white/[0.06]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold text-slate-200">{cat.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCatId(cat.id);
                              setEditingCatName(cat.name);
                            }}
                            aria-label={`Sửa mục ${cat.name}`}
                            className="p-1 rounded-md text-slate-400 hover:text-sky-300 hover:bg-white/[0.06]"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            aria-label={`Xóa mục ${cat.name}`}
                            className="p-1 rounded-md text-slate-500 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={prodSearch}
              onChange={(e) => setProdSearch(e.target.value)}
              placeholder="Tìm sản phẩm theo tên, thương hiệu hoặc SKU..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#0EA5E9]"
            />
          </div>

          {loadingProducts && products.length === 0 ? (
            <SkeletonTable />
          ) : (
            <div className="rounded-2xl liquid-glass-card divide-y divide-white/[0.06]">
              {filteredProducts.map((p) => (
                <div
                  key={p.sku}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <BrandIcon
                      slug={p.sku}
                      name={p.name}
                      iconPath={p.icon}
                      size="md"
                      laser={false}
                    />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-white truncate">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-sky-300">{p.sku}</span> • {p.category} •{' '}
                        {p.warranty_days === 0 ? 'KBH' : `BH ${p.warranty_days ?? 30} ngày`}
                        {p.input_type === 'credentials' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            TK|MK|2FA
                          </span>
                        )}
                        {p.input_type === 'email_only' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                            Add Family
                          </span>
                        )}
                        {p.input_type === 'admin_delivered' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            Cấp sẵn
                          </span>
                        )}
                        {p.allow_voucher === false && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            Khóa voucher
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                    <span className="font-mono tabular-nums text-xs sm:text-sm font-bold text-white px-2">
                      {formatVND(p.sell_price)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleProductStatus(p)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border flex items-center gap-1 ${
                        p.status === 'ACTIVE'
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {p.status === 'ACTIVE' ? (
                        <>
                          <Eye className="w-3 h-3" />
                          <span>Đang bật</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3" />
                          <span>Đang ẩn</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewProduct(false);
                        setForm(p);
                        setEditModalOpen(true);
                      }}
                      className="p-2 rounded-lg bg-[#060B16] border border-sky-200/[0.1] text-slate-300 hover:text-white"
                      aria-label="Sửa sản phẩm"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(p)}
                      className="p-2 rounded-lg bg-[#060B16] border border-red-500/20 text-red-400 hover:bg-red-500/15"
                      aria-label="Xóa sản phẩm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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

      {/* Product Edit Modal */}
      <PortalModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={isNewProduct ? 'Thêm Sản Phẩm Mới' : `Chỉnh Sửa: ${form.sku}`}
      >
        <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Mã SKU</label>
              <input
                type="text"
                required
                disabled={!isNewProduct}
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                className="w-full h-9 px-3 rounded-xl bg-[#060B16] border border-sky-200/[0.12] font-mono text-white disabled:opacity-60"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Giá bán (VNĐ)</label>
              <input
                type="number"
                required
                value={form.sell_price}
                onChange={(e) => setForm({ ...form, sell_price: Number(e.target.value) })}
                className="w-full h-9 px-3 rounded-xl bg-[#060B16] border border-sky-200/[0.12] font-mono tabular-nums text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Tên gói sản phẩm</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.12] text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Danh mục (Category)</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.12] text-white"
            >
              {!categories.some((c) => c.name === form.category) && form.category && (
                <option value={form.category}>{form.category}</option>
              )}
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Giá gốc (VNĐ)</label>
              <input
                type="number"
                min={0}
                value={form.original_price ?? 0}
                onChange={(e) => setForm({ ...form, original_price: Number(e.target.value) })}
                className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.12] font-mono tabular-nums text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Bảo hành (0 = KBH)</label>
              <input
                type="number"
                min={0}
                value={form.warranty_days ?? 30}
                onChange={(e) => setForm({ ...form, warranty_days: Number(e.target.value) })}
                className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.12] font-mono tabular-nums text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Thứ tự / Trạng thái</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min={0}
                  value={form.sort_order ?? 0}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                  aria-label="Thứ tự sắp xếp"
                  className="w-16 h-9 px-2 rounded-xl bg-[#07090E] border border-white/[0.12] font-mono tabular-nums text-white"
                />
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as 'ACTIVE' | 'HIDDEN' })}
                  className="flex-1 h-9 px-2 rounded-xl bg-[#07090E] border border-white/[0.12] text-white"
                >
                  <option value="ACTIVE">Mở bán</option>
                  <option value="HIDDEN">Ẩn</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Mô tả ngắn</label>
            <input
              type="text"
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Mô tả quyền lợi gói..."
              className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.12] text-white"
            />
          </div>

          <IconUploaderField
            value={form.icon || '/assets/icons/products/chatgpt.jpg'}
            onChange={(newIcon) => setForm({ ...form, icon: newIcon })}
          />

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Loại đầu vào (Input Type)</label>
              <select
                value={form.input_type || 'none'}
                onChange={(e) => setForm({ ...form, input_type: e.target.value })}
                className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.12] text-white"
              >
                <option value="none">none (Không bắt buộc TK/MK)</option>
                <option value="credentials">credentials (Nâng cấp chính chủ: TK|MK|2FA)</option>
                <option value="email_only">email_only (Add Family / Chỉ cần Email)</option>
                <option value="admin_delivered">admin_delivered (Tài khoản cấp sẵn - Admin bàn giao)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Mã giảm giá (Voucher)</label>
              <select
                value={form.allow_voucher === false ? 'false' : 'true'}
                onChange={(e) => setForm({ ...form, allow_voucher: e.target.value === 'true' })}
                className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.12] text-white"
              >
                <option value="true">Áp dụng mã giảm giá bình thường</option>
                <option value="false">Khóa mã giảm giá (Không áp dụng voucher)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProduct}
            className="w-full h-10 rounded-xl btn-ios-blue text-xs font-bold disabled:opacity-50"
          >
            {savingProduct ? 'Đang lưu...' : 'Lưu Thay Đổi'}
          </button>
        </form>
      </PortalModal>
    </div>
  );
}
