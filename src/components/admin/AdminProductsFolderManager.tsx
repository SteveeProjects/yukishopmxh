'use client';

import React, { useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Edit3,
  Eye,
  EyeOff,
  Trash2,
  FolderPlus,
  FolderOpen,
  Folder,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Check,
  X,
} from 'lucide-react';
import { PortalModal } from '@/components/PortalModal';
import { IconUploaderField } from '@/components/admin/IconUploaderField';
import { SkeletonTable } from '@/components/common/skeleton-shimmer';
import { BrandIcon } from '@/components/BrandIcon';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  DELIVERY_MODE_OPTIONS,
  getDeliveryModeMeta,
  normalizeDeliveryMode,
} from '@/lib/catalog/delivery-modes';

export interface FolderCategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sort_order?: number;
}

export interface AdminProductItem {
  sku: string;
  name: string;
  category: string;
  display_section?: string;
  sell_price: number;
  original_price?: number;
  stock: number;
  sort_order?: number;
  status: 'ACTIVE' | 'HIDDEN';
  description?: string;
  icon?: string;
  warranty_days?: number;
  input_type?: string;
  delivery_mode?: string;
  custom_input_label?: string;
  fulfillment_mode?: string;
  allow_voucher?: boolean;
}

interface Props {
  categories: FolderCategoryItem[];
  products: AdminProductItem[];
  loading: boolean;
  onRefresh: () => Promise<void> | void;
  onNotice: (notice: { type: 'ok' | 'err'; text: string } | null) => void;
}

const DISPLAY_SECTIONS = [
  'Google Gemini',
  'Muse AI',
  'Dịch Vụ SMS & OTP',
  'Trang Chủ - Sản Phẩm Nổi Bật',
  'Trí Tuệ Nhân Tạo AI',
  'Giải Trí & Video',
  'Đồ Họa & Biên Tập',
  'Học Tập & Ngôn Ngữ',
];

