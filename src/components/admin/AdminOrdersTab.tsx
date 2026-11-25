'use client';

import React, { useEffect, useState } from 'react';
import {
  Search,
  RefreshCw,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
} from 'lucide-react';
import { SkeletonOrders } from '@/components/common/skeleton-shimmer';

export function AdminOrdersTab({
  onPendingChange,
}: {
  onPendingChange?: (count: number) => void;
}) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deliveryDrafts, setDeliveryDrafts] = useState<Record<string, string>>({});
  const [adminNoteDrafts, setAdminNoteDrafts] = useState<Record<string, string>>({});
  const [actingCode, setActingCode] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/admin/orders', { cache: 'no-store', credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.orders) ? data.orders : [];
        setOrders(list);
        if (typeof data.pending_count === 'number') {
          onPendingChange?.(data.pending_count);
        }
      } else {
        setNotice({ type: 'err', text: 'Không thể tải danh sách đơn hàng từ máy chủ.' });
      }
    } catch {
      setNotice({ type: 'err', text: 'Lỗi kết nối khi tải danh sách đơn hàng.' });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const formatVND = (num: number) =>
    new Intl.NumberFormat('vi-VN').format(num) + 'đ';

  // Multi-mode Order Action
  const handleAction = async (
    order: any,
    action: 'approve' | 'approve_deliver' | 'approve_upgraded' | 'processing' | 'reject'
  ) => {
    const code = order.order_code || order.id;
    const deliveryInfo = (deliveryDrafts[code] || '').trim();
    const adminNote = (adminNoteDrafts[code] || '').trim();

    if (action === 'approve_deliver' && !deliveryInfo) {
      setNotice({
        type: 'err',
        text: `Đơn #${code}: Vui lòng nhập TK / MK / 2FA / Key bàn giao vào ô trước khi bấm Duyệt & Gửi TK/Key.`,
      });
      return;
    }

    const prevOrders = [...orders];
    const optimisticStatus =
      action === 'reject'
        ? 'cancelled'
        : action === 'processing'
        ? 'processing'
        : 'completed';

    setActingCode(code);
    setOrders((curr) =>
      curr.map((o) =>
        (o.order_code || o.id) === code
          ? {
              ...o,
              status: optimisticStatus,
              delivery_info: deliveryInfo || o.delivery_info,
              admin_note: adminNote || o.admin_note,
            }
          : o
      )
    );
    setNotice(null);

    try {
      const res = await fetch('/api/admin/orders/action', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: code,
          action,
          deliveryInfo: deliveryInfo || undefined,
          adminNote: adminNote || undefined,
          type:
            order.service_type === 'DEPOSIT' ||
            order.service_type === 'NAP_VI' ||
            order.order_type === 'DEPOSIT'
              ? 'topup'
              : 'order',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Thao tác thất bại.');
      }
      setNotice({ type: 'ok', text: data.message || `Đã xử lý đơn #${code}` });
      loadOrders(true);
    } catch (err: any) {
      setOrders(prevOrders);
      setNotice({ type: 'err', text: err.message || 'Lỗi xử lý đơn hàng.' });
    } finally {
      setActingCode(null);
    }
  };

  const filtered = orders.filter((o) => {
    const st = String(o.status || 'pending').toLowerCase();
    if (statusFilter === 'PENDING' && !['pending', 'waiting_confirm', 'processing'].includes(st)) return false;
    if (statusFilter === 'COMPLETED' && !['completed', 'approved'].includes(st)) return false;
    if (statusFilter === 'CANCELLED' && !['cancelled', 'rejected'].includes(st)) return false;

    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      String(o.order_code || '').toLowerCase().includes(q) ||
      String(o.item_name || '').toLowerCase().includes(q) ||
      String(o.user_name || '').toLowerCase().includes(q) ||
      String(o.delivery_contact || '').toLowerCase().includes(q)
    );
  });

  if (loading && orders.length === 0) {
    return <SkeletonOrders />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: `Tất cả (${orders.length})` },
            {
              id: 'PENDING',
              label: `Chờ duyệt (${orders.filter((o) => ['pending', 'waiting_confirm', 'processing'].includes(String(o.status || '').toLowerCase())).length})`,
            },
            { id: 'COMPLETED', label: 'Đã hoàn tất' },
            { id: 'CANCELLED', label: 'Đã hủy' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === tab.id
                  ? 'bg-[#0EA5E9] text-[#07090E] font-bold'
                  : 'bg-white/[0.04] text-slate-300 border border-white/[0.08] hover:border-sky-400/30'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm mã đơn, khách, sản phẩm..."
              className="w-full h-9 pl-8 pr-3 rounded-xl bg-[#0D1526] border border-sky-200/[0.1] text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#0EA5E9]"
            />
          </div>
          <button
            type="button"
            onClick={() => loadOrders()}
            className="h-9 px-3 rounded-xl btn-ios-secondary text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tải lại</span>
          </button>
        </div>
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

      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#0D1526]/80 border border-sky-200/[0.08] text-center text-xs text-slate-400">
            Không có đơn hàng nào khớp bộ lọc.
          </div>
        ) : (
          filtered.map((o) => {
            const code = o.order_code || o.id;
            const st = String(o.status || 'pending').toLowerCase();
            const isProcessing = st === 'processing';
            const isPending = st === 'pending' || st === 'waiting_confirm' || isProcessing;
            const isDone = st === 'completed' || st === 'approved';
            const isDepositOrder =
              o.service_type === 'DEPOSIT' ||
              o.service_type === 'NAP_VI' ||
              o.order_type === 'DEPOSIT' ||
              /^YUKISP_/i.test(String(code));
            const deliveredText = o.delivery_info || o.delivered_data || '';

            return (
              <div
                key={code}
                className="p-4 rounded-2xl liquid-glass-card space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-[#38BDF8]">
                        #{code}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isDone
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : isProcessing
                            ? 'bg-sky-500/15 border-sky-500/35 text-sky-300'
                            : isPending
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                            : 'bg-red-500/15 border-red-500/30 text-red-300'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : isPending ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span>
                          {isDone
                            ? 'Hoàn tất'
                            : isProcessing
                            ? 'Đang xử lý / Chờ 2FA'
                            : isPending
                            ? 'Chờ duyệt'
                            : 'Đã hủy'}
                        </span>
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white truncate">
                      {o.item_name} <span className="text-xs text-slate-400">x{o.quantity || 1}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Khách: <span className="text-slate-200">{o.user_name}</span> • Liên hệ:{' '}
                      <span className="font-mono text-sky-300">{o.delivery_contact}</span>
                    </div>
                    {o.account_credentials && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex flex-wrap items-center justify-between gap-2 my-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-amber-400 font-bold shrink-0">🔑 TK|MK|2FA:</span>
                          <code className="text-white font-mono break-all text-[11px] selection:bg-amber-500/30">
                            {o.account_credentials}
                          </code>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                              navigator.clipboard.writeText(o.account_credentials);
                              setCopiedCode(code);
                              setTimeout(() => setCopiedCode(null), 1500);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] font-bold flex items-center gap-1 transition shrink-0"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedCode === code ? 'Đã chép' : 'Sao chép'}</span>
                        </button>
                      </div>
                    )}
                    {o.notes && (
                      <div className="text-[11px] text-slate-400">
                        Ghi chú: <span className="text-slate-200">{o.notes}</span>
                      </div>
                    )}
                    {deliveredText && (
                      <div className="text-[11px] text-emerald-300 font-mono">
                        Đã bàn giao: {deliveredText}
                      </div>
                    )}
                    {o.admin_note && (
                      <div className="text-[11px] text-amber-300">
                        Phản hồi Admin: {o.admin_note}
                      </div>
                    )}
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <div className="font-mono tabular-nums text-base font-black text-white">
                      {formatVND(Number(o.total_amount || 0))}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {o.created_at
                        ? new Date(o.created_at).toLocaleString('vi-VN', {
                            timeZone: 'Asia/Ho_Chi_Minh',
                          })
                        : ''}
                    </div>
                  </div>
                </div>

                {isPending && (
                  <div className="pt-2.5 border-t border-sky-200/[0.08] space-y-2">
                    {!isDepositOrder && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={deliveryDrafts[code] ?? ''}
                          onChange={(e) =>
                            setDeliveryDrafts((prev) => ({ ...prev, [code]: e.target.value }))
                          }
                          placeholder="Nhập TK | MK | 2FA / Key bàn giao cho khách..."
                          className="h-9 px-3 rounded-xl bg-[#060B16] border border-sky-200/[0.12] text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-[#0EA5E9]"
                        />
                        <input
                          type="text"
                          value={adminNoteDrafts[code] ?? ''}
                          onChange={(e) =>
                            setAdminNoteDrafts((prev) => ({ ...prev, [code]: e.target.value }))
                          }
                          placeholder="Ghi chú gửi khách / Yêu cầu mã 2FA (tuỳ chọn)..."
                          className="h-9 px-3 rounded-xl bg-[#060B16] border border-sky-200/[0.12] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9]"
                        />
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      {isDepositOrder ? (
                        <button
                          type="button"
                          disabled={actingCode === code}
                          onClick={() => handleAction(o, 'approve')}
                          className="h-9 px-3.5 rounded-xl btn-ios-blue text-xs flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{actingCode === code ? 'Đang xử lý...' : 'Duyệt Nạp Ví'}</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={actingCode === code}
                            onClick={() => handleAction(o, 'approve_deliver')}
                            className="h-9 px-3.5 rounded-xl btn-ios-blue text-xs flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{actingCode === code ? 'Đang lưu...' : '🔑 Duyệt & Gửi TK/Key'}</span>
                          </button>
                          <button
                            type="button"
                            disabled={actingCode === code}
                            onClick={() => handleAction(o, 'approve_upgraded')}
                            className="h-9 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <span>✨ Đã Nâng / Add Family</span>
                          </button>
                          <button
                            type="button"
                            disabled={actingCode === code}
                            onClick={() => handleAction(o, 'processing')}
                            className="h-9 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-200 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <span>⏳ Xin 2FA / Đang xử lý</span>
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        disabled={actingCode === code}
                        onClick={() => handleAction(o, 'reject')}
                        className="h-9 px-3 rounded-xl bg-red-500/12 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{isDepositOrder ? 'Từ chối' : 'Từ chối & Hoàn Ví'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
