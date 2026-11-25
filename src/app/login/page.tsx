'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Sai thông tin đăng nhập hoặc mật khẩu.');
      }

      // Save user to localStorage and broadcast login across tabs
      if (typeof window !== 'undefined' && data.user) {
        localStorage.setItem('yuki_user', JSON.stringify(data.user));
        localStorage.setItem('yuki_auth_event', JSON.stringify({ type: 'LOGIN', ts: Date.now() }));
        if (typeof BroadcastChannel !== 'undefined') {
          const ch = new BroadcastChannel('yuki_auth_sync');
          ch.postMessage({ type: 'LOGIN', ts: Date.now() });
          ch.close();
        }
      }

      window.location.href = data.user?.role === 'admin' ? '/admin' : '/';
    } catch (err: any) {
      setErrorMsg(err.message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center text-white px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#12151C]/90 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-white mb-3">
            <LogIn className="w-6 h-6 stroke-[1.75]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Đăng Nhập YUKISHOPMXH</h1>
          <p className="text-xs text-slate-400 mt-1">
            Đăng nhập bằng Gmail hoặc ID / @Username Telegram
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 stroke-[1.75]" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Gmail hoặc ID / @Username Telegram
            </label>
            <input
              type="text"
              required
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Nhập Gmail, ID số hoặc @username Telegram..."
              className="w-full rounded-2xl border border-white/[0.1] bg-black/40 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-[#0A84FF] focus:outline-none transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Mật khẩu
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-slate-400 hover:text-white font-semibold transition hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full rounded-2xl border border-white/[0.1] bg-black/40 pl-4 pr-11 py-3 text-sm text-white placeholder-slate-500 focus:border-[#0A84FF] focus:outline-none transition"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl btn-ios-white py-3.5 font-bold text-slate-950 text-sm shadow transition duration-200 mt-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Đang xác thực...' : 'Đăng Nhập Ngay'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-white/[0.08] text-center">
          <Link
            href="/register"
            className="text-xs text-slate-300 hover:text-white font-semibold transition"
          >
            Chưa có tài khoản? Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
