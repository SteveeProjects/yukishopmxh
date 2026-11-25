'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, Send, Lock, ShieldCheck, Gift, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [telegramId, setTelegramId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref') || params.get('referral');
      if (ref) {
        const cleanRef = ref.trim().toUpperCase();
        setReferralCode(cleanRef);
        localStorage.setItem('yuki_ref_code', cleanRef);
      } else {
        const savedRef = localStorage.getItem('yuki_ref_code');
        if (savedRef) {
          setReferralCode(savedRef.trim().toUpperCase());
        }
      }
    }
  }, []);

  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanTele = telegramId.trim().replace(/^@/, '');

    // 1. Validation checks
    if (!cleanEmail || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleanEmail)) {
      setErrorMsg('Vui lòng nhập đúng định dạng Gmail (VD: yourname@gmail.com).');
      return;
    }

    if (!cleanTele || !/^(\d{5,15}|[a-zA-Z0-9_]{4,32})$/.test(cleanTele)) {
      setErrorMsg('Telegram phải là ID số (5-15 chữ số) hoặc @username hợp lệ (4-32 ký tự).');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Mật khẩu phải có độ dài tối thiểu từ 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp với mật khẩu đã nhập.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          telegramId: cleanTele,
          password,
          confirmPassword,
          referralCode: referralCode.trim().toUpperCase() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Đăng ký thất bại.');
      }

      if (typeof window !== 'undefined' && data.user) {
        localStorage.setItem('yuki_user', JSON.stringify(data.user));
        localStorage.setItem('yuki_auth_event', JSON.stringify({ type: 'LOGIN', ts: Date.now() }));
        if (typeof BroadcastChannel !== 'undefined') {
          const ch = new BroadcastChannel('yuki_auth_sync');
          ch.postMessage({ type: 'LOGIN', ts: Date.now() });
          ch.close();
        }
      }

      window.location.href = '/';
    } catch (err: any) {
      setErrorMsg(err.message || 'Đăng ký thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center text-white px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#12151C]/90 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-white mb-3">
            <ShieldCheck className="w-7 h-7 text-white stroke-[1.75]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Tạo Tài Khoản Mới</h1>
          <p className="text-xs text-slate-400 mt-1">Đăng ký thành viên chính chủ YUKISHOPMXH</p>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-300 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 stroke-[1.75]" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={onRegister} className="space-y-3.5">
          {/* 1. Gmail cá nhân */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400 stroke-[1.75]" />
              <span>Gmail cá nhân (Bắt buộc)</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="VD: nguyenvana@gmail.com"
              className="w-full rounded-2xl border border-white/[0.1] bg-black/40 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#0A84FF] focus:outline-none transition"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Dùng để quản lý đơn hàng & xác minh khi khôi phục tài khoản
            </p>
          </div>

          {/* 2. ID hoặc @Username Telegram cá nhân */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-slate-400 stroke-[1.75]" />
              <span>ID số hoặc @Username Telegram</span>
            </label>
            <input
              type="text"
              required
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value.replace(/[^a-zA-Z0-9_@]/g, ''))}
              placeholder="VD: 6123456789 hoặc @yuki_user"
              className="w-full rounded-2xl border border-white/[0.1] bg-black/40 px-4 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:border-[#0A84FF] focus:outline-none transition"
            />
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <ArrowRight className="w-3 h-3 text-[#0A84FF] shrink-0" />
              <span>
                Lấy ID số tại{' '}
                <a
                  href="https://t.me/userinfobot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-white underline hover:text-[#0A84FF]"
                >
                  @userinfobot
                </a>{' '}
                hoặc nhập @username Telegram để nhận OTP &amp; hỗ trợ đơn hàng
              </span>
            </p>
          </div>

          {/* 3. Mật khẩu & Xác nhận mật khẩu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400 stroke-[1.75]" />
                <span>Mật khẩu</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự..."
                  className="w-full rounded-2xl border border-white/[0.1] bg-black/40 pl-3.5 pr-9 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#0A84FF] focus:outline-none transition"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400 stroke-[1.75]" />
                <span>Nhập lại MK</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Khớp với mật khẩu..."
                className="w-full rounded-2xl border border-white/[0.1] bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#0A84FF] focus:outline-none transition"
              />
            </div>
          </div>

          {/* 4. Mã Giới Thiệu (Tùy chọn) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-slate-400 stroke-[1.75]" />
                <span>Mã giới thiệu (Nếu có)</span>
              </span>
              {referralCode && (
                <span className="text-[10px] text-emerald-400 font-normal">
                  [Đã tự động điền từ link mời]
                </span>
              )}
            </label>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="VD: YUKIXY9A2 (Tự động điền nếu đi qua link)"
              className="w-full rounded-2xl border border-white/[0.1] bg-black/40 px-4 py-2.5 text-sm text-white font-mono tracking-wider placeholder-slate-500 focus:border-[#0A84FF] focus:outline-none transition"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Nhập mã giới thiệu của bạn bè để kích hoạt liên kết hoa hồng đối tác.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl btn-ios-white py-3.5 font-bold text-slate-950 text-sm shadow transition mt-3 active:scale-95 disabled:opacity-40"
          >
            {loading ? 'Đang khởi tạo tài khoản...' : 'Hoàn Tất Đăng Ký'}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-slate-400 border-t border-white/[0.08] pt-4">
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-white hover:text-slate-300 font-bold underline">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
