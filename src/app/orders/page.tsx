'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SkeletonOrders } from '@/components/common/skeleton-shimmer';
import {
  RefreshCw,
  Send,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  Terminal,
  Package,
  RotateCcw,
  CheckCircle2,
  Search,
} from 'lucide-react';
import { ADMIN_TELEGRAM_URL, ADMIN_SUPPORT_LABEL } from '@/lib/constants';
import { useAuth } from '@/contexts/auth-context';

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Guest Order Lookup state
  const [lookupCode, setLookupCode] = useState('');
  const [lookupContact, setLookupContact] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<any | null>(null);

  const handleGuestLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);
    try {
      const res = await fetch('/api/orders/lookup', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderCode: lookupCode.trim(), contact: lookupContact.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setLookupError(json.error || 'Không tìm thấy đơn hàng khớp.');
      } else {
        setLookupResult(json.order);
      }
    } catch {
      setLookupError('Lỗi kết nối khi tra cứu đơn hàng.');
    } finally {
      setLookupLoading(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders', { cache: 'no-store', credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.orders) setOrders(data.orders);
      }
    } catch (e) {
      console.warn('Failed to load orders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const formatVND = (amt: number) =>
    new Intl.NumberFormat('vi-VN').format(amt) + 'đ';

  const copyToClipboard = async (text: string, id: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopiedCode(id);
        setTimeout(() => setCopiedCode(null), 2000);
      }
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'completed':
      case 'approved':
        return <Badge variant="success">Hoàn tất</Badge>;
      case 'processing':
        return <Badge variant="info">Đang xử lý</Badge>;
      case 'rejected':
      case 'cancelled':
        return <Badge variant="danger">Đã hủy</Badge>;
      default:
        return <Badge variant="warning">Chờ duyệt</Badge>;
    }
  };

  const getReorderHref = (order: any) => {
    const sku = String(order.sku || '');
    const isBuff =
      order.service_type === 'BUFF' ||
      order.service_type === 'BUFF_MXH' ||
      sku.startsWith('BUFF-');
    if (isBuff) {
      const params = new URLSearchParams();
      if (sku) params.set('sku', sku);
      if (order.target_link && order.target_link !== 'Website') params.set('target', order.target_link);
      if (order.quantity) params.set('qty', String(order.quantity));
      return `/buff?${params.toString()}`;
    }
    return `/checkout?sku=${encodeURIComponent(sku)}&qty=${order.quantity || 1}`;
  };

  const pendingCount = orders.filter((o) => {
    const s = (o.status || 'pending').toLowerCase();
    return s === 'pending' || s === 'waiting_confirm' || s === 'processing';
  }).length;

  const completedCount = orders.filter((o) => {
    const s = (o.status || 'pending').toLowerCase();
    return s === 'completed' || s === 'approved';
  }).length;

  const cancelledCount = orders.filter((o) => {
    const s = (o.status || 'pending').toLowerCase();
    return s === 'cancelled' || s === 'rejected';
  }).length;

  const filteredOrders = orders.filter((o) => {
    const s = (o.status || 'pending').toLowerCase();
    if (statusFilter === 'PENDING') return s === 'pending' || s === 'waiting_confirm' || s === 'processing';
    if (statusFilter === 'COMPLETED') return s === 'completed' || s === 'approved';
    if (statusFilter === 'CANCELLED') return s === 'cancelled' || s === 'rejected';
    return true;
  });

  return (
    <div className="space-y-6 py-2 max-w-4xl mx-auto animate-page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-sky-200/[0.08]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white tabular-nums">
            Lịch Sử Đơn Hàng ({orders.length})
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Theo dõi trạng thái xử lý, sao chép tài khoản bàn giao, đặt lại đơn hoặc yêu cầu bảo hành 1 chạm.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={fetchOrders} className="text-xs btn-ios-secondary">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Làm mới
          </Button>
          <Link
            href="/warranty"
            className="px-3 py-2 rounded-xl btn-ios-secondary text-xs flex items-center gap-1.5 text-sky-300"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Bảo hành</span>
          </Link>
          <Link
            href="/services"
            className="px-3.5 py-2 rounded-xl btn-ios-blue text-xs font-bold"
          >
            Mua thêm dịch vụ
          </Link>
        </div>
      </div>

      {/* Guest Order Lookup (No login required) */}
      <section className="p-4 sm:p-5 rounded-2xl liquid-glass-card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-[#0EA5E9]" />
              <span>Tra Cứu Đơn Nhanh (Không Cần Đăng Nhập)</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Nhập Mã đơn hàng và Email / Telegram / SĐT đã đặt để xem trạng thái &amp; thông tin bàn giao.
            </p>
          </div>
          {!user && (
            <Link href="/login" className="text-xs font-semibold text-sky-300 hover:underline shrink-0">
              Đăng nhập xem tất cả
            </Link>
          )}
        </div>

        <form onSubmit={handleGuestLookup} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs">
          <input
            type="text"
            value={lookupCode}
            onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
            placeholder="Mã đơn (VD: YUKI-123456)"
            className="sm:col-span-4 h-10 px-3 rounded-xl bg-[#07090E] border border-white/[0.1] text-white font-mono focus:outline-none focus:border-[#0EA5E9]"
            required
          />
          <input
            type="text"
            value={lookupContact}
            onChange={(e) => setLookupContact(e.target.value)}
            placeholder="Email, @Telegram hoặc SĐT đã đặt..."
            className="sm:col-span-5 h-10 px-3 rounded-xl bg-[#07090E] border border-white/[0.1] text-white focus:outline-none focus:border-[#0EA5E9]"
            required
          />
          <button
            type="submit"
            disabled={lookupLoading}
            className="sm:col-span-3 h-10 rounded-xl btn-ios-blue text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{lookupLoading ? 'Đang tìm...' : 'Tra Cứu Đơn'}</span>
          </button>
        </form>

        {lookupError && (
          <div className="p-3 rounded-xl bg-red-500/12 border border-red-500/30 text-xs text-red-300">
            {lookupError}
          </div>
        )}

        {lookupResult && (
          <div className="p-4 rounded-xl bg-[#07090E]/90 border border-sky-400/30 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sky-300">{lookupResult.order_code}</span>
                {getStatusBadge(lookupResult.status)}
              </div>
              <span className="font-mono tabular-nums font-bold text-emerald-400">
                {formatVND(lookupResult.total_amount || 0)}
              </span>
            </div>
            <div className="font-semibold text-white">
              {lookupResult.item_name} <span className="text-slate-400">(SL: {lookupResult.quantity || 1})</span>
            </div>
            {lookupResult.delivery_info && (
              <div className="p-3 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-between gap-2">
                <span className="font-mono text-emerald-300 break-all">{lookupResult.delivery_info}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(lookupResult.delivery_info, `lookup_${lookupResult.order_code}`)}
                  className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-200 text-[11px] font-semibold shrink-0"
                >
                  {copiedCode === `lookup_${lookupResult.order_code}` ? 'Đã chép' : 'Sao chép'}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Status Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs font-semibold">
        {[
          { id: 'ALL', label: 'Tất cả', count: orders.length },
          { id: 'PENDING', label: 'Chờ duyệt', count: pendingCount },
          { id: 'COMPLETED', label: 'Hoàn tất', count: completedCount },
          { id: 'CANCELLED', label: 'Đã hủy', count: cancelledCount },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              statusFilter === tab.id
                ? 'bg-[#0EA5E9] text-[#060B16] font-bold'
                : 'bg-[#0D1526] border border-sky-200/[0.1] text-slate-300 hover:text-white'
            }`}
          >
            <span>{tab.label}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-black/20 text-[10px] font-mono tabular-nums">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonOrders count={3} />
      ) : filteredOrders.length === 0 ? (
        <div className="p-10 text-center rounded-2xl border border-sky-200/[0.1] bg-[#0D1526]/85 space-y-3">
          <Package className="w-9 h-9 text-slate-500 mx-auto" strokeWidth={1.75} />
          <p className="text-sm font-semibold text-slate-300">
            {statusFilter === 'ALL' ? 'Bạn chưa có đơn hàng nào.' : 'Không có đơn hàng nào trong mục này.'}
          </p>
          <div className="pt-1">
            <Link href="/services" className="inline-flex px-4 py-2 rounded-xl btn-ios-blue text-xs font-bold">
              Khám Phá Kho Dịch Vụ
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredOrders.map((order: any) => {
            const code = order.order_code || order.id;
            const dateStr = order.created_at
              ? new Date(order.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
              : 'Vừa xong';

            const statusStr = String(order.status || 'pending').toLowerCase();
            const isCompleted = statusStr === 'completed' || statusStr === 'approved';
            const warrantyDays = order.warranty_days !== undefined ? Number(order.warranty_days) : 30;

            return (
              <Card
                key={code}
                className="p-4 sm:p-5 rounded-2xl border-sky-200/[0.1] bg-[#0D1526]/90 text-white space-y-3.5 shadow-xl"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-sky-200/[0.08] text-xs gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#38BDF8]">{code}</span>
                    <span className="text-slate-400">• {dateStr}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(order.status)}
                    <span className="font-extrabold font-mono tabular-nums text-emerald-400 text-sm">
                      {formatVND(order.total_amount || 0)}
                    </span>
                  </div>
                </div>

                {/* Body Details */}
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-sm text-white">{order.item_name}</div>
                  <div className="text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      Số lượng: <strong className="text-slate-200 tabular-nums">{order.quantity || 1}</strong>
                    </span>
                    {order.target_link && order.target_link !== 'Website' && (
                      <span className="font-mono text-sky-300 truncate max-w-xs inline-block align-bottom">
                        Link: {order.target_link}
                      </span>
                    )}
                    <span>
                      Bảo hành:{' '}
                      <strong className={warrantyDays === 0 ? 'text-slate-400' : 'text-emerald-400'}>
                        {warrantyDays === 0 ? 'Không hỗ trợ (KBH)' : `${warrantyDays} Ngày`}
                      </strong>
                    </span>
                  </div>
                  <div className="text-slate-300">
                    Liên hệ nhận đơn: <span className="font-mono text-sky-300">{order.delivery_contact || 'Chưa cung cấp'}</span>
                  </div>
                </div>

                {/* Delivery Info & Admin Note Boxes */}
                {order.admin_note && (
                  <div className="p-3 rounded-xl bg-amber-500/12 border border-amber-500/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-amber-200 leading-relaxed">
                      <strong className="text-amber-300">💬 Thông báo từ Admin:</strong> {order.admin_note}
                    </div>
                    <a
                      href={ADMIN_TELEGRAM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/35 text-sky-200 font-bold text-[11px] flex items-center gap-1.5 shrink-0"
                    >
                      <Send className="w-3 h-3" />
                      <span>Gửi 2FA / Nhắn Admin</span>
                    </a>
                  </div>
                )}
                {isCompleted && (
                  <div>
                    {order.delivery_info === 'CONTACT_ADMIN' ? (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-amber-200">
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-400" />
                          <span>Đơn đã duyệt. Liên hệ Admin qua Telegram để nhận bàn giao.</span>
                        </div>
                        <a
                          href={ADMIN_TELEGRAM_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl btn-ios-blue text-xs flex items-center justify-center gap-1.5 shrink-0"
                        >
                          <Send className="w-3.5 h-3.5" strokeWidth={1.75} />
                          <span>Nhắn Tin Nhận Đơn</span>
                        </a>
                      </div>
                    ) : order.delivery_info ? (
                      <div className="p-3.5 rounded-xl bg-[#060B16] border border-sky-200/[0.1] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-200 flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5 text-[#0EA5E9]" strokeWidth={1.75} />
                            <span>Thông tin tài khoản / key bàn giao</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(order.delivery_info, code)}
                            className="px-2.5 py-1 rounded-lg bg-[#0D1526] hover:bg-[#131F36] text-slate-200 text-[11px] font-semibold border border-sky-200/[0.12] flex items-center gap-1 transition"
                          >
                            {copiedCode === code ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" strokeWidth={1.75} />
                                <span className="text-emerald-400">Đã sao chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" strokeWidth={1.75} />
                                <span>Sao chép</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-3 rounded-xl bg-[#04070F] font-mono text-xs text-emerald-300 whitespace-pre-wrap break-all border border-sky-200/[0.06]">
                          {order.delivery_info}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Footer Actions: 1-Tap Warranty + Reorder + Support */}
                <div className="pt-2.5 border-t border-sky-200/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isCompleted && warrantyDays > 0 && (
                      order.warranty_claimed ? (
                        <span className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                          <span>Đang chờ bảo hành</span>
                        </span>
                      ) : (
                        <Link
                          href={`/warranty?order=${encodeURIComponent(code)}`}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/12 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1.5 transition"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.75} />
                          <span>Yêu Cầu Bảo Hành</span>
                        </Link>
                      )
                    )}

                    {order.sku && !String(order.sku).startsWith('DEP') && (
                      <Link
                        href={getReorderHref(order)}
                        className="px-3 py-1.5 rounded-xl bg-sky-500/12 hover:bg-sky-500/20 text-sky-300 border border-sky-400/30 text-[11px] font-bold flex items-center gap-1.5 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
                        <span>Đặt Lại</span>
                      </Link>
                    )}
                  </div>

                  <a
                    href={ADMIN_TELEGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl btn-ios-secondary text-[11px] flex items-center gap-1.5"
                  >
                    <Send className="w-3 h-3 text-[#0EA5E9]" strokeWidth={1.75} />
                    <span>{ADMIN_SUPPORT_LABEL}</span>
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
