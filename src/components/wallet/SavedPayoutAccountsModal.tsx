'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  VIETNAM_BANKS,
  VietnamBank,
  normalizeAccountHolderName,
  findBankByCode,
} from '@/lib/constants/vietnam-banks';

export interface PayoutAccount {
  id: string;
  userId: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  contact?: string;
  qrCodeUrl?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SavedPayoutAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount?: (account: PayoutAccount) => void;
}

export default function SavedPayoutAccountsModal({
  isOpen,
  onClose,
  onSelectAccount,
}: SavedPayoutAccountsModalProps) {
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [bankSearch, setBankSearch] = useState('');
  const [selectedBankCode, setSelectedBankCode] = useState('VCB');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [contact, setContact] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Lock body scroll when modal is open to prevent drifting or page background scrolling
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/profile/payout-accounts', { cache: 'no-store', credentials: 'include' });
      const data = await res.json();
      if (data.success && Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
      setIsAdding(false);
      setEditingId(null);
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setSelectedBankCode('VCB');
    setAccountNumber('');
    setAccountHolder('');
    setContact('');
    setQrCodeUrl('');
    setIsDefault(false);
    setFormError('');
    setBankSearch('');
  };

  const filteredBanks = useMemo(() => {
    if (!bankSearch.trim()) return VIETNAM_BANKS;
    const q = bankSearch.toLowerCase().trim();
    return VIETNAM_BANKS.filter(
      (b) =>
        b.shortName.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q)
    );
  }, [bankSearch]);

  const handleStartEdit = (acc: PayoutAccount) => {
    setEditingId(acc.id);
    setSelectedBankCode(acc.bankCode);
    setAccountNumber(acc.accountNumber);
    setAccountHolder(acc.accountHolder);
    setContact(acc.contact || '');
    setQrCodeUrl(acc.qrCodeUrl || '');
    setIsDefault(acc.isDefault);
    setFormError('');
    setIsAdding(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const bank = findBankByCode(selectedBankCode);
    if (!bank) {
      setFormError('Vui lòng chọn ngân hàng / ví điện tử.');
      return;
    }
    if (!accountNumber.trim()) {
      setFormError('Vui lòng nhập số tài khoản hoặc số ví.');
      return;
    }
    const cleanHolder = normalizeAccountHolderName(accountHolder);
    if (!cleanHolder) {
      setFormError('Vui lòng nhập họ và tên chủ tài khoản.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/profile/payout-accounts', {
        cache: 'no-store',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId || undefined,
          bankCode: bank.code,
          bankName: bank.shortName,
          accountNumber: accountNumber.trim(),
          accountHolder: cleanHolder,
          contact: contact.trim(),
          qrCodeUrl: qrCodeUrl.trim(),
          isDefault,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || 'Lưu thất bại.');
        return;
      }

      setAccounts(data.accounts || []);
      setIsAdding(false);
      setEditingId(null);
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Lỗi mạng khi lưu tài khoản.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      const res = await fetch(`/api/profile/payout-accounts?id=${id}`, {
        cache: 'no-store',
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
      } else {
        setFormError(data.error || 'Không thể xóa tài khoản.');
      }
    } catch {
      setFormError('Lỗi kết nối khi xóa tài khoản.');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch('/api/profile/payout-accounts', {
        cache: 'no-store',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
      }
    } catch {}
  };

  // Convert uploaded image file to base64
  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setFormError('Kích thước ảnh QR tối đa là 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setQrCodeUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-[#090D16] border border-cyan-500/20 shadow-2xl shadow-cyan-950/40 text-slate-100 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-[#0c121f]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Sổ Lưu Tài Khoản Nhận Tiền
              </h2>
              <p className="text-xs text-slate-400">
                Lưu sẵn ngân hàng / ví điện tử để rút hoa hồng nhanh 1-chạm
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Đóng sổ tài khoản"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!isAdding ? (
            <>
              {/* Account List */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Tài khoản đã lưu ({accounts.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsAdding(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Thêm Tài Khoản Mới
                </button>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  Đang tải sổ tài khoản...
                </div>
              ) : accounts.length === 0 ? (
                <div className="py-10 text-center rounded-xl bg-white/[0.02] border border-dashed border-white/[0.08] p-6">
                  <div className="w-12 h-12 mx-auto rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-3">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-200">Chưa lưu tài khoản nhận tiền nào</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Thêm số tài khoản ngân hàng hoặc ví MoMo/ZaloPay để rút hoa hồng CTV một cách tiện lợi nhất.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setIsAdding(true);
                    }}
                    className="mt-4 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition shadow-lg shadow-cyan-500/20"
                  >
                    + Thêm Ngân Hàng / Ví Ngay
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map((acc) => {
                    const bankInfo = findBankByCode(acc.bankCode);
                    return (
                      <div
                        key={acc.id}
                        className={`p-4 rounded-xl border transition relative ${
                          acc.isDefault
                            ? 'bg-gradient-to-r from-cyan-950/30 to-blue-950/20 border-cyan-500/40 ring-1 ring-cyan-500/30'
                            : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.15]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[#0F172A] border border-white/[0.1] flex items-center justify-center text-xs font-black text-cyan-300 uppercase shrink-0">
                              {acc.bankCode.slice(0, 4)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">
                                  {acc.bankName}
                                </span>
                                {acc.isDefault && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                    MẶC ĐỊNH
                                  </span>
                                )}
                                {bankInfo?.withdrawalFee === 5000 && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                    Phí 5k
                                  </span>
                                )}
                                {bankInfo?.withdrawalFee === 2000 && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                    Phí 2k
                                  </span>
                                )}
                              </div>
                              <div className="text-sm font-mono text-cyan-400 mt-1 select-all font-semibold">
                                {acc.accountNumber}
                              </div>
                              <div className="text-xs font-medium text-slate-300 uppercase tracking-wide mt-0.5">
                                {acc.accountHolder}
                              </div>
                              {acc.contact && (
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  Liên hệ: {acc.contact}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Quick selection or actions */}
                          <div className="flex flex-col items-end gap-1.5">
                            {onSelectAccount && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectAccount(acc);
                                  onClose();
                                }}
                                className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition shadow-sm"
                              >
                                Chọn Rút
                              </button>
                            )}

                            <div className="flex items-center gap-1 mt-1">
                              {!acc.isDefault && (
                                <button
                                  type="button"
                                  onClick={() => handleSetDefault(acc.id)}
                                  title="Đặt làm mặc định"
                                  className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-white/[0.05] transition text-[11px]"
                                >
                                  Mặc định
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleStartEdit(acc)}
                                title="Chỉnh sửa"
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.05] transition"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAccount(acc.id)}
                                title="Xóa"
                                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-white/[0.05] transition"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>

                        {acc.qrCodeUrl && (
                          <div className="mt-2.5 pt-2 border-t border-white/[0.05] flex items-center gap-2">
                            <span className="text-[11px] text-slate-400">Mã QR nhận tiền:</span>
                            <span className="text-[11px] text-emerald-400 font-medium">Đã đính kèm ảnh</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Add / Edit Form */
            <form onSubmit={handleSaveAccount} className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                <span className="text-sm font-bold text-white">
                  {editingId ? 'Chỉnh Sửa Tài Khoản' : 'Thêm Tài Khoản Mới'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                    resetForm();
                  }}
                  className="text-xs text-slate-400 hover:text-white transition"
                >
                  Quay lại danh sách
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formError}
                </div>
              )}

              {/* Bank selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Chọn Ngân Hàng / Ví Điện Tử <span className="text-rose-400">*</span>
                </label>
                <div className="relative mb-2">
                  <input
                    type="text"
                    placeholder="Tìm nhanh ngân hàng (MB, VCB, MoMo...)"
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/40 border border-white/[0.1] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
                  />
                </div>
                <select
                  value={selectedBankCode}
                  onChange={(e) => setSelectedBankCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#0F172A] border border-white/[0.12] text-white focus:outline-none focus:border-cyan-500/80"
                >
                  {filteredBanks.map((b) => (
                    <option key={b.code} value={b.code} className="bg-[#0F172A] text-white">
                      {b.shortName} - {b.name} ({b.withdrawalFee === 5000 ? 'Phí 5k' : 'Phí 2k'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Số Tài Khoản / SĐT Ví Nhận Tiền <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 0987654321 hoặc 1029384756"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/[0.12] text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500/80"
                />
              </div>

              {/* Account Holder Name (Uppercase Unaccented) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tên Chủ Tài Khoản (In hoa không dấu) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: NGUYEN VAN A"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(normalizeAccountHolderName(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/[0.12] text-white uppercase placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 font-semibold"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Hệ thống tự động chuyển sang CHỮ IN HOA KHÔNG DẤU đúng chuẩn ngân hàng Napas.
                </p>
              </div>

              {/* Contact (Zalo/Tele) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Liên Hệ Xác Nhận (Zalo hoặc Telegram)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Zalo 0987654321 hoặc @username"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/[0.12] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/80"
                />
              </div>

              {/* QR Code Upload / Link */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Ảnh Mã QR Nhận Tiền (Tùy chọn, khuyên dùng cho MoMo/ZaloPay)
                </label>
                <div className="flex items-center gap-3">
                  <label className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-slate-200 cursor-pointer transition">
                    <span>Chọn ảnh từ máy...</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQrUpload}
                      className="hidden"
                    />
                  </label>
                  {qrCodeUrl && (
                    <button
                      type="button"
                      onClick={() => setQrCodeUrl('')}
                      className="text-xs text-rose-400 hover:text-rose-300 transition"
                    >
                      Xóa ảnh QR
                    </button>
                  )}
                </div>
                {qrCodeUrl && (
                  <div className="mt-2 p-2 rounded-xl bg-white/[0.02] border border-white/[0.08] inline-block">
                    <img
                      src={qrCodeUrl}
                      alt="QR Code Preview"
                      className="w-24 h-24 object-contain rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Is Default Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isDefaultAccount"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded border-white/[0.2] bg-black/40 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                />
                <label htmlFor="isDefaultAccount" className="text-xs text-slate-300 cursor-pointer">
                  Đặt làm tài khoản nhận tiền mặc định
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black text-xs font-bold transition shadow-lg shadow-cyan-500/20"
                >
                  {saving ? 'Đang lưu...' : editingId ? 'Cập Nhật Tài Khoản' : 'Lưu Tài Khoản'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.08] bg-[#0c121f] text-[11px] text-slate-400 flex items-center justify-between">
          <span>Bảo mật chuẩn mã hóa Napas 24/7</span>
          <button
            type="button"
            onClick={onClose}
            className="text-cyan-400 hover:text-cyan-300 font-semibold"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
