'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { calculateVipTier } from '@/lib/vip-tier';
import { DigitalWalletCard } from '@/components/common/digital-wallet-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  User,
  Wallet,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Gift,
  Copy,
  Check,
  Send,
  BookmarkPlus,
  Trash2,
  Landmark,
  BookOpen,
  UserCheck,
} from 'lucide-react';
import SavedPayoutAccountsModal from '@/components/wallet/SavedPayoutAccountsModal';

interface AffiliateStats {
  referralCode: string;
  referralLink: string;
  totalReferred: number;
  totalEarnings: number;
  commissionRate: number;
  recentLogs: Array<{
    id: string;
    deposit_amount: number;
    commission_amount: number;
    referee_email?: string;
    created_at: string;
  }>;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, role, wallet, lifetimeDeposit, refreshUserData, signOut, signOutAllDevices } = useAuth();
  const [signingOutAll, setSigningOutAll] = useState(false);
  const supabase = createClient();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [affStats, setAffStats] = useState<AffiliateStats | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Saved Profiles state
  const [presetLabel, setPresetLabel] = useState('');
  const [presetEmail, setPresetEmail] = useState('');
  const [presetSocial, setPresetSocial] = useState('');
  const [presetTelegram, setPresetTelegram] = useState('');
  const [presetNote, setPresetNote] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetNotice, setPresetNotice] = useState<string | null>(null);
  const [redeemingPoints, setRedeemingPoints] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState<string | null>(null);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [bindCode, setBindCode] = useState('');
  const [bindingReferrer, setBindingReferrer] = useState(false);
  const [bindReferrerMsg, setBindReferrerMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleBindReferrer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bindCode.trim()) return;
    setBindingReferrer(true);
    setBindReferrerMsg(null);
    try {
      const res = await fetch('/api/affiliate/bind-referrer', {
        cache: 'no-store',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: bindCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setBindReferrerMsg({ type: 'err', text: data.error || 'Gắn mã thất bại.' });
      } else {
        setBindReferrerMsg({ type: 'ok', text: data.message || 'Gắn mã giới thiệu thành công!' });
        setBindCode('');
        await refreshUserData();
      }
    } catch {
      setBindReferrerMsg({ type: 'err', text: 'Lỗi mạng khi gắn mã.' });
    } finally {
      setBindingReferrer(false);
    }
  };

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setPhoneNumber(profile.phoneNumber || '');
      setTelegramUsername((profile as any).telegramUsername || '');
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/affiliate', { cache: 'no-store', credentials: 'include' })
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && json.data) {
          setAffStats(json.data);
        }
      })
      .catch(() => {});
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      // ignore
    } finally {
      router.push('/login');
    }
  };

  const handleLogoutAllDevices = async () => {
    setSigningOutAll(true);
    try {
      await signOutAllDevices();
    } catch {
      setSigningOutAll(false);
    }
  };

  const formatVND = (amount: number) =>
    new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

  const handleCopyAffiliate = async () => {
    if (!affStats?.referralLink) return;
    try {
      await navigator.clipboard.writeText(affStats.referralLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);
    setIsSavingProfile(true);
    try {
      if (!user) {
        setProfileError('Vui lòng đăng nhập để cập nhật hồ sơ.');
        return;
      }
      const res = await fetch('/api/user/profile', {
        cache: 'no-store',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phone: phoneNumber,
          telegramId: telegramUsername,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setProfileError(data.error || 'Không thể lưu thay đổi hồ sơ.');
        return;
      }
      await refreshUserData();
      setProfileSuccess(data.message || 'Đã cập nhật thông tin hồ sơ thành công!');
    } catch (err: any) {
      setProfileError(err.message || 'Lỗi kết nối khi cập nhật hồ sơ.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPasswordError(data.error || 'Lỗi khi đổi mật khẩu.');
        return;
      }
      setPasswordSuccess(data.message || 'Đã cập nhật mật khẩu mới thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Lỗi không xác định khi đổi mật khẩu.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const vipInfo = calculateVipTier(lifetimeDeposit);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4 animate-page-enter">
        <div className="p-8 rounded-3xl bg-[#0D1526]/90 border border-sky-200/[0.1] space-y-4">
          <User className="w-10 h-10 text-[#0EA5E9] mx-auto" strokeWidth={1.75} />
          <h1 className="text-xl font-black text-white">Hồ Sơ Cá Nhân &amp; Affiliate</h1>
          <p className="text-xs text-slate-400">
            Đăng nhập để quản lý Digital Pass, điểm hoàn 2%, liên kết mời 5% hoa hồng và hồ sơ đặt nhanh.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Link href="/login" className="px-5 py-2.5 rounded-xl btn-ios-blue text-xs">
              Đăng Nhập
            </Link>
            <Link href="/register" className="px-5 py-2.5 rounded-xl btn-ios-secondary text-xs">
              Đăng Ký
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2 animate-page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-sky-200/[0.08]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
            Hồ Sơ &amp; Cài Đặt Tài Khoản
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Quản lý Digital Pass, hồ sơ đặt nhanh, hạng VIP, hoa hồng giới thiệu 5% và bảo mật mật khẩu.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={refreshUserData} className="btn-ios-secondary gap-1.5 text-xs self-start sm:self-auto">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Làm mới</span>
        </Button>
      </div>

      {/* Obsidian Digital Pass */}
      <DigitalWalletCard
        balance={wallet?.balance || 0}
        userName={profile?.fullName || user.email?.split('@')[0] || 'Thành viên'}
        userContact={user.email || (profile as any)?.telegramUsername || 'YUKI-PASS'}
        vipName={vipInfo.name}
        vipDiscountPercent={vipInfo.discountPercent}
        cashbackPoints={Number((profile as any)?.cashbackPoints || 0)}
        affiliateBalance={Number((profile as any)?.affiliateBalance || 0)}
        spinTickets={Number((profile as any)?.spinTickets || 0)}
        withdrawableBalance={Number((profile as any)?.withdrawableBalance || 0)}
        referralLink={affStats?.referralLink}
        redeemingPoints={redeemingPoints}
        onRedeemPoints={async () => {
          setRedeemingPoints(true);
          setRedeemMsg(null);
          try {
            const res = await fetch('/api/wallet/redeem-points', {
        cache: 'no-store',
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            });
            const data = await res.json();
            setRedeemMsg(data.message || data.error || null);
            if (res.ok && data.success) await refreshUserData();
          } finally {
            setRedeemingPoints(false);
          }
        }}
      />
      {redeemMsg && (
        <div className="p-3 rounded-xl bg-sky-500/12 border border-sky-400/25 text-xs font-semibold text-sky-200">
          {redeemMsg}
        </div>
      )}

      {/* Top iOS Settings Summary Card */}
      <div className="rounded-2xl liquid-glass-card divide-y divide-white/[0.08] overflow-hidden">
        <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#0EA5E9]/15 border border-sky-400/35 flex items-center justify-center font-black text-lg text-[#38BDF8] shrink-0">
              {(profile?.fullName || user.email || 'Y').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white truncate">
                  {profile?.fullName || user.email?.split('@')[0] || 'Thành viên'}
                </h2>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${vipInfo.badgeClass}`}>
                  {vipInfo.badge}
                </span>
              </div>
              <div className="text-xs text-slate-400 truncate font-mono mt-0.5">{user.email}</div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Số dư ví</div>
            <div className="text-lg font-black font-mono tabular-nums text-emerald-400">
              {formatVND(wallet?.balance || 0)}
            </div>
          </div>
        </div>

        {/* Quick Settings Navigation Rows */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-sky-200/[0.08] text-xs">
          <Link href="/wallet" className="p-3.5 flex items-center justify-between hover:bg-sky-500/[0.05] transition">
            <span className="flex items-center gap-2 font-semibold text-slate-200">
              <Wallet className="w-4 h-4 text-[#0EA5E9]" />
              <span>Nạp Ví VietQR</span>
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
          <Link href="/orders" className="p-3.5 flex items-center justify-between hover:bg-sky-500/[0.05] transition">
            <span className="flex items-center gap-2 font-semibold text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Lịch Sử Đơn &amp; Bảo Hành</span>
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
          {role === 'ADMIN' ? (
            <Link href="/admin" className="p-3.5 flex items-center justify-between hover:bg-sky-500/[0.05] transition">
              <span className="flex items-center gap-2 font-semibold text-sky-300">
                <ShieldCheck className="w-4 h-4 text-[#0EA5E9]" />
                <span>Mở Bảng Quản Trị Admin</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
            </Link>
          ) : (
            <Link href="/warranty" className="p-3.5 flex items-center justify-between hover:bg-sky-500/[0.05] transition">
              <span className="flex items-center gap-2 font-semibold text-slate-200">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <span>Trung Tâm Bảo Hành</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => setIsPayoutModalOpen(true)}
            className="w-full p-3.5 flex items-center justify-between hover:bg-sky-500/[0.05] transition text-left"
          >
            <span className="flex items-center gap-2 font-semibold text-slate-200">
              <Landmark className="w-4 h-4 text-cyan-400" />
              <span>Sổ Lưu Tài Khoản Nhận Tiền (Rút Hoa Hồng)</span>
            </span>
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* Referrer Binding Card */}
      <div className="p-5 rounded-2xl bg-[#090D16] border border-white/[0.08] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-cyan-400" />
              <span>Người Giới Thiệu Của Bạn</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {(profile as any)?.referredBy
                ? 'Tài khoản của bạn đã được liên kết với người giới thiệu.'
                : 'Bạn chưa có người giới thiệu? Nhập mã người mời để nhận thêm đặc quyền.'}
            </p>
          </div>

          {(profile as any)?.referredBy ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Đã liên kết người giới thiệu</span>
            </div>
          ) : (
            <form onSubmit={handleBindReferrer} className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                required
                placeholder="Nhập mã giới thiệu hoặc username..."
                value={bindCode}
                onChange={(e) => setBindCode(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-black/40 border border-white/[0.12] text-white focus:outline-none focus:border-cyan-500/80 w-full sm:w-56 font-mono"
              />
              <button
                type="submit"
                disabled={bindingReferrer || !bindCode.trim()}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black text-xs font-bold shrink-0 transition"
              >
                {bindingReferrer ? 'Đang lưu...' : 'Liên Kết'}
              </button>
            </form>
          )}
        </div>

        {bindReferrerMsg && (
          <div
            className={`p-2.5 rounded-xl text-xs font-medium border ${
              bindReferrerMsg.type === 'ok'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {bindReferrerMsg.text}
          </div>
        )}
      </div>

      {/* Affiliate 5% Commission Section */}
      <section id="affiliate" className="p-5 rounded-2xl liquid-glass-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-400/30 text-[#0EA5E9] flex items-center justify-center">
              <Gift className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Affiliate — Hoa Hồng {Math.round((affStats?.commissionRate ?? 0.05) * 100)}% Trọn Đời</h2>
              <p className="text-[11px] text-slate-400">
                Chia sẻ liên kết mời để nhận ngay {Math.round((affStats?.commissionRate ?? 0.05) * 100)}% trên mọi giao dịch nạp tiền hợp lệ của người được giới thiệu.
              </p>
            </div>
          </div>
          <Link href="/affiliate" className="text-xs font-semibold text-sky-400 hover:underline shrink-0">
            Chi tiết bảng hoa hồng
          </Link>
        </div>

        {/* 1-Tap Copy Link */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 h-10 px-3 rounded-xl bg-[#060B16] border border-sky-200/[0.12] flex items-center justify-between text-xs font-mono text-sky-300 overflow-hidden">
            <span className="truncate">
              {affStats?.referralLink || `Mã giới thiệu: ${profile?.referralCode || 'Đang tải...'}`}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopyAffiliate}
            disabled={!affStats?.referralLink}
            className="h-10 px-4 rounded-xl btn-ios-blue text-xs flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Đã sao chép link' : 'Sao chép Link 1 Chạm'}</span>
          </button>
        </div>

        {/* 3 Real Stats */}
        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="p-3 rounded-xl bg-[#060B16]/80 border border-sky-200/[0.08]">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Bạn đã mời</div>
            <div className="text-base font-black font-mono tabular-nums text-white mt-0.5">
              {affStats?.totalReferred ?? 0}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#060B16]/80 border border-sky-200/[0.08]">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Tổng hoa hồng</div>
            <div className="text-base font-black font-mono tabular-nums text-emerald-400 mt-0.5">
              {formatVND(affStats?.totalEarnings ?? 0)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#07090E]/80 border border-white/[0.08]">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Tỷ lệ nhận</div>
            <div className="text-base font-black font-mono tabular-nums text-[#38BDF8] mt-0.5">
              {Math.round((affStats?.commissionRate ?? 0.05) * 100)}%
            </div>
          </div>
        </div>
      </section>

      {/* Saved Profiles (1-Tap Checkout Presets) */}
      <section className="p-5 rounded-2xl liquid-glass-card space-y-4">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <BookmarkPlus className="w-4 h-4 text-sky-400" />
              <span>Hồ Sơ Đặt Nhanh (Saved Profiles)</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Lưu sẵn Email nâng cấp, Link kênh MXH hoặc Telegram để điền 1 chạm khi mua tài khoản &amp; Buff.
            </p>
          </div>
          <span className="text-[11px] font-mono tabular-nums text-sky-300">
            {(profile?.savedProfiles || []).length}/15
          </span>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSavingPreset(true);
            setPresetNotice(null);
            try {
              const res = await fetch('/api/profile/saved-contacts', {
        cache: 'no-store',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  label: presetLabel,
                  email: presetEmail,
                  socialLink: presetSocial,
                  telegram: presetTelegram,
                  note: presetNote,
                }),
              });
              const json = await res.json();
              if (!res.ok || !json.success) {
                setPresetNotice(json.error || 'Không thể lưu hồ sơ.');
              } else {
                setPresetLabel('');
                setPresetEmail('');
                setPresetSocial('');
                setPresetTelegram('');
                setPresetNote('');
                setPresetNotice('Đã lưu hồ sơ đặt nhanh!');
                await refreshUserData();
              }
            } finally {
              setSavingPreset(false);
            }
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs"
        >
          <input
            type="text"
            value={presetLabel}
            onChange={(e) => setPresetLabel(e.target.value)}
            placeholder="Tên gợi nhớ (VD: Kênh TikTok Chính) *"
            className="h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.1] text-white"
            required
          />
          <input
            type="text"
            value={presetEmail}
            onChange={(e) => setPresetEmail(e.target.value)}
            placeholder="Gmail nâng cấp (tuỳ chọn)"
            className="h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.1] text-white"
          />
          <input
            type="text"
            value={presetSocial}
            onChange={(e) => setPresetSocial(e.target.value)}
            placeholder="Link MXH (https://...)"
            className="h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.1] text-white"
          />
          <input
            type="text"
            value={presetTelegram}
            onChange={(e) => setPresetTelegram(e.target.value)}
            placeholder="Telegram @username hoặc ID"
            className="h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.1] text-white"
          />
          <input
            type="text"
            value={presetNote}
            onChange={(e) => setPresetNote(e.target.value)}
            placeholder="Ghi chú mặc định (tuỳ chọn)"
            className="h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.1] text-white"
          />
          <Button type="submit" isLoading={savingPreset} className="h-9 btn-ios-blue rounded-xl text-xs">
            Lưu Hồ Sơ
          </Button>
        </form>

        {presetNotice && (
          <p className="text-[11px] font-semibold text-sky-300">{presetNotice}</p>
        )}

        {(profile?.savedProfiles || []).length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(profile?.savedProfiles || []).map((preset) => (
              <div
                key={preset.id}
                className="p-3 rounded-xl bg-[#07090E]/85 border border-white/[0.08] flex items-start justify-between gap-2 text-xs"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="font-bold text-white truncate">{preset.label}</div>
                  {preset.email && <div className="text-[11px] text-slate-400 truncate">Gmail: {preset.email}</div>}
                  {preset.socialLink && <div className="text-[11px] text-sky-300 truncate">{preset.socialLink}</div>}
                  {preset.telegram && <div className="text-[11px] text-slate-400 truncate">Tele: {preset.telegram}</div>}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch(`/api/profile/saved-contacts?id=${encodeURIComponent(preset.id)}`, {
        cache: 'no-store',
                      method: 'DELETE',
                    });
                    await refreshUserData();
                  }}
                  aria-label="Xóa hồ sơ"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/10 transition shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Profile Info & Security Forms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Edit Profile */}
        <div className="p-5 rounded-2xl bg-[#0D1526]/90 border border-sky-200/[0.1] space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2.5 border-b border-sky-200/[0.08]">
            <User className="w-4 h-4 text-[#0EA5E9]" />
            <span>Thông Tin Cá Nhân</span>
          </h3>

          <form onSubmit={handleUpdateProfile} className="space-y-3.5 text-xs">
            {profileSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}
            {profileError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <Input
              label="Họ và tên"
              placeholder="Nguyễn Văn A"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input
              label="Số điện thoại"
              placeholder="09xxxxxxxx"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <Input
              label="Telegram ID / Username"
              placeholder="@username hoặc ID số"
              value={telegramUsername}
              onChange={(e) => setTelegramUsername(e.target.value)}
            />

            <Button type="submit" isLoading={isSavingProfile} className="w-full h-10 btn-ios-blue rounded-xl text-xs">
              Lưu thay đổi hồ sơ
            </Button>
          </form>
        </div>

        {/* Security & OTP Password Reset */}
        <div className="p-5 rounded-2xl bg-[#0D1526]/90 border border-sky-200/[0.1] space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2.5 border-b border-sky-200/[0.08]">
            <Lock className="w-4 h-4 text-[#0EA5E9]" />
            <span>Bảo Mật &amp; Đổi Mật Khẩu</span>
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}
            {passwordError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <Input
              label="Mật khẩu hiện tại"
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label="Mật khẩu mới (tối thiểu 6 ký tự)"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Input
              label="Xác nhận mật khẩu mới"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button type="submit" isLoading={isChangingPassword} className="w-full h-10 btn-ios-secondary rounded-xl text-xs">
              Cập nhật mật khẩu
            </Button>
          </form>

          <div className="pt-2 border-t border-sky-200/[0.08] flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Quên mật khẩu hoặc cần xác thực Bot OTP?</span>
            <Link href="/forgot-password" className="text-[#38BDF8] font-bold hover:underline flex items-center gap-1">
              <Send className="w-3 h-3" />
              <span>Xác thực qua Bot OTP</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Logout & Multi-Device Revocation */}
      <div className="pt-2 pb-4 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Đăng xuất thiết bị này</span>
        </button>
        <button
          type="button"
          disabled={signingOutAll}
          onClick={handleLogoutAllDevices}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/25 transition disabled:opacity-50"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{signingOutAll ? 'Đang thu hồi phiên...' : 'Đăng xuất khỏi tất cả thiết bị'}</span>
        </button>
      </div>
      {/* Saved Payout Accounts Modal */}
      <SavedPayoutAccountsModal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
      />
    </div>
  );
}
