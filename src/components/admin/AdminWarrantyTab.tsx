'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  RotateCcw,
  KeyRound,
  XCircle,
} from 'lucide-react';
import { SkeletonOrders } from '@/components/common/skeleton-shimmer';

export function AdminWarrantyTab() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replacementDrafts, setReplacementDrafts] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadClaims = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/warranty');
      if (res.ok) {
        const data = await res.json();
        setClaims(Array.isArray(data.claims) ? data.claims : []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, []);

  const formatVND = (num: number) =>
    new Intl.NumberFormat('vi-VN').format(num) + 'đ';

  const handleResolve = async (
    claim: any,
    action: 'replace' | 'refund' | 'reject'
  ) => {
    const code = claim.order_code || claim.id;
    const newDeliveryInfo = (replacementDrafts[code] || '').trim();
    if (action === 'replace' && !newDeliveryInfo) {
      setNotice({
        type: 'err',
        text: `Vui lòng nhập tài khoản hoặc key đổi mới cho đơn #${code} trước khi xác nhận.`,
      });
      return;
    }

    const prev = [...claims];
    const nextStatus =
      action === 'replace'
        ? 'RESOLVED_REPLACED'
        : action === 'refund'
        ? 'RESOLVED_REFUNDED'
        : 'REJECTED';

    // Optimistic UI update
    setClaims((list) =>
      list.map((c) =>
        (c.order_code || c.id) === code
          ? {
              ...c,
              warranty_claimed: false,
              warranty_status: nextStatus,
              delivery_info: newDeliveryInfo || c.delivery_info,
            }
          : c
      )
    );
    setNotice(null);

    try {
      const res = await fetch('/api/admin/warranty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderCode: code,
          action,
          newDeliveryInfo: newDeliveryInfo || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Xử lý bảo hành thất bại.');
      }
      setNotice({ type: 'ok', text: data.message });
      loadClaims();
    } catch (err: any) {
      setClaims(prev);
      setNotice({ type: 'err', text: err.message || 'Lỗi xử lý bảo hành.' });
    }
  };

  if (loading && claims.length === 0) {
    return <SkeletonOrders />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white">
            Trung Tâm Bảo Hành 1 Chạm
          </h2>
          <p className="text-xs text-slate-400">
            Xử lý khiếu nại đổi tài khoản mới, hoàn tiền về ví tự động hoặc từ chối.
          </p>
        </div>
        <button
          type="button"
          onClick={loadClaims}
          className="px-3 py-2 rounded-xl btn-ios-secondary text-xs flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Làm mới</span>
        </button>
      </div>

      {notice && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold border ${
            notice.type === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {notice.text}
        </div>
      )}

      {claims.length === 0 ? (
        <div className="p-10 rounded-2xl liquid-glass-card text-center space-y-2">
          <ShieldCheck className="w-8 h-8 text-[#0EA5E9] mx-auto" strokeWidth={1.75} />
          <div className="text-sm font-bold text-white">Chưa có khiếu nại bảo hành</div>
          <p className="text-xs text-slate-400">
            Khi khách gửi yêu cầu từ /warranty hoặc Lịch sử đơn, yêu cầu sẽ xuất hiện tại đây.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((c) => {
            const code = c.order_code || c.id;
            const isPending = c.warranty_claimed && c.warranty_status === 'PENDING';

            return (
              <div
                key={code}
                className="p-4 rounded-2xl liquid-glass-card space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-[#38BDF8]">
                        #{code}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isPending
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                            : c.warranty_status === 'REJECTED'
                            ? 'bg-red-500/15 border-red-500/30 text-red-300'
                            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        }`}
                      >
                        {isPending
                          ? 'Chờ xử lý'
                          : c.warranty_status === 'RESOLVED_REPLACED'
                          ? 'Đã đổi mới'
                          : c.warranty_status === 'RESOLVED_REFUNDED'
                          ? 'Đã hoàn ví'
                          : 'Đã từ chối'}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white">{c.item_name}</div>
                    <div className="text-xs text-slate-300 bg-[#060B16]/80 border border-sky-200/[0.08] p-2.5 rounded-xl">
                      <span className="text-slate-400">Lý do lỗi: </span>
                      {c.warranty_claim_reason || 'Không có mô tả'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Khách: {c.user_name} • Liên hệ: {c.delivery_contact} • Chính sách: BH{' '}
                      {c.warranty_days ?? 30} ngày
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <div className="font-mono tabular-nums text-base font-black text-white">
                      {formatVND(Number(c.total_amount || 0))}
                    </div>
                    {c.warranty_resolution_note && (
                      <div className="text-[11px] text-emerald-300 mt-1">
                        {c.warranty_resolution_note}
                      </div>
                    )}
                  </div>
                </div>

                {isPending && (
                  <div className="pt-3 border-t border-sky-200/[0.08] space-y-2.5">
                    <input
                      type="text"
                      value={replacementDrafts[code] ?? ''}
                      onChange={(e) =>
                        setReplacementDrafts((prev) => ({
                          ...prev,
                          [code]: e.target.value,
                        }))
                      }
                      placeholder="Nhập tài khoản đổi mới (email|pass hoặc key) nếu chọn Đổi Tài Khoản Mới..."
                      className="w-full h-9 px-3 rounded-xl bg-[#060B16] border border-sky-200/[0.12] text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9]"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleResolve(c, 'replace')}
                        className="h-9 px-3.5 rounded-xl btn-ios-blue text-xs flex items-center gap-1.5"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Đổi Tài Khoản Mới</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResolve(c, 'refund')}
                        className="h-9 px-3.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Hoàn Tiền Về Ví</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResolve(c, 'reject')}
                        className="h-9 px-3.5 rounded-xl bg-red-500/12 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Từ Chối</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
