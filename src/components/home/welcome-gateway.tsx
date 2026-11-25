'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Wallet,
  Send,
  Zap,
  HelpCircle,
  ChevronDown,
  Lock,
  Layers,
  Award,
  TrendingUp,
  MessageCircle,
  Video,
  ThumbsUp,
  Flame,
  Bot,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { ADMIN_TELEGRAM_URL, ADMIN_SUPPORT_LABEL } from '@/lib/constants';

interface WelcomeGatewayProps {
  onEnterStore: (category?: string) => void;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  pulseSpeed: number;
}

export function WelcomeGateway({ onEnterStore }: WelcomeGatewayProps) {
  const { user, profile } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const displayName = profile?.fullName || user?.email?.split('@')[0] || 'Quý Khách';

  // 60fps Perspective Grid + Gold Dust Canvas VFX
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Init ambient gold particles
    const particleCount = Math.min(36, Math.floor(width / 35));
    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.8,
      speedY: -(Math.random() * 0.35 + 0.15),
      speedX: (Math.random() - 0.5) * 0.2,
      opacity: Math.random() * 0.5 + 0.2,
      pulseSpeed: Math.random() * 0.02 + 0.008,
    }));

    let gridOffset = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Perspective 3D Depth Grid
      gridOffset = (gridOffset + 0.35) % 40;
      const horizonY = height * 0.45;

      ctx.save();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.05)';
      ctx.lineWidth = 1;

      // Vertical perspective lines
      const vanishingX = width / 2;
      const lineSpread = Math.max(width * 1.5, 1200);
      const step = 60;
      for (let x = -lineSpread / 2; x <= lineSpread / 2; x += step) {
        ctx.beginPath();
        ctx.moveTo(vanishingX, horizonY);
        ctx.lineTo(vanishingX + x * 2.2, height);
        ctx.stroke();
      }

      // Horizontal depth lines
      for (let y = horizonY; y < height; y += 40) {
        const adjustedY = ((y - horizonY + gridOffset) % (height - horizonY)) + horizonY;
        const depthAlpha = ((adjustedY - horizonY) / (height - horizonY)) * 0.12;
        ctx.strokeStyle = `rgba(245, 158, 11, ${depthAlpha})`;
        ctx.beginPath();
        ctx.moveTo(0, adjustedY);
        ctx.lineTo(width, adjustedY);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Ambient Gold Dust Particles
      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.opacity += Math.sin(Date.now() * p.pulseSpeed) * 0.005;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.fillStyle = `rgba(245, 158, 11, ${Math.max(0.1, Math.min(0.65, p.opacity))})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Central ambient gold flare
      const glowGrad = ctx.createRadialGradient(
        width / 2,
        height * 0.28,
        0,
        width / 2,
        height * 0.28,
        Math.min(width, height) * 0.55
      );
      glowGrad.addColorStop(0, 'rgba(245, 158, 11, 0.12)');
      glowGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.04)');
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleEnterStore = (category?: string) => {
    try {
      sessionStorage.setItem('yuki_gateway_entered', 'true');
    } catch {}
    onEnterStore(category);
  };

  // Nền tảng shop hỗ trợ (8 nền tảng thực tế)
  const platforms = [
    { name: 'Facebook', badge: 'FB Meta', color: 'from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/30' },
    { name: 'TikTok', badge: 'TikTok Video', color: 'from-cyan-500/20 to-pink-500/10 text-cyan-300 border-cyan-400/30' },
    { name: 'Instagram', badge: 'IG Reels', color: 'from-pink-500/20 to-purple-600/10 text-pink-400 border-pink-500/30' },
    { name: 'YouTube', badge: 'YT Shorts', color: 'from-red-500/20 to-red-600/10 text-red-400 border-red-500/30' },
    { name: 'Telegram', badge: 'Tele Channel', color: 'from-sky-500/20 to-sky-600/10 text-sky-400 border-sky-400/30' },
    { name: 'ChatGPT', badge: 'Plus / Team', color: 'from-emerald-500/20 to-teal-600/10 text-emerald-400 border-emerald-500/30' },
    { name: 'Google Gemini', badge: 'Advanced AI', color: 'from-sky-500/20 to-blue-600/10 text-sky-300 border-sky-400/30' },
    { name: 'Claude AI', badge: 'Claude Pro', color: 'from-amber-500/20 to-orange-600/10 text-amber-300 border-amber-400/30' },
  ];

  // 6 Thẻ Dịch Vụ Của Chúng Tôi
  const services = [
    {
      id: 'ai',
      icon: Bot,
      title: 'Tài Khoản AI & Bản Quyền Chính Chủ',
      desc: 'Nâng cấp chính chủ và tài khoản dùng riêng ổn định, bàn giao nhanh kèm chế độ bảo hành rõ ràng.',
      tags: ['ChatGPT Plus/Pro', 'Google Gemini', 'Claude Pro', 'Hoàn điểm 2%'],
      onClick: () => handleEnterStore('AI'),
    },
    {
      id: 'tiktok',
      icon: Flame,
      title: 'Tăng Trưởng TikTok',
      desc: 'Tăng phạm vi tiếp cận và cải thiện tương tác tự nhiên cho video và kênh bán hàng.',
      tags: ['Lượt xem', 'Lượt thích', 'Theo dõi', 'Bình luận'],
      onClick: () => {
        handleEnterStore();
        window.location.href = '/buff?platform=tiktok';
      },
    },
    {
      id: 'facebook',
      icon: ThumbsUp,
      title: 'Tiếp Thị Facebook',
      desc: 'Xây dựng độ tin cậy cho bài viết bán hàng, trang cá nhân và Fanpage kinh doanh.',
      tags: ['Lượt thích bài viết', 'Theo dõi', 'Cảm xúc'],
      onClick: () => {
        handleEnterStore();
        window.location.href = '/buff?platform=facebook';
      },
    },
    {
      id: 'instagram-youtube',
      icon: Video,
      title: 'Tăng Trưởng Instagram & YouTube',
      desc: 'Mở rộng độ phủ thương hiệu cá nhân và tăng chỉ số tương tác ổn định trên từng bài đăng.',
      tags: ['Người theo dõi', 'Lượt thích', 'Lượt xem'],
      onClick: () => {
        handleEnterStore();
        window.location.href = '/buff?platform=instagram';
      },
    },
    {
      id: 'telegram',
      icon: MessageCircle,
      title: 'Phát Triển Kênh Telegram',
      desc: 'Tăng thành viên nhóm/kênh cộng đồng và lượt xem bài viết tự động đều đặn.',
      tags: ['Thành viên kênh', 'Lượt xem bài viết'],
      onClick: () => {
        handleEnterStore();
        window.location.href = '/buff?platform=telegram';
      },
    },
    {
      id: 'rewards',
      icon: Award,
      title: 'Đặc Quyền Thành Viên YUKISHOP',
      desc: 'Tích lũy nạp nhận vé quay trúng tiền mặt rút về ngân hàng và chia sẻ hoa hồng trọn đời.',
      tags: ['Vòng Quay 200K', 'Hoa Hồng 5%', 'Đua Top Tháng'],
      onClick: () => {
        handleEnterStore();
        window.location.href = '/spin';
      },
    },
  ];

  // 5 Thẻ Vì Sao Chọn Chúng Tôi
  const reasons = [
    {
      icon: Zap,
      title: 'Nạp Tiền VietQR Tự Động 24/7',
      desc: 'Quét mã chuyển khoản ngân hàng nhận số dư tự động chỉ sau 5–15 giây, không cần chờ duyệt tay.',
    },
    {
      icon: Lock,
      title: 'An Toàn & Không Cần Mật Khẩu',
      desc: 'Mọi dịch vụ tăng tương tác chỉ yêu cầu đường dẫn công khai, bảo mật tuyệt đối tài khoản khách hàng.',
    },
    {
      icon: ShieldCheck,
      title: 'Bảo Hành & Tự Động Bù Minh Bạch',
      desc: 'Các gói có ký hiệu bảo hành được hỗ trợ kiểm tra và xử lý bù nhanh chóng ngay trên web.',
    },
    {
      icon: Coins,
      title: 'Hoàn Điểm 2% & Vòng Quay May Mắn',
      desc: 'Tích điểm hoàn mỗi đơn từ 20.000đ và nhận thêm vé quay trúng Voucher hoặc tiền mặt rút về Bank khi nạp từ 100.000đ.',
    },
    {
      icon: Send,
      title: 'Hỗ Trợ Trực Tiếp Qua Telegram',
      desc: 'Kết nối trực tiếp Admin @YukiIsMe2311 và theo dõi Kênh Telegram Update Tech & Shop cập nhật công nghệ & ưu đãi mới mỗi ngày.',
    },
  ];

  // 4 Câu Hỏi Thường Gặp
  const faqs = [
    {
      question: 'Nạp tiền vào ví bao lâu thì nhận được số dư?',
      answer:
        'Hệ thống tích hợp xử lý giao dịch VietQR hoàn toàn tự động 24/7. Ngay khi quý khách quét mã và hoàn tất chuyển khoản chính xác nội dung hiển thị trên màn hình nạp, số dư sẽ được cộng vào ví của bạn chỉ trong 5 đến 15 giây mà không cần chờ duyệt thủ công.',
    },
    {
      question: 'Dịch vụ tăng tương tác có cần cung cấp mật khẩu tài khoản không?',
      answer:
        'Tuyệt đối không. YUKISHOPMXH chỉ yêu cầu liên kết công khai (URL bài viết, video, fanpage hoặc trang cá nhân). Chúng tôi không bao giờ hỏi mật khẩu, mã OTP hay quyền truy cập riêng tư của tài khoản khách hàng dưới bất kỳ hình thức nào.',
    },
    {
      question: 'Làm sao để nhận Vé Quay May Mắn và rút tiền thưởng về ngân hàng?',
      answer:
        'Quý khách sẽ tự động nhận 1 Vé Quay May Mắn cho mỗi 100.000đ nạp ví thành công, hoặc khi tuyến dưới (F1) của bạn nạp từ 200.000đ. Toàn bộ tiền mặt trúng thưởng từ Vòng Quay (lên đến 200.000đ/lần) được cộng thẳng vào Sổ Hoa Hồng và bạn có thể rút về tài khoản ngân hàng hoặc ví điện tử hoàn toàn miễn phí (0đ phí).',
    },
    {
      question: 'Chế độ hoàn điểm 2% và bảo hành đơn hàng hoạt động như thế nào?',
      answer:
        'Mọi đơn hàng từ 20.000đ đều được tự động tích lũy hoàn 2% điểm thưởng về ví sau khi hoàn tất. Đối với dịch vụ có tag bảo hành ([BH: 30N], [BH: 60N], [BH: TRỌN ĐỜI]), nếu xảy ra hiện tượng tụt số lượng trong thời hạn cam kết, bạn chỉ cần bấm yêu cầu bảo hành tại mục Đơn Hàng để hệ thống xử lý bù tự động.',
    },
  ];

  return (
    <div className="relative w-full text-slate-100">
      {/* 60fps Canvas VFX nền chạy ngầm */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0 block"
      />

      {/* 1. THANH TRẠNG THÁI HỆ THỐNG TRỰC TUYẾN (LIVE STATUS TICKER) */}
      <section className="relative z-10 w-full max-w-5xl mx-auto px-4 pt-3 pb-2">
        <div className="flex items-center justify-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#090D18]/90 border border-white/[0.08] backdrop-blur-xl text-center shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <p className="text-[11px] sm:text-xs font-medium text-slate-300 truncate">
            Hệ thống nạp VietQR tự động 24/7 & xử lý đơn Buff MXH trực tuyến — Kênh Update Tech & Shop
          </p>
        </div>
      </section>

      {/* 2. KHU VỰC MỞ ĐẦU (HERO SECTION) */}
      <section className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-10 text-center flex flex-col items-center">
        {/* Emblem & Logo GIF */}
        <div className="flex items-center gap-3 mb-6">
          <img
            src="/assets/images/logo-fx.gif"
            alt="YUKISHOPMXH Emblem"
            onError={(e) => {
              e.currentTarget.src = '/assets/images/logo.png';
            }}
            className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-2xl border border-amber-400/30 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
          />
          <div className="text-left">
            <div className="text-base sm:text-lg font-black tracking-wider text-white">
              YUKISHOP<span className="text-amber-400">MXH</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
              Automated Digital Ecosystem
            </div>
          </div>
        </div>

        {/* Clean Hero Banner GIF frame (Pure <img>, zero overlay text) */}
        <div className="w-full max-w-2xl mb-8 relative group">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-amber-500/20 via-sky-500/20 to-amber-500/20 blur-xl opacity-75 group-hover:opacity-100 transition duration-1000" />
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-amber-400/30 bg-[#07090e] shadow-[0_16px_40px_rgba(0,0,0,0.7)]">
            <img
              src="/assets/images/hero-banner.gif"
              alt="YUKISHOPMXH Banner"
              onError={(e) => {
                e.currentTarget.src = '/assets/images/hero-banner.png';
              }}
              className="w-full h-auto object-cover block"
            />
          </div>
        </div>

        {/* Tiêu đề chính lớn, đậm, dứt khoát */}
        <div className="space-y-3.5 max-w-3xl mb-8">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            Hệ thống Tài khoản AI &amp; <br className="hidden sm:inline" />
            <span className="text-amber-300">
              Dịch vụ Mạng xã hội
            </span>{' '}
            <br className="hidden sm:inline" />
            tự động và uy tín
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed max-w-xl mx-auto">
            Nạp VietQR cộng tiền sau 5 giây, bảo hành minh bạch, hoàn điểm 2% mỗi đơn.
          </p>
        </div>

        {/* 2 Nút hành động đặt ngang hàng (grid-cols-2, 48px, rounded-2xl) */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-md mx-auto w-full mb-10">
          <button
            type="button"
            onClick={() => handleEnterStore()}
            className="h-12 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-[#07090E] font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_8px_25px_rgba(245,158,11,0.35)] active:scale-[0.98] transition group"
          >
            <span>Khám Phá Cửa Hàng</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform stroke-[2.5]" />
          </button>

          {user ? (
            <Link
              href="/wallet"
              className="h-12 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.12] text-xs sm:text-sm font-bold text-slate-200 flex items-center justify-center gap-2 transition backdrop-blur-md active:scale-[0.98]"
            >
              <Wallet className="w-4 h-4 text-amber-300" />
              <span className="truncate">Ví Tiền Của Tôi</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="h-12 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.12] text-xs sm:text-sm font-bold text-slate-200 flex items-center justify-center gap-2 transition backdrop-blur-md active:scale-[0.98]"
            >
              <span>Đăng Nhập / Đăng Ký</span>
            </Link>
          )}
        </div>

        {/* Dải Nền Tảng Chạy Ngang Mượt (Infinite Smooth Marquee) */}
        <div className="w-full max-w-4xl overflow-hidden py-3 border-y border-white/[0.06] relative">
          {/* Gradient fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#07090E] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#07090E] to-transparent z-10 pointer-events-none" />

          <div className="animate-smooth-marquee flex items-center gap-3">
            {/* Set 1 */}
            {platforms.map((p, idx) => (
              <div
                key={`p1-${idx}`}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r ${p.color} border shrink-0`}
              >
                <span className="w-2 h-2 rounded-full bg-current opacity-80" />
                <span className="text-xs font-bold text-white">{p.name}</span>
                <span className="text-[10px] text-slate-300 opacity-80">({p.badge})</span>
              </div>
            ))}
            {/* Set 2 for smooth loop */}
            {platforms.map((p, idx) => (
              <div
                key={`p2-${idx}`}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r ${p.color} border shrink-0`}
              >
                <span className="w-2 h-2 rounded-full bg-current opacity-80" />
                <span className="text-xs font-bold text-white">{p.name}</span>
                <span className="text-[10px] text-slate-300 opacity-80">({p.badge})</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. KHU VỰC DỊCH VỤ CỦA CHÚNG TÔI (THẺ LỚN BO GÓC ROUNDED-3XL CÓ TAG CON) */}
      <section className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/25 text-[11px] font-bold text-amber-300 uppercase tracking-wider">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Hệ Thống Danh Mục Thực Tế</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Dịch Vụ Của Chúng Tôi
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Khám phá các giải pháp công nghệ bản quyền và tăng trưởng truyền thông tự động
          </p>
        </div>

        {/* Grid 1 cột mobile, 2 cột desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {services.map((srv) => {
            const Icon = srv.icon;
            return (
              <div
                key={srv.id}
                onClick={srv.onClick}
                className="group p-6 sm:p-7 rounded-3xl bg-[#090D18]/90 border border-white/[0.08] hover:border-amber-400/40 transition duration-300 flex flex-col justify-between space-y-4 backdrop-blur-xl cursor-pointer shadow-[0_8px_30px_rgba(0,0,0,0.5)] active:scale-[0.99]"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="w-12 h-12 rounded-2xl bg-amber-500/12 border border-amber-400/25 text-amber-300 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition">
                      <Icon className="w-6 h-6" strokeWidth={1.8} />
                    </span>
                    <span className="text-xs font-semibold text-slate-400 group-hover:text-amber-300 transition flex items-center gap-1">
                      <span>Mở ngay</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-white group-hover:text-amber-200 transition">
                    {srv.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {srv.desc}
                  </p>
                </div>

                {/* Hàng thẻ tag con bo tròn rounded-full */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.05]">
                  {srv.tags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/[0.04] border border-white/[0.08] text-slate-300 group-hover:border-amber-400/25 group-hover:text-amber-300 transition"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. KHU VỰC VÌ SAO NÊN CHỌN CHÚNG TÔI (5 THẺ SẠCH SẼ, TÍNH NĂNG THẬT) */}
      <section className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/25 text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Tiêu Chuẩn Vận Hành Minh Bạch</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Vì Sao Nên Chọn Chúng Tôi
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Cam kết mang lại trải nghiệm tiện lợi, bảo mật tuyệt đối và bảo hành rõ ràng
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {reasons.map((r, rIdx) => {
            const Icon = r.icon;
            return (
              <div
                key={rIdx}
                className="p-5 sm:p-6 rounded-3xl bg-[#090D18]/85 border border-white/[0.08] space-y-3 backdrop-blur-xl shadow-[0_6px_24px_rgba(0,0,0,0.4)]"
              >
                <span className="w-10 h-10 rounded-2xl bg-amber-500/12 border border-amber-400/25 text-amber-300 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" strokeWidth={1.8} />
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-white">
                  {r.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {r.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. KHU VỰC CÂU HỎI THƯỜNG GẶP (FAQ ACCORDION) */}
      <section className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center max-w-xl mx-auto mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-400/10 border border-sky-400/25 text-[11px] font-bold text-sky-300 uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Giải Đáp Thắc Mắc</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Câu Hỏi Thường Gặp
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Những thông tin cần biết trước khi bắt đầu sử dụng dịch vụ tại YUKISHOPMXH
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, fIdx) => {
            const isOpen = openFaq === fIdx;
            return (
              <div
                key={fIdx}
                className="rounded-2xl sm:rounded-3xl bg-[#090D18]/90 border border-white/[0.08] overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : fIdx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-white/[0.02] transition"
                >
                  <span className="text-xs sm:text-sm font-bold text-white">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-amber-400 shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : 'rotate-0'
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/[0.04]">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CTA cuối trang Cổng Chào */}
        <div className="mt-10 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-transparent border border-amber-400/30 flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left backdrop-blur-xl">
          <div className="space-y-1">
            <div className="text-base sm:text-lg font-black text-white">
              Sẵn sàng trải nghiệm dịch vụ tự động?
            </div>
            <p className="text-xs text-slate-300">
              Quét mã VietQR nhận số dư sau 5 giây, bảo hành minh bạch và hoàn 2% mỗi đơn.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleEnterStore()}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-[#07090E] font-black text-xs sm:text-sm uppercase tracking-wider inline-flex items-center justify-center gap-2 shadow-[0_8px_25px_rgba(245,158,11,0.35)] transition shrink-0 active:scale-[0.98]"
          >
            <span>Khám Phá Cửa Hàng Ngay</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </section>
    </div>
  );
}
