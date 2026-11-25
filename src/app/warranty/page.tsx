'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  FileText,
} from 'lucide-react';
import { ADMIN_TELEGRAM_URL, ADMIN_SUPPORT_LABEL } from '@/lib/constants';

const QUICK_FAULT_REASONS = [
  'Sai mật khẩu hoặc không đăng nhập được',
  'Tài khoản bị mất gói Pro / Premium giữa kỳ hạn',
  'Bị văng thiết bị hoặc lỗi giới hạn vùng',
  'Đơn Buff MXH bị tụt số lượng cần bảo hành bù',
];

function WarrantyContent() {
  const searchParams = useSearchParams();
  const initialOrderCode = searchParams.get('order') || '';

  const { profile } = useAuth();
  const [orderCode, setOrderCode] = useState(initialOrderCode);
  const [reason, setReason] = useState('');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [lookupOrder, setLookupOrder] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (profile?.telegramId || profile?.phone) {
      setContact(String(profile.telegramId || profile.phone));
    }
  }, [profile]);

  useEffect(() => {
    if (initialOrderCode) {
      setOrderCode(initialOrderCode);
      handleLookup(initialOrderCode);
    }
  }, [initialOrderCode]);

  const handleLookup = async (codeToLookup: string) => {
    const clean = codeToLookup.trim();
    if (!clean) return;

    setSearching(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/orders?code=${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (res.ok && data.orders && data.orders.length > 0) {
        const found = data.orders.find((o: any) => o.order_code === clean || o.id === clean);
        setLookupOrder(found || data.orders[0]);
      } else {
        setLookupOrder(null);
      }
    } catch {
      setLookupOrder(null);
    } finally {
      setSearching(false);
    }
  };

  const onSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanCode = orderCode.trim();
    if (!cleanCode) {
      setErrorMsg('Vui lòng nhập mã đơn hàng cần bảo hành.');
      return;
    }

    if (!reason.trim() || reason.trim().length < 5) {
      setErrorMsg('Vui lòng mô tả chi tiết lỗi gặp phải (tối thiểu 5 ký tự).');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/warranty/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderCode: cleanCode,
          reason: reason.trim(),
          customerContact: contact.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gửi yêu cầu bảo hành thất bại.');
      }

      setSuccessMsg(data.message || 'Đã gửi yêu cầu bảo hành thành công!');
      setReason('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi gửi yêu cầu bảo hành.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 py-2 max-w-4xl mx-auto animate-page-enter">
      <div className="space-y-2 pb-4 border-b border-sky-200/[0.08]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/12 border border-sky-400/25 text-sky-300 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-[#0EA5E9]" />
          <span>Trung Tâm Bảo Hành &amp; Hỗ Trợ Sau Bán</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
          Tra Cứu &amp; Gửi Yêu Cầu Bảo Hành
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
          Chọn đơn hàng hoặc nhập mã đơn, chọn nhanh lý do lỗi để Admin kiểm tra đổi mới hoặc hoàn tiền về ví.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Claim (7 cols) */}
        <div className="lg:col-span-7">
          <div className="p-5 sm:p-6 rounded-2xl border border-sky-200/[0.1] bg-[#0D1526]/90 shadow-xl backdrop-blur-xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-sky-200/[0.08] pb-3">
              <FileText className="w-4 h-4 text-[#0EA5E9]" />
              <span>Gửi Yêu Cầu Bảo Hành</span>
            </h2>

            {errorMsg && (
              <div className="p-3.5 rounded-xl border border-red-500/35 bg-red-500/10 text-xs text-red-300 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-4 rounded-xl border border-emerald-500/35 bg-emerald-500/10 text-xs text-emerald-300 font-semibold space-y-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{successMsg}</span>
                </div>
                <div className="pt-2 border-t border-emerald-500/20 flex flex-wrap gap-2">
                  <Link href="/orders" className="px-3 py-1.5 rounded-xl btn-ios-secondary text-[11px]">
                    Quay lại Lịch sử đơn
                  </Link>
                  <a
                    href={ADMIN_TELEGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl btn-ios-blue text-[11px] flex items-center gap-1.5"
                  >
                    <Send className="w-3 h-3" strokeWidth={1.75} />
                    <span>{ADMIN_SUPPORT_LABEL}</span>
                  </a>
                </div>
              </div>
            )}

            <form onSubmit={onSubmitClaim} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mã đơn hàng cần bảo hành <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="VD: YUKI-123456 hoặc BUFF-..."
                    value={orderCode}
                    onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
                    className="flex-1 h-11 px-3.5 rounded-xl bg-[#060B16] border border-sky-200/[0.12] text-xs text-white font-mono uppercase focus:outline-none focus:border-[#0EA5E9]"
                  />
                  <button
                    type="button"
                    onClick={() => handleLookup(orderCode)}
                    disabled={searching || !orderCode.trim()}
                    className="px-3.5 rounded-xl btn-ios-secondary text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{searching ? 'Đang tìm...' : 'Tra cứu'}</span>
                  </button>
                </div>
              </div>

              {lookupOrder && (
                <div className="p-3.5 rounded-xl bg-[#060B16]/80 border border-sky-400/25 text-xs space-y-1.5">
                  <div className="font-bold text-white flex items-center justify-between gap-2">
                    <span className="truncate">{lookupOrder.item_name}</span>
                    <span className="font-mono text-[#38BDF8] shrink-0">{lookupOrder.order_code}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>
                      Chính sách:{' '}
                      <strong className={lookupOrder.warranty_days === 0 ? 'text-red-400' : 'text-emerald-400'}>
                        {lookupOrder.warranty_days === 0 ? 'Không hỗ trợ BH (KBH)' : `${lookupOrder.warranty_days || 30} Ngày BH`}
                      </strong>
                    </span>
                    <span>
                      Trạng thái: <strong className="text-slate-200">{lookupOrder.status}</strong>
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Kênh phản hồi cho bạn (Telegram / Zalo)
                </label>
                <input
                  type="text"
                  placeholder="ID Telegram (@username / ID số) hoặc SĐT Zalo..."
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#060B16] border border-sky-200/[0.12] text-xs text-white focus:outline-none focus:border-[#0EA5E9]"
                />
              </div>

              {/* 1-Tap Quick Reason Chips */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Chọn nhanh lỗi thường gặp hoặc mô tả chi tiết <span className="text-red-400">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_FAULT_REASONS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setReason(chip)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] border transition text-left ${
                        reason === chip
                          ? 'bg-sky-500/20 border-[#0EA5E9] text-sky-200 font-semibold'
                          : 'bg-[#060B16] border-sky-200/[0.1] text-slate-300 hover:border-sky-400/35'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <textarea
                  required
                  rows={4}
                  placeholder="Mô tả cụ thể lỗi đang gặp phải để Admin xử lý nhanh..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-[#060B16] border border-sky-200/[0.12] text-xs text-white focus:outline-none focus:border-[#0EA5E9] resize-none leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={loading || (lookupOrder && lookupOrder.warranty_days === 0)}
                className="w-full h-11 rounded-xl btn-ios-blue font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" strokeWidth={1.75} />
                <span>
                  {loading
                    ? 'Đang gửi yêu cầu...'
                    : lookupOrder && lookupOrder.warranty_days === 0
                    ? 'Gói Không Hỗ Trợ Bảo Hành'
                    : 'Gửi Yêu Cầu Bảo Hành'}
                </span>
              </button>
            </form>
          </div>
        </div>

        {/* Policy Card (5 cols) */}
        <div className="lg:col-span-5">
          <div className="p-5 rounded-2xl border border-sky-200/[0.1] bg-[#0D1526]/90 shadow-xl space-y-3.5 text-xs text-slate-300">
            <h3 className="font-bold text-sm text-white flex items-center gap-2 border-b border-sky-200/[0.08] pb-2.5">
              <Clock className="w-4 h-4 text-[#0EA5E9]" strokeWidth={1.75} />
              <span>Chính Sách Bảo Hành</span>
            </h3>

            <div className="space-y-2.5 text-[11px] leading-relaxed">
              <div className="p-3 rounded-xl bg-[#060B16]/75 border border-sky-200/[0.08]">
                <strong className="text-white block mb-0.5">Tài khoản &amp; Bản quyền số</strong>
                Đổi mới hoặc gia hạn lại trong suốt thời hạn bảo hành ghi trên gói, hoặc hoàn tiền về ví nếu hết nguồn cấp.
              </div>

              <div className="p-3 rounded-xl bg-[#060B16]/75 border border-sky-200/[0.08]">
                <strong className="text-white block mb-0.5">Dịch vụ Buff MXH</strong>
                Chỉ áp dụng bảo hành bù cho các server có ký hiệu [BH]. Các gói [KBH] không hỗ trợ bảo hành.
              </div>

              <div className="p-3 rounded-xl bg-[#060B16]/75 border border-sky-200/[0.08]">
                <strong className="text-white block mb-0.5">Thời gian xử lý</strong>
                Tiếp nhận và phản hồi trong vòng 1–3 giờ làm việc.
              </div>
            </div>

            <div className="pt-2 border-t border-sky-200/[0.08]">
              <a
                href={ADMIN_TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-10 px-3 rounded-xl btn-ios-secondary text-xs flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5 text-[#0EA5E9]" strokeWidth={1.75} />
                <span>{ADMIN_SUPPORT_LABEL}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WarrantyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Đang tải Trung Tâm Bảo Hành...</div>}>
      <WarrantyContent />
    </Suspense>
  );
}
