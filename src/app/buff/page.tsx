'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { BUFF_PLATFORMS, BUFF_SERVICES, BuffPlatformId, SmmServer, calculateSmmPrice } from '@/lib/catalog/buff-data';
import { resolveBuffServerMeta, type BuffServerOverride } from '@/lib/catalog/buff-badges';
import { BrandIcon } from '@/components/BrandIcon';
import { PreOrderModal } from '@/components/common/pre-order-modal';
import { useCustomDialog } from '@/components/common/custom-dialog';
import { loadBuffDraft, saveBuffDraft, clearBuffDraft } from '@/lib/order-draft';
import { ADMIN_TELEGRAM_URL, ADMIN_SUPPORT_LABEL } from '@/lib/constants';
import {
  Sparkles,
  Send,
  Check,
  Plus,
  Minus,
  MessageCircle,
  HelpCircle,
  CheckCircle2,
  Phone,
  UserCheck,
  Wallet,
  ArrowRight,
  BookmarkCheck,
  Layers,
  Link2,
  Server,
  Info,
  AlertCircle,
} from 'lucide-react';

function BuffSocialContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const skuParam = searchParams.get('sku');
  const platformParam = searchParams.get('platform')?.toUpperCase();
  const targetParam = searchParams.get('target');
  const qtyParam = searchParams.get('qty');

  const { user, profile, wallet, refreshUserData } = useAuth();
  const { showAlert } = useCustomDialog();

  const [selectedPlatform, setSelectedPlatform] = useState<BuffPlatformId>('TIKTOK');
  const [selectedServiceCode, setSelectedServiceCode] = useState<string>('TT-VIEW');
  const [selectedServerId, setSelectedServerId] = useState<number>(3272);
  const [targetUrl, setTargetUrl] = useState('');
  const [quantity, setQuantity] = useState<number>(1000);
  const [telegramId, setTelegramId] = useState('');
  const [zaloPhone, setZaloPhone] = useState('');
  const [resolvedUser, setResolvedUser] = useState<{
    username: string | null;
    fullName: string;
    chatUrl: string;
  } | null>(null);
  const [resolvingUser, setResolvingUser] = useState(false);
  const [userNotes, setUserNotes] = useState('');
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
  const [isPreOrderModalOpen, setIsPreOrderModalOpen] = useState(false);
  const [quoteSuccess, setQuoteSuccess] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkUrlsText, setBulkUrlsText] = useState('');
  const [preOrderAck, setPreOrderAck] = useState(false);
  const [buffOverrides, setBuffOverrides] = useState<Record<string, BuffServerOverride>>({});

  // Sync live overrides (prices, badges, custom notes, hidden servers) from Admin
  useEffect(() => {
    fetch('/api/buff', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.overrides && typeof data.overrides === 'object') {
          setBuffOverrides(data.overrides);
        }
      })
      .catch(() => {});
  }, []);

  // Restore Reorder / ?platform= query params OR Auto-Save Draft
  useEffect(() => {
    if (platformParam && BUFF_PLATFORMS.some((p) => p.id === platformParam)) {
      const pId = platformParam as BuffPlatformId;
      setSelectedPlatform(pId);
      const firstSvc = BUFF_SERVICES.find((s) => s.platform === pId);
      if (firstSvc) {
        setSelectedServiceCode(firstSvc.code);
        if (firstSvc.servers[0]) {
          setSelectedServerId(firstSvc.servers[0].id);
          setQuantity(firstSvc.servers[0].minQty);
        }
      }
      return;
    }

    if (skuParam) {
      // Parse BUFF-{PLATFORM}-{SERVICE_CODE}-SV{SERVER_ID}
      const match = skuParam.match(/^BUFF-([A-Z]+)-(.+)-SV(\d+)$/);
      if (match) {
        const [, plat, svcCode, srvIdStr] = match;
        if (BUFF_PLATFORMS.some((p) => p.id === plat)) {
          setSelectedPlatform(plat as BuffPlatformId);
        }
        setSelectedServiceCode(svcCode);
        setSelectedServerId(Number(srvIdStr));
      }
      if (targetParam) setTargetUrl(targetParam);
      if (qtyParam && Number(qtyParam) > 0) setQuantity(Number(qtyParam));
      return;
    }

    const draft = loadBuffDraft();
    if (draft) {
      if (draft.platform && BUFF_PLATFORMS.some((p) => p.id === draft.platform)) {
        setSelectedPlatform(draft.platform as BuffPlatformId);
      }
      if (draft.serviceCode) setSelectedServiceCode(draft.serviceCode);
      if (draft.serverId) setSelectedServerId(draft.serverId);
      if (draft.targetUrl) setTargetUrl(draft.targetUrl);
      if (draft.quantity && draft.quantity > 0) setQuantity(draft.quantity);
      if (draft.telegramId) setTelegramId(draft.telegramId);
      if (draft.zaloPhone) setZaloPhone(draft.zaloPhone);
      if (draft.notes) setUserNotes(draft.notes);
    }
  }, [skuParam, platformParam, targetParam, qtyParam]);

  useEffect(() => {
    if (!telegramId && profile?.telegramId) {
      setTelegramId(String(profile.telegramId));
    }
  }, [profile, telegramId]);

  // Auto-save draft on change
  useEffect(() => {
    saveBuffDraft({
      platform: selectedPlatform,
      serviceCode: selectedServiceCode,
      serverId: selectedServerId,
      targetUrl,
      quantity,
      telegramId,
      zaloPhone,
      notes: userNotes,
    });
  }, [selectedPlatform, selectedServiceCode, selectedServerId, targetUrl, quantity, telegramId, zaloPhone, userNotes]);

  // Debounced Telegram lookup
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
        .catch(() => setResolvedUser(null))
        .finally(() => setResolvingUser(false));
    }, 500);

    return () => clearTimeout(timer);
  }, [telegramId]);

  const currentPlatformServices = useMemo(
    () =>
      BUFF_SERVICES.filter(
        (s) => s.platform.toLowerCase() === selectedPlatform.toLowerCase()
      ),
    [selectedPlatform]
  );

  const activeService =
    currentPlatformServices.find((s) => s.code === selectedServiceCode) || currentPlatformServices[0];

  const activeServers = useMemo(() => {
    const raw = activeService?.servers || [];
    return raw.filter((srv) => buffOverrides[String(srv.id)]?.status !== 'HIDDEN');
  }, [activeService, buffOverrides]);

  const rawSelectedServer: SmmServer =
    activeServers.find((srv) => srv.id === selectedServerId) || activeServers[0] || {
      id: 0,
      name: 'Mặc định',
      originalPrice: 0,
      retailPrice: 0,
      minQty: 100,
      maxQty: 100000,
      symbols: [],
    };

  const selectedServerMeta = useMemo(
    () => resolveBuffServerMeta(rawSelectedServer, buffOverrides[String(rawSelectedServer.id)]),
    [rawSelectedServer, buffOverrides]
  );

  const selectedServer: SmmServer = {
    ...rawSelectedServer,
    retailPrice: selectedServerMeta.retailPrice,
  };

  const handlePlatformSelect = (platId: BuffPlatformId) => {
    setSelectedPlatform(platId);
    const platServices = BUFF_SERVICES.filter(
      (s) => s.platform.toLowerCase() === platId.toLowerCase()
    );
    const firstSvc = platServices[0];
    if (firstSvc) {
      setSelectedServiceCode(firstSvc.code);
      const firstSrv =
        firstSvc.servers.find((s) => buffOverrides[String(s.id)]?.status !== 'HIDDEN') ||
        firstSvc.servers[0];
      if (firstSrv) {
        setSelectedServerId(firstSrv.id);
        setQuantity(firstSrv.minQty);
      }
    }
  };

  const handleServiceSelect = (svcCode: string) => {
    setSelectedServiceCode(svcCode);
    const svc = currentPlatformServices.find((s) => s.code === svcCode);
    if (svc && svc.servers.length > 0) {
      const firstVisible =
        svc.servers.find((s) => buffOverrides[String(s.id)]?.status !== 'HIDDEN') ||
        svc.servers[0];
      setSelectedServerId(firstVisible.id);
      setQuantity(firstVisible.minQty);
    }
  };

  const handleServerSelect = (server: SmmServer) => {
    setSelectedServerId(server.id);
    setPreOrderAck(false);
    if (quantity < server.minQty) setQuantity(server.minQty);
    else if (quantity > server.maxQty) setQuantity(server.maxQty);
  };

  const handleQtyAdjust = (delta: number) => {
    if (!selectedServer) return;
    const next = quantity + delta;
    if (next >= selectedServer.minQty && next <= selectedServer.maxQty) {
      setQuantity(next);
    }
  };

  const rawBulkLines = bulkUrlsText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const validBulkLinks = rawBulkLines.filter((line) => /^https?:\/\/\S+/i.test(line));
  const invalidBulkLines = rawBulkLines.filter((line) => !/^https?:\/\/\S+/i.test(line));

  const singleUnitTotal = calculateSmmPrice(selectedServer.retailPrice, quantity);
  const calculatedTotal = bulkMode
    ? singleUnitTotal * Math.max(0, validBulkLinks.length)
    : singleUnitTotal;
  const finalTotal = calculatedTotal;
  const userBalance = Number(wallet?.balance || 0);
  const isInsufficient = userBalance < finalTotal;
  const missingAmount = Math.max(10000, Math.ceil((finalTotal - userBalance) / 1000) * 1000);
  const isNoWarrantyServer = selectedServerMeta.isNoWarranty;
  const savedProfiles = Array.isArray(profile?.savedProfiles) ? profile.savedProfiles : [];

  const formatVND = (val: number) =>
    new Intl.NumberFormat('vi-VN').format(val) + 'đ';

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setQuoteSuccess(null);

    if (!user) {
      router.push('/login?next=/buff');
      return;
    }
    if (isInsufficient) {
      router.push(`/wallet?amount=${missingAmount}`);
      return;
    }
    if (bulkMode) {
      if (validBulkLinks.length === 0) {
        showAlert('Vui lòng nhập ít nhất 1 đường dẫn hợp lệ (bắt đầu bằng http:// hoặc https://).', 'Thiếu link Buff', 'warning');
        return;
      }
      if (invalidBulkLines.length > 0) {
        showAlert(`Có ${invalidBulkLines.length} dòng không phải URL hợp lệ (cần http:// hoặc https://). Vui lòng kiểm tra lại.`, 'Link không hợp lệ', 'warning');
        return;
      }
    } else if (!targetUrl.trim()) {
      showAlert('Vui lòng nhập đường dẫn bài viết hoặc kênh cần tăng tương tác.', 'Thiếu thông tin', 'warning');
      return;
    }
    if (isNoWarrantyServer && !preOrderAck) {
      showAlert('Vui lòng xác nhận đã đọc kỹ lưu ý gói Không Bảo Hành / cảnh báo máy chủ trước khi tạo đơn.', 'Cần xác nhận', 'warning');
      return;
    }
    const cleanTele = telegramId.trim();
    const cleanZalo = zaloPhone.trim();
    if (!cleanTele && !cleanZalo) {
      showAlert('Vui lòng nhập ít nhất ID Telegram hoặc Số Zalo để nhận thông báo đơn.', 'Thiếu liên hệ', 'warning');
      return;
    }
    setIsPreOrderModalOpen(true);
  };

  const handleConfirmOrder = async () => {
    setIsSubmittingQuote(true);
    const linksToSubmit = bulkMode ? validBulkLinks : [targetUrl.trim()];
    const cleanTele = telegramId.trim();
    const cleanZalo = zaloPhone.trim();
    const contactStr = [
      cleanTele ? `Tele: ${cleanTele}` : '',
      cleanZalo ? `Zalo: ${cleanZalo}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    try {
      const createdCodes: string[] = [];
      const failedErrors: string[] = [];

      for (const linkUrl of linksToSubmit) {
        const res = await fetch('/api/orders/create', {
          method: 'POST',
          cache: 'no-store',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sku: `BUFF-${selectedPlatform}-${activeService?.code || 'SVC'}-SV${selectedServer.id}`,
            name: `${selectedPlatform} - ${activeService?.name || 'Buff MXH'} (Server #${selectedServer.id} ${selectedServer.name})`,
            item_name: `${selectedPlatform} - ${activeService?.name || 'Buff MXH'} (Server #${selectedServer.id} ${selectedServer.name})`,
            amount: bulkMode ? singleUnitTotal : finalTotal,
            quantity,
            target_link: linkUrl,
            telegram_id: cleanTele || undefined,
            telegramId: cleanTele || undefined,
            zalo_phone: cleanZalo || undefined,
            zaloPhone: cleanZalo || undefined,
            delivery_contact: contactStr,
            customerContact: contactStr,
            service_type: 'BUFF_MXH',
            notes: userNotes,
          }),
        });
        const resData = await res.json();
        if (resData.success && resData.order) {
          createdCodes.push(resData.order.order_code);
        } else {
          failedErrors.push(resData.error || resData.message || 'Lỗi tạo đơn');
        }
      }

      if (createdCodes.length > 0) {
        clearBuffDraft();
        await refreshUserData();
        setQuoteSuccess('Đặt đơn thành công — Đang chuyển sang Kho đơn hàng...');
        setIsPreOrderModalOpen(false);
        if (bulkMode) setBulkUrlsText('');
        else setTargetUrl('');
        setUserNotes('');
        setTimeout(() => {
          router.push('/orders');
        }, 550);
      } else {
        setIsSubmittingQuote(false);
        setIsPreOrderModalOpen(false);
        showAlert(failedErrors[0] || 'Không thể tạo đơn hàng.', 'Lỗi đặt đơn', 'warning');
      }
    } catch (err: any) {
      setIsSubmittingQuote(false);
      setIsPreOrderModalOpen(false);
      showAlert('Lỗi gửi đơn: ' + err.message, 'Lỗi kết nối', 'warning');
    }
  };

  const platformIcons: Record<string, string> = {
    TIKTOK: '/assets/icons/platforms/tiktok.jpg',
    FACEBOOK: '/assets/icons/platforms/facebook.jpg',
    INSTAGRAM: '/assets/icons/platforms/instagram.jpg',
    YOUTUBE: '/assets/icons/platforms/youtube.jpg',
    TELEGRAM: '/assets/icons/platforms/telegram.jpg',
    THREADS: '/assets/icons/platforms/threads.jpg',
  };

  return (
    <div className="space-y-6 py-2 max-w-7xl mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-sky-200/[0.08]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-[#0EA5E9]" strokeWidth={1.75} />
            <span>Buff Mạng Xã Hội (6 Nền Tảng • 57 Server)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Tăng tương tác TikTok, Facebook, Instagram, YouTube, Telegram, Threads với bảng giá minh bạch.
          </p>
        </div>

        <a
          href={ADMIN_TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl btn-ios-secondary text-xs flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5 text-[#0EA5E9]" strokeWidth={1.75} />
          <span>{ADMIN_SUPPORT_LABEL}</span>
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Step 1: Platforms */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-sky-300">
                1. Chọn nền tảng mạng xã hội
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">{selectedPlatform}</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {BUFF_PLATFORMS.map((plat) => {
                const isSelected = selectedPlatform === plat.id;
                return (
                  <button
                    key={plat.id}
                    type="button"
                    onClick={() => handlePlatformSelect(plat.id)}
                    className={`relative min-h-[76px] p-2 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all border ${
                      isSelected
                        ? 'border-[#0EA5E9] bg-sky-500/[0.12] shadow-[0_8px_24px_rgba(14,165,233,0.18)]'
                        : 'liquid-glass-card hover:border-sky-400/35'
                    }`}
                  >
                    <BrandIcon
                      slug={plat.id.toLowerCase()}
                      name={plat.name}
                      iconPath={platformIcons[plat.id]}
                      size="sm"
                      active={isSelected}
                    />
                    <span className="text-[10px] sm:text-xs font-bold text-slate-200">{plat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Services & Servers */}
          <div className="space-y-4">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-sky-300">
              2. Chọn dịch vụ &amp; máy chủ
            </h2>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
              {currentPlatformServices.map((svc) => {
                const isSvcActive = svc.code === selectedServiceCode;
                return (
                  <button
                    key={svc.code}
                    type="button"
                    onClick={() => handleServiceSelect(svc.code)}
                    className={`whitespace-nowrap shrink-0 px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
                      isSvcActive
                        ? 'bg-[#0EA5E9] text-[#07090E]'
                        : 'bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:text-white'
                    }`}
                  >
                    <span>{svc.name}</span>
                    <span className="text-[10px] font-mono tabular-nums opacity-75">
                      ({svc.servers.filter((s) => buffOverrides[String(s.id)]?.status !== 'HIDDEN').length})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2.5">
              {activeServers.map((server) => {
                const ov = buffOverrides[String(server.id)];
                const meta = resolveBuffServerMeta(server, ov);
                const resolvedServer: SmmServer = { ...server, retailPrice: meta.retailPrice };
                const isServerSelected = server.id === selectedServer.id;
                const isVietnam = meta.originBadge === 'Việt';
                const isFastSpeed = meta.speedBadge === 'Tức thì' || meta.speedBadge === 'Nhanh';

                return (
                  <button
                    key={server.id}
                    type="button"
                    onClick={() => handleServerSelect(resolvedServer)}
                    className={`w-full text-left p-3.5 sm:p-4 rounded-2xl transition border flex items-start justify-between gap-3 ${
                      isServerSelected
                        ? 'border-[#0EA5E9] bg-sky-500/[0.1] shadow-[0_8px_24px_rgba(14,165,233,0.16)]'
                        : 'liquid-glass-card hover:border-sky-400/35'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <BrandIcon
                        slug={selectedPlatform.toLowerCase()}
                        name={selectedPlatform}
                        iconPath={platformIcons[selectedPlatform]}
                        size="md"
                        active={isServerSelected}
                      />

                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 font-mono text-[10px] font-bold border border-sky-400/25">
                            #{server.id}
                          </span>
                          <span className="font-bold text-xs sm:text-sm text-white">
                            {meta.cleanName}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                              isVietnam
                                ? 'bg-teal-500/12 border-teal-400/25 text-teal-300'
                                : 'bg-indigo-500/12 border-indigo-400/25 text-indigo-300'
                            }`}
                          >
                            {meta.originBadge}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                              isFastSpeed
                                ? 'bg-sky-500/12 border-sky-400/25 text-sky-300'
                                : 'bg-slate-500/15 border-slate-400/25 text-slate-300'
                            }`}
                          >
                            {meta.speedBadge}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                              meta.isNoWarranty
                                ? 'bg-amber-500/12 border-amber-400/25 text-amber-300'
                                : 'bg-emerald-500/12 border-emerald-400/25 text-emerald-300'
                            }`}
                          >
                            {meta.warrantyBadge}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-mono tabular-nums">
                          <span>Min {server.minQty.toLocaleString()}</span>
                          <span>•</span>
                          <span>Max {server.maxQty.toLocaleString()}</span>
                          {meta.serverNote && <span className="text-slate-300 font-sans">• {meta.serverNote}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono tabular-nums font-bold text-sm text-[#38BDF8]">
                        {formatVND(meta.retailPrice)}
                      </div>
                      <div className="text-[10px] text-slate-400">/ 1.000 {activeService.unit}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Dedicated Selected Server Spec & Note Card */}
            {selectedServer.id > 0 && (
              <div className="p-4 rounded-2xl liquid-glass-card border-sky-400/25 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-sky-300">
                    Chú thích riêng máy chủ #{selectedServer.id} — {selectedServerMeta.cleanName}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold">
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] text-slate-200">
                      {selectedServerMeta.originBadge}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-sky-500/12 border border-sky-400/25 text-sky-300">
                      {selectedServerMeta.speedBadge}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded border ${
                        selectedServerMeta.isNoWarranty
                          ? 'bg-amber-500/12 border-amber-400/25 text-amber-300'
                          : 'bg-emerald-500/12 border-emerald-400/25 text-emerald-300'
                      }`}
                    >
                      {selectedServerMeta.warrantyBadge}
                    </span>
                  </div>
                </div>
                <p className="text-slate-200 leading-relaxed">
                  {selectedServerMeta.serverNote ||
                    `Tốc độ ${selectedServerMeta.speedBadge.toLowerCase()}, nguồn tài nguyên ${selectedServerMeta.originBadge}, chính sách ${selectedServerMeta.warrantyBadge}.`}
                </p>
                <div className="text-[11px] font-mono tabular-nums text-slate-400">
                  Giới hạn số lượng: Min {selectedServer.minQty.toLocaleString()} — Max {selectedServer.maxQty.toLocaleString()} {activeService?.unit || ''}
                </div>
              </div>
            )}

            {/* Full Clean Guidance & Server Notes Card */}
            <div className="p-4 sm:p-5 rounded-2xl liquid-glass-card space-y-3 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-bold text-sky-300 text-xs sm:text-sm">
                <HelpCircle className="w-4 h-4 shrink-0" />
                <span>Lưu Ý &amp; Chú Thích Khi Đặt Đơn Buff MXH</span>
              </div>

              <ul className="space-y-1.5 text-[11px] sm:text-xs text-slate-300 leading-relaxed list-disc pl-4">
                <li>
                  <strong className="text-white">Cách lấy link công khai:</strong> Đặt bài viết, video hoặc trang cá nhân ở chế độ Công khai (Public), sao chép đúng đường dẫn gốc và không dùng link rút gọn.
                </li>
                <li>
                  <strong className="text-white">Không đổi Username khi đơn đang chạy:</strong> Tuyệt đối không đổi ID kênh, ẩn bài viết hay khóa riêng tư trong lúc hệ thống đang xử lý để tránh bị hụt đơn.
                </li>
                <li>
                  <strong className="text-white">Quy định bảo hành:</strong> Máy chủ có nhãn <strong className="text-emerald-300">BH</strong> được hỗ trợ bảo hành theo đúng thời hạn ghi trên gói; máy chủ nhãn <strong className="text-amber-300">KBH</strong> là gói giá sale, không áp dụng bảo hành tụt tự nhiên.
                </li>
              </ul>

              <div className="pt-2 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 rounded-xl bg-[#07090E]/80 border border-white/[0.06]">
                  <strong className="text-teal-300">[Việt / Tây]</strong>
                  <div className="text-slate-400 text-[10px]">Nguồn tài khoản chạy</div>
                </div>
                <div className="p-2 rounded-xl bg-[#07090E]/80 border border-white/[0.06]">
                  <strong className="text-sky-300">[Nhanh / Chậm]</strong>
                  <div className="text-slate-400 text-[10px]">Tốc độ lên tương tác</div>
                </div>
                <div className="p-2 rounded-xl bg-[#07090E]/80 border border-white/[0.06]">
                  <strong className="text-emerald-300">[BH X ngày]</strong>
                  <div className="text-slate-400 text-[10px]">Bảo hành tụt theo hạn</div>
                </div>
                <div className="p-2 rounded-xl bg-[#07090E]/80 border border-white/[0.06]">
                  <strong className="text-amber-300">[KBH]</strong>
                  <div className="text-slate-400 text-[10px]">Gói không bảo hành</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sticky Order Inspector (4 cols) */}
        <div className="lg:col-span-4 lg:sticky lg:top-20 self-start">
          <form
            onSubmit={handleOrderSubmit}
            className="p-5 rounded-2xl liquid-glass-card glass-refraction space-y-4 text-xs"
          >
            <div className="font-bold uppercase tracking-wider text-sky-300 pb-2.5 border-b border-white/[0.08]">
              3. Thông tin &amp; Thanh toán
            </div>

            {selectedServer.id > 0 && (
              <div className="p-3 rounded-xl bg-[#07090E]/80 border border-sky-400/25 space-y-1">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-bold text-white truncate">
                    #{selectedServer.id} • {selectedServerMeta.cleanName}
                  </span>
                  <span className="font-mono tabular-nums font-bold text-sky-300 shrink-0">
                    {formatVND(selectedServer.retailPrice)}/1k
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 leading-relaxed">
                  {selectedServerMeta.serverNote ||
                    `${selectedServerMeta.originBadge} • ${selectedServerMeta.speedBadge} • ${selectedServerMeta.warrantyBadge}`}
                </div>
              </div>
            )}

            {quoteSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/12 border border-emerald-500/35 space-y-2.5">
                <div className="text-emerald-300 font-semibold flex items-start gap-2">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{quoteSuccess}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/orders" className="px-3 py-1.5 rounded-lg btn-ios-secondary text-[11px]">
                    Xem lịch sử đơn
                  </Link>
                  <a
                    href={ADMIN_TELEGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg btn-ios-blue text-[11px] flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>Nhắn Admin</span>
                  </a>
                </div>
              </div>
            )}

            {/* Single vs Bulk Buff Switcher */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#07090E] border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setBulkMode(false)}
                className={`h-8 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition ${
                  !bulkMode ? 'bg-[#0EA5E9] text-[#07090E]' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Đặt 1 Link</span>
              </button>
              <button
                type="button"
                onClick={() => setBulkMode(true)}
                className={`h-8 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition ${
                  bulkMode ? 'bg-[#0EA5E9] text-[#07090E]' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Đặt Nhiều Link</span>
              </button>
            </div>

            {/* Saved Profiles 1-Tap Chips */}
            {savedProfiles.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  <BookmarkCheck className="w-3 h-3 text-sky-400" />
                  <span>Điền nhanh từ Hồ sơ</span>
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {savedProfiles.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        const url = preset.socialLink || '';
                        if (url) {
                          if (bulkMode) {
                            setBulkUrlsText((prev) => (prev.trim() ? `${prev.trim()}\n${url}` : url));
                          } else {
                            setTargetUrl(url);
                          }
                        }
                        if (preset.telegram && /^\d+$/.test(preset.telegram.replace('@', ''))) {
                          setTelegramId(preset.telegram.replace('@', ''));
                        }
                      }}
                      className="px-2.5 py-1 rounded-full bg-sky-500/12 border border-sky-400/25 hover:border-sky-400/50 text-[10px] font-semibold text-sky-200 whitespace-nowrap transition"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {bulkMode ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300">
                    Danh sách đường dẫn (mỗi dòng 1 link) <span className="text-red-400">*</span>
                  </label>
                  <span className="font-mono tabular-nums text-[10px] text-sky-300">
                    {validBulkLinks.length} link hợp lệ
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={bulkUrlsText}
                  onChange={(e) => setBulkUrlsText(e.target.value)}
                  placeholder={'https://www.tiktok.com/@user/video/1\nhttps://www.tiktok.com/@user/video/2'}
                  className="w-full p-2.5 rounded-xl bg-[#07090E] border border-white/[0.12] text-white font-mono text-[11px] focus:outline-none focus:border-[#0EA5E9]"
                />
                {invalidBulkLines.length > 0 && (
                  <p className="text-[10px] text-amber-300 mt-1">
                    {invalidBulkLines.length} dòng chưa bắt đầu bằng http:// hoặc https://
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Đường dẫn liên kết cần tăng tương tác <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full h-10 px-3 rounded-xl bg-[#07090E] border border-white/[0.12] text-white focus:outline-none focus:border-[#0EA5E9]"
                />
              </div>
            )}

            <div className="p-3 rounded-xl bg-[#060B16]/80 border border-sky-200/[0.08] space-y-2.5">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <UserCheck className="w-3.5 h-3.5 text-[#0EA5E9]" />
                <span>Thông tin liên hệ nhận đơn</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300">ID Telegram</label>
                  {resolvingUser && <span className="text-[10px] text-sky-400">Đang kiểm tra...</span>}
                </div>
                <input
                  type="text"
                  placeholder="ID số Telegram..."
                  value={telegramId}
                  onChange={(e) => setTelegramId(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-9 px-3 rounded-xl bg-[#0D1526] border border-sky-200/[0.1] text-white font-mono focus:outline-none focus:border-[#0EA5E9]"
                />
                {resolvedUser && (
                  <div className="mt-1.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{resolvedUser.username ? `@${resolvedUser.username}` : resolvedUser.fullName}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-slate-300 flex items-center gap-1 mb-1">
                  <Phone className="w-3 h-3 text-[#0EA5E9]" />
                  <span>Số Zalo (tuỳ chọn)</span>
                </label>
                <input
                  type="tel"
                  placeholder="09xxxxxxxx"
                  value={zaloPhone}
                  onChange={(e) => setZaloPhone(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-[#0D1526] border border-sky-200/[0.1] text-white font-mono focus:outline-none focus:border-[#0EA5E9]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-300">
                  Số lượng ({activeService?.unit || 'Lượt'})
                </label>
                <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                  {selectedServer.minQty.toLocaleString()} – {selectedServer.maxQty.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQtyAdjust(-100)}
                  className="w-10 h-10 rounded-xl bg-[#060B16] border border-sky-200/[0.1] text-white flex items-center justify-center"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  value={quantity}
                  min={selectedServer.minQty}
                  max={selectedServer.maxQty}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || selectedServer.minQty)}
                  className="flex-1 h-10 text-center font-mono tabular-nums font-bold px-2 rounded-xl bg-[#060B16] border border-sky-200/[0.1] text-white"
                />
                <button
                  type="button"
                  onClick={() => handleQtyAdjust(100)}
                  className="w-10 h-10 rounded-xl bg-[#060B16] border border-sky-200/[0.1] text-white flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {bulkMode && (
              <p className="text-[11px] text-slate-400">
                Chế độ Nhiều Link: giá = {formatVND(singleUnitTotal)} x {validBulkLinks.length} link.
              </p>
            )}

            {/* Total */}
            <div className="p-3.5 rounded-xl bg-[#060B16]/90 border border-sky-200/[0.1] space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-sm font-medium">Tổng thanh toán</span>
                <span className="font-mono tabular-nums text-lg font-black text-[#38BDF8]">
                  {formatVND(finalTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Số dư ví khả dụng</span>
                <span className="font-mono tabular-nums font-bold text-emerald-400">
                  {formatVND(userBalance)}
                </span>
              </div>
              <div className="pt-2 border-t border-white/[0.06] flex items-center gap-1.5 text-[11px] text-amber-300/90 leading-tight">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                <span>Giá dịch vụ Buff MXH đã được tối ưu sát giá gốc — không áp dụng mã giảm giá/Voucher.</span>
              </div>
            </div>

            <textarea
              rows={2}
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="Ghi chú thêm cho Admin (tuỳ chọn)..."
              className="w-full p-2.5 rounded-xl bg-[#07090E] border border-white/[0.1] text-white focus:outline-none focus:border-[#0EA5E9]"
            />

            {isNoWarrantyServer && (
              <label className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/[0.08] border border-amber-400/25 text-[11px] text-amber-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={preOrderAck}
                  onChange={(e) => setPreOrderAck(e.target.checked)}
                  className="mt-0.5 rounded border-amber-400/50 bg-[#07090E] text-sky-400 focus:ring-0"
                />
                <span>
                  Tôi hiểu máy chủ này <strong>Không Bảo Hành (KBH)</strong> / có thể tụt tự nhiên và đã đọc kỹ mô tả.
                </span>
              </label>
            )}

            {isInsufficient ? (
              <Link
                href={`/wallet?amount=${missingAmount}`}
                className="w-full h-11 rounded-xl btn-ios-blue flex items-center justify-center gap-2 font-bold"
              >
                <Wallet className="w-4 h-4" />
                <span className="tabular-nums">Nạp Thêm {formatVND(missingAmount)} Để Thanh Toán</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                type="submit"
                disabled={isSubmittingQuote || Boolean(quoteSuccess)}
                className="w-full h-11 rounded-xl btn-ios-blue flex items-center justify-center gap-2 font-bold disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>
                  {quoteSuccess
                    ? 'Đang chuyển sang Kho đơn hàng...'
                    : isSubmittingQuote
                    ? 'Đang tạo đơn...'
                    : 'Tạo Đơn Buff MXH'}
                </span>
              </button>
            )}

            {/* Khối 1: Thông tin máy chủ */}
            <div className="p-4 rounded-2xl liquid-glass-card glass-refraction border border-sky-400/20 space-y-2.5 text-xs mt-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-sky-400" />
                  <span>Thông tin máy chủ</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  ID: #{selectedServer.id}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.05] border border-white/[0.1] text-slate-200">
                  {selectedServerMeta.originBadge === 'Việt' ? '🇻🇳 Tài nguyên Acc Việt' : '🌏 Tài nguyên Acc Tây'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 border border-sky-400/30 text-sky-200">
                  ⚡ Tốc độ: {selectedServerMeta.speedBadge}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  selectedServerMeta.isNoWarranty
                    ? 'bg-amber-500/15 border-amber-400/30 text-amber-300'
                    : 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                }`}>
                  {selectedServerMeta.isNoWarranty ? '⚠️ Không Bảo Hành' : `♻️ ${selectedServerMeta.warrantyBadge}`}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#060B16]/80 border border-sky-200/[0.08] text-slate-300 leading-relaxed text-[11px]">
                {selectedServerMeta.serverNote ||
                  `Máy chủ #${selectedServer.id} (${selectedServerMeta.cleanName}): Tốc độ ${selectedServerMeta.speedBadge.toLowerCase()}, nguồn tài nguyên ${selectedServerMeta.originBadge.toLowerCase()}, chính sách ${selectedServerMeta.warrantyBadge}. Hỗ trợ tăng ổn định theo link bài viết hoặc kênh.`}
              </div>
            </div>

            {/* Khối 2: Thông báo người dùng & Kí hiệu Buff */}
            <div className="p-4 rounded-2xl liquid-glass-card glass-refraction border border-sky-400/20 space-y-3 text-xs mt-3">
              <div className="flex items-center justify-between pb-1 border-b border-white/[0.08]">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-sky-400" />
                  <span>Thông Báo Người Dùng &amp; Kí Hiệu Buff</span>
                </span>
                <span className="text-[10px] font-mono text-sky-300 font-semibold">SMM Guide</span>
              </div>

              {/* Bảng Kí hiệu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-base">⚡</span>
                  <span className="text-slate-300">Tốc độ hoàn thành đơn nhanh</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-base">⚠️</span>
                  <span className="text-slate-300">Không Bảo Hành, có thể tụt nhẹ</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-base">♻️</span>
                  <span className="text-slate-300">Có bảo hành (thường kèm số ngày)</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-base">🌏</span>
                  <span className="text-slate-300">Tài nguyên acc tây</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] sm:col-span-2">
                  <span className="text-base">🇻🇳</span>
                  <span className="text-slate-300">Tài nguyên acc Việt</span>
                </div>
              </div>

              {/* Cảnh báo TikTok & IG quét */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] space-y-1.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Khuyến cáo:</strong> Các dịch vụ TikTok và Sub IG đang bị quét rất mạnh, ưu tiên dùng máy chủ có bảo hành để tránh hao hụt số lượng.
                  </p>
                </div>
                <div className="pl-6">
                  <Link
                    href="/warranty"
                    className="text-sky-300 hover:text-sky-200 font-bold inline-flex items-center gap-1 transition"
                  >
                    <span>Xem chính sách bảo hành 1-chạm</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {selectedServer && (
        <PreOrderModal
          isOpen={isPreOrderModalOpen}
          onClose={() => setIsPreOrderModalOpen(false)}
          onConfirm={handleConfirmOrder}
          orderType="BUFF"
          title="Xác Nhận Đơn Buff MXH"
          orderSummary={{
            name: `${selectedPlatform} • ${activeService?.name || 'Buff MXH'}`,
            price: finalTotal,
            quantity,
            details: bulkMode
              ? `#${selectedServer.id} ${selectedServerMeta.cleanName} | ${validBulkLinks.length} liên kết`
              : `#${selectedServer.id} ${selectedServerMeta.cleanName} | Link: ${targetUrl}`,
          }}
          isSubmitting={isSubmittingQuote}
        />
      )}
    </div>
  );
}

export default function BuffSocialPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Đang tải Buff MXH...</div>}>
      <BuffSocialContent />
    </Suspense>
  );
}