export function AdminProductsFolderManager({
  categories,
  products,
  loading,
  onRefresh,
  onNotice,
}: Props) {
  const [prodSearch, setProdSearch] = useState('');
  const debouncedSearch = useDebouncedValue(prodSearch, 150);
  const [selectedFolder, setSelectedFolder] = useState<string>('ALL');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [busySku, setBusySku] = useState<string | null>(null);

  // Create / Edit Folder Modal
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderCategoryItem | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderIcon, setFolderIcon] = useState('Folder');
  const [folderDesc, setFolderDesc] = useState('');
  const [folderSortOrder, setFolderSortOrder] = useState(0);
  const [savingFolder, setSavingFolder] = useState(false);

  // Create / Edit Product Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [form, setForm] = useState<AdminProductItem>({
    sku: '',
    name: '',
    category: 'Google Gemini',
    display_section: 'Google Gemini',
    sell_price: 85000,
    original_price: 250000,
    stock: 99,
    sort_order: 1,
    status: 'ACTIVE',
    description: '',
    icon: '/assets/icons/products/gemini.jpg',
    warranty_days: 30,
    input_type: 'email_only',
    delivery_mode: 'email_only',
    custom_input_label: '',
    fulfillment_mode: 'MANUAL',
    allow_voucher: true,
  });

  const formatVND = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

  const openNewFolderModal = () => {
    setEditingFolder(null);
    setFolderName('');
    setFolderIcon('Folder');
    setFolderDesc('');
    setFolderSortOrder(categories.length + 1);
    setFolderModalOpen(true);
  };

  const openEditFolderModal = (cat: FolderCategoryItem) => {
    setEditingFolder(cat);
    setFolderName(cat.name);
    setFolderIcon(cat.icon || 'Folder');
    setFolderDesc(cat.description || '');
    setFolderSortOrder(Number(cat.sort_order ?? 0));
    setFolderModalOpen(true);
  };

  const handleSaveFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = folderName.trim();
    if (!clean) {
      onNotice({ type: 'err', text: 'Tên thư mục không được để trống.' });
      return;
    }
    setSavingFolder(true);
    try {
      const method = editingFolder ? 'PUT' : 'POST';
      const payload = editingFolder
        ? {
            id: editingFolder.id,
            oldName: editingFolder.name,
            name: clean,
            icon: folderIcon.trim() || 'Folder',
            description: folderDesc.trim(),
            sort_order: folderSortOrder,
          }
        : {
            name: clean,
            icon: folderIcon.trim() || 'Folder',
            description: folderDesc.trim(),
            sort_order: folderSortOrder,
          };

      const res = await fetch('/api/admin/categories', {
        method,
        cache: 'no-store',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lưu thư mục thất bại.');
      }
      setFolderModalOpen(false);
      onNotice({
        type: 'ok',
        text: editingFolder ? `Đã cập nhật thư mục "${clean}".` : `Đã tạo thư mục mới "${clean}".`,
      });
      await onRefresh();
    } catch (err: any) {
      onNotice({ type: 'err', text: err.message || 'Lỗi lưu thư mục.' });
    } finally {
      setSavingFolder(false);
    }
  };

  const handleDeleteFolder = async (cat: FolderCategoryItem) => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Xác nhận xóa thư mục "${cat.name}"? (Sản phẩm bên trong vẫn giữ nguyên và có thể chuyển sang thư mục khác)`)
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/categories?id=${encodeURIComponent(cat.id)}`, {
        method: 'DELETE',
        cache: 'no-store',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Xóa thư mục thất bại.');
      if (selectedFolder === cat.name) setSelectedFolder('ALL');
      onNotice({ type: 'ok', text: `Đã xóa thư mục "${cat.name}".` });
      await onRefresh();
    } catch (err: any) {
      onNotice({ type: 'err', text: err.message || 'Lỗi xóa thư mục.' });
    }
  };

  const openAddProductModal = (defaultFolder?: string) => {
    const folder = defaultFolder || categories[0]?.name || 'Google Gemini';
    setIsNewProduct(true);
    setForm({
      sku: `YUKI-${Date.now().toString().slice(-5)}`,
      name: '',
      category: folder,
      display_section: folder,
      sell_price: 85000,
      original_price: 200000,
      stock: 99,
      sort_order: products.length + 1,
      status: 'ACTIVE',
      description: '',
      icon: '/assets/icons/products/gemini.jpg',
      warranty_days: 30,
      input_type: 'admin_deliver',
      delivery_mode: 'admin_deliver',
      custom_input_label: '',
      fulfillment_mode: 'MANUAL',
      allow_voucher: true,
    });
    setEditModalOpen(true);
  };

  const openEditProductModal = (p: AdminProductItem) => {
    const mode = normalizeDeliveryMode(p.delivery_mode || p.input_type, p.sku);
    setIsNewProduct(false);
    setForm({
      ...p,
      display_section: p.display_section || p.category,
      delivery_mode: mode,
      input_type: mode,
      custom_input_label: p.custom_input_label || '',
      fulfillment_mode: p.fulfillment_mode || 'MANUAL',
      sort_order: Number(p.sort_order ?? 100),
      allow_voucher: p.allow_voucher !== false,
    });
    setEditModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      onNotice({ type: 'err', text: 'Tên sản phẩm không được để trống.' });
      return;
    }
    if (!Number.isFinite(form.sell_price) || form.sell_price <= 0) {
      onNotice({ type: 'err', text: 'Giá bán phải lớn hơn 0đ.' });
      return;
    }

    setSavingProduct(true);
    try {
      const mode = normalizeDeliveryMode(form.delivery_mode || form.input_type, form.sku);
      const res = await fetch('/api/admin/catalog', {
        method: isNewProduct ? 'POST' : 'PUT',
        cache: 'no-store',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          input_type: mode,
          delivery_mode: mode,
          display_section: form.display_section || form.category,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lưu sản phẩm thất bại.');
      }
      setEditModalOpen(false);
      onNotice({ type: 'ok', text: `Đã lưu sản phẩm ${form.name} vào thư mục "${form.category}".` });
      await onRefresh();
    } catch (err: any) {
      onNotice({ type: 'err', text: err.message || 'Lỗi lưu sản phẩm.' });
    } finally {
      setSavingProduct(false);
    }
  };

  const handleQuickPatchProduct = async (p: AdminProductItem, patch: Partial<AdminProductItem>, okMsg: string) => {
    setBusySku(p.sku);
    try {
      const res = await fetch('/api/admin/catalog', {
        method: 'PUT',
        cache: 'no-store',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...p, ...patch }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Cập nhật thất bại.');
      onNotice({ type: 'ok', text: okMsg });
      await onRefresh();
    } catch (err: any) {
      onNotice({ type: 'err', text: err.message || 'Lỗi cập nhật sản phẩm.' });
    } finally {
      setBusySku(null);
    }
  };

  const handleMoveOrder = async (folderItems: AdminProductItem[], idx: number, dir: -1 | 1) => {
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= folderItems.length) return;

    const current = folderItems[idx];
    const target = folderItems[swapIdx];
    const currentOrder = Number(current.sort_order ?? idx + 1);
    const targetOrder = Number(target.sort_order ?? swapIdx + 1);
    const nextCurrentOrder = currentOrder === targetOrder ? swapIdx + 1 : targetOrder;
    const nextTargetOrder = currentOrder === targetOrder ? idx + 1 : currentOrder;

    setBusySku(current.sku);
    try {
      const res = await fetch('/api/admin/catalog', {
        method: 'PATCH',
        cache: 'no-store',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            { sku: current.sku, sort_order: nextCurrentOrder },
            { sku: target.sku, sort_order: nextTargetOrder },
          ],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Đổi thứ tự thất bại.');
      onNotice({ type: 'ok', text: `Đã đổi vị trí hiển thị của ${current.sku}.` });
      await onRefresh();
    } catch (err: any) {
      onNotice({ type: 'err', text: err.message || 'Lỗi sắp xếp sản phẩm.' });
    } finally {
      setBusySku(null);
    }
  };

  const handleDeleteProduct = async (p: AdminProductItem) => {
    if (typeof window !== 'undefined' && !window.confirm(`Xác nhận xóa sản phẩm ${p.name} (${p.sku})?`)) {
      return;
    }
    setBusySku(p.sku);
    try {
      const res = await fetch('/api/admin/catalog', {
        method: 'DELETE',
        cache: 'no-store',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku: p.sku }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Xóa sản phẩm thất bại.');
      onNotice({ type: 'ok', text: `Đã xóa sản phẩm ${p.sku}.` });
      await onRefresh();
    } catch (err: any) {
      onNotice({ type: 'err', text: err.message || 'Lỗi xóa sản phẩm.' });
    } finally {
      setBusySku(null);
    }
  };

  const filteredProducts = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return products
      .filter((p) => {
        if (selectedFolder !== 'ALL' && (p.category || 'Khác') !== selectedFolder) return false;
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => Number(a.sort_order ?? 100) - Number(b.sort_order ?? 100));
  }, [products, debouncedSearch, selectedFolder]);

  const folderGroups = useMemo(() => {
    const catMetaMap = new Map<string, FolderCategoryItem>();
    for (const c of categories) {
      if (c?.name) catMetaMap.set(c.name, c);
    }

    const grouped = new Map<string, AdminProductItem[]>();
    for (const c of categories) {
      if (selectedFolder === 'ALL' || selectedFolder === c.name) {
        grouped.set(c.name, []);
      }
    }
    for (const p of filteredProducts) {
      const folder = p.category || 'Khác';
      if (!grouped.has(folder)) grouped.set(folder, []);
      grouped.get(folder)!.push(p);
    }

    return Array.from(grouped.entries()).map(([folderKey, items]) => ({
      folderName: folderKey,
      meta: catMetaMap.get(folderKey) || null,
      items,
    }));
  }, [categories, filteredProducts, selectedFolder]);

  const allFolderOptions = useMemo(() => {
    const set = new Set<string>(categories.map((c) => c.name));
    for (const p of products) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set);
  }, [categories, products]);

  return (
    <div className="space-y-4">
      {/* Toolbar: Folder Pills + Search + Create Folder / Add Product */}
      <div className="p-4 rounded-2xl liquid-glass-card space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-[#0EA5E9]" strokeWidth={1.75} />
              <span>Thư Mục &amp; Sắp Xếp Sản Phẩm ({categories.length} thư mục • {products.length} sản phẩm)</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Chia từng thư mục gọn gàng, bấm Lên ▲ / Xuống ▼ để đổi vị trí hiển thị ngoài shop hoặc chuyển thư mục 1 chạm.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={openNewFolderModal}
              className="h-9 px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-sky-400/35 text-sky-200 font-bold flex items-center gap-1.5"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ Tạo Thư Mục Mới</span>
            </button>
            <button
              type="button"
              onClick={() => openAddProductModal(selectedFolder !== 'ALL' ? selectedFolder : undefined)}
              className="h-9 px-3.5 rounded-xl btn-ios-blue font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Thêm Sản Phẩm</span>
            </button>
          </div>
        </div>

        {/* Folder Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setSelectedFolder('ALL')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition ${
              selectedFolder === 'ALL'
                ? 'bg-[#0EA5E9] text-[#07090E] font-bold'
                : 'bg-[#07090E] border border-white/[0.08] text-slate-300 hover:border-sky-400/35'
            }`}
          >
            Tất cả ({products.length})
          </button>
          {categories.map((cat) => {
            const cnt = products.filter((p) => p.category === cat.name).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedFolder(cat.name)}
                className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  selectedFolder === cat.name
                    ? 'bg-[#0EA5E9] text-[#07090E] font-bold'
                    : 'bg-[#07090E] border border-white/[0.08] text-slate-300 hover:border-sky-400/35'
                }`}
              >
                <Folder className="w-3 h-3" />
                <span>{cat.name}</span>
                <span className="text-[10px] opacity-80 font-mono">({cnt})</span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={prodSearch}
            onChange={(e) => setProdSearch(e.target.value)}
            placeholder="Tìm sản phẩm theo tên, thư mục hoặc SKU..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#07090E] border border-white/[0.08] text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#0EA5E9]"
          />
        </div>
      </div>

      {/* Folder Accordion List */}
      {loading && products.length === 0 ? (
        <SkeletonTable />
      ) : (
        <div className="space-y-3">
          {folderGroups.map(({ folderName: fName, meta, items }) => {
            const isCollapsed = Boolean(collapsedFolders[fName]);
            return (
              <div
                key={fName}
                className="rounded-2xl liquid-glass-card overflow-hidden border border-white/[0.08]"
              >
                {/* Folder Header */}
                <div className="p-3.5 bg-white/[0.03] border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedFolders((prev) => ({ ...prev, [fName]: !prev[fName] }))
                    }
                    className="flex items-center gap-2 text-left min-w-0"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-sky-400 shrink-0" />
                    )}
                    <FolderOpen className="w-4 h-4 text-[#0EA5E9] shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">{fName}</span>
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/25 text-sky-300 text-[10px] font-mono font-bold">
                          {items.length} SP
                        </span>
                      </div>
                      {meta?.description && (
                        <div className="text-[11px] text-slate-400 truncate max-w-md">
                          {meta.description}
                        </div>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openAddProductModal(fName)}
                      className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-200 text-[11px] font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Thêm vào mục</span>
                    </button>
                    {meta && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditFolderModal(meta)}
                          aria-label={`Sửa thư mục ${fName}`}
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 hover:text-white"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFolder(meta)}
                          aria-label={`Xóa thư mục ${fName}`}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Folder Product Rows */}
                {!isCollapsed && (
                  <div className="divide-y divide-white/[0.06]">
                    {items.length === 0 ? (
                      <div className="p-5 text-center text-xs text-slate-500">
                        Thư mục này chưa có sản phẩm nào khớp bộ lọc.
                      </div>
                    ) : (
                      items.map((p, idx) => {
                        const modeMeta = getDeliveryModeMeta(p.delivery_mode || p.input_type, p.sku);
                        const isBusy = busySku === p.sku;

                        return (
                          <div
                            key={p.sku}
                            className="p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                          >
                            <div className="flex items-start sm:items-center gap-3 min-w-0">
                              {/* Up / Down + Order Number */}
                              <div className="flex flex-col items-center gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={idx === 0 || isBusy}
                                  onClick={() => handleMoveOrder(items, idx, -1)}
                                  aria-label={`Đưa ${p.name} lên`}
                                  className="p-1 rounded bg-white/[0.04] hover:bg-white/[0.12] border border-white/[0.08] text-slate-300 disabled:opacity-25"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                                  #{p.sort_order ?? idx + 1}
                                </span>
                                <button
                                  type="button"
                                  disabled={idx === items.length - 1 || isBusy}
                                  onClick={() => handleMoveOrder(items, idx, 1)}
                                  aria-label={`Đưa ${p.name} xuống`}
                                  className="p-1 rounded bg-white/[0.04] hover:bg-white/[0.12] border border-white/[0.08] text-slate-300 disabled:opacity-25"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>

                              <BrandIcon
                                slug={p.sku}
                                name={p.name}
                                iconPath={p.icon}
                                size="md"
                                laser={false}
                              />

                              <div className="min-w-0 space-y-1">
                                <div className="text-xs sm:text-sm font-bold text-white truncate">
                                  {p.name}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-sky-300">{p.sku}</span>
                                  <span>• {p.warranty_days === 0 ? 'KBH' : `BH ${p.warranty_days ?? 30} ngày`}</span>
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                    {modeMeta.shortBadge}
                                  </span>
                                  {p.allow_voucher === false && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                      Khóa voucher
                                    </span>
                                  )}
                                  {p.display_section && p.display_section !== p.category && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-white/[0.06] text-slate-300">
                                      Mục: {p.display_section}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Quick Controls: Move Folder Dropdown + Price + Status + Edit + Delete */}
                            <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 shrink-0">
                              <select
                                aria-label={`Chuyển thư mục cho ${p.name}`}
                                disabled={isBusy}
                                value={p.category || fName}
                                onChange={(e) =>
                                  handleQuickPatchProduct(
                                    p,
                                    { category: e.target.value, display_section: e.target.value },
                                    `Đã chuyển ${p.sku} sang thư mục "${e.target.value}".`
                                  )
                                }
                                className="h-8 px-2 rounded-lg bg-[#07090E] border border-white/[0.12] text-[11px] text-slate-200 max-w-[160px]"
                              >
                                {allFolderOptions.map((opt) => (
                                  <option key={opt} value={opt}>
                                    📁 {opt}
                                  </option>
                                ))}
                              </select>

                              <div className="text-right px-1.5">
                                <div className="font-mono tabular-nums text-xs sm:text-sm font-bold text-white">
                                  {formatVND(p.sell_price)}
                                </div>
                                {p.original_price && p.original_price > p.sell_price ? (
                                  <div className="font-mono tabular-nums text-[10px] text-slate-500 line-through">
                                    {formatVND(p.original_price)}
                                  </div>
                                ) : null}
                              </div>

                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  handleQuickPatchProduct(
                                    p,
                                    { status: p.status === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE' },
                                    `Đã ${p.status === 'ACTIVE' ? 'ẩn' : 'hiển thị'} gói ${p.sku}.`
                                  )
                                }
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
                                disabled={isBusy}
                                onClick={() => openEditProductModal(p)}
                                className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-white text-[11px] font-semibold flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Sửa</span>
                              </button>

                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleDeleteProduct(p)}
                                aria-label={`Xóa sản phẩm ${p.sku}`}
                                className="p-1.5 rounded-lg bg-red-500/12 hover:bg-red-500/20 border border-red-500/30 text-red-300"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Folder Modal */}
      <PortalModal
        isOpen={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        title={editingFolder ? `Sửa Thư Mục: ${editingFolder.name}` : 'Tạo Thư Mục Sản Phẩm Mới'}
      >
        <form onSubmit={handleSaveFolder} className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Tên thư mục *</label>
            <input
              type="text"
              required
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="VD: Google Gemini, Muse AI, Tài Khoản Dev..."
              className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.12] text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Icon (Lucide / Emoji)</label>
              <input
                type="text"
                value={folderIcon}
                onChange={(e) => setFolderIcon(e.target.value)}
                placeholder="Folder, Sparkles..."
                className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.12] text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Thứ tự (Sort Order)</label>
              <input
                type="number"
                min={0}
                value={folderSortOrder}
                onChange={(e) => setFolderSortOrder(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.12] font-mono text-white"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Mô tả thư mục</label>
            <input
              type="text"
              value={folderDesc}
              onChange={(e) => setFolderDesc(e.target.value)}
              placeholder="Mô tả ngắn hiển thị cho quản trị..."
              className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.12] text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setFolderModalOpen(false)}
              className="h-9 px-3.5 rounded-xl bg-white/[0.06] text-slate-300 font-semibold flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Hủy</span>
            </button>
            <button
              type="submit"
              disabled={savingFolder}
              className="h-9 px-4 rounded-xl btn-ios-blue font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{savingFolder ? 'Đang lưu...' : 'Lưu Thư Mục'}</span>
            </button>
          </div>
        </form>
      </PortalModal>

      {/* Create / Edit Product Modal (Full 5 Delivery Modes + Sort Order + Section) */}
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
              <label className="text-[11px] font-semibold text-slate-300">Giá bán (VNĐ) *</label>
              <input
                type="number"
                required
                min={1}
                value={form.sell_price}
                onChange={(e) => setForm({ ...form, sell_price: Number(e.target.value) })}
                className="w-full h-9 px-3 rounded-xl bg-[#060B16] border border-sky-200/[0.12] font-mono tabular-nums text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Tên gói sản phẩm *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.12] text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Thư mục (Folder)</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.12] text-white"
              >
                {allFolderOptions.map((catName) => (
                  <option key={catName} value={catName}>
                    {catName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Khu vực hiển thị</label>
              <select
                value={form.display_section || form.category}
                onChange={(e) => setForm({ ...form, display_section: e.target.value })}
                className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.12] text-white"
              >
                {Array.from(new Set([...DISPLAY_SECTIONS, ...allFolderOptions, form.display_section || ''])).filter(Boolean).map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>
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
              <label className="text-[11px] font-semibold text-slate-300">Vị trí / Trạng thái</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min={0}
                  value={form.sort_order ?? 1}
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
            <label className="text-[11px] font-semibold text-slate-300">Chế độ nhận hàng (Delivery Mode)</label>
            <select
              value={form.delivery_mode || form.input_type || 'admin_deliver'}
              onChange={(e) =>
                setForm({ ...form, delivery_mode: e.target.value, input_type: e.target.value })
              }
              className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.12] text-white"
            >
              {DELIVERY_MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.value})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">
              Hướng dẫn nhập thông tin riêng cho khách (Tùy chọn)
            </label>
            <input
              type="text"
              value={form.custom_input_label || ''}
              onChange={(e) => setForm({ ...form, custom_input_label: e.target.value })}
              placeholder="VD: Email Google nhận lời mời Slot Family (Không cần mật khẩu)..."
              className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.12] text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Mã giảm giá (Voucher)</label>
              <select
                value={form.allow_voucher === false ? 'false' : 'true'}
                onChange={(e) => setForm({ ...form, allow_voucher: e.target.value === 'true' })}
                className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.12] text-white"
              >
                <option value="true">Áp dụng mã giảm giá</option>
                <option value="false">Khóa mã giảm giá</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Kiểu duyệt (Fulfillment)</label>
              <select
                value={form.fulfillment_mode || 'MANUAL'}
                onChange={(e) => setForm({ ...form, fulfillment_mode: e.target.value })}
                className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.12] text-white"
              >
                <option value="MANUAL">Thủ công qua Admin / Telegram</option>
                <option value="AUTO">Tự động / Kho có sẵn</option>
              </select>
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
            value={form.icon || '/assets/icons/products/gemini.jpg'}
            onChange={(newIcon) => setForm({ ...form, icon: newIcon })}
          />

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
