'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Mail,
  Send,
  KeyRound,
  Copy,
  Check,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Lock,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [telegram, setTelegram] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [botUrl, setBotUrl] = useState('https://t.me/YukiIsMe2311');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanTele = telegram.trim();

    if (!cleanEmail) {
      setErrorMsg('Vui lòng nhập địa chỉ Gmail đăng ký tài khoản.');
      return;
    }

    if (!cleanTele) {
      setErrorMsg('Vui lòng nhập ID Telegram hoặc @Username Telegram đã liên kết.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          telegram: cleanTele,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || '❌ Gmail hoặc ID/@Username Telegram không khớp với hồ sơ tài khoản!');
      }

      setGeneratedToken(data.token);
      if (data.botUrl) {
        setBotUrl(data.botUrl);
      }
    } catch (err: any) {
      setErrorMsg(err.message || '❌ Gmail hoặc ID/@Username Telegram không khớp với hồ sơ tài khoản!');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToken = async () => {
    if (!generatedToken) return;
    try {
      await navigator.clipboard.writeText(generatedToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleReset = () => {
    setGeneratedToken(null);
    setErrorMsg('');
    setCopied(false);
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-white flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/[0.08] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-sky-500/[0.05] rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Main Card */}
        <div className="rounded-3xl border border-amber-400/25 bg-gradient-to-b from-[#0e1220]/95 via-[#0a0d16]/95 to-[#07090e]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-300 mb-3 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <KeyRound className="w-7 h-7 text-amber-400 stroke-[1.8]" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Khôi Phục Mật Khẩu
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Xác thực chính chủ 2 lớp an toàn qua Bot Telegram YukiShop
            </p>
          </div>

          {/* Case 1: Token Created Successfully */}
          {generatedToken ? (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Token Display Box */}
              <div className="p-5 rounded-2xl bg-black/60 border border-amber-400/40 text-center space-y-2 relative overflow-hidden shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                  Mã Token Khôi Phục Của Bạn
                </div>

                <div className="font-mono text-3xl font-black tracking-widest text-amber-300 py-1 drop-shadow-[0_2px_12px_rgba(245,158,11,0.35)]">
                  {generatedToken}
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 text-[10px] font-semibold border border-amber-400/20">
                  <span>⏱️ Hiệu lực 10 phút • Dùng 1 lần duy nhất</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="py-3 px-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.15] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Đã Sao Chép!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-amber-400" />
                      <span>Sao Chép Token</span>
                    </>
                  )}
                </button>

                <a
                  href={botUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black text-xs font-black transition flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(245,158,11,0.3)] active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Gửi Cho Admin Telegram</span>
                </a>
              </div>

              {/* Step by step guide */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-300 space-y-2.5">
                <div className="font-bold text-white flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-amber-300">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Xác Thực Chính Chủ Với Admin:</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
                  <p>
                    <strong className="text-amber-300">Bước 1:</strong> Bấm nút{' '}
                    <strong>Gửi Cho Admin Telegram</strong> ở trên, gửi mã token{' '}
                    <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded font-mono">
                      {generatedToken}
                    </code>{' '}
                    tới Telegram Admin (@YukiIsMe2311).
                  </p>
                  <p>
                    <strong className="text-amber-300">Bước 2:</strong> Admin sẽ đối soát trực tiếp thông tin tài khoản và hỗ trợ cấp lại mật khẩu mới cho bạn trong vòng 1 - 3 phút.
                  </p>
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-slate-400 hover:text-white transition flex items-center justify-center gap-1 mx-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tạo lại mã token khác</span>
                </button>
              </div>
            </div>
          ) : (
            /* Case 2: Form Input (2 required fields) */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3.5 rounded-2xl border border-red-500/40 bg-red-500/10 text-xs font-semibold text-red-300 flex items-center gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400 stroke-[1.8]" />
                  <span className="leading-snug">{errorMsg}</span>
                </div>
              )}

              {/* Ô 1: Gmail đăng ký tài khoản */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>1. Gmail Đăng Ký Tài Khoản</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="VD: kyomeyuki2k@gmail.com"
                    className="w-full rounded-2xl border border-slate-700/80 bg-slate-900/80 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition"
                  />
                </div>
              </div>

              {/* Ô 2: ID Telegram hoặc @Username Telegram */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-sky-400" />
                  <span>2. ID Telegram Hoặc @Username Đã Liên Kết</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    placeholder="VD: 8960751162 hoặc @YukiIsMe2311"
                    className="w-full rounded-2xl border border-slate-700/80 bg-slate-900/80 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 transition"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Nhập đúng ID số (VD: <code className="text-slate-300">8960751162</code>) hoặc username có dấu @ (VD: <code className="text-slate-300">@YukiIsMe2311</code>).
                </p>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-sm uppercase tracking-wider transition-all shadow-[0_8px_24px_rgba(245,158,11,0.3)] disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>ĐANG XÁC THỰC...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>TẠO MÃ TOKEN KHÔI PHỤC</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer Back to Login */}
          <div className="mt-6 pt-5 border-t border-white/[0.08] text-center">
            <Link
              href="/login"
              className="text-xs text-slate-400 hover:text-white transition inline-flex items-center gap-1 font-semibold hover:underline"
            >
              <span>← Quay lại Đăng nhập</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
