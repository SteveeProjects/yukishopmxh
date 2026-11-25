'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { BRANDS_CATALOG, PackageVariant } from '@/lib/catalog/brands-data';
import { getDeliveryModeMeta, normalizeDeliveryMode } from '@/lib/catalog/delivery-modes';
import { PreOrderModal } from '@/components/common/pre-order-modal';
import { calculateVipTier, isVipDiscountApplicable } from '@/lib/vip';
import { loadOrderDraft, saveOrderDraft, clearOrderDraft } from '@/lib/order-draft';
import {
  ShoppingBag,
  Tag,
  Check,
  ShieldCheck,
  Wallet,
  ArrowRight,
  AlertCircle,
  Clock,
  Sparkles,
  Send,
  MessageCircle,
  Plus,
  Minus,
  CheckCircle2,
  Phone,
  FileText,
  UserCheck,
} from 'lucide-react';
import { ADMIN_TELEGRAM_URL, ADMIN_SUPPORT_LABEL } from '@/lib/constants';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const skuParam = searchParams.get('sku') || 'CHATGPT-PLUS-30D';
  const qtyParam = parseInt(searchParams.get('qty') || '1', 10);

  const { user, profile, role, wallet, lifetimeDeposit, refreshUserData } = useAuth();

  // Find package in catalog
  let selectedPkg: PackageVariant | undefined;
  let brandName = '';
  for (const brand of BRANDS_CATALOG) {
    const found = brand.packages.find((p) => p.sku === skuParam);
    if (found) {
      selectedPkg = found;
      brandName = brand.name;
      break;
    }
  }

  // Fallback if sku not matched
  const initialPkg: PackageVariant = selectedPkg || {
    sku: skuParam,
    name: 'Sản phẩm số dịch vụ',
    price: 220000,
    originalPrice: 490000,
    duration: '30 Ngày',
    durationDays: 30,
    status: 'ACTIVE',
    fulfillmentMode: 'MANUAL',
    warranty: 'Bảo hành đầy đủ kỳ hạn',
    benefits: ['Bản quyền chính thức'],
    usageConditions: ['Tuân thủ điều khoản'],
    stock: 10,
  };

  const [pkg, setPkg] = useState<PackageVariant>(initialPkg);

  useEffect(() => {
    fetch('/api/catalog', { cache: 'no-store', credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.products) {
          const found = data.products.find((p: any) => p.sku === skuParam);
          if (found) {
            setPkg({
              sku: found.sku,
              name: found.name,
              price: Number(found.sell_price),
              originalPrice: Number(found.original_price || found.originalPrice || found.sell_price * 1.5),
              duration: 'Theo Gói',
              durationDays: found.warranty_days ?? 30,
              status: found.status,
              fulfillmentMode: found.fulfillment_mode === 'AUTO' ? 'AUTO' : 'MANUAL',
              fulfillment_mode: found.fulfillment_mode || 'MANUAL',
              warranty: found.description || 'Bảo hành đầy đủ kỳ hạn',
              warranty_days: found.warranty_days,
              benefits: ['Bản quyền chính thức'],
              usageConditions: ['Tuân thủ điều khoản'],
              stock: Number(found.stock || 50),
              allow_voucher: found.allow_voucher,
              allowVoucher: found.allow_voucher,
              input_type: found.delivery_mode || found.input_type,
              delivery_mode: found.delivery_mode || found.input_type,
              custom_input_label: found.custom_input_label,
              requires_credentials: found.requires_credentials,
            });
          }
        }
      })
      .catch(() => {});
  }, [skuParam]);

  const [quantity, setQuantity] = useState(qtyParam > 0 ? qtyParam : 1);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreOrderModalOpen, setIsPreOrderModalOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Delivery Info Fields
  const [telegramId, setTelegramId] = useState('');
  const [zaloPhone, setZaloPhone] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [accountLogin, setAccountLogin] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountTwoFa, setAccountTwoFa] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [resolvedUser, setResolvedUser] = useState<{
    username: string | null;
    fullName: string;
    chatUrl: string;
  } | null>(null);
  const [resolvingUser, setResolvingUser] = useState(false);

  // Hydrate & persist Auto-Save Draft
  useEffect(() => {
    const draft = loadOrderDraft();
    if (draft) {
      if (draft.deliveryContact && !telegramId) setTelegramId(draft.deliveryContact);
      if (draft.notes && !customerNotes) setCustomerNotes(draft.notes);
    }
  }, []);

  useEffect(() => {
    saveOrderDraft({
      sku: pkg.sku,
      quantity,
      deliveryContact: telegramId || zaloPhone,
      notes: customerNotes,
      couponCode,
    });
  }, [pkg.sku, quantity, telegramId, zaloPhone, customerNotes, couponCode]);

  // Initialize telegramId from profile
  useEffect(() => {
    if (profile?.telegramId) {
      setTelegramId(String(profile.telegramId));
    }
  }, [profile]);

  // Debounced Telegram lookup (500ms)
  useEffect(() => {
    const cleanId = telegramId.trim().replace(/^@/, '');
    if (!cleanId || !/^\d{5,15}$/.test(cleanId)) {
      setResolvedUser(null);
      return;
    }

    setResolvingUser(true);
    const timer = setTimeout(() => {
      fetch('/api/telegram/resolve-user', {
        cache: 'no-store',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: cleanId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setResolvedUser({
              username: data.username,
              fullName: data.fullName,
              chatUrl: data.chatUrl,
            });
          } else {
            setResolvedUser(null);
          }
        })
        .catch(() => {
          setResolvedUser(null);
        })
        .finally(() => {
          setResolvingUser(false);
        });
    }, 500);

    return () => clearTimeout(timer);
  }, [telegramId]);

  const deliveryMode = normalizeDeliveryMode(pkg.delivery_mode || pkg.input_type, pkg.sku);
  const deliveryModeMeta = getDeliveryModeMeta(deliveryMode, pkg.sku);
  const isFamilyEmailRequired = deliveryMode === 'email_only';
  const isCredentialsRequired = deliveryMode === 'credentials' || deliveryMode === 'credentials_2fa';
  const isTwoFaRequired = deliveryMode === 'credentials_2fa';
  const isAdminDelivered = deliveryMode === 'admin_deliver';
  const isContactAdminMode = deliveryMode === 'contact_admin';
  const combinedCredentials = isCredentialsRequired
    ? [accountLogin.trim(), accountPassword.trim(), accountTwoFa.trim()].filter(Boolean).join(' | ')
    : '';

  const isVoucherBlocked = Boolean(
    pkg.allow_voucher === false ||
    pkg.allowVoucher === false ||
    pkg.sku?.startsWith('API-TOOL-SMS') ||
    /api.*sms/i.test(pkg.name)
  );

  // VIP Tier calculation based on lifetime total deposited
  const vipInfo = calculateVipTier(lifetimeDeposit);
  const canApplyVip = isVipDiscountApplicable({ sku: pkg.sku, name: pkg.name });
  const vipDiscountPercent = canApplyVip ? vipInfo.discountPercent : 0;

  const subtotal = pkg.price * quantity;
  const vipDiscountAmount = Math.round((subtotal * vipDiscountPercent) / 100);
  const effectiveCouponDiscount = isVoucherBlocked ? 0 : couponDiscount;
  const finalTotal = Math.max(0, subtotal - effectiveCouponDiscount - vipDiscountAmount);

  const formatVND = (amt: number) => {
    return new Intl.NumberFormat('vi-VN').format(amt) + 'đ';
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    setValidatingCoupon(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        cache: 'no-store',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          orderAmount: subtotal,
          applicableTo: 'PRODUCT',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Mã giảm giá không hợp lệ.');
      }
      setCouponDiscount(data.coupon.discount_amount);
      setAppliedCoupon(data.coupon);
      setCouponApplied(true);
    } catch (err: any) {
      setCouponDiscount(0);
      setAppliedCoupon(null);
      setCouponApplied(false);
      setCouponError(err.message || 'Lỗi kiểm tra mã giảm giá.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponDiscount(0);
    setAppliedCoupon(null);
    setCouponApplied(false);
    setCouponError(null);
  };

  const onStartCheckout = () => {
    setOrderError(null);

    if (!user) {
      router.push(`/login?next=/checkout?sku=${skuParam}&qty=${quantity}`);
      return;
    }

    const cleanTele = telegramId.trim();
    const cleanZalo = zaloPhone.trim();
    const cleanEmail = googleEmail.trim();

    if (isFamilyEmailRequired) {
      if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        setOrderError('Vui lòng nhập chính xác Email Google nhận lời mời Family (Bắt buộc)!');
        return;
      }
    } else if (!cleanTele && !cleanZalo) {
      setOrderError('Vui lòng nhập ít nhất ID Telegram hoặc Số điện thoại Zalo để nhận đơn bàn giao!');
      return;
    }

    if (isCredentialsRequired) {
      if (!accountLogin.trim() || !accountPassword.trim()) {
        setOrderError('Vui lòng nhập đầy đủ Tài khoản và Mật khẩu cần nâng cấp (Bắt buộc)!');
        return;
      }
      if (isTwoFaRequired && !accountTwoFa.trim()) {
        setOrderError('Gói này yêu cầu nhập thêm Mã 2FA / Backup Code!');
        return;
      }
    }

    setIsPreOrderModalOpen(true);
  };

  const handleCheckout = async () => {
    setOrderError(null);

    if (!user) {
      setOrderError('Vui lòng đăng nhập trước khi thực hiện thanh toán');
      return;
    }

    const cleanTele = telegramId.trim();
    const cleanZalo = zaloPhone.trim();
    const cleanEmail = googleEmail.trim();

    if (isFamilyEmailRequired) {
      if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        setOrderError('Vui lòng nhập đúng Email Google nhận lời mời Family!');
        return;
      }
    } else if (!cleanTele && !cleanZalo) {
      setOrderError('Vui lòng cung cấp ít nhất ID Telegram hoặc Số Zalo để Admin liên hệ giao hàng!');
      return;
    }

    if (isCredentialsRequired && (!accountLogin.trim() || !accountPassword.trim())) {
      setOrderError('Vui lòng nhập đầy đủ Tài khoản và Mật khẩu!');
      return;
    }

    const contactStr = [
      cleanEmail ? `Google Email: ${cleanEmail}` : '',
      cleanTele ? `Tele: ${cleanTele}` : '',
      cleanZalo ? `Zalo: ${cleanZalo}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    setIsProcessing(true);
    try {
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: pkg.sku,
          name: `${brandName ? `${brandName} - ` : ''}${pkg.name}`,
          item_name: `${brandName ? `${brandName} - ` : ''}${pkg.name}`,
          amount: finalTotal,
          quantity: quantity,
          telegram_id: cleanTele || undefined,
          telegramId: cleanTele || undefined,
          zalo_phone: cleanZalo || undefined,
          zaloPhone: cleanZalo || undefined,
          account_credentials: isCredentialsRequired ? combinedCredentials : undefined,
          notes: customerNotes.trim() || undefined,
          delivery_contact: contactStr,
          customerContact: contactStr,
          service_type: 'MUA_SAN_PHAM',
          coupon_code: !isVoucherBlocked && couponApplied ? couponCode.trim().toUpperCase() : undefined,
        }),
      });

      const resData = await response.json();

      if (resData.success && resData.order) {
        clearOrderDraft();
        setOrderSuccess(resData.order.order_code);
        setIsPreOrderModalOpen(false);
        await refreshUserData();
        setTimeout(() => {
          router.push('/orders');
        }, 550);
      } else {
        setOrderError(resData.message || resData.error || 'Không thể tạo đơn hàng. Vui lòng thử lại!');
        setIsProcessing(false);
      }
    } catch (err: any) {
      setOrderError('Lỗi kết nối khi gửi đơn hàng: ' + (err.message || 'Thử lại sau'));
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 py-2 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white">
          Thanh Toán Đơn Hàng (Atomic Checkout)
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Hệ thống xác thực đơn giá server-side, bảo vệ chống trừ ví hai lần qua Idempotency Key.
        </p>
      </div>

      {orderSuccess ? (
        <div className="p-8 rounded-2xl bg-[#0F172E] border border-emerald-500/50 text-center space-y-4 max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold font-display text-white">Đặt Đơn Thành Công!</h2>
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-bold animate-pulse">
            Đặt đơn thành công — Đang chuyển sang Kho đơn hàng...
          </div>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            Mã đơn hàng: <strong className="font-mono text-sky-400">{orderSuccess}</strong>. Đơn hàng đã được trừ ví nguyên tử và chuyển vào hàng đợi xử lý của Admin.
          </p>

          {/* Mandatory Warning Notice & Contact Buttons */}
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-left text-xs text-slate-300 space-y-3 max-w-md mx-auto">
            <p className="leading-relaxed">
              <strong>Lưu ý:</strong> Hiện tại hệ thống chưa tích hợp API xử lý tự động. Sau khi đặt đơn thành công, vui lòng nhắn tin trực tiếp cho Admin để được kiểm tra và kích hoạt nhanh nhất.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <a
                href="https://t.me/YukiIsMe2311"
                target="_blank"
                rel="noopener noreferrer"
                className="touch-target py-2 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-sky-300 font-bold text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <Send className="w-3.5 h-3.5 text-sky-400" strokeWidth={1.75} />
                <span>Liên Hệ Admin (@YukiIsMe2311)</span>
              </a>
              <a
                href="https://discord.com/users/1312037242331729971"
                target="_blank"
                rel="noopener noreferrer"
                className="touch-target py-2 px-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Liên Hệ Discord</span>
              </a>
            </div>
          </div>

          <div className="pt-3 flex flex-wrap justify-center gap-3">
            <Link
              href="/orders"
              className="touch-target px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs"
            >
              Xem Đơn Hàng Của Tôi
            </Link>
            <Link
              href="/services"
              className="touch-target px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
            >
              Tiếp Tục Mua Sắm
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Package details & Delivery contact */}
          <div className="lg:col-span-7 space-y-5">
            {/* Mandatory Warning Notice Banner */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-2.5">
              <div className="flex items-start gap-2">
                <span className="text-base shrink-0">⚠️</span>
                <p className="leading-relaxed">
                  <strong>Lưu ý:</strong> Hiện tại hệ thống chưa tích hợp API xử lý tự động. Sau khi đặt đơn thành công, vui lòng nhắn tin trực tiếp cho Admin để được kiểm tra và kích hoạt nhanh nhất.
                </p>
              </div>
              <a
                href="https://t.me/YukiIsMe2311"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-sky-300 font-bold text-xs transition shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>💬 Liên Hệ Admin Ngay (@YukiIsMe2311) ↗</span>
              </a>
            </div>

            {/* Item Summary Card */}
            <div className="p-5 rounded-2xl bg-[#0F172E] border border-slate-800 space-y-4">
              <div className="flex justify-between items-start pb-4 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                    {brandName || 'Sản Phẩm'}
                  </span>
                  <h3 className="font-bold text-base text-white mt-1">{pkg.name}</h3>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">SKU: {pkg.sku}</div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span>Thời hạn: {pkg.duration}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-base text-sky-400">{formatVND(pkg.price)}</div>
                  {pkg.originalPrice ? (
                    <div className="text-xs text-slate-500 line-through font-mono">{formatVND(pkg.originalPrice)}</div>
                  ) : null}
                </div>
              </div>

              {/* Delivery & Input Mode Badge */}
              {isAdminDelivered && (
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-200 text-xs font-semibold">
                  <span>🔑 Tài khoản cấp sẵn — Admin bàn giao sau khi duyệt</span>
                </div>
              )}
              {isCredentialsRequired && (
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs font-semibold">
                  <span>⚡ Nâng cấp trực tiếp trên tài khoản chính chủ của bạn</span>
                </div>
              )}
              {isFamilyEmailRequired && (
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-sky-500/10 border border-sky-500/25 text-sky-200 text-xs font-semibold">
                  <span>📧 Nâng cấp Add Family / Slot riêng tư (Chỉ cần Email Google)</span>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-slate-300">Số lượng cần mua:</span>
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white flex items-center justify-center transition"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-12 text-center bg-transparent font-bold text-white text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Delivery Info Section */}
            <div className="p-5 rounded-2xl bg-[#0F172E] border border-cyan-500/30 space-y-4 shadow-lg shadow-cyan-500/5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <UserCheck className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-white">📬 Thông Tin Nhận Đơn Bàn Giao (Admin Duyệt Tay)</h3>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed bg-sky-500/10 border border-sky-500/25 rounded-xl p-3">
                <strong className="text-sky-300">{deliveryModeMeta.label}:</strong>{' '}
                {pkg.custom_input_label || deliveryModeMeta.customerInstruction}
              </p>

              {/* Google Family Email */}
              {isFamilyEmailRequired && (
                <div className="space-y-1.5 p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30">
                  <label className="text-xs font-bold text-sky-300">
                    Email Google nhận lời mời Family (Bắt buộc) *
                  </label>
                  <input
                    type="email"
                    placeholder="example@gmail.com"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900 border border-sky-500/40 text-xs text-white font-mono focus:outline-none focus:border-sky-400 transition"
                  />
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    ⚠️ Email nhận link mời tham gia nhóm Family Google One / Gemini Ultra.
                  </p>
                </div>
              )}

              {/* TK + MK (+ 2FA) Credentials Inputs */}
              {isCredentialsRequired && (
                <div className="space-y-2.5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-300">
                      Tài khoản cần nâng cấp (Bắt buộc) *
                    </label>
                    <span className="text-[10px] text-amber-400 font-mono">
                      {isTwoFaRequired ? 'TK + MK + 2FA' : 'TK + MK'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="Email / Tài khoản..."
                      value={accountLogin}
                      onChange={(e) => setAccountLogin(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900 border border-amber-500/40 text-xs text-white font-mono focus:outline-none focus:border-amber-400 transition"
                    />
                    <input
                      type="text"
                      placeholder="Mật khẩu..."
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900 border border-amber-500/40 text-xs text-white font-mono focus:outline-none focus:border-amber-400 transition"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder={
                      isTwoFaRequired
                        ? 'Mã 2FA / Backup Code (Bắt buộc) *'
                        : 'Mã 2FA / Backup Code (Không bắt buộc)'
                    }
                    value={accountTwoFa}
                    onChange={(e) => setAccountTwoFa(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900 border border-amber-500/40 text-xs text-white font-mono focus:outline-none focus:border-amber-400 transition"
                  />
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    ⚠️ Vui lòng tắt xác minh SĐT/thiết bị hoặc cung cấp mã 2FA để Admin kích hoạt nhanh.
                  </p>
                </div>
              )}

              {isContactAdminMode && (
                <div className="p-3.5 rounded-xl bg-indigo-500/12 border border-indigo-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <span className="text-indigo-200">Gói nâng chay / xử lý riêng trực tiếp cùng Admin:</span>
                  <a
                    href={ADMIN_TELEGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl btn-ios-blue text-xs font-bold shrink-0 text-center"
                  >
                    Nhắn Telegram @YukiIsMe2311 ↗
                  </a>
                </div>
              )}

              {/* Telegram ID Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-cyan-400" />
                    <span>ID Telegram nhận đơn</span>
                  </label>
                  {resolvingUser && (
                    <span className="text-[10px] text-cyan-400 animate-pulse">Đang tra cứu...</span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Nhập ID Telegram số (VD: 6123456789) - Lấy tại @userinfobot"
                  value={telegramId}
                  onChange={(e) => setTelegramId(e.target.value.replace(/\D/g, ''))}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-cyan-400 transition"
                />

                {/* Resolved Telegram Badge */}
                {resolvedUser && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>
                        ✅ <strong>{resolvedUser.username ? `@${resolvedUser.username}` : ''}</strong> ({resolvedUser.fullName})
                      </span>
                    </div>
                    <a
                      href={resolvedUser.chatUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] underline text-cyan-400 hover:text-cyan-300 font-semibold"
                    >
                      Mở Chat
                    </a>
                  </div>
                )}
              </div>

              {/* Zalo Phone Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Số điện thoại Zalo nhận đơn (Tùy chọn)</span>
                </label>
                <input
                  type="tel"
                  placeholder="VD: 0987654321 (Nếu bạn muốn Admin nhắn qua Zalo)"
                  value={zaloPhone}
                  onChange={(e) => setZaloPhone(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-cyan-400 transition"
                />
              </div>

              {/* Customer Notes Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    {isCredentialsRequired
                      ? 'Ghi chú tài khoản (Tùy chọn)'
                      : isFamilyEmailRequired
                      ? 'Ghi chú nhận lời mời Family (Tùy chọn)'
                      : 'Ghi chú cho Admin (Tùy chọn)'}
                  </span>
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    isCredentialsRequired
                      ? 'Thông tin ghi chú thêm cho tài khoản cần nâng cấp...'
                      : isFamilyEmailRequired
                      ? 'Ghi chú thêm về Email Google nhận lời mời...'
                      : 'Lời nhắn gửi thêm cho Admin khi bàn giao đơn (nếu có)...'
                  }
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400 transition resize-none"
                />
              </div>
            </div>
          </div>

          {/* Right Column (5 cols, Sticky): Financials & Checkout Action */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
            <div className="p-5 rounded-2xl bg-[#0F172E] border border-slate-800 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
                Tóm Tắt Đơn Hàng & Ví Tiền
              </h3>

              {/* Pricing Breakdown */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Tạm tính ({quantity} gói):</span>
                  <span className="font-mono text-white font-medium">{formatVND(subtotal)}</span>
                </div>

                {vipDiscountAmount > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span className="flex items-center gap-1">
                      <span>⭐ Ưu đãi {vipInfo.title} (-{vipDiscountPercent}%):</span>
                    </span>
                    <span className="font-mono font-bold">-{formatVND(vipDiscountAmount)}</span>
                  </div>
                )}

                {couponApplied && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Mã giảm giá ({couponCode.toUpperCase()}):</span>
                    <span className="font-mono font-bold">-{formatVND(couponDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-extrabold text-white pt-3 border-t border-slate-800">
                  <span>Tổng thanh toán:</span>
                  <span className="font-mono text-cyan-400 text-xl tabular-nums">{formatVND(finalTotal)}</span>
                </div>
              </div>

              {/* Coupon Code Input */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Mã Giảm Giá (Coupon)</label>
                  {couponApplied && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Đã áp dụng
                    </span>
                  )}
                </div>

                {isVoucherBlocked ? (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between">
                    <span className="text-slate-400">Mã giảm giá</span>
                    <span className="text-amber-400 font-semibold text-[11px]">Sản phẩm API không áp dụng mã giảm giá</span>
                  </div>
                ) : couponApplied ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-300">{couponCode.toUpperCase()}</span>
                      <span className="text-emerald-400 text-[11px]">(-{formatVND(couponDiscount)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="touch-target px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-bold transition"
                    >
                      Hủy mã
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="space-y-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nhập mã (ví dụ: YUKI10)"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white uppercase focus:outline-none focus:border-sky-400 font-mono"
                      />
                      <button
                        type="submit"
                        disabled={validatingCoupon || !couponCode.trim()}
                        className="touch-target px-4 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 disabled:opacity-50 transition shrink-0"
                      >
                        {validatingCoupon ? 'Đang ktra...' : 'Áp Dụng'}
                      </button>
                    </div>
                    {couponError && <p className="text-[11px] text-rose-400 mt-1 font-medium">{couponError}</p>}
                  </form>
                )}
              </div>

              {/* Wallet Balance Status & Insufficient Balance Guard */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-300">Số dư ví khả dụng:</span>
                </div>
                <span className="font-mono font-bold text-emerald-400 text-sm tabular-nums">
                  {formatVND(wallet?.balance || 0)}
                </span>
              </div>

              {(wallet?.balance || 0) < finalTotal && (
                <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/50 text-red-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>
                      Số dư ví không đủ (Hiện có: <strong>{formatVND(wallet?.balance || 0)}</strong>, Cần: <strong>{formatVND(finalTotal)}</strong>). Vui lòng nạp thêm tiền!
                    </span>
                  </div>
                  <Link
                    href={`/wallet?amount=${Math.max(10000, Math.ceil((finalTotal - (wallet?.balance || 0)) / 1000) * 1000)}`}
                    className="px-3.5 py-2 rounded-xl btn-ios-blue text-xs whitespace-nowrap text-center shadow transition shrink-0 tabular-nums"
                  >
                    Nạp Thêm {formatVND(Math.max(10000, Math.ceil((finalTotal - (wallet?.balance || 0)) / 1000) * 1000))}
                  </Link>
                </div>
              )}

              {orderError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                  <span>{orderError}</span>
                </div>
              )}

              {/* Confirm Payment Action */}
              <button
                type="button"
                onClick={onStartCheckout}
                disabled={isProcessing || (wallet?.balance || 0) < finalTotal}
                className="touch-target w-full py-3.5 rounded-xl btn-ios-white font-bold text-xs text-slate-950 shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShieldCheck className="w-4 h-4 text-[#090B0E]" strokeWidth={1.75} />
                <span>
                  {(wallet?.balance || 0) < finalTotal
                    ? 'Số Dư Ví Không Đủ — Vui Lòng Nạp Thêm'
                    : isProcessing
                    ? 'Đang Xử Lý Giao Dịch...'
                    : 'Xác Nhận Trừ Ví & Mua Ngay'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Order Mandatory Warning Modal */}
      <PreOrderModal
        isOpen={isPreOrderModalOpen}
        onClose={() => setIsPreOrderModalOpen(false)}
        onConfirm={handleCheckout}
        orderType="PRODUCT"
        title="Lưu Ý Xử Lý Đơn Hàng"
        orderSummary={{
          name: `${brandName ? `${brandName} - ` : ''}${pkg.name}`,
          price: finalTotal,
          quantity,
          details: pkg.warranty,
        }}
        isSubmitting={isProcessing}
      />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Đang tải trang thanh toán...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
