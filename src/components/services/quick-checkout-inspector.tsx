'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrandInfo, PackageVariant } from '@/lib/catalog/brands-data';
import { useAuth } from '@/contexts/auth-context';
import { calculateVipPrice, calculateVipTier } from '@/lib/vip-tier';
import { loadOrderDraft, saveOrderDraft, clearOrderDraft } from '@/lib/order-draft';
import { ADMIN_TELEGRAM_URL } from '@/lib/constants';
import { getDeliveryModeMeta, normalizeDeliveryMode } from '@/lib/catalog/delivery-modes';
import { BrandLogo } from '@/components/common/brand-logo';
import { BrandIcon } from '@/components/BrandIcon';
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Wallet,
  Tag,
  AlertCircle,
  Send,
  Plus,
  Minus,
  ExternalLink,
  ShoppingBag,
  BookmarkCheck,
  Coins,
} from 'lucide-react';

interface QuickCheckoutInspectorProps {
  brand: BrandInfo | null;
  onOrderCompleted?: () => void;
  compactHeader?: boolean;
}

export function QuickCheckoutInspector({
  brand,
  onOrderCompleted,
  compactHeader = false,
}: QuickCheckoutInspectorProps) {
  const router = useRouter();
  const { user, profile, wallet, lifetimeDeposit, refreshUserData } = useAuth();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [deliveryContact, setDeliveryContact] = useState('');
  const [accountLogin, setAccountLogin] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountTwoFa, setAccountTwoFa] = useState('');
  const [notes, setNotes] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [preOrderAck, setPreOrderAck] = useState(false);

  // Hydrate Auto-Save Draft from sessionStorage + user profile defaults
  useEffect(() => {
    setPreOrderAck(false);
    const draft = loadOrderDraft();
    if (draft) {
      if (draft.deliveryContact) setDeliveryContact(draft.deliveryContact);
      if (draft.notes) setNotes(draft.notes);
      if (draft.couponCode) setCouponCode(draft.couponCode);
      if (draft.quantity && draft.quantity > 0) setQuantity(draft.quantity);
      if (brand && draft.brandSlug === brand.slug && typeof draft.packageIndex === 'number') {
        setSelectedIdx(
          Math.min(draft.packageIndex, Math.max(0, brand.packages.length - 1))
        );
      } else {
        setSelectedIdx(0);
      }
    } else {
      setSelectedIdx(0);
    }
    setSubmitError(null);
    setSubmitSuccess(null);
  }, [brand?.slug]);

  useEffect(() => {
    if (!deliveryContact && (profile?.telegramId || profile?.phone || user?.email)) {
      setDeliveryContact(String(profile?.telegramId || profile?.phone || user?.email || ''));
    }
  }, [profile, user, deliveryContact]);

  // Persist Auto-Save Draft whenever fields change
  useEffect(() => {
    if (!brand) return;
    const activePkg = brand.packages[selectedIdx] || brand.packages[0];
    saveOrderDraft({
      brandSlug: brand.slug,
      sku: activePkg?.sku,
      packageIndex: selectedIdx,
      quantity,
      deliveryContact,
      notes,
      couponCode,
    });
  }, [brand, selectedIdx, quantity, deliveryContact, notes, couponCode]);

  const formatVND = (amount: number) =>
    new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

  if (!brand) {
    return (
      <div className="liquid-glass-card rounded-2xl p-5 text-center space-y-3">
        <div className="w-11 h-11 rounded-2xl bg-sky-500/12 border border-sky-400/25 text-[#0EA5E9] mx-auto flex items-center justify-center">
          <ShoppingBag className="w-5 h-5" strokeWidth={1.75} />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white">Thanh Toán Nhanh</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Chọn một dịch vụ ở danh sách bên trái để xem chi tiết gói, chiết khấu VIP và đặt đơn trực tiếp tại đây.
          </p>
        </div>
      </div>
    );
  }

  const currentPkg: PackageVariant = brand.packages[selectedIdx] || brand.packages[0];
  const isNoWarranty =
    currentPkg.warrantyDays === 0 ||
    currentPkg.warranty_days === 0 ||
    /không bảo hành|kbh/i.test(currentPkg.warranty || '');

  const deliveryMode = normalizeDeliveryMode(
    currentPkg.delivery_mode || currentPkg.input_type,
    currentPkg.sku
  );
  const deliveryModeMeta = getDeliveryModeMeta(deliveryMode, currentPkg.sku);
  const isFamilyEmailRequired = deliveryMode === 'email_only';
  const isCredentialsRequired = deliveryMode === 'credentials' || deliveryMode === 'credentials_2fa';
  const isTwoFaRequired = deliveryMode === 'credentials_2fa';
  const isAdminDelivered = deliveryMode === 'admin_deliver';
  const isContactAdminMode = deliveryMode === 'contact_admin';
  const combinedCredentials = isCredentialsRequired
    ? [accountLogin.trim(), accountPassword.trim(), accountTwoFa.trim()].filter(Boolean).join(' | ')
    : '';

  const isVoucherBlocked = Boolean(
    currentPkg.allow_voucher === false ||
    currentPkg.allowVoucher === false ||
    currentPkg.sku?.startsWith('API-TOOL-SMS') ||
    /api.*sms/i.test(currentPkg.name)
  );

  const vipTier = calculateVipTier(lifetimeDeposit);
  const rawTotal = currentPkg.price * quantity;
  const effectiveCouponDiscount = isVoucherBlocked ? 0 : couponDiscount;
  const afterCoupon = Math.max(0, rawTotal - effectiveCouponDiscount);
  const vipCalc = calculateVipPrice(
    afterCoupon,
    vipTier.discountPercent,
    brand.category,
    currentPkg.sku,
    currentPkg.name
  );
  const finalTotal = vipCalc.finalPrice;
  const estimatedCashback = effectiveCouponDiscount === 0 && finalTotal >= 20000 ? Math.floor(finalTotal * 0.02) : 0;

  const userBalance = Number(wallet?.balance || 0);
  const isInsufficientBalance = Boolean(user && userBalance < finalTotal);
  const missingAmount = Math.max(10000, Math.ceil((finalTotal - userBalance) / 1000) * 1000);
  const savedProfiles = Array.isArray(profile?.savedProfiles) ? profile.savedProfiles : [];

  const handleApplyCoupon = async () => {
    const clean = couponCode.trim().toUpperCase();
    if (!clean) return;
    setValidatingCoupon(true);
    setCouponError(null);
    setCouponMessage(null);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: clean,
          orderAmount: rawTotal,
          applicableTo: 'PRODUCT',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.coupon) {
        setCouponDiscount(0);
        setCouponError(data.error || 'Mã giảm giá không hợp lệ.');
      } else {
        const discountVal = Number(data.coupon.discount_amount || 0);
        setCouponDiscount(discountVal);
        setCouponMessage(`Đã áp dụng mã ${clean} (-${formatVND(discountVal)})`);
      }
    } catch {
      setCouponError('Không thể kiểm tra mã giảm giá.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`/checkout?sku=${currentPkg.sku}`)}`);
      return;
    }

    if (!deliveryContact.trim()) {
      setSubmitError(
        isFamilyEmailRequired
          ? 'Vui lòng nhập Email Google nhận lời mời Family (Bắt buộc).'
          : 'Vui lòng nhập Telegram, Zalo hoặc Gmail để Admin bàn giao đơn.'
      );
      return;
    }

    if (isFamilyEmailRequired) {
      const email = deliveryContact.trim();
      if (!email.includes('@') || !email.includes('.')) {
        setSubmitError('Email Google không hợp lệ. Vui lòng nhập đúng địa chỉ Gmail để nhận slot Family.');
        return;
      }
    }

    if (isCredentialsRequired) {
      if (!accountLogin.trim() || !accountPassword.trim()) {
        setSubmitError('Vui lòng nhập đầy đủ Tài khoản và Mật khẩu cần nâng cấp (Bắt buộc).');
        return;
      }
      if (isTwoFaRequired && !accountTwoFa.trim()) {
        setSubmitError('Gói này yêu cầu nhập thêm Mã 2FA / Backup Code để Admin kích hoạt.');
        return;
      }
    }

    if (isNoWarranty && !preOrderAck) {
      setSubmitError('Vui lòng tick xác nhận đã đọc kỹ điều kiện gói Không Bảo Hành (KBH).');
      return;
    }

    if (isInsufficientBalance) {
      router.push(`/wallet?amount=${missingAmount}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_type: 'PRODUCT',
          sku: currentPkg.sku,
          item_name: `${brand.name} — ${currentPkg.name}`,
          quantity,
          total_amount: rawTotal,
          delivery_contact: deliveryContact.trim(),
          telegram_id: deliveryContact.trim(),
          account_credentials: isCredentialsRequired ? combinedCredentials : undefined,
          notes: notes.trim(),
          coupon_code: !isVoucherBlocked && couponDiscount > 0 ? couponCode.trim().toUpperCase() : '',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Tạo đơn hàng thất bại.');
      }
      clearOrderDraft();
      setNotes('');
      setCouponCode('');
      setCouponDiscount(0);
      setCouponMessage(null);
      await refreshUserData();
      setSubmitSuccess('Đặt đơn thành công — Đang chuyển sang Kho đơn hàng...');
      onOrderCompleted?.();
      setTimeout(() => {
        router.push('/orders');
      }, 550);
    } catch (err: any) {
      setSubmitError(err.message || 'Lỗi tạo đơn hàng.');
      setSubmitting(false);
    }
  };

  return (
    <div className="liquid-glass-card glass-refraction rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.08] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <BrandIcon
            slug={brand.slug}
            name={brand.name}
            iconPath={brand.iconPath}
            size="lg"
            active
          />
          <div className="min-w-0">
            <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/12 text-sky-300 border border-sky-400/25">
              {brand.badgeLabel}
            </span>
            <h3 className="text-sm font-bold text-white truncate mt-1">{brand.name}</h3>
          </div>
        </div>
        <BrandLogo size="xs" />
      </div>

      <form onSubmit={handleCheckout} className="p-4 space-y-3.5 text-xs">
        {!compactHeader && (
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {brand.shortDesc}
          </p>
        )}

        {/* Package Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-300 block">
            Chọn gói dịch vụ ({brand.packages.length})
          </label>
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
            {brand.packages.map((pkg, idx) => {
              const active = idx === selectedIdx;
              const pkgVip = calculateVipPrice(
                pkg.price,
                vipTier.discountPercent,
                brand.category,
                pkg.sku,
                pkg.name
              );
              return (
                <button
                  key={pkg.sku}
                  type="button"
                  onClick={() => {
                    setSelectedIdx(idx);
                    setPreOrderAck(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left border transition flex items-center justify-between gap-2 ${
                    active
                      ? 'bg-sky-500/15 border-[#0EA5E9] text-white'
                      : 'bg-[#07090E]/80 border-white/[0.08] text-slate-300 hover:border-sky-400/35'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{pkg.name}</div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {pkg.warranty}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono tabular-nums font-bold text-sky-300">
                      {formatVND(pkgVip.finalPrice)}
                    </div>
                    {pkgVip.isApplied && (
                      <div className="font-mono tabular-nums text-[10px] text-slate-500 line-through">
                        {formatVND(pkg.price)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Warranty & Benefits */}
        <div className="p-3 rounded-xl bg-[#07090E]/80 border border-white/[0.08] space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.75} />
              <span>Bảo hành</span>
            </span>
            <span className={`font-semibold ${isNoWarranty ? 'text-amber-300' : 'text-emerald-300'}`}>
              {currentPkg.warranty}
            </span>
          </div>

          {/* Delivery & Input Mode Badge */}
          {isAdminDelivered && (
            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-200 text-[11px] font-semibold">
              <span>🔑 Tài khoản cấp sẵn — Admin bàn giao sau khi duyệt</span>
            </div>
          )}
          {isCredentialsRequired && (
            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-[11px] font-semibold">
              <span>⚡ Nâng cấp trực tiếp trên tài khoản chính chủ của bạn</span>
            </div>
          )}
          {isFamilyEmailRequired && (
            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-sky-500/10 border border-sky-500/25 text-sky-200 text-[11px] font-semibold">
              <span>📧 Nâng cấp Add Family / Slot riêng tư (Chỉ cần Email Google)</span>
            </div>
          )}

          {currentPkg.benefits?.slice(0, 2).map((b, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0EA5E9] shrink-0 mt-0.5" strokeWidth={1.75} />
              <span>{b}</span>
            </div>
          ))}
        </div>

        {/* Saved Profiles 1-Tap Chips */}
        {savedProfiles.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <BookmarkCheck className="w-3 h-3 text-sky-400" />
              <span>Hồ sơ đặt nhanh</span>
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {savedProfiles.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    const contact = preset.email || preset.telegram || preset.socialLink || '';
                    if (contact) setDeliveryContact(contact);
                    if (preset.note && !notes.trim()) setNotes(preset.note);
                  }}
                  className="px-2.5 py-1 rounded-full bg-sky-500/12 border border-sky-400/25 hover:border-sky-400/50 text-[10px] font-semibold text-sky-200 whitespace-nowrap transition"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity + Delivery Contact */}
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1 space-y-1">
            <label className="text-[10px] font-bold text-slate-400 block">Số lượng</label>
            <div className="h-9 rounded-xl bg-[#07090E] border border-white/[0.1] flex items-center justify-between px-1.5">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-1 text-slate-400 hover:text-white"
                aria-label="Giảm số lượng"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="font-mono tabular-nums font-bold text-white">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                className="p-1 text-slate-400 hover:text-white"
                aria-label="Tăng số lượng"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-[10px] font-bold text-slate-400 block">
              {isFamilyEmailRequired
                ? 'Email Google nhận lời mời Family (Bắt buộc) *'
                : 'Telegram / Zalo / Gmail nhận đơn'}
            </label>
            <input
              type={isFamilyEmailRequired ? 'email' : 'text'}
              value={deliveryContact}
              onChange={(e) => setDeliveryContact(e.target.value)}
              placeholder={isFamilyEmailRequired ? 'example@gmail.com' : '@username, SĐT hoặc Gmail...'}
              className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.1] text-white placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9]"
            />
          </div>
        </div>

        {/* Delivery Mode Explainer */}
        <div className="p-2.5 rounded-xl bg-sky-500/[0.08] border border-sky-400/25 space-y-1">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-bold text-sky-300">📬 {deliveryModeMeta.label}</span>
          </div>
          <p className="text-[10px] text-slate-300 leading-relaxed">
            {currentPkg.custom_input_label || deliveryModeMeta.customerInstruction}
          </p>
        </div>

        {/* TK + MK (+ 2FA) Credentials Input */}
        {isCredentialsRequired && (
          <div className="space-y-2 p-3 rounded-xl bg-amber-500/[0.08] border border-amber-500/25">
            <div className="text-[10px] font-bold text-amber-300 flex items-center justify-between">
              <span>Tài khoản cần nâng cấp (Bắt buộc) *</span>
              <span className="text-[9px] text-amber-400 font-mono">
                {isTwoFaRequired ? 'TK + MK + 2FA' : 'TK + MK'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <input
                type="text"
                value={accountLogin}
                onChange={(e) => setAccountLogin(e.target.value)}
                placeholder="Email / Tài khoản..."
                className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-amber-500/30 text-white placeholder-slate-500 font-mono text-[11px] focus:outline-none focus:border-amber-400"
              />
              <input
                type="text"
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
                placeholder="Mật khẩu..."
                className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-amber-500/30 text-white placeholder-slate-500 font-mono text-[11px] focus:outline-none focus:border-amber-400"
              />
            </div>
            <input
              type="text"
              value={accountTwoFa}
              onChange={(e) => setAccountTwoFa(e.target.value)}
              placeholder={
                isTwoFaRequired
                  ? 'Mã 2FA / Backup Code (Bắt buộc) *'
                  : 'Mã 2FA / Backup Code (Không bắt buộc)'
              }
              className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-amber-500/30 text-white placeholder-slate-500 font-mono text-[11px] focus:outline-none focus:border-amber-400"
            />
            <p className="text-[10px] text-slate-400 leading-tight">
              ⚠️ Vui lòng tắt xác minh SĐT/thiết bị hoặc cung cấp kèm mã 2FA để Admin kích hoạt nhanh nhất.
            </p>
          </div>
        )}

        {isContactAdminMode && (
          <div className="p-2.5 rounded-xl bg-indigo-500/12 border border-indigo-400/30 text-[11px] text-indigo-200 flex items-center justify-between gap-2">
            <span>Gói xử lý riêng 1-1 cùng Admin:</span>
            <a
              href={ADMIN_TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-sky-500/20 border border-sky-400/40 text-sky-200 font-bold shrink-0"
            >
              Nhắn @YukiIsMe2311 ↗
            </a>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 block">
            {isCredentialsRequired
              ? 'Ghi chú tài khoản (Tùy chọn)'
              : isFamilyEmailRequired
              ? 'Ghi chú nhận lời mời Family (Tùy chọn)'
              : 'Ghi chú cho Admin (Tùy chọn)'}
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              isCredentialsRequired
                ? 'Thông tin ghi chú thêm cho tài khoản...'
                : isFamilyEmailRequired
                ? 'Ghi chú thêm về Email Google...'
                : 'Lời nhắn gửi thêm cho Admin khi duyệt đơn (nếu có)...'
            }
            className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.1] text-white placeholder-slate-500 focus:outline-none focus:border-[#0EA5E9]"
          />
        </div>

        {/* Coupon / CTV */}
        {isVoucherBlocked ? (
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/[0.06] flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              <span>Mã giảm giá</span>
            </span>
            <span className="text-amber-400 font-medium text-[10px]">Sản phẩm API không áp dụng mã giảm giá</span>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Mã giảm giá / Mã CTV"
                  className="w-full h-9 pl-8 pr-2 rounded-xl bg-[#07090E] border border-white/[0.1] text-white placeholder-slate-500 font-mono text-[11px] focus:outline-none focus:border-[#0EA5E9]"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={validatingCoupon || !couponCode.trim()}
                className="px-3 h-9 rounded-xl btn-ios-secondary text-[11px] disabled:opacity-50"
              >
                {validatingCoupon ? '...' : 'Áp dụng'}
              </button>
            </div>
            {couponMessage && <p className="text-[10px] text-emerald-400">{couponMessage}</p>}
            {couponError && <p className="text-[10px] text-red-400">{couponError}</p>}
          </div>
        )}

        {/* Price Breakdown + Cashback */}
        <div className="p-3 rounded-xl bg-[#07090E]/85 border border-white/[0.08] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Giá gốc ({quantity}x)</span>
            <span className="font-mono tabular-nums">{formatVND(rawTotal)}</span>
          </div>
          {vipCalc.isApplied && (
            <div className="flex items-center justify-between text-[11px] text-sky-300">
              <span>Chiết khấu {vipTier.name} (-{vipTier.discountPercent}%)</span>
              <span className="font-mono tabular-nums">-{formatVND(vipCalc.discountAmount)}</span>
            </div>
          )}
          {couponDiscount > 0 && (
            <div className="flex items-center justify-between text-[11px] text-emerald-400">
              <span>Mã giảm giá / CTV</span>
              <span className="font-mono tabular-nums">-{formatVND(couponDiscount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
            <span className="text-slate-200 font-semibold">Tổng thanh toán</span>
            <span className="font-mono tabular-nums text-lg font-black text-white">
              {formatVND(finalTotal)}
            </span>
          </div>
          {user && !isInsufficientBalance && (
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Số dư sau thanh toán</span>
              <span className="font-mono tabular-nums text-slate-300">
                {formatVND(Math.max(0, userBalance - finalTotal))}
              </span>
            </div>
          )}
          <div className="pt-1 flex items-center justify-between gap-2 text-[10px]">
            <span className="text-slate-400 flex items-center gap-1">
              <Coins className="w-3 h-3 text-emerald-400" />
              <span>Hoàn điểm 2%</span>
            </span>
            {estimatedCashback > 0 ? (
              <span className="font-mono tabular-nums font-bold text-emerald-300">
                +{formatVND(estimatedCashback)} điểm
              </span>
            ) : (
              <span className="text-slate-500 text-right">
                {couponDiscount > 0 ? 'Không áp dụng khi dùng mã' : 'Đơn từ 20.000đ'}
              </span>
            )}
          </div>
        </div>

        {/* Non-Warranty Pre-Order Guard */}
        {isNoWarranty && (
          <label className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/[0.08] border border-amber-400/25 text-[11px] text-amber-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={preOrderAck}
              onChange={(e) => setPreOrderAck(e.target.checked)}
              className="mt-0.5 rounded border-amber-400/50 bg-[#07090E] text-sky-400 focus:ring-0"
            />
            <span>
              Tôi đã đọc kỹ điều kiện gói <strong>Không Bảo Hành (KBH)</strong> trước khi thanh toán.
            </span>
          </label>
        )}

        {submitError && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-[11px] flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        {submitSuccess && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] space-y-1.5">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{submitSuccess}</span>
            </div>
            <Link
              href="/orders"
              className="inline-flex items-center gap-1 text-sky-300 font-bold hover:underline"
            >
              <span>Xem Lịch Sử Đơn</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Manual Processing Notice & Admin Contact */}
        <div className="p-3 rounded-xl bg-amber-500/[0.08] border border-amber-500/25 space-y-2">
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            <strong>Lưu ý:</strong> Hiện tại hệ thống chưa tích hợp API xử lý tự động. Sau khi đặt đơn thành công, vui lòng nhắn tin trực tiếp cho Admin để được kiểm tra và kích hoạt nhanh nhất.
          </p>
          <a
            href="https://t.me/YukiIsMe2311"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-sky-300 font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
          >
            <Send className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
            <span>💬 Liên Hệ Admin Ngay (@YukiIsMe2311) ↗</span>
          </a>
        </div>

        {/* Smart Action CTA */}
        {isInsufficientBalance ? (
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] flex items-center justify-between">
              <span>Ví còn thiếu:</span>
              <strong className="font-mono tabular-nums text-amber-300">
                {formatVND(Math.max(0, finalTotal - userBalance))}
              </strong>
            </div>
            <Link
              href={`/wallet?amount=${missingAmount}`}
              className="w-full h-11 rounded-xl btn-ios-blue text-xs flex items-center justify-center gap-2"
            >
              <Wallet className="w-4 h-4" strokeWidth={1.75} />
              <span className="tabular-nums">Nạp Thêm {formatVND(missingAmount)} Ngay</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <button
            type="submit"
            disabled={submitting || Boolean(submitSuccess)}
            className="w-full h-11 rounded-xl btn-ios-blue text-xs flex items-center justify-center gap-2 disabled:opacity-60 font-bold"
          >
            <span>
              {submitSuccess
                ? 'Đang chuyển sang Kho đơn hàng...'
                : submitting
                ? 'Đang xử lý đơn...'
                : user
                ? 'Thanh Toán Qua Ví Yuki'
                : 'Đăng Nhập Để Đặt Hàng'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
          <Link
            href={`/checkout?sku=${encodeURIComponent(currentPkg.sku)}`}
            className="text-slate-400 hover:text-sky-300 transition"
          >
            Mở trang thanh toán đầy đủ
          </Link>
          <a
            href={ADMIN_TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:text-sky-300 flex items-center gap-1 transition"
          >
            <Send className="w-3 h-3" />
            <span>Hỗ trợ</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </form>
    </div>
  );
}
