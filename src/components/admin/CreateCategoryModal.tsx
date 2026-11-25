'use client';

import React, { useState } from 'react';
import { PortalModal } from '@/components/PortalModal';
import { Sparkles, Layers, Tag, FileText } from 'lucide-react';

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newCat: any) => void;
}

export function CreateCategoryModal({ isOpen, onClose, onCreated }: CreateCategoryModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Sparkles');
  const [badge, setBadge] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/categories', {
        cache: 'no-store',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          icon,
          badge: badge.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi tạo danh mục.');
      }

      onCreated(data.category);
      setName('');
      setDescription('');
      setBadge('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi tạo danh mục.');
    } finally {
      setSaving(false);
    }
  };

  const presetIcons = ['Sparkles', 'Bot', 'Tv', 'GraduationCap', 'Terminal', 'Zap', 'Shield', 'Globe', 'Cpu'];

  return (
    <PortalModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          <span>Tạo Danh Mục / Mục Mới</span>
        </div>
      }
      maxWidthClass="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tên Danh Mục Mới (Bắt buộc)</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: AI & API Model, Công Cụ MMO, Proxy & VPS..."
            className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Biểu Tượng (Icon) Đại Diện</span>
          </label>
          <div className="grid grid-cols-5 gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
            {presetIcons.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                className={`p-2 rounded-xl border text-center transition ${
                  icon === ic
                    ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300 font-bold'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-xs">{ic}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
            Huy Hiệu Nhỏ (Badge tùy chọn)
          </label>
          <input
            type="text"
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            placeholder="VD: HOT, MỚI, TỰ ĐỘNG..."
            className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mô tả ngắn danh mục</span>
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="VD: Nhóm sản phẩm tài khoản và API chuyên dụng..."
            className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="px-5 py-2.5 rounded-2xl btn-ios-white hover:opacity-95 text-slate-950 font-bold shadow disabled:opacity-50"
          >
            {saving ? 'Đang tạo...' : '+ Tạo Danh Mục'}
          </button>
        </div>
      </form>
    </PortalModal>
  );
}
