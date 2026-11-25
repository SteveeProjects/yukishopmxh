'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import {
  Bell,
  CheckCheck,
  Wallet,
  ShoppingBag,
  Crown,
  AlertCircle,
  Inbox,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  content: string;
  date: string;
  isRead: boolean;
  type: 'WALLET' | 'ORDER' | 'MEMBERSHIP' | 'SYSTEM';
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRealNotifications = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const items: NotificationItem[] = [];

      // 1. Fetch from wallet transactions
      try {
        const txRes = await fetch('/api/wallet/transactions', { cache: 'no-store', credentials: 'include' });
        const txData = await txRes.json();
        if (txData && Array.isArray(txData.transactions)) {
          for (const tx of txData.transactions.slice(0, 15)) {
            const isDeposit = tx.type === 'TOPUP' || tx.type === 'DEPOSIT';
            const amtStr = new Intl.NumberFormat('vi-VN').format(tx.amount || 0) + ' VNĐ';
            items.push({
              id: `tx-${tx.id || tx.ref}`,
              title: isDeposit ? 'Biến động số dư: Nạp tiền' : 'Biến động số dư: Thanh toán',
              content: isDeposit
                ? `Đã ghi nhận giao dịch nạp +${amtStr} vào ví tài khoản (Mã: ${tx.ref || '-'}).`
                : `Đã trừ -${amtStr} cho giao dịch ${tx.description || tx.ref || '-'}.`,
              date: tx.created_at ? new Date(tx.created_at).toLocaleString('vi-VN') : 'Vừa tạo',
              isRead: false,
              type: isDeposit ? 'WALLET' : 'ORDER',
            });
          }
        }
      } catch {}

      // 2. Fetch from orders
      try {
        const ordRes = await fetch('/api/orders', { cache: 'no-store', credentials: 'include' });
        const ordData = await ordRes.json();
        if (ordData && Array.isArray(ordData.orders)) {
          for (const ord of ordData.orders.slice(0, 15)) {
            const code = ord.order_code || ord.id;
            const statusLabel =
              ord.status === 'approved' || ord.status === 'completed'
                ? 'Đã duyệt thành công'
                : ord.status === 'rejected'
                ? 'Đã bị từ chối'
                : 'Đang chờ Admin duyệt';

            // Avoid duplicate with wallet transactions of same ref
            if (!items.some((i) => i.id.includes(code))) {
              items.push({
                id: `ord-${code}`,
                title: `Cập nhật đơn hàng #${code}`,
                content: `Đơn "${ord.item_name}" (${new Intl.NumberFormat('vi-VN').format(ord.total_amount || 0)} VNĐ) hiện ở trạng thái: ${statusLabel}.`,
                date: ord.created_at ? new Date(ord.created_at).toLocaleString('vi-VN') : 'Vừa tạo',
                isRead: false,
                type: 'ORDER',
              });
            }
          }
        }
      } catch {}

      setNotifications(items);
    } catch (e) {
      console.warn('Error fetching real notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealNotifications();
  }, [user]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'WALLET':
        return <Wallet className="w-4 h-4 text-emerald-400" />;
      case 'MEMBERSHIP':
        return <Crown className="w-4 h-4 text-amber-400" />;
      case 'ORDER':
        return <ShoppingBag className="w-4 h-4 text-primary" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6 py-4 max-w-3xl mx-auto px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-foreground">
            Trung Tâm Thông Báo
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cập nhật tức thời về biến động số dư, đơn hàng và phản hồi của Ban quản trị.
          </p>
        </div>
        {notifications.length > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-1.5 text-xs self-start sm:self-auto">
            <CheckCheck className="w-4 h-4" />
            Đọc Tất Cả
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground bg-surface/50 rounded-2xl border border-surface-border">
            Đang tải thông báo...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-surface/40 rounded-3xl border border-surface-border">
            <div className="w-12 h-12 rounded-2xl bg-surface-hover border border-surface-border flex items-center justify-center mx-auto text-muted-foreground">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-foreground">Chưa có thông báo mới</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Khi bạn thực hiện nạp tiền ví hoặc đặt hàng dịch vụ, các thông báo cập nhật tiến độ sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <Card
              key={n.id}
              className={`p-4 transition-colors ${
                !n.isRead ? 'border-primary/40 bg-surface shadow-md' : 'bg-surface/50 opacity-80'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-surface-border flex items-center justify-center shrink-0">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="text-sm font-bold text-foreground">{n.title}</h4>
                    <span className="text-[11px] font-mono text-muted-foreground">{n.date}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{n.content}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
