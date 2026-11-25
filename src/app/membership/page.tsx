'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { useCustomDialog } from '@/components/common/custom-dialog';
import { calculateVipTier } from '@/lib/vip-tier';
import { Award, Check, Info } from 'lucide-react';

export default function MembershipPage() {
  const router = useRouter();
  const { user, profile, wallet, membership, lifetimeDeposit, refreshUserData } = useAuth();
  const { showAlert, showConfirm } = useCustomDialog();
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const plans = [
    {
      id: 'VIP-30D',
      name: 'VIP 30 Ngày',
      tier: 'VIP',
      price: 20000,
      duration: '30 ngày',
      quota: '40 lượt/ngày',
      loop: '20 vòng lặp',
      wfq: '30% (Trọng số 3)',
      badge: 'Phổ biến',
      badgeVariant: 'vip' as const,
      features: ['Hạn ngạch 40 tác vụ/ngày', '20 vòng lặp lệnh', 'Ưu tiên hàng đợi 30%', 'Gia hạn nối tiếp thời gian'],
    },
    {
      id: 'VIP-LIFE',
      name: 'VIP Trọn Đời',
      tier: 'VIP',
      price: 100000,
      duration: 'Vĩnh viễn',
      quota: '40 lượt/ngày',
      loop: '20 vòng lặp',
      wfq: '30% (Trọng số 3)',
      badge: 'Tiết kiệm',
      badgeVariant: 'vip' as const,
      features: ['Duy trì quyền VIP vĩnh viễn', 'Không cần gia hạn', '40 lượt/ngày', 'Hỗ trợ kỹ thuật ưu tiên'],
    },
    {
      id: 'SVIP-30D',
      name: 'SVIP 30 Ngày',
      tier: 'SVIP',
      price: 35000,
      duration: '30 ngày',
      quota: 'Không giới hạn ngày',
      loop: '100 vòng lặp',
      wfq: '50% (Trọng số 5)',
      badge: 'Khuyên dùng',
      badgeVariant: 'svip' as const,
      highlight: true,
      features: ['Không giới hạn lượt thành công/ngày', '100 vòng lặp lệnh', 'Ưu tiên hàng đợi 50% WFQ', 'Ghi đè gói VIP tức thì'],
    },
    {
      id: 'SVIP-LIFE',
      name: 'SVIP Trọn Đời',
      tier: 'SVIP',
      price: 150000,
      duration: 'Vĩnh viễn',
      quota: 'Không giới hạn ngày',
      loop: '100 vòng lặp',
      wfq: '50% (Trọng số 5)',
      badge: 'Cao cấp nhất',
      badgeVariant: 'svip' as const,
      highlight: true,
      features: ['Đặc quyền SVIP trọn đời', '100 vòng lặp lệnh', '50% WFQ tối đa', 'Được hỗ trợ xử lý hàng đầu'],
    },
  ];

  const rankTiers = [
    { name: 'Đồng', contribution: 500000, discount: 2 },
    { name: 'Bạc', contribution: 1000000, discount: 5 },
    { name: 'Vàng', contribution: 3000000, discount: 8 },
    { name: 'Kim Cương', contribution: 5000000, discount: 10 },
  ];

  const vipInfo = calculateVipTier(lifetimeDeposit || 0);
  const currentBalance = Number(wallet?.balance || 0);

  const formatVND = (val: number) =>
    new Intl.NumberFormat('vi-VN').format(val) + 'đ';

  const handlePurchase = async (plan: typeof plans[0]) => {
    if (!user) {
      await showAlert('Vui lòng đăng nhập tài khoản trước khi kích hoạt gói Hội Viên.', 'Yêu Cầu Đăng Nhập', 'warning');
      router.push('/login');
      return;
    }

    if (currentBalance < plan.price) {
      const goTopup = await showConfirm(
        `Số dư ví hiện tại (${formatVND(currentBalance)}) không đủ ${formatVND(plan.price)} để kích hoạt gói ${plan.name}. Bạn có muốn chuyển sang trang Nạp Ví VietQR ngay?`,
        'Số Dư Không Đủ'
      );
      if (goTopup) {
        router.push('/wallet?action=topup');
      }
      return;
    }

    const ok = await showConfirm(
      `Xác nhận trừ ${formatVND(plan.price)} từ Ví Mua Hàng để đăng ký gói ${plan.name}?`,
      'Xác Nhận Kích Hoạt Gói'
    );
    if (!ok) return;

    setActivatingId(plan.id);
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: plan.id,
          item_name: `Gói Hội Viên ${plan.name}`,
          service_type: 'MEMBERSHIP',
          order_type: 'PRODUCT',
          quantity: 1,
          amount: plan.price,
          total_amount: plan.price,
          delivery_contact: profile?.telegramId || profile?.email || user.email || 'Website',
          notes: `Kích hoạt gói hội viên ${plan.name} (${plan.duration})`,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        await showAlert(json.error || 'Không thể kích hoạt gói lúc này.', 'Lỗi Thanh Toán', 'error');
        return;
      }

      await refreshUserData();
      await showAlert(
        `Đơn đăng ký gói ${plan.name} (#${json.order?.order_code || 'YUKI'}) đã được tạo thành công! Admin đã nhận thông báo kích hoạt qua Telegram.`,
        'Đăng Ký Gói Thành Công',
        'success'
      );
    } catch {
      await showAlert('Lỗi kết nối máy chủ. Vui lòng thử lại.', 'Lỗi Mạng', 'error');
    } finally {
      setActivatingId(null);
    }
  };

  return (
    <div className="space-y-8 py-4 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white">
            Đặc Quyền Hội Viên &amp; Bậc Rank Tích Lũy
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
            Nâng cấp quyền lợi hàng đợi, hạn ngạch thực thi mỗi ngày và hưởng chiết khấu tự động trọn đời theo tổng mức nạp.
          </p>
        </div>
        <Link
          href="/wallet"
          className="min-h-[44px] px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-xs font-bold text-sky-300 flex items-center gap-2 shrink-0"
        >
          <span>Số dư ví:</span>
          <span className="font-mono tabular-nums text-emerald-400">{formatVND(currentBalance)}</span>
        </Link>
      </div>

      <Alert variant="info">
        <Info className="w-4 h-4 mr-1 shrink-0" />
        <div>
          <strong>Quy tắc nghiệp vụ chuẩn:</strong>
          <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs">
            <li>Người dùng đang có gói VIP mua gói SVIP → SVIP sẽ ghi đè và nâng cấp quyền lợi lập tức.</li>
            <li>Gia hạn cùng cấp độ → Thời hạn mới được cộng dồn nối tiếp vào ngày hết hạn hiện tại.</li>
            <li>Chiết khấu Rank áp dụng tự động dựa trên tổng nạp tích lũy (<span className="font-mono tabular-nums">{formatVND(lifetimeDeposit || 0)}</span>).</li>
          </ul>
        </div>
      </Alert>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((p) => (
          <Card
            key={p.id}
            className={`flex flex-col justify-between bg-[#0D1526]/90 ${
              p.highlight ? 'border-sky-400/50 shadow-xl shadow-sky-500/10' : 'border-white/[0.08]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <Badge variant={p.badgeVariant}>{p.badge}</Badge>
                <span className="text-xs text-slate-400">{p.duration}</span>
              </div>
              <h3 className="text-base font-bold font-display text-white">{p.name}</h3>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-[#38BDF8] my-2">{formatVND(p.price)}</div>

              <div className="space-y-1.5 py-3 border-y border-white/[0.08] text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Quota:</span>
                  <span className="font-semibold text-white">{p.quota}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vòng lặp:</span>
                  <span className="font-semibold text-white">{p.loop}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hàng đợi:</span>
                  <span className="font-semibold text-white">{p.wfq}</span>
                </div>
              </div>

              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6">
              <Button
                variant={p.highlight ? 'primary' : 'outline'}
                isLoading={activatingId === p.id}
                disabled={Boolean(activatingId)}
                onClick={() => handlePurchase(p)}
                className="w-full min-h-[44px] text-xs font-bold"
              >
                {activatingId === p.id ? 'Đang kích hoạt...' : 'Kích Hoạt Ngay'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="bg-[#0D1526]/90 border-white/[0.08]">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-white">
            <Award className="w-5 h-5 text-[#0EA5E9]" />
            Tiến Trình Bậc Rank Tích Lũy
          </CardTitle>
          <p className="text-xs text-slate-400 mt-0.5">
            Tổng nạp hợp lệ được cộng dồn tự động từ ZaloPay QR. Chi tiêu trong ví không làm giảm hạng Rank.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {rankTiers.map((r) => (
              <div key={r.name} className="p-4 rounded-xl bg-[#07090E] border border-white/[0.08] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{r.name}</span>
                  <Badge variant="rank">Giảm {r.discount}%</Badge>
                </div>
                <div className="font-mono tabular-nums text-xs text-slate-400">{formatVND(r.contribution)}</div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-[#07090E]/80 border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-slate-400">
              Cấp bậc hiện tại của bạn ({membership?.tier || 'Thành viên'}):
            </span>
            <span className="font-bold text-sky-300 font-mono tabular-nums">
              {vipInfo.name} (Chiết khấu {vipInfo.discountPercent}% • Tổng nạp {formatVND(lifetimeDeposit || 0)})
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
