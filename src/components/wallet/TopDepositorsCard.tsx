'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Crown, Gift, AlertCircle, Sparkles, ChevronRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface TierInfo {
  tierName: string;
  targetThreshold: number;
  isDowngraded: boolean;
  rewardDescription: string;
  voucherPercent: number;
  voucherMaxDiscount?: number;
  voucherMinOrder?: number;
  walletReward: number;
  spinTickets: number;
  missingForTarget: number;
}

interface Depositor {
  rank: number;
  userId: string;
  maskedName: string;
  totalDeposit: number;
  vipTier: 'MEMBER' | 'SILVER' | 'GOLD' | 'DIAMOND';
  vipBadge: string;
  tierInfo?: TierInfo;
}

export function TopDepositorsCard({ className = '' }: { className?: string }) {
  const [depositors, setDepositors] = useState<Depositor[]>([]);
  const [activeMonth, setActiveMonth] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showTiersModal, setShowTiersModal] = useState(false);

  useEffect(() => {
    fetch('/api/wallet/top-depositors')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.topDepositors)) {
          setDepositors(data.topDepositors);
          if (data.month) setActiveMonth(data.month);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatVND = (num: number) =>
    new Intl.NumberFormat('vi-VN').format(num) + 'đ';

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-black flex items-center justify-center font-black text-xs shadow-lg shadow-amber-500/25 shrink-0">
          <Crown className="w-4 h-4 fill-black" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-slate-400 to-slate-200 text-slate-900 flex items-center justify-center font-black text-xs shadow-md shadow-slate-400/20 shrink-0">
          <Crown className="w-4 h-4 fill-slate-900" />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-700 to-amber-500 text-white flex items-center justify-center font-black text-xs shadow-md shadow-amber-700/20 shrink-0">
          <Crown className="w-4 h-4 fill-white" />
        </div>
      );
    }
    return (
      <div className="w-7 h-7 rounded-xl bg-[#080d1a] border border-sky-400/20 text-sky-300 flex items-center justify-center font-mono tabular-nums font-bold text-xs shrink-0">
        #{rank}
      </div>
    );
  };

  return (
    <div
      className={`rounded-3xl border border-sky-500/20 bg-gradient-to-b from-[#0a0f1d]/95 via-[#070b16]/95 to-[#05070d]/95 p-4 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-2xl ${className}`}
    >
      {/* Background glow accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-sky-400/15">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/10 border border-amber-400/30 text-amber-300 flex items-center justify-center shadow-inner">
            <Trophy className="w-5 h-5 text-amber-400" strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                Bảng Vàng Top Nạp {activeMonth ? `Tháng ${activeMonth}` : ''}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 text-[10px] font-mono font-bold border border-amber-400/30">
                Reset ngày 01 hàng tháng
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Chốt thưởng định kỳ cuối tháng: Voucher giảm sốc + Tiền Ví Mua Hàng + Vé Lucky Spin
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowTiersModal(!showTiersModal)}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-semibold transition-all shadow-sm"
        >
          <Gift className="w-3.5 h-3.5 text-amber-400" />
          <span>{showTiersModal ? 'Ẩn Cơ Chế Thưởng' : 'Xem Mốc & Cơ Chế Thưởng'}</span>
        </button>
      </div>

      {/* 4 Smart Tiers Visual Showcase */}
      {(showTiersModal || depositors.length === 0) && (
        <div className="my-4 p-4 rounded-2xl bg-[#060a14]/90 border border-amber-400/25 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>4 Mốc Thưởng & Quy Tắc Tự Động Hạ Bậc Minh Bạch</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Top 1 */}
            <div className="p-3 rounded-xl bg-amber-500/[0.08] border border-amber-400/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-black text-amber-300">
                  <span>🥇 TOP 1</span>
                  <span className="font-mono text-[11px] text-amber-400">≥ 2.000.000đ</span>
                </div>
                <div className="mt-1.5 text-[11px] text-slate-200 space-y-0.5 leading-snug">
                  <p className="text-amber-300 font-semibold">• Voucher 10% (tối đa 40k)</p>
                  <p>• +50.000đ Ví Mua Hàng</p>
                  <p>• +3 Vé Quay May Mắn</p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-amber-400/20 text-[10px] text-slate-400 italic">
                *Nếu nạp &lt; 2M sẽ tự hạ xuống mốc 1.5M, 1M hoặc 500k.
              </div>
            </div>

            {/* Top 2 */}
            <div className="p-3 rounded-xl bg-slate-300/[0.07] border border-slate-300/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-black text-slate-200">
                  <span>🥈 TOP 2</span>
                  <span className="font-mono text-[11px] text-slate-300">≥ 1.500.000đ</span>
                </div>
                <div className="mt-1.5 text-[11px] text-slate-200 space-y-0.5 leading-snug">
                  <p className="text-slate-300 font-semibold">• Voucher 8% (tối đa 30k)</p>
                  <p>• +25.000đ Ví Mua Hàng</p>
                  <p>• +2 Vé Quay May Mắn</p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-300/20 text-[10px] text-slate-400 italic">
                *Nếu nạp &lt; 1.5M sẽ tự hạ xuống mốc 1M hoặc 500k.
              </div>
            </div>

            {/* Top 3 */}
            <div className="p-3 rounded-xl bg-amber-800/[0.1] border border-amber-600/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-black text-amber-400">
                  <span>🥉 TOP 3</span>
                  <span className="font-mono text-[11px] text-amber-400">≥ 1.000.000đ</span>
                </div>
                <div className="mt-1.5 text-[11px] text-slate-200 space-y-0.5 leading-snug">
                  <p className="text-amber-400 font-semibold">• Voucher 7% (tối đa 20k)</p>
                  <p>• +15.000đ Ví Mua Hàng</p>
                  <p>• +1 Vé Quay May Mắn</p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-amber-600/20 text-[10px] text-slate-400 italic">
                *Nếu nạp &lt; 1M sẽ tự hạ xuống mốc 500k.
              </div>
            </div>

            {/* Khuyen Khich */}
            <div className="p-3 rounded-xl bg-sky-500/[0.08] border border-sky-400/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-black text-sky-300">
                  <span>🎖️ KHUYẾN KHÍCH</span>
                  <span className="font-mono text-[11px] text-sky-300">≥ 500.000đ</span>
                </div>
                <div className="mt-1.5 text-[11px] text-slate-200 space-y-0.5 leading-snug">
                  <p className="text-sky-300 font-semibold">• Voucher 5% (đơn từ 100k)</p>
                  <p>• +1 Vé Quay May Mắn</p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-sky-400/20 text-[10px] text-slate-400 italic">
                *Dành cho mọi khách nạp từ 500k trở lên.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-white">Cơ chế bảo vệ quyền lợi:</strong> Người đạt Top nhưng tổng nạp chưa đạt mốc chuẩn vẫn được bảo lưu nhận phần thưởng tương ứng ở mốc đã nạp, không bao giờ bị mất trắng!
            </p>
          </div>
        </div>
      )}

      {/* Depositors List */}
      <div className="mt-3 divide-y divide-sky-400/10">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span>Đang tải bảng vàng xếp hạng...</span>
          </div>
        ) : depositors.length === 0 ? (
          <div className="py-8 text-center">
            <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">Chưa có giao dịch nạp tiền hoàn tất</p>
            <p className="text-xs text-slate-500 mt-1">Hãy là người đầu tiên nạp ví để ghi danh lên Bảng Vàng!</p>
          </div>
        ) : (
          depositors.map((d) => {
            const tier = d.tierInfo;
            return (
              <div
                key={d.userId + d.rank}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-sky-500/[0.04] px-3 rounded-2xl transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getRankBadge(d.rank)}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-white font-mono truncate">
                        {d.maskedName}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-400/25 uppercase font-mono">
                        {d.vipBadge}
                      </span>
                    </div>

                    {tier && (
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          tier.isDowngraded
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-400/30'
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
                        }`}>
                          {tier.tierName}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate">
                          {tier.rewardDescription}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 pl-10 sm:pl-0">
                  <div className="text-sm sm:text-base font-black text-amber-300 font-mono tabular-nums tracking-tight">
                    {formatVND(d.totalDeposit)}
                  </div>
                  {tier && tier.missingForTarget > 0 ? (
                    <div className="text-[10px] text-amber-400/90 font-medium flex items-center gap-1">
                      <span>Cần nạp +{formatVND(tier.missingForTarget)}</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>Đã đạt chuẩn mốc</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer promotion */}
      <div className="mt-4 pt-3.5 border-t border-sky-400/10 flex items-center justify-between text-xs">
        <span className="text-slate-400">
          Chốt quà và phát tự động vào cuối mỗi chu kỳ bởi Admin
        </span>
        <Link
          href="/spin"
          className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 font-bold transition-colors"
        >
          <span>Quay Vòng May Mắn</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
