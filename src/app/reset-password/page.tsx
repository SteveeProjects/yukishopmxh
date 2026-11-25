'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '@/components/common/brand-logo';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState('');
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setTokenValid(false);
      setTokenError('Thiếu mã token xác thực trong liên kết. Vui lòng mở lại link từ Bot Telegram.');
      return;
    }

    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setTokenValid(true);
          setEmail(data.email || '');
        } else {
          setTokenValid(false);
          setTokenError(data.error || 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn (quá 15 phút).');
        }
      })
      .catch(() => {
        setTokenValid(false);
        setTokenError('Lỗi kết nối kiểm tra link. Vui lòng thử lại.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (password.length < 8) {
      setFormError('Mật khẩu mới phải có ít nhất 8 ký tự để đảm bảo an toàn.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword: password,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || 'Không thể đổi mật khẩu. Vui lòng thử lại.');
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 2200);
      }
    } catch {
      setFormError('Lỗi kết nối máy chủ. Vui lòng thử lại sau giây lát.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-block mx-auto mb-2">
            <BrandLogo size="lg" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <KeyRound className="w-6 h-6 text-[#0EA5E9]" />
            <span>Đặt Lại Mật Khẩu</span>
          </h1>
          <p className="text-xs text-slate-400">
            Xác thực liên kết Magic Link bảo mật từ Bot Telegram YukiShopMXH
          </p>
        </div>

        {/* Main Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#090D16]/95 border border-sky-400/25 shadow-2xl backdrop-blur-2xl space-y-5 text-slate-200">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              <span>Đang xác thực liên kết Magic Link...</span>
            </div>
          ) : !tokenValid ? (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Liên kết không hợp lệ</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                  {tokenError}
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <a
                  href="https://t.me/YukiIsMe2311"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-4 rounded-xl btn-ios-blue text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <span>Liên Hệ Admin Cấp Lại</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <Link
                  href="/login"
                  className="py-2.5 px-4 rounded-xl btn-ios-secondary text-xs font-bold text-center"
                >
                  Về Đăng Nhập
                </Link>
              </div>
            </div>
          ) : success ? (
            <div className="space-y-4 text-center py-4 animate-fade-in">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Đổi Mật Khẩu Thành Công!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Mật khẩu tài khoản <strong className="text-sky-300">{email}</strong> đã được cập nhật an toàn. Đang chuyển sang trang đăng nhập...
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="w-full py-2.5 rounded-xl btn-ios-blue text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <span>Đăng Nhập Ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-400/20 text-xs flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                <div className="truncate">
                  <span className="text-slate-400">Tài khoản: </span>
                  <span className="font-bold text-white">{email}</span>
                </div>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Mật khẩu mới (tối thiểu 8 ký tự)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới..."
                    required
                    minLength={8}
                    className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#060B16] border border-sky-200/[0.12] text-white text-sm focus:border-sky-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 text-slate-400 hover:text-white absolute right-2.5 top-1/2 -translate-y-1/2 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới..."
                    required
                    minLength={8}
                    className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[#060B16] border border-sky-200/[0.12] text-white text-sm focus:border-sky-400 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-xl btn-ios-blue text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 active:scale-[0.98] transition disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang cập nhật...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Xác Nhận &amp; Lưu Mật Khẩu</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-400 space-y-1">
          <p>YukiShopMXH • Hệ Thống Bảo Mật Cấp Cao</p>
          <div className="flex items-center justify-center gap-3 pt-1">
            <Link href="/login" className="hover:text-sky-300 transition">Đăng Nhập</Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-sky-300 transition">Điều Khoản</Link>
            <span>•</span>
            <a href="https://t.me/YukiShopMXH" target="_blank" rel="noopener noreferrer" className="hover:text-sky-300 transition">Hỗ Trợ Admin</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[85vh] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
