'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PortalModal } from '@/components/PortalModal';
import { IconUploaderField } from '@/components/admin/IconUploaderField';
import { CreateCategoryModal } from '@/components/admin/CreateCategoryModal';
import { Layers, Plus, Sparkles, FolderPlus } from 'lucide-react';
import { useCustomDialog } from '@/components/common/custom-dialog';

interface Product {
  id?: string;
  sku: string;
  name: string;
  category: string;
  sell_price: number;
  stock: number;
  status: 'ACTIVE' | 'HIDDEN';
  description?: string;
  icon?: string;
}

const EMPTY_FORM: Product = {
  sku: '',
  name: '',
  category: 'Trí Tuệ Nhân Tạo (AI)',
  sell_price: 25000,
  stock: 99,
  status: 'ACTIVE',
  description: '',
  icon: '/assets/icons/products/chatgpt.jpg',
};

export default function AdminInventoryPage() {
  const { showAlert, showConfirm } = useCustomDialog();
  const [products, setProducts] = useState<Product[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Product>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [customCategories, setCustomCategories] = useState<Array<{ id: string; name: string }>>([]);

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/admin/catalog');
      if (res.ok) {
        const data = await res.json();
        if (data.products) setProducts(data.products);
      }
    } catch (e) {
      console.warn('Error loading catalog:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories');
      if (res.ok) {
        const data = await res.json();
        if (data.categories) setCustomCategories(data.categories);
      }
    } catch {}
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const openCreateModal = () => {
    setIsEditing(false);
    setForm({
      ...EMPTY_FORM,
      sku: `YUKI-${Date.now().toString().slice(-6)}`,
      icon: '/assets/icons/products/chatgpt.jpg',
    });
    setModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setIsEditing(true);
    setForm({
      ...p,
      sell_price: Number(p.sell_price || 0),
      stock: Number(p.stock || 0),
      status: p.status === 'HIDDEN' ? 'HIDDEN' : 'ACTIVE',
      icon: p.icon || '/assets/icons/products/chatgpt.jpg',
      description: p.description || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = isEditing ? 'PUT' : 'POST';
      // Default warranty note if left empty
      const payload = {
        ...form,
        description: form.description?.trim() || 'Không bảo hành (KBH)',
      };

      const res = await fetch('/api/admin/catalog', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi lưu sản phẩm.');

      setModalOpen(false);
      await loadProducts();
    } catch (err: any) {
      await showAlert(err.message || 'Lỗi lưu sản phẩm.', 'Lỗi Lưu Kho', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Product) => {
    if (!p.sku) return;
    const confirmed = await showConfirm(`Xác nhận xóa sản phẩm "${p.name}" (${p.sku})?`, 'Xóa Sản Phẩm');
    if (!confirmed) return;

    try {
      const res = await fetch('/api/admin/catalog', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku: p.sku }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi xóa sản phẩm.');

      await loadProducts();
    } catch (err: any) {
      await showAlert(err.message || 'Lỗi xóa sản phẩm.', 'Lỗi Xóa Sản Phẩm', 'error');
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchCat = filterCategory === 'ALL' || p.category === filterCategory;
    const matchSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  const categories = Array.from(
    new Set([
      ...products.map((p) => p.category),
      ...customCategories.map((c) => c.name),
    ])
  ).filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-6 text-white space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="text-xs font-semibold text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>←</span>
              <span>Bảng điều khiển Admin</span>
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-black mt-1">
            Quản Lý Kho Hàng & Dịch Vụ ({products.length} gói)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Thêm sản phẩm mới, upload icon, tạo danh mục mới hoặc ẩn/xóa sản phẩm tức thời
          </p>
        </div>

        {/* 2 Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setCategoryModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 font-bold text-xs shadow-md transition text-center flex items-center justify-center gap-1.5"
          >
            <FolderPlus className="w-4 h-4 text-cyan-400" />
            <span>+ Tạo Danh Mục / Mục Mới</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl btn-ios-white hover:opacity-95 text-slate-950 font-bold text-xs shadow transition text-center flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thêm Sản Phẩm Mới</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-3xl bg-slate-900 border border-slate-800">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="🔍 Tìm theo tên hoặc mã SKU..."
          className="flex-1 rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 min-h-[42px]"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 min-h-[42px]"
        >
          <option value="ALL">Tất cả danh mục ({categories.length})</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Table Section */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">Icon / SKU</th>
                <th className="p-3.5">Tên Dịch Vụ</th>
                <th className="p-3.5">Danh Mục</th>
                <th className="p-3.5">Giá Bán</th>
                <th className="p-3.5">Kho</th>
                <th className="p-3.5">Bảo Hành</th>
                <th className="p-3.5">Trạng Thái</th>
                <th className="p-3.5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Đang tải danh sách kho hàng...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Không tìm thấy sản phẩm nào khớp bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isHidden = p.status === 'HIDDEN';
                  return (
                    <tr key={p.sku} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="icon-beam-box icon-ambient-live w-8 h-8 rounded-lg overflow-hidden bg-slate-950 border border-slate-700 shrink-0 flex items-center justify-center">
                            <img
                              src={p.icon || '/assets/icons/products/chatgpt.jpg'}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/assets/icons/products/chatgpt.jpg';
                              }}
                            />
                          </div>
                          <span className="font-mono font-bold text-cyan-400 text-xs">{p.sku}</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-semibold text-white max-w-xs truncate">{p.name}</td>
                      <td className="p-3.5 text-slate-400">{p.category}</td>
                      <td className="p-3.5 font-mono font-bold text-emerald-400 text-xs">
                        {new Intl.NumberFormat('vi-VN').format(p.sell_price)}đ
                      </td>
                      <td className="p-3.5 font-mono">{p.stock}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {p.description || 'Không bảo hành (KBH)'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isHidden
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {isHidden ? 'Đang ẩn' : 'Hiển thị'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-bold transition text-[11px]"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p)}
                          className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 font-bold transition text-[11px]"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal with PortalModal to document.body */}
      <PortalModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? `Sửa Sản Phẩm: ${form.sku}` : 'Thêm Sản Phẩm Mới Vào Kho'}
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Icon Uploader & Picker Field */}
          <IconUploaderField
            value={form.icon || ''}
            onChange={(newIcon) => setForm({ ...form, icon: newIcon })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                Mã SKU (Duy nhất)
              </label>
              <input
                type="text"
                required
                disabled={isEditing}
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                placeholder="VD: YUKI-YT-1M"
                className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                Danh mục
              </label>
              <input
                type="text"
                required
                list="category-options"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Chọn hoặc nhập danh mục..."
                className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <datalist id="category-options">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
              Tên sản phẩm hiển thị
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="VD: YouTube Premium 1 Tháng Nâng Cấp Email Chính Chủ"
              className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                Giá bán (VNĐ)
              </label>
              <input
                type="number"
                required
                min={0}
                step={1000}
                value={form.sell_price}
                onChange={(e) => setForm({ ...form, sell_price: Number(e.target.value) })}
                className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 px-3 py-2.5 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                Số lượng kho
              </label>
              <input
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 px-3 py-2.5 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                Trạng thái
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as 'ACTIVE' | 'HIDDEN' })
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="ACTIVE">Hiển thị</option>
                <option value="HIDDEN">Ẩn</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Ghi chú bảo hành
              </label>
              <span className="text-[10px] text-slate-400">
                Nếu để trống, mặc định hiển thị: <strong>Không bảo hành (KBH)</strong>
              </span>
            </div>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="VD: Không bảo hành (KBH) hoặc Bảo hành full thời gian..."
              className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-2xl btn-ios-white hover:opacity-95 text-slate-950 font-bold shadow disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : isEditing ? 'Cập Nhật Giá / SP' : 'Thêm Vào Kho'}
            </button>
          </div>
        </form>
      </PortalModal>

      {/* Create Category Modal */}
      <CreateCategoryModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onCreated={(newCat) => {
          loadCategories();
          setForm((f) => ({ ...f, category: newCat.name }));
        }}
      />
    </div>
  );
}
