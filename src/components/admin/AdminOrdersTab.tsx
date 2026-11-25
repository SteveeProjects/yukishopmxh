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
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/admin/orders', { cache: 'no-store' });
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

  // Optimistic Order Action
  const handleAction = async (order: any, action: 'approve' | 'reject') => {
    const code = order.order_code || order.id;
    const deliveryInfo = (deliveryDrafts[code] || '').trim();
    const prevOrders = [...orders];
    const optimisticStatus = action === 'approve' ? 'completed' : 'cancelled';

    // Optimistic UI update immediately
    setOrders((curr) =>
      curr.map((o) =>
        (o.order_code || o.id) === code
          ? {
              ...o,
              status: optimisticStatus,
              delivery_info: deliveryInfo || o.delivery_info,
            }
          : o
      )
    );
    setNotice(null);

    try {
      const res = await fetch('/api/admin/orders/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: code,
          action,
          deliveryInfo: deliveryInfo || undefined,
          type: order.service_type === 'DEPOSIT' ? 'topup' : 'order',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Thao tác thất bại.');
      }
      setNotice({ type: 'ok', text: data.message || `Đã xử lý đơn #${code}` });
      loadOrders(true);
    } catch (err: any) {
      // Rollback on failure
      setOrders(prevOrders);
      setNotice({ type: 'err', text: err.message || 'Lỗi xử lý đơn hàng.' });
    }
  };

  const filtered = orders.filter((o) => {
    const st = String(o.status || 'pending').toLowerCase();
    if (statusFilter === 'PENDING' && !['pending', 'waiting_confirm'].includes(st)) return false;
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
              label: `Chờ duyệt (${orders.filter((o) => ['pending', 'waiting_confirm'].includes(String(o.status || '').toLowerCase())).length})`,
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
            const isPending = st === 'pending' || st === 'waiting_confirm';
            const isDone = st === 'completed' || st === 'approved';

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
                          {isDone ? 'Hoàn tất' : isPending ? 'Chờ duyệt' : 'Đã hủy'}
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
                    {o.delivery_info && (
                      <div className="text-[11px] text-emerald-300 font-mono">
                        Đã bàn giao: {o.delivery_info}
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
                  <div className="pt-2.5 border-t border-sky-200/[0.08] flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={deliveryDrafts[code] ?? ''}
                      onChange={(e) =>
                        setDeliveryDrafts((prev) => ({ ...prev, [code]: e.target.value }))
                      }
                      placeholder="Nhập email|pass hoặc key bàn giao cho khách (tuỳ chọn)..."
                      className="flex-1 h-9 px-3 rounded-xl bg-[#060B16] border border-sky-200/[0.12] text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-[#0EA5E9]"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAction(o, 'approve')}
                        className="h-9 px-3.5 rounded-xl btn-ios-blue text-xs flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Duyệt &amp; Trả Hàng</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(o, 'reject')}
                        className="h-9 px-3 rounded-xl bg-red-500/12 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Từ chối</span>
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
