import { NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';

export const dynamic = 'force-dynamic';

function maskActor(raw: string): string {
  const s = String(raw || '').trim();
  if (!s || s === 'anonymous' || s === 'Khách Hàng' || s === 'Chưa cập nhật') return 'Khách hàng';
  if (s.includes('@')) {
    const [prefix, domain] = s.split('@');
    return `${prefix.slice(0, Math.min(2, prefix.length))}***@${domain}`;
  }
  if (/^\d+$/.test(s) && s.length >= 4) return `***${s.slice(-4)}`;
  if (s.length > 4) return `${s.slice(0, 2)}***${s.slice(-2)}`;
  return 'Thành viên';
}

export async function GET() {
  try {
    const orders = serverStore.loadOrders();
    const topups = serverStore.loadTopups();

    const realOrders = orders
      .filter((o) => o.status === 'completed' || o.status === 'approved')
      .filter((o) => !String(o.sku || '').startsWith('TEST-') && !String(o.item_name || '').includes('Test QA'))
      .slice(0, 8)
      .map((o) => ({
        id: o.order_code || o.id,
        actor: maskActor(o.user_name || o.delivery_contact || 'Khách hàng'),
        action: o.service_type === 'BUFF' || o.service_type === 'BUFF_MXH' ? 'đặt dịch vụ' : 'mua',
        target: o.item_name,
        amount: Number(o.total_amount || 0),
        type: o.service_type === 'BUFF' || o.service_type === 'BUFF_MXH' ? 'BUFF' : 'BUY',
        created_at: o.created_at,
      }));

    const realTopups = topups
      .filter((t) => t.status === 'approved')
      .slice(0, 8)
      .map((t) => ({
        id: t.code || t.id,
        actor: maskActor(t.user_name || t.user_contact || 'Thành viên'),
        action: 'nạp ví',
        target: t.bank || 'VietQR',
        amount: Number(t.amount || 0),
        type: 'TOPUP',
        created_at: t.created_at,
      }));

    const combined = [...realOrders, ...realTopups]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      activities: combined,
    });
  } catch (err: any) {
    return NextResponse.json({ success: true, activities: [] });
  }
}
