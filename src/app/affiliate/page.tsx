'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import type { AffiliateSummary } from '@/types/affiliate';
import SavedPayoutAccountsModal, { PayoutAccount } from '@/components/wallet/SavedPayoutAccountsModal';
import {
  VIETNAM_BANKS,
  findBankByCode,
  calculateWithdrawalFee,
  normalizeAccountHolderName,
} from '@/lib/constants/vietnam-banks';
import {
  Users,
  Gift,
  Copy,
  Check,
  Wallet,
  Sparkles,
  ShieldCheck,
  Clock,
  Share2,
  Info,
  ArrowRightLeft,
  Landmark,
  Send,
  BookOpen,
  UserCheck,
  AlertCircle,
  QrCode,
} from 'lucide-react';

export default function AffiliatePage() {
  const { user, profile, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [data, setData] = useState<AffiliateSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Referral binding states
  const [inputReferralCode, setInputReferralCode] = useState('');
  const [bindBusy, setBindBusy] = useState(false);
  const [bindMsg, setBindMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Withdrawal modal and action states
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [withdrawMode, setWithdrawMode] = useState<'wallet' | 'bank'>('wallet');
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);

  // Option 1: Transfer to wallet states
  const [walletTransferAmount, setWalletTransferAmount] = useState('');

  // Option 2: Bank / E-Wallet withdrawal states
  const [bankWithdrawAmount, setBankWithdrawAmount] = useState('');
  const [selectedBankCode, setSelectedBankCode] = useState('VCB');
  const [bankAccount, setBankAccount] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [contact, setContact] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [selectedSavedAccountId, setSelectedSavedAccountId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAffiliateData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/affiliate');
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setErrorMsg(json.error || 'Không thể tải thông tin giới thiệu.');
      }
    } catch (err: any) {
      setErrorMsg('Lỗi kết nối máy chủ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAffiliateData();
  }, [user]);

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
  };

  const formatVNTimestamp = (raw?: string | null): string => {
    if (!raw) return 'Vừa nhận';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return 'Vừa nhận';
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  };

  const referralCode =
    data?.referralCode || (profile as any)?.referralCode || (user as any)?.referralCode || 'YUKIVIP';

  const originUrl =
    mounted && typeof window !== 'undefined'
      ? window.location.origin
      : 'https://yukishopmxh.com';

  const referralLink = data?.referralLink || `${originUrl}/register?ref=${referralCode}`;

  const commissionPercent = Math.round((data?.commissionRate ?? 0.05) * 100);
  const affiliateBalance = Number(
    data?.affiliateBalance ?? (profile as any)?.affiliateBalance ?? (user as any)?.affiliateBalance ?? 0
  );

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {}
  };

  // Handle manual referral code binding
  const handleBindReferrer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputReferralCode.trim()) return;

    setBindBusy(true);
    setBindMsg(null);
    try {
      const res = await fetch('/api/affiliate/bind-referrer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inputReferralCode.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setBindMsg({ type: 'err', text: json.error || 'Gắn mã giới thiệu thất bại.' });
      } else {
        setBindMsg({ type: 'ok', text: json.message || 'Gắn mã giới thiệu thành công!' });
        setInputReferralCode('');
        await refreshUserData();
        fetchAffiliateData();
      }
    } catch (err: any) {
      setBindMsg({ type: 'err', text: err.message || 'Lỗi mạng khi gắn mã.' });
    } finally {
      setBindBusy(false);
    }
  };

  // Option 1: Transfer to Shop Wallet (Min 50k, Fee 0đ)
  const handleTransferToWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(walletTransferAmount || affiliateBalance);
    if (!amt || amt < 50000) {
      setActionMsg({ type: 'err', text: 'Số tiền chuyển về Ví tối thiểu là 50.000đ.' });
      return;
    }
    if (amt > affiliateBalance) {
      setActionMsg({ type: 'err', text: 'Số tiền chuyển vượt quá số dư hoa hồng khả dụng.' });
      return;
    }

    setActionBusy(true);
    setActionMsg(null);
    try {
      const res = await fetch('/api/affiliate/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transfer_to_wallet',
          amount: amt,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setActionMsg({ type: 'err', text: json.error || 'Chuyển ví thất bại.' });
      } else {
        setActionMsg({ type: 'ok', text: json.message || 'Đã chuyển hoa hồng vào Ví mua hàng thành công (Phí 0đ)!' });
        setWalletTransferAmount('');
        await refreshUserData();
        fetchAffiliateData();
      }
    } catch {
      setActionMsg({ type: 'err', text: 'Lỗi kết nối khi chuyển hoa hồng.' });
    } finally {
      setActionBusy(false);
    }
  };

  // Option 2: Bank Withdrawal (Min 100k, Fee 2k/5k)
  const selectedBank = useMemo(() => findBankByCode(selectedBankCode), [selectedBankCode]);
  const withdrawalFee = useMemo(
    () => calculateWithdrawalFee(selectedBankCode, Boolean(qrCodeUrl)),
    [selectedBankCode, qrCodeUrl]
  );

  const withdrawAmtNumber = Number(bankWithdrawAmount || 0);
  const netWithdrawAmount = Math.max(0, withdrawAmtNumber - withdrawalFee);

  const handleWithdrawBank = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(bankWithdrawAmount || 0);
    if (!amt || amt < 100000) {
      setActionMsg({ type: 'err', text: 'Số tiền rút tối thiểu về Ngân hàng / Ví là 100.000đ.' });
      return;
    }
    if (amt > affiliateBalance) {
      setActionMsg({ type: 'err', text: 'Số tiền rút vượt quá số dư hoa hồng khả dụng.' });
      return;
    }

    const cleanHolder = normalizeAccountHolderName(accountHolder);
    if (!cleanHolder) {
      setActionMsg({ type: 'err', text: 'Vui lòng nhập tên chủ tài khoản in hoa không dấu.' });
      return;
    }

    setActionBusy(true);
    setActionMsg(null);
    try {
      const res = await fetch('/api/affiliate/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'withdraw_telegram',
          amount: amt,
          bankCode: selectedBankCode,
          bankName: selectedBank?.shortName || selectedBankCode,
          bankAccount: bankAccount.trim(),
          accountHolder: cleanHolder,
          contact: contact.trim(),
          qrCodeUrl: qrCodeUrl.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setActionMsg({ type: 'err', text: json.error || 'Gửi yêu cầu rút thất bại.' });
      } else {
        setActionMsg({
          type: 'ok',
          text: json.message || 'Đã gửi yêu cầu rút tiền thành công tới Admin qua Telegram!',
        });
        setBankWithdrawAmount('');
        await refreshUserData();
        fetchAffiliateData();
      }
    } catch {
      setActionMsg({ type: 'err', text: 'Lỗi kết nối máy chủ.' });
    } finally {
      setActionBusy(false);
    }
  };

  // When user selects a saved account from the modal
  const handleSelectSavedAccount = (acc: PayoutAccount) => {
    setSelectedSavedAccountId(acc.id);
    setSelectedBankCode(acc.bankCode);
    setBankAccount(acc.accountNumber);
    setAccountHolder(acc.accountHolder);
    if (acc.contact) setContact(acc.contact);
    if (acc.qrCodeUrl) setQrCodeUrl(acc.qrCodeUrl);
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setActionMsg({ type: 'err', text: 'Kích thước ảnh QR tối đa 2MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setQrCodeUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const isReferred = Boolean(
    data?.referredBy || (profile as any)?.referredBy || (user as any)?.referredBy
  );
  const referredByDisplay =
    data?.referredByUsername || (profile as any)?.referredBy || (user as any)?.referredBy;

  return (
    <div className="space-y-6 sm:space-y-8 py-2 sm:py-4 max-w-5xl mx-auto px-3 sm:px-4 text-slate-100">
      {/* 1. Header Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl liquid-glass-card glass-refraction p-6 sm:p-8">
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-[#0EA5E9]/12 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-xs font-bold uppercase tracking-wider">
              <Gift className="w-3.5 h-3.5 text-sky-400" />
              <span>Chương Trình Đối Tác &amp; Affiliate Yuki</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
              Kiếm Tiền Cùng <span className="text-cyan-400">YUKISHOPMXH</span>
              <br />
              Nhận Hoa Hồng <span className="text-emerald-400 font-mono tabular-nums">{commissionPercent}%</span> Trọn Đời
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Mời bạn bè đăng ký và nạp tiền để nhận ngay{' '}
              <strong className="text-emerald-400 tabular-nums">{commissionPercent}%</strong> hoa hồng tự động. Rút về Ví mua hàng (từ 50.000đ - Phí 0đ) hoặc rút tiền mặt qua STK / Ví điện tử (từ 100.000đ - Phí 2k/5k).
            </p>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-sky-200/90">
              <div className="inline-flex items-center gap-1.5 bg-sky-500/10 border border-sky-400/20 px-2.5 py-1 rounded-lg">
                <Check className="w-3 h-3 text-cyan-400" />
                <span>Chuyển Ví: Tối thiểu 50.000đ (0đ phí)</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-400/20 px-2.5 py-1 rounded-lg text-emerald-300">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Rút Tiền Mặt: Tối thiểu 100.000đ (Phí 2k/5k)</span>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-center justify-center p-5 rounded-2xl bg-[#07090E]/85 border border-white/[0.1] shadow-xl text-center min-w-[170px]">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tỷ Lệ Thưởng</span>
            <span className="text-4xl sm:text-5xl font-black font-mono tabular-nums text-sky-400 mt-1">
              {commissionPercent}.0%
            </span>
            <span className="text-[11px] text-emerald-400 font-semibold mt-1">Tự Động &amp; Trọn Đời</span>
          </div>
        </div>
      </div>

      {/* 2. Referral Link & Code Box (If Logged In) */}
      {user ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          {/* Link Box (7 cols) */}
          <div className="md:col-span-7 rounded-2xl border border-slate-800 bg-[#07090E]/90 p-5 shadow-lg space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-cyan-400" />
                  <span>Link Giới Thiệu Của Bạn</span>
                </h2>
                <span className="text-[11px] text-slate-400">Click để sao chép nhanh</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-cyan-300 focus:outline-none"
                />
                <Button
                  onClick={handleCopyLink}
                  className="shrink-0 min-h-[42px] px-4 rounded-xl bg-white hover:bg-slate-200 font-bold text-slate-950 text-xs flex items-center gap-1.5 shadow transition"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-700" />
                      <span>Đã Chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-950" />
                      <span>Copy Link</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>Mã giới thiệu riêng:</span>
                <span className="font-mono font-black text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  {referralCode}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="text-cyan-400 hover:text-cyan-300 font-semibold text-xs flex items-center gap-1 transition"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Đã chép mã' : 'Copy mã'}</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Box (5 cols) */}
          <div className="md:col-span-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl liquid-glass-card p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Bạn Bè Đã Giới Thiệu</span>
                <Users className="w-4 h-4 text-sky-400" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black font-mono tabular-nums text-white">
                  {data?.totalReferred || 0}
                </span>
                <span className="text-xs text-slate-400 ml-1">thành viên</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Tổng đã nhận: <span className="font-mono font-semibold text-slate-200">{formatVND(data?.totalEarnings || 0)}</span>
              </p>
            </div>

            <div className="rounded-2xl liquid-glass-card p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Số Dư Hoa Hồng</span>
                <Wallet className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2">
                <span className="text-xl sm:text-2xl font-black font-mono tabular-nums text-emerald-400">
                  {formatVND(affiliateBalance)}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Khả dụng để rút hoặc chuyển ví</p>
            </div>
          </div>
        </div>
      ) : (
        /* Not logged in CTA */
        <div className="rounded-2xl liquid-glass-card p-6 text-center space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-white">
            Đăng nhập để lấy Link giới thiệu và bắt đầu nhận hoa hồng {commissionPercent}%
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Hệ thống tự động kích hoạt mã giới thiệu độc quyền cho tài khoản của bạn ngay khi đăng nhập.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/login">
              <Button className="rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs px-5 py-2.5">
                Đăng Nhập Ngay
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" className="rounded-xl border-slate-700 text-xs px-5 py-2.5">
                Tạo Tài Khoản
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 3. Manual Referral Binding Card (If Logged In) */}
      {user && (
        <div className="rounded-2xl bg-[#090D16] border border-white/[0.08] p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  Người Giới Thiệu Của Bạn
                </h3>
              </div>
              <p className="text-xs text-slate-400 max-w-xl">
                {isReferred
                  ? 'Tài khoản của bạn đã được gắn cố định với người giới thiệu dưới đây.'
                  : 'Nếu bạn được bạn bè mời nhưng chưa đăng ký qua link, hãy nhập mã hoặc username của họ tại đây.'}
              </p>
            </div>

            {isReferred ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Đã liên kết với: <strong className="font-mono text-white">@{referredByDisplay}</strong></span>
              </div>
            ) : (
              <form onSubmit={handleBindReferrer} className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  required
                  placeholder="Nhập mã giới thiệu hoặc username..."
                  value={inputReferralCode}
                  onChange={(e) => setInputReferralCode(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/[0.12] text-white focus:outline-none focus:border-cyan-500/80 w-full sm:w-60 font-mono"
                />
                <button
                  type="submit"
                  disabled={bindBusy || !inputReferralCode.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black text-xs font-bold shrink-0 transition"
                >
                  {bindBusy ? 'Đang lưu...' : 'Liên Kết'}
                </button>
              </form>
            )}
          </div>

          {bindMsg && (
            <div
              className={`mt-3 p-2.5 rounded-xl text-xs font-medium border ${
                bindMsg.type === 'ok'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {bindMsg.text}
            </div>
          )}
        </div>
      )}

      {/* 4. WITHDRAWAL & TRANSFER CONTROL CENTER (2 DISTINCT OPTIONS) */}
      {user && (
        <div className="rounded-3xl border border-white/[0.08] bg-[#07090E]/95 p-5 sm:p-7 shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Landmark className="w-5 h-5 text-cyan-400" />
                <span>Rút Tiền &amp; Chuyển Hoa Hồng CTV</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Số dư hoa hồng hiện có:{' '}
                <strong className="text-emerald-400 font-mono tabular-nums text-sm">
                  {formatVND(affiliateBalance)}
                </strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAccountsModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.1] text-xs font-semibold text-cyan-300 flex items-center gap-1.5 transition"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Sổ Lưu Tài Khoản ({data?.totalReferred !== undefined ? 'Quản lý' : ''})</span>
              </button>
            </div>
          </div>

          {/* Action notification message */}
          {actionMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold border flex items-center gap-2 ${
                actionMsg.type === 'ok'
                  ? 'bg-emerald-500/12 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/12 border-rose-500/30 text-rose-300'
              }`}
            >
              {actionMsg.type === 'ok' ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{actionMsg.text}</span>
            </div>
          )}

          {/* Tabs selector */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/40 border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setWithdrawMode('wallet')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                withdrawMode === 'wallet'
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Chuyển Sang Ví Mua Hàng (Phí 0đ)</span>
            </button>
            <button
              type="button"
              onClick={() => setWithdrawMode('bank')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                withdrawMode === 'bank'
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Landmark className="w-4 h-4" />
              <span>Rút Về Ngân Hàng / Ví (Phí 2k/5k)</span>
            </button>
          </div>

          {/* TAB 1: TRANSFER TO SHOP WALLET */}
          {withdrawMode === 'wallet' && (
            <form onSubmit={handleTransferToWallet} className="space-y-4 pt-2">
              <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white">Chuyển Tiền Tức Thì Sang Ví Mua Hàng</span>
                  <p className="text-[11px] text-slate-300">
                    Cộng thẳng vào số dư Ví shop để mua tài khoản Netflix, Spotify, Canva, AI hoặc buff đơn ngay.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                    MIỄN PHÍ 100%
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Tối thiểu: 50.000đ</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Số tiền muốn chuyển (VNĐ)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={50000}
                    max={affiliateBalance}
                    placeholder="Nhập số tiền (tối thiểu 50.000đ)..."
                    value={walletTransferAmount}
                    onChange={(e) => setWalletTransferAmount(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm rounded-xl bg-black/50 border border-white/[0.12] text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 pr-28"
                  />
                  <button
                    type="button"
                    onClick={() => setWalletTransferAmount(String(affiliateBalance))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold transition"
                  >
                    Chuyển Tất Cả
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={actionBusy || affiliateBalance < 50000}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-cyan-500/20"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>
                  {actionBusy
                    ? 'Đang xử lý...'
                    : affiliateBalance < 50000
                    ? 'Cần tối thiểu 50.000đ để chuyển ví'
                    : `Xác Nhận Chuyển +${new Intl.NumberFormat('vi-VN').format(Number(walletTransferAmount || affiliateBalance))}đ Vào Ví`}
                </span>
              </button>
            </form>
          )}

          {/* TAB 2: BANK / E-WALLET WITHDRAWAL */}
          {withdrawMode === 'bank' && (
            <form onSubmit={handleWithdrawBank} className="space-y-4 pt-2">
              <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white">Rút Tiền Mặt Về Tài Khoản Ngân Hàng / Ví</span>
                  <p className="text-[11px] text-slate-300">
                    Duyệt tự động hoặc liên hệ bot Telegram. Hỗ trợ 40+ ngân hàng Napas 24/7 và ví điện tử.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold">
                    Tối thiểu: 100.000đ
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAccountsModalOpen(true)}
                    className="text-xs text-cyan-400 hover:underline font-semibold"
                  >
                    Chọn từ Sổ Lưu
                  </button>
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Số tiền muốn rút (VNĐ) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={100000}
                    max={affiliateBalance}
                    placeholder="Nhập số tiền muốn rút (tối thiểu 100.000đ)..."
                    value={bankWithdrawAmount}
                    onChange={(e) => setBankWithdrawAmount(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm rounded-xl bg-black/50 border border-white/[0.12] text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 pr-24"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setBankWithdrawAmount(String(affiliateBalance))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold transition"
                  >
                    Rút Tối Đa
                  </button>
                </div>
              </div>

              {/* Bank selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Ngân Hàng / Ví Điện Tử <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={selectedBankCode}
                    onChange={(e) => setSelectedBankCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#0F172A] border border-white/[0.12] text-white focus:outline-none focus:border-cyan-500/80"
                  >
                    {VIETNAM_BANKS.map((b) => (
                      <option key={b.code} value={b.code} className="bg-[#0F172A] text-white">
                        {b.shortName} - {b.name} ({b.withdrawalFee === 5000 ? 'Phí 5k' : 'Phí 2k'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Số Tài Khoản / SĐT Ví <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 0987654321..."
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/[0.12] text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500/80"
                  />
                </div>
              </div>

              {/* Account holder and contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tên Chủ Tài Khoản (In hoa không dấu) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: NGUYEN VAN A"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(normalizeAccountHolderName(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/[0.12] text-white uppercase placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Số Zalo hoặc Telegram Liên Hệ
                  </label>
                  <input
                    type="text"
                    placeholder="Zalo SĐT hoặc @username Telegram"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/[0.12] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/80"
                  />
                </div>
              </div>

              {/* QR Upload optional */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Đính kèm Ảnh Mã QR Nhận Tiền (Tùy chọn)
                </label>
                <div className="flex items-center gap-3">
                  <label className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-slate-200 cursor-pointer transition flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{qrCodeUrl ? 'Thay đổi ảnh QR' : 'Tải lên mã QR...'}</span>
                    <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
                  </label>
                  {qrCodeUrl && (
                    <button
                      type="button"
                      onClick={() => setQrCodeUrl('')}
                      className="text-xs text-rose-400 hover:underline"
                    >
                      Bỏ ảnh
                    </button>
                  )}
                </div>
              </div>

              {/* LIVE SUMMARY / FEE CALCULATION BOX */}
              <div className="p-4 rounded-2xl bg-black/60 border border-cyan-500/20 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Chi Tiết Giao Dịch Rút Tiền
                </span>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[11px] text-slate-400">Số tiền rút</span>
                    <p className="text-sm font-bold text-white font-mono mt-0.5">
                      {formatVND(withdrawAmtNumber)}
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[11px] text-slate-400">Phí giao dịch</span>
                    <p className="text-sm font-bold text-amber-300 font-mono mt-0.5">
                      {formatVND(withdrawalFee)}
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-[11px] text-emerald-300">THỰC NHẬN</span>
                    <p className="text-sm font-black text-emerald-400 font-mono mt-0.5">
                      {formatVND(netWithdrawAmount)}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={actionBusy || affiliateBalance < 100000 || withdrawAmtNumber < 100000}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-cyan-500/20"
              >
                <Send className="w-4 h-4" />
                <span>
                  {actionBusy
                    ? 'Đang gửi yêu cầu...'
                    : affiliateBalance < 100000
                    ? 'Cần tối thiểu 100.000đ để rút về Ngân hàng'
                    : `Xác Nhận Rút ${formatVND(withdrawAmtNumber)} (Thực nhận ${formatVND(netWithdrawAmount)})`}
                </span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* 5. 3-Step Guide */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 space-y-4">
        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>3 Bước Đơn Giản Nhận Hoa Hồng Trọn Đời</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="text-sm font-bold text-slate-200">Chia sẻ Link Mời</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Gửi link mời riêng hoặc mã giới thiệu của bạn cho bạn bè, khách hàng trên Facebook, Zalo, Telegram.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h3 className="text-sm font-bold text-slate-200">Bạn Bè Nạp Tiền</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bạn bè bấm link đăng ký và nạp tiền vào ví qua VietQR tự động 24/7 để mua tài khoản hoặc dịch vụ.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h3 className="text-sm font-bold text-slate-200">Nhận {commissionPercent}% Hoa Hồng</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hệ thống tự động cộng {commissionPercent}% giá trị nạp vào ví Affiliate ngay lập tức. Rút tiền minh bạch 24/7!
            </p>
          </div>
        </div>
      </div>

      {/* 6. Referral Commission History */}
      {user && (
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Lịch Sử Hoa Hồng Gần Đây</span>
            </h2>
            <span className="text-xs text-slate-400">20 giao dịch mới nhất</span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Đang tải lịch sử...</div>
          ) : !data?.recentLogs || data.recentLogs.length === 0 ? (
            <div className="py-10 text-center rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-xs text-slate-400">
              Chưa có giao dịch hoa hồng nào. Hãy chia sẻ link mời để bắt đầu nhận thưởng!
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{log.referee_email}</span>
                      <span className="text-[10px] text-slate-400">nạp {formatVND(log.deposit_amount)}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">{formatVNTimestamp(log.created_at)}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold font-mono text-emerald-400 tabular-nums">
                      +{formatVND(log.commission_amount)}
                    </span>
                    <div className="text-[10px] text-emerald-400 font-medium">Hoa hồng 5%</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Saved Payout Accounts Modal */}
      <SavedPayoutAccountsModal
        isOpen={isAccountsModalOpen}
        onClose={() => setIsAccountsModalOpen(false)}
        onSelectAccount={handleSelectSavedAccount}
      />
    </div>
  );
}
