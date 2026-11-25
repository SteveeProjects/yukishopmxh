'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import {
  Sparkles,
  Trophy,
  Ticket,
  Gift,
  Coins,
  Copy,
  Check,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Info,
  RefreshCw,
  Wallet,
  ExternalLink,
  Flame,
  Award,
  Crown,
} from 'lucide-react';

interface Prize {
  index: number;
  name: string;
  type: 'NOTHING' | 'VOUCHER' | 'WALLET' | 'CASH';
  shortText: string;
  subText: string;
  color: string;
  textColor: string;
  iconType: 'CLOVER' | 'TICKET' | 'GIFT' | 'WALLET' | 'FIRE' | 'CASH' | 'GOLD' | 'CROWN';
}

const PRIZE_LIST: Prize[] = [
  { index: 0, name: 'Chúc bạn may mắn lần sau', type: 'NOTHING', shortText: 'MAY MẮN', subText: 'LẦN SAU', color: '#0b1120', textColor: '#94a3b8', iconType: 'CLOVER' },
  { index: 1, name: 'Voucher Giảm 3%', type: 'VOUCHER', shortText: 'VC 3%', subText: 'ĐƠN 50K', color: '#1e1b4b', textColor: '#c7d2fe', iconType: 'TICKET' },
  { index: 2, name: 'Voucher Giảm 5%', type: 'VOUCHER', shortText: 'VC 5%', subText: 'ĐƠN 100K', color: '#064e3b', textColor: '#6ee7b7', iconType: 'GIFT' },
  { index: 3, name: '+5.000đ Ví Mua Hàng', type: 'WALLET', shortText: '+5.000đ', subText: 'CỘNG VÍ', color: '#1e3a8a', textColor: '#93c5fd', iconType: 'WALLET' },
  { index: 4, name: 'Voucher Giảm 10%', type: 'VOUCHER', shortText: 'VC 10%', subText: 'ĐƠN 150K', color: '#7c2d12', textColor: '#fdba74', iconType: 'FIRE' },
  { index: 5, name: '+10.000đ Tiền Mặt', type: 'CASH', shortText: '10.000đ', subText: 'RÚT BANK', color: '#0f766e', textColor: '#5eead4', iconType: 'CASH' },
  { index: 6, name: '+50.000đ Tiền Mặt', type: 'CASH', shortText: '50.000đ', subText: 'RÚT BANK', color: '#b45309', textColor: '#fef08a', iconType: 'GOLD' },
  { index: 7, name: 'JACKPOT +200.000đ', type: 'CASH', shortText: '200.000đ', subText: 'JACKPOT', color: '#881337', textColor: '#fecdd3', iconType: 'CROWN' },
];

