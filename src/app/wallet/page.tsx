'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DigitalWalletCard } from '@/components/common/digital-wallet-card';
import { SkeletonTable } from '@/components/common/skeleton-shimmer';
import { calculateVipTier } from '@/lib/vip-tier';
import { TopDepositorsCard } from '@/components/wallet/TopDepositorsCard';
import { ADMIN_TELEGRAM_URL, ADMIN_SUPPORT_LABEL } from '@/lib/constants';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  QrCode,
  Copy,
  CheckCircle2,
  RefreshCw,
  Download,
  AlertTriangle,
  Send,
  Check,
  XCircle,
  ExternalLink,
  Landmark,
  BookOpen,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import SavedPayoutAccountsModal from '@/components/wallet/SavedPayoutAccountsModal';

function WalletContent() {
  const searchParams = useSearchParams();
  const amountParam = searchParams.get('amount');

  const { user, profile, wallet, lifetimeDeposit, refreshUserData } = useAuth();
  const [topupAmount, setTopupAmount] = useState<number>(50000);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [inlineQrOpen, setInlineQrOpen] = useState(false);
  const [referenceCode, setReferenceCode] = useState('');
  const [sequenceNumber, setSequenceNumber] = useState<number | null>(null);
  const [qrAmount, setQrAmount] = useState<number>(50000);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [confirmNotice, setConfirmNotice] = useState<string | null>(null);
  const [isDepositSuccess, setIsDepositSuccess] = useState(false);
  const [redeemingPoints, setRedeemingPoints] = useState(false);
  const [redeemNotice, setRedeemNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [mountedOrigin, setMountedOrigin] = useState('');
  const [spinState, setSpinState] = useState<{
    spinTickets: number;
    depositSpinProgress: number;
    withdrawableBalance: number;
  }>({
    spinTickets: 0,
    depositSpinProgress: 0,
    withdrawableBalance: 0,
  });
  const autoTriggeredRef = useRef(false);

  useEffect(() => {
    setMountedOrigin(window.location.origin);
  }, []);

  const formatVND = (amount: number) =>
    new Intl.NumberFormat('vi-VN').format(amount) + ' VNĐ';

  const formatVNTimestamp = (raw?: string | null): string => {
    if (!raw) return 'Vừa tạo';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return 'Vừa tạo';
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(parsed);
  };

  const [ledger, setLedger] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(true);

  const fetchLedger = useCallback(async () => {
    if (!user) {
      setLoadingLedger(false);
      return;
    }
    setLoadingLedger(true);
    try {
      const res = await fetch('/api/wallet/transactions', { cache: 'no-store' });
      const data = await res.json();
      if (data && Array.isArray(data.transactions)) {
        setLedger(data.transactions);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingLedger(false);
    }
  }, [user]);

  const fetchSpinState = useCallback(async () => {
    try {
      const res = await fetch('/api/spin/state', { cache: 'no-store' });
      const data = await res.json();
      if (data && data.success) {
        setSpinState({
          spinTickets: data.spinTickets || 0,
          depositSpinProgress: data.depositSpinProgress || 0,
          withdrawableBalance: data.withdrawableBalance || 0,
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchLedger();
    fetchSpinState();
  }, [fetchLedger, fetchSpinState]);

  // Smart Pre-fill & Auto-QR from ?amount=...
  const triggerTopupRequest = useCallback(
    async (amt: number) => {
      if (amt < 10000 || amt > 2000000) {
        setErrorMessage('Hạn mức nạp tiền từ 10.000 VNĐ đến 2.000.000 VNĐ cho mỗi lần tạo đơn.');
        return;
      }
      setIsGenerating(true);
      setIsDepositSuccess(false);
      setConfirmNotice(null);
      try {
        const res = await fetch('/api/wallet/topup/request', {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: amt }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error?.message || 'Không thể tạo mã nạp tiền. Vui lòng đăng nhập và thử lại.');
        }
        setReferenceCode(data.data.referenceCode);
        setSequenceNumber(data.data.sequenceNumber ?? data.data.orderNumber ?? null);
        setQrAmount(Number(data.data.amount || amt));
        setInlineQrOpen(true);
        fetchLedger();
        setTimeout(() => {
          document.getElementById('inline-deposit-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } catch (err: any) {
        setErrorMessage(err.message || 'Lỗi khi tạo đơn nạp.');
      } finally {
        setIsGenerating(false);
      }
    },
    [fetchLedger]
  );

  useEffect(() => {
    if (!amountParam) return;
    const parsed = Number(amountParam);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const normalized = Math.min(2000000, Math.max(10000, Math.ceil(parsed / 1000) * 1000));
    setTopupAmount(normalized);

    if (user && !autoTriggeredRef.current) {
      autoTriggeredRef.current = true;
      triggerTopupRequest(normalized);
    }
  }, [amountParam, user, triggerTopupRequest]);

  // Real-time Polling every 3s for deposit completion
  useEffect(() => {
    if (!inlineQrOpen || !referenceCode || isDepositSuccess) return;
    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/wallet/topup/status?code=${encodeURIComponent(referenceCode)}`, { cache: 'no-store' });
        const data = await res.json();
        if (isMounted && data.success && data.status === 'completed') {
          setIsDepositSuccess(true);
          setConfirmNotice(null);
          refreshUserData();
          fetchLedger();
        }
      } catch {}
    }, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [inlineQrOpen, referenceCode, isDepositSuccess, refreshUserData, fetchLedger]);

  // Automatically sync a fresh sequential deposit order code + QR whenever amount changes
  useEffect(() => {
    if (!inlineQrOpen || isDepositSuccess || isGenerating) return;
    if (!Number.isFinite(topupAmount) || topupAmount < 10000 || topupAmount > 2000000) return;
    if (topupAmount === qrAmount) return;

    const timer = setTimeout(() => {
      triggerTopupRequest(topupAmount);
    }, 450);
    return () => clearTimeout(timer);
  }, [topupAmount, qrAmount, inlineQrOpen, isDepositSuccess, isGenerating, triggerTopupRequest]);

  const handleGenerateQR = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    await triggerTopupRequest(topupAmount);
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleConfirmTopup = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/deposits/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceCode, amount: qrAmount }),
      });
      const json = await res.json().catch(() => ({}));
      if (json?.alreadyApproved) {
        setIsDepositSuccess(true);
        refreshUserData();
        fetchLedger();
        return;
      }
      setConfirmNotice(json?.message || 'Đã gửi yêu cầu xác nhận. Vui lòng chờ Admin duyệt.');
      fetchLedger();
    } catch {
      setConfirmNotice('Đã gửi yêu cầu xác nhận. Vui lòng chờ Admin duyệt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelTopup = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch('/api/wallet/topup/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceCode }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setErrorMessage(json?.error?.message || 'Không thể hủy đơn nạp lúc này.');
        return;
      }
      setInlineQrOpen(false);
      setConfirmNotice(null);
      setIsDepositSuccess(false);
      fetchLedger();
    } catch {
      setErrorMessage('Lỗi kết nối khi hủy đơn nạp.');
    } finally {
      setIsCancelling(false);
    }
  };

  const quickPresets = [20000, 50000, 100000, 200000, 500000, 1000000, 2000000];
  const vipInfo = calculateVipTier(lifetimeDeposit);

  const handleRedeemPoints = async () => {
    setRedeemingPoints(true);
    setRedeemNotice(null);
    try {
      const res = await fetch('/api/wallet/redeem-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setRedeemNotice({ type: 'err', text: data.error || 'Không thể quy đổi điểm thưởng.' });
      } else {
        setRedeemNotice({ type: 'ok', text: data.message || 'Đã quy đổi điểm vào ví!' });
        await refreshUserData();
        fetchLedger();
      }
    } catch {
      setRedeemNotice({ type: 'err', text: 'Lỗi kết nối khi đổi điểm thưởng.' });
    } finally {
      setRedeemingPoints(false);
    }
  };

  const refCodeForCard = (profile as any)?.referralCode || 'YUKIVIP';
  const refLinkForCard = mountedOrigin
    ? `${mountedOrigin}/register?ref=${refCodeForCard}`
    : `/register?ref=${refCodeForCard}`;

  return (
    <div className="space-y-6 py-2 max-w-5xl mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-sky-200/[0.08]">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black font-display tracking-tight text-white flex flex-wrap items-center gap-2">
            <Wallet className="w-6 h-6 text-[#0EA5E9]" strokeWidth={1.75} />
            <span>Ví Tiền &amp; Nạp VietQR</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>MacroDroid Auto 24/7</span>
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Đối soát nạp ví tự động qua MacroDroid &amp; lưu vết biến động số dư trước – sau minh bạch.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPayoutModalOpen(true)}
            className="btn-ios-secondary gap-1.5 text-xs text-cyan-300"
          >
            <Landmark className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sổ Tài Khoản</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refreshUserData();
              fetchLedger();
            }}
            className="btn-ios-secondary gap-1.5 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Làm mới số dư</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <DigitalWalletCard
            balance={wallet?.balance || 0}
            userName={profile?.fullName || user?.email?.split('@')[0] || 'Thành viên'}
            userContact={profile?.telegramId ? `@${profile.telegramId.replace('@', '')}` : (profile?.phone || 'YUKI-WALLET')}
            compact={false}
            vipName={vipInfo.name}
            vipDiscountPercent={vipInfo.discountPercent}
            cashbackPoints={Number((profile as any)?.cashbackPoints || 0)}
            affiliateBalance={Number((profile as any)?.affiliateBalance || 0)}
            spinTickets={spinState.spinTickets}
            withdrawableBalance={spinState.withdrawableBalance}
            referralLink={refLinkForCard}
            onRedeemPoints={handleRedeemPoints}
            redeemingPoints={redeemingPoints}
          />

          {redeemNotice && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold ${
                redeemNotice.type === 'ok'
                  ? 'bg-emerald-500/12 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/12 border-red-500/30 text-red-300'
              }`}
            >
              {redeemNotice.text}
            </div>
          )}

          {/* Topup Form */}
          <Card className="border-sky-200/[0.1] bg-[#0D1526]/90 backdrop-blur-xl">
            <CardHeader className="pb-3 space-y-3">
              <CardTitle className="text-base flex items-center gap-2 font-display text-white">
                <QrCode className="w-4 h-4 text-[#0EA5E9]" />
                <span>Nạp Tiền Vào Ví Qua QR</span>
              </CardTitle>

              {/* Tích Hợp Tiến Độ Nhận Vé Quay Tinh Gọn Ngay Trên Form Nạp (Không Lặp Thẻ) */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/[0.1] via-yellow-500/[0.05] to-transparent border border-amber-400/25 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-white text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Nạp Tích Vé Lucky Spin (+1 vé / 100k)</span>
                  </span>
                  <Link
                    href="/spin"
                    className="text-[10px] font-black text-amber-300 hover:text-amber-200 flex items-center gap-0.5 shrink-0"
                  >
                    <span>Quay ngay ({spinState.spinTickets} vé)</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="w-full h-1.5 rounded-full bg-black/60 border border-amber-400/20 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((spinState.depositSpinProgress / 100000) * 100))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Đã nạp: <strong className="text-amber-300">{new Intl.NumberFormat('vi-VN').format(spinState.depositSpinProgress)}đ</strong> / 100k</span>
                  <span>Cần thêm: <strong className="text-white">{new Intl.NumberFormat('vi-VN').format(Math.max(0, 100000 - spinState.depositSpinProgress))}đ</strong></span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerateQR} className="space-y-4">
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs text-slate-300 font-semibold mb-1.5 block">
                    Số tiền muốn nạp (10.000đ – 2.000.000đ)
                  </label>
                  <input
                    type="number"
                    min={10000}
                    max={2000000}
                    step={1000}
                    value={topupAmount}
                    onChange={(e) => {
                      setTopupAmount(Number(e.target.value));
                      if (errorMessage) setErrorMessage(null);
                    }}
                    required
                    className="w-full h-11 px-3.5 rounded-xl bg-[#060B16] border border-sky-200/[0.12] text-white text-base font-mono tabular-nums focus:border-[#0EA5E9] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {quickPresets.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setTopupAmount(amt);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      className={`h-10 px-2 rounded-xl text-xs font-mono tabular-nums border transition font-bold ${
                        topupAmount === amt
                          ? 'bg-sky-500/20 border-[#0EA5E9] text-sky-200'
                          : 'bg-[#060B16]/80 border-sky-200/[0.1] hover:border-sky-400/35 text-slate-300'
                      }`}
                    >
                      +{new Intl.NumberFormat('vi-VN').format(amt)}đ
                    </button>
                  ))}
                </div>

                <Button
                  type="submit"
                  isLoading={isGenerating}
                  className="w-full h-11 gap-2 font-bold text-xs btn-ios-blue rounded-xl"
                >
                  <QrCode className="w-4 h-4" strokeWidth={1.75} />
                  <span>{isGenerating ? 'Đang tạo mã nạp...' : 'Tạo Mã ZaloPay VietQR'}</span>
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Inline QR Card */}
          {inlineQrOpen && (
            <div
              id="inline-deposit-section"
              className="p-5 rounded-2xl bg-[#0D1526]/95 border border-sky-400/25 shadow-2xl space-y-4 text-center"
            >
              <div className="flex items-center justify-between pb-3 border-b border-sky-200/[0.08]">
                <div className="text-left">
                  <div className="text-sm font-bold text-white">
                    Mã Nạp ZaloPay VietQR {sequenceNumber ? `(Đơn #${sequenceNumber})` : ''}
                  </div>
                  <p className="text-[11px] text-slate-400">Quét mã hoặc chuyển đúng nội dung bên dưới</p>
                </div>
                {!isDepositSuccess && (
                  <button
                    type="button"
                    onClick={handleCancelTopup}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 transition"
                    title="Đóng đơn nạp"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                )}
              </div>

              {isDepositSuccess ? (
                <div className="p-5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <h3 className="text-base font-black text-white">Nạp Tiền Thành Công</h3>
                  <p className="text-base font-bold font-mono tabular-nums text-emerald-300">
                    +{formatVND(qrAmount)}
                  </p>
                  <Button
                    type="button"
                    className="w-full h-10 btn-ios-blue rounded-xl text-xs"
                    onClick={() => {
                      setInlineQrOpen(false);
                      setIsDepositSuccess(false);
                      setConfirmNotice(null);
                    }}
                  >
                    Hoàn tất
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative p-3 bg-white rounded-2xl inline-block mx-auto shadow-2xl shadow-cyan-950/40 overflow-hidden group">
                    <div className="qr-laser-scanner" />
                    <img
                      src={`https://api.vietqr.io/image/970454-99ZP26265M78019191-compact2.png?amount=${qrAmount}&addInfo=${encodeURIComponent(referenceCode)}&accountName=ZALOPAY_NGUYEN%20THAI%20TU`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/images/zalopay_qr.jpg';
                      }}
                      alt="ZaloPay VietQR"
                      className="w-56 h-56 sm:w-64 sm:h-64 object-contain mx-auto rounded-xl"
                    />
                    <div className="mt-2 flex items-center justify-between px-1">
                      <span className="text-xs font-mono tabular-nums font-bold text-slate-900">
                        {formatVND(qrAmount)}
                      </span>
                      <a
                        href={`https://api.vietqr.io/image/970454-99ZP26265M78019191-compact2.png?amount=${qrAmount}&addInfo=${encodeURIComponent(referenceCode)}&accountName=ZALOPAY_NGUYEN%20THAI%20TU`}
                        download={`ZaloPay_QR_${referenceCode}.png`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-sky-600 flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Tải QR</span>
                      </a>
                    </div>
                  </div>

                  <div className="space-y-2 text-left bg-[#060B16] p-3.5 rounded-xl border border-sky-200/[0.08] text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-sky-200/[0.06]">
                      <span className="text-slate-400">STK ZaloPay:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-sky-300">99ZP26265M78019191</span>
                        <button type="button" onClick={() => handleCopy('99ZP26265M78019191', 'stk')} className="p-1 text-slate-400 hover:text-white">
                          {copiedField === 'stk' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b border-sky-200/[0.06]">
                      <span className="text-slate-400">Chủ TK:</span>
                      <span className="font-bold text-white">ZALOPAY_NGUYEN THAI TU</span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b border-sky-200/[0.06]">
                      <span className="text-slate-400">Số tiền:</span>
                      <span className="font-mono tabular-nums font-bold text-emerald-400">{formatVND(qrAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-amber-300 font-bold">Nội dung CK:</span>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <span className="font-mono font-bold text-sky-200 bg-sky-500/15 px-2.5 py-1 rounded-lg border border-sky-400/35">
                          {referenceCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(referenceCode, 'ref')}
                          className="px-2.5 py-1 rounded-lg btn-ios-secondary text-[11px]"
                        >
                          {copiedField === 'ref' ? 'Đã chép' : 'Copy'}
                        </button>
                        <button
                          type="button"
                          disabled={isGenerating}
                          onClick={() => triggerTopupRequest(topupAmount)}
                          className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/30 text-[11px] font-medium flex items-center gap-1 transition"
                          title="Đổi mã nạp tiền mới"
                        >
                          <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                          <span>Đổi mã mới</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {confirmNotice ? (
                    <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs text-left space-y-2">
                      <div className="font-bold">{confirmNotice}</div>
                      <Button type="button" className="w-full h-9 btn-ios-secondary text-xs" onClick={() => setInlineQrOpen(false)}>
                        Thu gọn
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-[44px] border-red-500/35 text-red-400 hover:bg-red-500/10 rounded-xl text-xs"
                        onClick={handleCancelTopup}
                        isLoading={isCancelling}
                      >
                        Hủy đơn
                      </Button>
                      <Button
                        type="button"
                        className="min-h-[44px] btn-ios-blue rounded-xl text-xs"
                        onClick={handleConfirmTopup}
                        isLoading={isSubmitting}
                      >
                        Tôi đã chuyển khoản
                      </Button>
                    </div>
                  )}

                  <a
                    href={ADMIN_TELEGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-9 rounded-xl btn-ios-secondary text-xs flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5 text-[#0EA5E9]" />
                    <span>{ADMIN_SUPPORT_LABEL}</span>
                  </a>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right Column (7 cols): Ledger + Top Depositors */}
        <div className="lg:col-span-7 space-y-6">
          {loadingLedger ? (
            <SkeletonTable rows={5} />
          ) : (
            <Card className="border-sky-200/[0.1] bg-[#0D1526]/90 backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-display text-white">
                    Lịch Sử Biến Động Số Dư
                  </CardTitle>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ghi nhận chuẩn số dư trước và sau mọi giao dịch.
                  </p>
                </div>
                <Badge variant="default" className="text-[10px]">Sổ cái</Badge>
              </CardHeader>
              <CardContent>
                {/* Mobile Cards */}
                <div className="block md:hidden space-y-2.5">
                  {ledger.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Chưa có giao dịch biến động số dư nào.
                    </div>
                  ) : (
                    ledger.map((tx) => {
                      const isCredit =
                        typeof tx.delta === 'number'
                          ? tx.delta >= 0
                          : ['TOPUP', 'DEPOSIT', 'REFUND', 'CASHBACK_REDEEM', 'AFFILIATE_TRANSFER'].includes(tx.type);
                      return (
                        <div
                          key={tx.id}
                          className="p-3.5 rounded-xl bg-[#060B16]/80 border border-sky-200/[0.08] space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isCredit ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                              {tx.type}
                            </span>
                            <span className={`font-mono tabular-nums font-bold text-sm ${isCredit ? 'text-emerald-400' : 'text-red-400'}`}>
                              {isCredit ? `+${formatVND(tx.amount)}` : `-${formatVND(tx.amount)}`}
                            </span>
                          </div>
                          <div className="text-xs text-slate-200">{tx.description || '-'}</div>
                          <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono tabular-nums pt-1 border-t border-sky-200/[0.06]">
                            <span>Trước: {formatVND(tx.balanceBefore || tx.balance_before || 0)}</span>
                            <span className="text-emerald-400">Sau: {formatVND(tx.balanceAfter || tx.balance_after || 0)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#060B16]/80 text-slate-400 uppercase tracking-wider border-b border-sky-200/[0.08]">
                      <tr>
                        <th className="p-3">Thời gian</th>
                        <th className="p-3">Loại</th>
                        <th className="p-3">Số tiền</th>
                        <th className="p-3">Trước</th>
                        <th className="p-3">Sau</th>
                        <th className="p-3">Nội dung</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-200/[0.06]">
                      {ledger.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400">
                            Chưa có giao dịch biến động số dư nào.
                          </td>
                        </tr>
                      ) : (
                        ledger.map((tx) => {
                          const isCredit =
                        typeof tx.delta === 'number'
                          ? tx.delta >= 0
                          : ['TOPUP', 'DEPOSIT', 'REFUND', 'CASHBACK_REDEEM', 'AFFILIATE_TRANSFER'].includes(tx.type);
                          return (
                            <tr key={tx.id} className="hover:bg-sky-500/[0.04] font-mono tabular-nums">
                              <td className="p-3 text-slate-400 whitespace-nowrap">
                                {formatVNTimestamp(tx.created_at || tx.date || tx.createdAt)}
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                {isCredit ? (
                                  <Badge variant="success" className="gap-1">
                                    <ArrowDownLeft className="w-3 h-3" /> {tx.type}
                                  </Badge>
                                ) : (
                                  <Badge variant="danger" className="gap-1">
                                    <ArrowUpRight className="w-3 h-3" /> {tx.type}
                                  </Badge>
                                )}
                              </td>
                              <td className={`p-3 font-bold ${isCredit ? 'text-emerald-400' : 'text-red-400'}`}>
                                {isCredit ? `+${formatVND(tx.amount)}` : `-${formatVND(tx.amount)}`}
                              </td>
                              <td className="p-3 text-slate-400">{formatVND(tx.balanceBefore || tx.balance_before || 0)}</td>
                              <td className="p-3 font-semibold text-white">{formatVND(tx.balanceAfter || tx.balance_after || 0)}</td>
                              <td className="p-3 font-sans text-slate-300">{tx.description || '-'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <TopDepositorsCard />
        </div>
      </div>

      <SavedPayoutAccountsModal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
      />
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Đang tải Ví tiền...</div>}>
      <WalletContent />
    </Suspense>
  );
}