// Pure 2D Canvas Vector Icon Renderer (Zero Emojis)
function drawPrizeVectorIcon(
  ctx: CanvasRenderingContext2D,
  type: string,
  x: number,
  y: number,
  size: number
) {
  ctx.save();
  ctx.translate(x, y);

  if (type === 'CLOVER') {
    // 4-leaf clover in metallic gold
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = 'rgba(245, 158, 11, 0.7)';
    ctx.shadowBlur = 4;
    const r = size * 0.28;
    const offsets = [
      [-r * 0.7, -r * 0.7],
      [r * 0.7, -r * 0.7],
      [-r * 0.7, r * 0.7],
      [r * 0.7, r * 0.7],
    ];
    for (const [ox, oy] of offsets) {
      ctx.beginPath();
      ctx.arc(ox, oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = '#fef08a';
    ctx.fill();
  } else if (type === 'TICKET') {
    // Golden discount voucher ticket
    ctx.fillStyle = '#818cf8';
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.2;
    const w = size * 0.9;
    const h = size * 0.55;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 2.5);
    ctx.fill();
    ctx.stroke();
    // Inner dashed line
    ctx.strokeStyle = '#1e1b4b';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(0, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // Star or dot in ticket
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(-w / 4, 0, 1.8, 0, Math.PI * 2);
    ctx.arc(w / 4, 0, 1.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'GIFT') {
    // Luxury gift box
    const s = size * 0.72;
    ctx.fillStyle = '#34d399';
    ctx.fillRect(-s / 2, -s / 2 + 2, s, s);
    // Ribbon
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-1.5, -s / 2 + 2, 3, s);
    ctx.fillRect(-s / 2, -1, s, 2.5);
    // Bow at top
    ctx.beginPath();
    ctx.arc(-3, -s / 2, 2.5, 0, Math.PI * 2);
    ctx.arc(3, -s / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'WALLET') {
    // Digital card/wallet
    const w = size * 0.88;
    const h = size * 0.6;
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 2.5);
    ctx.fill();
    // Stripe
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(-w / 2, -h / 2 + 3, w, 3.5);
    // Chip
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-w / 2 + 3, 0, 4, 3.5);
  } else if (type === 'FIRE') {
    // Double gold flame
    ctx.fillStyle = '#fb923c';
    ctx.shadowColor = '#ea580c';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.48);
    ctx.bezierCurveTo(size * 0.4, -size * 0.2, size * 0.38, size * 0.42, 0, size * 0.42);
    ctx.bezierCurveTo(-size * 0.38, size * 0.42, -size * 0.4, -size * 0.2, 0, -size * 0.48);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.18);
    ctx.bezierCurveTo(size * 0.18, 0, size * 0.18, size * 0.32, 0, size * 0.32);
    ctx.bezierCurveTo(-size * 0.18, size * 0.32, -size * 0.18, 0, 0, -size * 0.18);
    ctx.fill();
  } else if (type === 'CASH') {
    // Banknote
    const w = size * 0.9;
    const h = size * 0.52;
    ctx.fillStyle = '#2dd4bf';
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f766e';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('đ', 0, 0);
  } else if (type === 'GOLD') {
    // Stack of gold coins
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1;
    ctx.shadowColor = 'rgba(245, 158, 11, 0.7)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.ellipse(0, 3, size * 0.36, size * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(0, -2, size * 0.36, size * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (type === 'CROWN') {
    // Royal Crown in brilliant gold
    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1;
    ctx.shadowColor = 'rgba(254, 240, 138, 0.9)';
    ctx.shadowBlur = 6;
    const w = size * 0.85;
    const h = size * 0.65;
    ctx.beginPath();
    ctx.moveTo(-w / 2, h / 2);
    ctx.lineTo(w / 2, h / 2);
    ctx.lineTo(w / 2, -h / 4);
    ctx.lineTo(w / 4, 0);
    ctx.lineTo(0, -h / 2);
    ctx.lineTo(-w / 4, 0);
    ctx.lineTo(-w / 2, -h / 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, -h / 2, 2, 0, Math.PI * 2);
    ctx.arc(-w / 2, -h / 4, 1.8, 0, Math.PI * 2);
    ctx.arc(w / 2, -h / 4, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

interface UserVoucher {
  id: string;
  code: string;
  discountPercent: number;
  maxDiscount?: number;
  minOrder: number;
  expiresAt: string;
  isUsed: boolean;
  createdAt: string;
  source: string;
}

interface SpinLog {
  id: string;
  userName: string;
  prizeName: string;
  prizeType: string;
  prizeValue: number;
  voucherCode?: string;
  createdAt: string;
}

export default function LuckySpinPage() {
  const { user, refreshUserData } = useAuth();

  const [spinTickets, setSpinTickets] = useState<number>(0);
  const [depositSpinProgress, setDepositSpinProgress] = useState<number>(0);
  const [affiSpinProgress, setAffiSpinProgress] = useState<number>(0);
  const [withdrawableBalance, setWithdrawableBalance] = useState<number>(0);
  const [vouchersCount, setVouchersCount] = useState<number>(0);

  const [isSpinning, setIsSpinning] = useState(false);
  const [winModalPrize, setWinModalPrize] = useState<{
    prize: any;
    voucherCode?: string;
  } | null>(null);

  const [mounted, setMounted] = useState(false);
  const [pointerTick, setPointerTick] = useState(false);

  const [recentLogs, setRecentLogs] = useState<SpinLog[]>([]);
  const [userVouchers, setUserVouchers] = useState<UserVoucher[]>([]);
  const [activeTab, setActiveTab] = useState<'vouchers' | 'rules' | 'history'>('vouchers');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentRotationRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when win modal is open
  useEffect(() => {
    if (winModalPrize && mounted) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [winModalPrize, mounted]);

  // Play subtle synthesized audio tick and spring needle
  const playTickSound = useCallback(() => {
    setPointerTick(true);
    setTimeout(() => setPointerTick(false), 70);
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.045);
    } catch {}
  }, []);

  // Fetch spin state
  const loadSpinState = useCallback(async () => {
    try {
      const res = await fetch('/api/spin/state');
      const data = await res.json();
      if (data.success) {
        setSpinTickets(data.spinTickets || 0);
        setDepositSpinProgress(data.depositSpinProgress || 0);
        setAffiSpinProgress(data.affiSpinProgress || 0);
        setWithdrawableBalance(data.withdrawableBalance || 0);
        setVouchersCount(data.vouchersCount || 0);
      }
    } catch {}
  }, []);

  // Fetch recent public spin logs
  const loadRecentLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/spin/history');
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setRecentLogs(data.logs);
      }
    } catch {}
  }, []);

  // Fetch user vouchers
  const loadUserVouchers = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/user/vouchers');
      const data = await res.json();
      if (data.success && Array.isArray(data.vouchers)) {
        setUserVouchers(data.vouchers);
      }
    } catch {}
  }, [user]);

  useEffect(() => {
    loadSpinState();
    loadRecentLogs();
    loadUserVouchers();
  }, [loadSpinState, loadRecentLogs, loadUserVouchers]);

  // Draw wheel on canvas with Retina scaling
  const drawWheel = useCallback((rotationDeg: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? Math.max(window.devicePixelRatio || 1, 2) : 2;
    const size = 360;
    const center = 180;
    const radius = 160; // Bán kính đĩa outerRadius = 160 chuẩn xác
    const sliceAngle = (2 * Math.PI) / 8;

    if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate((rotationDeg * Math.PI) / 180);

    // 1. Draw outer gold decorative rim with 3D gradient
    ctx.beginPath();
    ctx.arc(0, 0, radius + 11, 0, 2 * Math.PI);
    ctx.fillStyle = '#05070e';
    ctx.fill();

    const rimGrad = ctx.createLinearGradient(-radius, -radius, radius, radius);
    rimGrad.addColorStop(0, '#fef08a');
    rimGrad.addColorStop(0.3, '#f59e0b');
    rimGrad.addColorStop(0.5, '#78350f');
    rimGrad.addColorStop(0.7, '#fbbf24');
    rimGrad.addColorStop(1, '#d97706');
    ctx.lineWidth = 7;
    ctx.strokeStyle = rimGrad;
    ctx.stroke();

    // Inner rim accent line
    ctx.beginPath();
    ctx.arc(0, 0, radius + 3, 0, 2 * Math.PI);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.45)';
    ctx.stroke();

    // 2. Draw 24 alternating flashing LED bulbs around rim
    const totalStuds = 24;
    const flashPhase = Math.floor(Date.now() / 250) % 2;
    for (let s = 0; s < totalStuds; s++) {
      const studAngle = (s * 2 * Math.PI) / totalStuds;
      const sx = (radius + 6.5) * Math.cos(studAngle);
      const sy = (radius + 6.5) * Math.sin(studAngle);
      const isLit = (s + flashPhase) % 2 === 0;

      ctx.beginPath();
      ctx.arc(sx, sy, isLit ? 3.6 : 2.4, 0, 2 * Math.PI);
      if (isLit) {
        ctx.fillStyle = s % 4 === 0 ? '#38bdf8' : '#fbbf24';
        ctx.shadowColor = s % 4 === 0 ? '#38bdf8' : '#fbbf24';
        ctx.shadowBlur = 6;
      } else {
        ctx.fillStyle = '#451a03';
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 3. Draw 8 slices with 3 distinct radial tiers (>=20px separation, zero overlap)
    for (let i = 0; i < 8; i++) {
      const p = PRIZE_LIST[i];
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = p.color;
      ctx.fill();

      ctx.lineWidth = 1.8;
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
      ctx.stroke();

      // Rotate to centerline of sector
      ctx.save();
      ctx.rotate(startAngle + sliceAngle / 2);

      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      // Vị trí 1 (r = outerRadius - 22): Icon đơn sắc tối giản (14px) màu vàng kim/trắng
      const rIcon = radius - 22;
      drawPrizeVectorIcon(ctx, p.iconType, rIcon - 6, 0, 14);

      // Vị trí 2 (r = outerRadius - 44): Dòng 1 — Tiêu đề chính (font: 800 13px Inter, sans-serif, màu #FFFFFF hoặc #FDE68A)
      const rLine1 = radius - 44;
      ctx.font = '800 13px Inter, system-ui, -apple-system, sans-serif';
      ctx.fillStyle = p.index === 7 ? '#FDE68A' : p.textColor || '#FFFFFF';
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 4;
      ctx.fillText(p.shortText, rLine1, -7.5);

      // Vị trí 3 (r = outerRadius - 64): Dòng 2 — Mô tả ngắn (font: 600 9px Inter, sans-serif, màu rgba(255,255,255,0.75))
      // Khoảng cách giữa Dòng 1 và Dòng 2 tách bạch đúng 20px (44 - 64 = -20px dọc theo bán kính hướng tâm)
      const rLine2 = radius - 64;
      ctx.font = '600 9px Inter, system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.shadowBlur = 0;
      ctx.fillText(p.subText, rLine2, 7.5);

      ctx.restore();
    }

    // 4. Center 3D Royal Medallion with Pulse Glow (hubR = 44, leaving 30px to subR = 74)
    const hubR = 44;
    ctx.beginPath();
    ctx.arc(0, 0, hubR, 0, 2 * Math.PI);
    const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, hubR);
    grad.addColorStop(0, '#fffbeb');
    grad.addColorStop(0.25, '#fef08a');
    grad.addColorStop(0.65, '#eab308');
    grad.addColorStop(0.9, '#b45309');
    grad.addColorStop(1, '#451a03');
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Bevel outer ring
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#070a12';
    ctx.stroke();

    // Inner engraved ring
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, 2 * Math.PI);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#78350f';
    ctx.stroke();

    // Gold Crown Vector at top of center
    drawPrizeVectorIcon(ctx, 'CROWN', 0, -16, 13);

    // Center text QUAY (bold gold engraved)
    ctx.fillStyle = '#050811';
    ctx.font = '900 13px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(254, 240, 138, 0.8)';
    ctx.shadowBlur = 2;
    ctx.fillText('QUAY', 0, -2);

    ctx.font = '800 8.5px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#78350f';
    ctx.shadowBlur = 0;
    ctx.fillText('SPIN', 0, 11);

    ctx.restore();
  }, []);

  // Initial draw
  useEffect(() => {
    drawWheel(currentRotationRef.current);
  }, [drawWheel]);

  // Confetti Particle Engine
  const triggerConfetti = useCallback(() => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#f59e0b', '#38bdf8', '#10b981', '#ec4899', '#f97316', '#a855f7'];
    const particles: any[] = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.45,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.8) * 18,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 12,
        alpha: 1,
      });
    }

    let start = performance.now();
    function animateConfetti(now: number) {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.rotation += p.vr;
        p.alpha -= 0.008;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      }

      if (alive && now - start < 3500) {
        requestAnimationFrame(animateConfetti);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    requestAnimationFrame(animateConfetti);
  }, []);

  // Handle Spin Roll
  const handleRoll = async () => {
    if (isSpinning) return;
    if (spinTickets < 1) {
      setErrorMsg('Bạn đã hết vé quay! Nạp từ 100.000đ để nhận thêm vé.');
      return;
    }

    setErrorMsg(null);
    setIsSpinning(true);

    try {
      const res = await fetch('/api/spin/roll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khi quay thưởng.');
      }

      const targetPrizeIndex = Number(data.prizeIndex ?? 0);
      setSpinTickets(data.remainingTickets ?? Math.max(0, spinTickets - 1));

      // Calculate target rotation angle:
      // Pointer is at 12 o'clock (270 deg).
      // Center of prize i is (i * 45 + 22.5) deg.
      // Offset = (270 - (targetPrizeIndex * 45 + 22.5) + 360) % 360.
      const sliceCenter = targetPrizeIndex * 45 + 22.5;
      const targetSectorOffset = (270 - sliceCenter + 360) % 360;

      // Add slight random jitter within ±12 deg of sector center
      const jitter = (Math.random() - 0.5) * 20;

      // Total rotations = 6 full turns + target
      const startRot = currentRotationRef.current % 360;
      const fullRotations = 6 * 360;
      const finalTargetRot = currentRotationRef.current + (360 - startRot) + fullRotations + targetSectorOffset + jitter;

      const duration = 4800; // ms
      const startTime = performance.now();
      const initialRot = currentRotationRef.current;
      let lastSector = -1;

      const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

      function step(now: number) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = easeOutQuint(progress);

        const currentRot = initialRot + (finalTargetRot - initialRot) * ease;
        currentRotationRef.current = currentRot;
        drawWheel(currentRot);

        // Sound tick on passing each 45deg sector
        const sector = Math.floor((currentRot % 360) / 45);
        if (sector !== lastSector && progress < 0.95) {
          lastSector = sector;
          playTickSound();
        }

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(step);
        } else {
          setIsSpinning(false);
          // Show win modal
          setWinModalPrize({
            prize: data.prize,
            voucherCode: data.prize?.voucherCode,
          });

          if (data.prize?.type !== 'NOTHING') {
            triggerConfetti();
          }

          loadSpinState();
          loadRecentLogs();
          loadUserVouchers();
          if (refreshUserData) refreshUserData();
        }
      }

      animFrameRef.current = requestAnimationFrame(step);
    } catch (err: any) {
      setIsSpinning(false);
      setErrorMsg(err.message || 'Không thể thực hiện vòng quay.');
    }
  };

  const handleCopy = async (code: string) => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    } catch {}
  };

  const formatVND = (num: number) =>
    new Intl.NumberFormat('vi-VN').format(num) + 'đ';

  return (
    <div className="min-h-screen bg-[#07090E] text-white pt-24 pb-28 lg:pb-12 px-3 sm:px-6 relative overflow-x-hidden">
      {/* Background radial effects */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/[0.07] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-40 right-10 w-96 h-96 bg-sky-500/[0.05] rounded-full blur-[120px] pointer-events-none" />

      {/* Confetti canvas */}
      <canvas
        ref={confettiCanvasRef}
        className="fixed inset-0 pointer-events-none z-50 w-full h-full"
      />

      <div className="max-w-5xl mx-auto space-y-6 relative z-10">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-[#0c0f1a]/95 via-[#080b13]/95 to-[#04060b]/95 border border-amber-400/25 shadow-2xl backdrop-blur-2xl">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Sự Kiện Tri Ân & May Mắn</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Vòng Quay May Mắn</span>
              <span className="text-amber-300">
                Yuki Lucky Spin
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Quay 100% minh bạch • Trúng ngay Voucher 10%, Tiền mặt rút Bank & JACKPOT 200.000đ
            </p>
          </div>

          {/* User Stat Pills */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-left">
              <div className="text-[10px] text-amber-300/80 font-bold uppercase">Vé Quay Của Bạn</div>
              <div className="font-mono text-xl font-black text-amber-300 flex items-center gap-1">
                <span>{spinTickets}</span>
                <span className="text-xs font-normal">vé</span>
              </div>
            </div>

            <Link
              href="/wallet"
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black text-xs font-black transition-all shadow-lg shadow-amber-500/25 flex items-center gap-1.5 active:scale-95"
            >
              <Ticket className="w-4 h-4" />
              <span>Nạp Thêm Lấy Vé</span>
            </Link>
          </div>
        </div>

        {/* Live Winners Ticker */}
        {recentLogs.length > 0 && (
          <div className="px-4 py-2.5 rounded-2xl bg-amber-500/[0.06] border border-amber-400/20 overflow-hidden flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs font-bold text-amber-300 shrink-0">
              <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="hidden sm:inline">Vừa Trúng Thưởng:</span>
            </div>
            <div className="overflow-x-auto no-scrollbar flex items-center gap-4 text-xs text-slate-300 whitespace-nowrap">
              {recentLogs.slice(0, 8).map((log, i) => (
                <div key={log.id + i} className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="text-slate-400 font-bold">{log.userName}</span>
                  <span className="text-amber-400">→</span>
                  <span className="text-white font-bold">{log.prizeName}</span>
                  {i < Math.min(recentLogs.length, 8) - 1 && <span className="text-slate-600 ml-2">•</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Spin Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Wheel Container (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center p-4 sm:p-8 rounded-3xl bg-[#090d18]/90 border border-sky-400/20 shadow-2xl relative backdrop-blur-xl">
            {/* Top Pointer with casino spring tick bounce */}
            <div className="relative z-30 -mb-5 flex flex-col items-center">
              <div
                className="w-8 h-10 -rotate-180 drop-shadow-[0_4px_16px_rgba(245,158,11,0.85)] origin-top transition-transform duration-75 ease-out"
                style={{
                  transform: pointerTick
                    ? 'rotate(-194deg) scale(1.15) translateY(-2px)'
                    : 'rotate(-180deg) scale(1) translateY(0)',
                }}
              >
                <svg viewBox="0 0 24 30" fill="none" className="w-full h-full">
                  <path
                    d="M12 0L24 24H0L12 0Z"
                    fill="url(#ptr-gold)"
                    stroke="#78350f"
                    strokeWidth="1.5"
                  />
                  <defs>
                    <linearGradient id="ptr-gold" x1="0" y1="0" x2="24" y2="30" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#fef08a" />
                      <stop offset="0.5" stopColor="#eab308" />
                      <stop offset="1" stopColor="#b45309" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* Canvas Wheel with rotating gold ambient aura */}
            <div className="relative p-2 rounded-full">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/25 via-yellow-400/15 to-transparent blur-3xl pointer-events-none animate-pulse" />
              <div className="absolute -inset-2 rounded-full border border-amber-400/20 pointer-events-none animate-[spin_30s_linear_infinite]" />
              <canvas
                ref={canvasRef}
                width={360}
                height={360}
                className="max-w-[320px] max-h-[320px] sm:max-w-[360px] sm:max-h-[360px] rounded-full cursor-pointer transition-transform relative z-10 active:scale-[0.98]"
                onClick={handleRoll}
              />
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mt-3 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 font-semibold text-center">
                {errorMsg}
              </div>
            )}

            {/* Spin CTA Button */}
            <div className="mt-6 w-full max-w-sm flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleRoll}
                disabled={isSpinning || spinTickets < 1}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-base uppercase tracking-wider transition-all shadow-[0_10px_30px_rgba(245,158,11,0.35)] disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isSpinning ? (
                  <>
                    <div className="w-5 h-5 border-3 border-black border-t-transparent rounded-full animate-spin" />
                    <span>ĐANG QUAY THƯỞNG...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>QUAY NGAY ({spinTickets} VÉ)</span>
                  </>
                )}
              </button>

              <span className="text-[11px] text-slate-400 font-medium">
                Mỗi lượt quay tiêu hao 1 Vé • Kết quả ngẫu nhiên xác thực bởi máy chủ
              </span>
            </div>
          </div>

          {/* Right Column: Ticket Progress & Quick Info (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Ticket Progress Card */}
            <div className="p-5 rounded-3xl bg-gradient-to-b from-[#0c101d] to-[#070a12] border border-amber-400/25 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-amber-400/15">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-400/15 text-amber-300 flex items-center justify-center font-bold">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Nhiệm Vụ Nhận Vé Quay</h3>
                    <p className="text-[11px] text-slate-400">Tự động cộng vé khi đạt mốc nạp</p>
                  </div>
                </div>
              </div>

              {/* Progress 1: Personal Deposit */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">1. Nạp Tiền Vào Ví</span>
                  <span className="font-bold text-amber-300 font-mono text-[11px]">+1 Vé / 100.000đ</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-black/60 border border-amber-400/20 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((depositSpinProgress / 100000) * 100))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Tiến độ: <strong className="text-amber-300">{formatVND(depositSpinProgress)}</strong> / 100k</span>
                  <span>Cần nạp thêm: <strong className="text-white">{formatVND(Math.max(0, 100000 - depositSpinProgress))}</strong></span>
                </div>
              </div>

              {/* Progress 2: Affiliate F1 Deposit */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">2. Cấp Dưới Nạp Tiền (F1)</span>
                  <span className="font-bold text-sky-300 font-mono text-[11px]">+1 Vé / 200.000đ</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-black/60 border border-sky-400/20 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((affiSpinProgress / 200000) * 100))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>F1 đã nạp: <strong className="text-sky-300">{formatVND(affiSpinProgress)}</strong> / 200k</span>
                  <span>Cần thêm: <strong className="text-white">{formatVND(Math.max(0, 200000 - affiSpinProgress))}</strong></span>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <Link
                  href="/wallet"
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-extrabold text-xs text-center hover:opacity-90 transition shadow-md shadow-amber-500/20"
                >
                  Nạp Tiền Ngay
                </Link>
                <Link
                  href="/affiliate"
                  className="flex-1 py-2.5 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-200 font-bold text-xs text-center transition"
                >
                  Mời Bạn Bè 5%
                </Link>
              </div>
            </div>

            {/* Quick Balances Summary Card */}
            <div className="p-4 rounded-3xl bg-[#090d18]/90 border border-sky-400/15 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Tiền mặt rút được (Bank):</span>
                <span className="font-mono text-base font-black text-emerald-300 tabular-nums">
                  {formatVND(withdrawableBalance)}
                </span>
              </div>
              <Link
                href="/affiliate"
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-200 font-bold text-xs flex items-center gap-1 transition"
              >
                <span>Rút Tiền</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Lower Section: Tabs (Kho Voucher, Thể Lệ & Tỷ Lệ, Lịch Sử) */}
        <div className="p-5 sm:p-7 rounded-3xl bg-[#080c16]/95 border border-sky-400/20 shadow-2xl backdrop-blur-2xl space-y-5">
          <div className="flex items-center gap-2 border-b border-sky-400/15 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('vouchers')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'vouchers'
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-400/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Gift className="w-4 h-4" />
              <span>Kho Voucher Của Tôi ({userVouchers.filter((v) => !v.isUsed).length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rules')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'rules'
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-400/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>Cơ Cấu & Tỷ Lệ Giải Thưởng</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-400/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Lịch Sử Vừa Trúng</span>
            </button>
          </div>

          {/* Tab 1: Kho Voucher Của Tôi */}
          {activeTab === 'vouchers' && (
            <div className="space-y-4">
              {userVouchers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Gift className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">Kho voucher trống</p>
                  <p className="text-xs text-slate-500">Quay Vòng May Mắn để săn ngay các voucher giảm 3%, 5%, 10%!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {userVouchers.map((v) => {
                    const isExpired = new Date(v.expiresAt).getTime() < Date.now();
                    return (
                      <div
                        key={v.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          v.isUsed || isExpired
                            ? 'bg-white/[0.02] border-white/[0.06] opacity-60'
                            : 'bg-gradient-to-br from-amber-500/[0.08] to-amber-600/[0.02] border-amber-400/30 shadow-lg shadow-amber-500/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                            Giảm {v.discountPercent}%
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {v.isUsed ? 'Đã dùng' : isExpired ? 'Hết hạn' : 'Khả dụng'}
                          </span>
                        </div>

                        <div className="my-2.5">
                          <div className="font-mono text-base font-black text-white tracking-wider flex items-center justify-between bg-black/40 px-3 py-1.5 rounded-xl border border-white/[0.08]">
                            <span>{v.code}</span>
                            {!v.isUsed && !isExpired && (
                              <button
                                type="button"
                                onClick={() => handleCopy(v.code)}
                                className="p-1 text-amber-300 hover:text-amber-200 transition"
                                title="Sao chép mã"
                              >
                                {copiedCode === v.code ? (
                                  <Check className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-300 space-y-0.5">
                          <p>• Áp dụng cho đơn từ: <strong className="text-white">{formatVND(v.minOrder)}</strong></p>
                          {v.maxDiscount && (
                            <p>• Giảm tối đa: <strong className="text-amber-300">{formatVND(v.maxDiscount)}</strong></p>
                          )}
                          <p className="text-[10px] text-slate-400">
                            HSD: {new Date(v.expiresAt).toLocaleDateString('vi-VN')}
                          </p>
                        </div>

                        {!v.isUsed && !isExpired && (
                          <Link
                            href="/services"
                            className="mt-3 w-full min-h-[44px] py-2 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-300 text-xs font-bold flex items-center justify-center gap-1 transition"
                          >
                            <span>Dùng ngay</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Thể Lệ & Tỷ Lệ */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-300 space-y-2 leading-relaxed">
                <p>
                  • <strong>Cách nhận vé:</strong> Tự động tích lũy khi nạp tiền (+1 vé / 100k nạp) hoặc người được bạn giới thiệu nạp tiền (+1 vé / 200k F1 nạp).
                </p>
                <p>
                  • <strong>Phần thưởng Tiền Mặt:</strong> Được cộng ngay vào <em>Tiền Mặt Rút Bank</em>, rút trực tiếp về mọi Ngân hàng / ZaloPay / MoMo 24/7.
                </p>
                <p>
                  • <strong>Phần thưởng Voucher:</strong> Tự động lưu vào <em>Kho Voucher</em> của bạn và áp dụng ngay khi thanh toán đơn hàng.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-sky-400/20 text-slate-400">
                      <th className="py-2.5 px-3">Ô</th>
                      <th className="py-2.5 px-3">Phần Thưởng</th>
                      <th className="py-2.5 px-3">Loại Quà</th>
                      <th className="py-2.5 px-3">Điều Kiện Áp Dụng</th>
                      <th className="py-2.5 px-3 text-right">Tỷ Lệ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-400">#0</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-300">Chúc Bạn May Mắn Lần Sau</td>
                      <td className="py-2.5 px-3 text-slate-400">Không có</td>
                      <td className="py-2.5 px-3 text-slate-400">-</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-300">34.0%</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-300">#1</td>
                      <td className="py-2.5 px-3 font-semibold text-amber-300">Voucher Giảm 3%</td>
                      <td className="py-2.5 px-3 text-sky-300">Voucher Shop</td>
                      <td className="py-2.5 px-3 text-slate-300">Đơn từ 50.000đ • HSD 7 ngày</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-300">25.0%</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-300">#2</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-300">Voucher Giảm 5%</td>
                      <td className="py-2.5 px-3 text-sky-300">Voucher Shop</td>
                      <td className="py-2.5 px-3 text-slate-300">Đơn từ 100.000đ • HSD 7 ngày</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-300">18.0%</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-sky-300">#3</td>
                      <td className="py-2.5 px-3 font-semibold text-sky-300">+5.000đ vào Ví Mua Hàng</td>
                      <td className="py-2.5 px-3 text-emerald-300">Số Dư Ví</td>
                      <td className="py-2.5 px-3 text-slate-300">Cộng thẳng vào số dư mua hàng</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-sky-300">12.0%</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-orange-300">#4</td>
                      <td className="py-2.5 px-3 font-semibold text-orange-300">Voucher Giảm 10%</td>
                      <td className="py-2.5 px-3 text-sky-300">Voucher Shop</td>
                      <td className="py-2.5 px-3 text-slate-300">Tối đa 25k • Đơn từ 150.000đ • HSD 7 ngày</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-orange-300">7.0%</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-teal-300">#5</td>
                      <td className="py-2.5 px-3 font-semibold text-teal-300">+10.000đ Tiền Mặt Rút Bank</td>
                      <td className="py-2.5 px-3 text-emerald-400">Tiền Mặt</td>
                      <td className="py-2.5 px-3 text-slate-300">Rút tự do về mọi ngân hàng / ví điện tử</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-teal-300">3.0%</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-yellow-300">#6</td>
                      <td className="py-2.5 px-3 font-semibold text-yellow-300">+50.000đ Tiền Mặt Rút Bank</td>
                      <td className="py-2.5 px-3 text-emerald-400">Tiền Mặt</td>
                      <td className="py-2.5 px-3 text-slate-300">Rút tự do về mọi ngân hàng / ví điện tử</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-yellow-300">0.9%</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-red-400">#7</td>
                      <td className="py-2.5 px-3 font-black text-red-400">
                        <span className="inline-block mr-1.5 px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono text-[9px] uppercase tracking-wider border border-amber-400/30">VIP</span>
                        JACKPOT +200.000đ Tiền Mặt
                      </td>
                      <td className="py-2.5 px-3 text-emerald-400">Tiền Mặt VIP</td>
                      <td className="py-2.5 px-3 text-slate-300">Rút tự do về mọi ngân hàng / ví điện tử</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-red-400">0.1%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Lịch Sử */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {recentLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Chưa có lượt quay nào được ghi nhận.
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {recentLogs.map((l) => (
                    <div key={l.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white font-mono">{l.userName}</span>
                        <span className="text-slate-400 ml-2">quay trúng</span>
                        <span className="font-bold text-amber-300 ml-1.5">{l.prizeName}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(l.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Win Celebration Modal rendered via createPortal */}
      {mounted && winModalPrize && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="max-w-md w-full p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-[#121829] via-[#090d16] to-[#04060b] border border-amber-400/40 shadow-[0_20px_60px_rgba(245,158,11,0.35)] text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 text-black mx-auto flex items-center justify-center shadow-xl shadow-amber-500/30 transition-transform duration-300">
              {winModalPrize.prize?.type === 'CASH' ? (
                <Crown className="w-8 h-8 fill-black stroke-black" />
              ) : winModalPrize.prize?.type === 'WALLET' ? (
                <Wallet className="w-8 h-8 stroke-black" />
              ) : winModalPrize.prize?.type === 'VOUCHER' ? (
                <Gift className="w-8 h-8 stroke-black" />
              ) : (
                <Sparkles className="w-8 h-8 text-black" />
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-xl sm:text-2xl font-black text-white">
                {winModalPrize.prize?.type === 'NOTHING' ? 'Chúc May Mắn Lần Sau!' : 'Chúc Mừng Bạn Đã Trúng!'}
              </h3>
              <p className="text-base font-bold text-amber-300">
                {winModalPrize.prize?.name}
              </p>
            </div>

            {winModalPrize.voucherCode && (
              <div className="p-3.5 rounded-2xl bg-black/50 border border-amber-400/30 space-y-1">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                  Mã Voucher Của Bạn
                </span>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-lg font-black text-white tracking-widest">
                    {winModalPrize.voucherCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(winModalPrize.voucherCode!)}
                    className="p-1 text-amber-300 hover:text-amber-200"
                  >
                    {copiedCode === winModalPrize.voucherCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">Đã lưu tự động vào Kho Voucher của bạn</p>
              </div>
            )}

            {winModalPrize.prize?.type === 'WALLET' && (
              <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-400/30 text-xs text-sky-200 leading-relaxed text-left space-y-1.5">
                <div className="font-bold text-sky-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Cộng Thẳng Vào Ví Mua Hàng</span>
                </div>
                <p>
                  Tiền thưởng đã được cộng trực tiếp vào <strong>Ví Mua Hàng</strong> của bạn! Bạn có thể sử dụng ngay để mua dịch vụ hoặc tài khoản.
                </p>
              </div>
            )}

            {winModalPrize.prize?.type === 'CASH' && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 text-xs text-emerald-200 leading-relaxed text-left space-y-1.5">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Cộng Thẳng Vào Sổ Hoa Hồng (Miễn Phí Rút 0đ)</span>
                </div>
                <p>
                  🎉 Tiền thưởng đã được cộng thẳng vào <strong>Sổ Hoa Hồng</strong>! Bạn có thể sang mục <strong>Rút Tiền Hoa Hồng</strong> để rút về Ngân hàng / Ví mà không mất phí rút (0đ).
                </p>
              </div>
            )}

            <div className="space-y-2 pt-1">
              {winModalPrize.prize?.type === 'CASH' && (
                <Link
                  href="/affiliate"
                  onClick={() => setWinModalPrize(null)}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Rút Tiền Hoa Hồng (0đ Phí)</span>
                </Link>
              )}

              {winModalPrize.prize?.type === 'WALLET' && (
                <Link
                  href="/wallet"
                  onClick={() => setWinModalPrize(null)}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-400 hover:from-sky-400 hover:to-blue-300 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 active:scale-95 transition"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Xem Số Dư Ví Mua Hàng</span>
                </Link>
              )}

              {winModalPrize.voucherCode && (
                <Link
                  href="/services"
                  onClick={() => setWinModalPrize(null)}
                  className="w-full min-h-[44px] py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition"
                >
                  <Gift className="w-4 h-4" />
                  <span>Dùng Voucher Mua Hàng Ngay</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => setWinModalPrize(null)}
                className={`w-full py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition ${
                  winModalPrize.prize?.type === 'NOTHING'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg shadow-amber-500/20'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                }`}
              >
                Tiếp Tục Quay
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
