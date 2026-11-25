'use client';

import React, { useEffect, useState } from 'react';
import {
  Wallet,
  BellRing,
  Activity,
  Save,
  ArrowRight,
  RefreshCw,
  Moon,
  Percent,
  Tag,
  Trash2,
  Search,
  Landmark,
  Bot,
  Send,
  Copy,
  Check,
  ExternalLink,
  Zap,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertTriangle,
  KeyRound,
} from 'lucide-react';
import { ADMIN_TELEGRAM_URL } from '@/lib/constants';
import { useCustomDialog } from '@/components/common/custom-dialog';

export function AdminSystemWalletTab() {
  const { showConfirm, showAlert } = useCustomDialog();
  const [users, setUsers] = useState<any[]>([]);
  const [balanceLogs, setBalanceLogs] = useState<any[]>([]);
  const [macroLogs, setMacroLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Balance adjustment form
  const [identifier, setIdentifier] = useState('');
  const [delta, setDelta] = useState<number>(50000);
  const [reason, setReason] = useState('Admin điều chỉnh số dư ví');
  const [adjusting, setAdjusting] = useState(false);
  const [walletNotice, setWalletNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Announcement & Support Link Config
  const [annConfig, setAnnConfig] = useState({
    is_active: false,
    banner_active: true,
    title: 'Thông Báo Hệ Thống YukiShopMXH',
    content: '',
    cta_text: 'Kênh Hỗ Trợ Telegram',
    cta_link: ADMIN_TELEGRAM_URL,
    support_telegram_url: ADMIN_TELEGRAM_URL,
    banner_text: '',
  });
  const [savingAnn, setSavingAnn] = useState(false);
  const [annNotice, setAnnNotice] = useState<string | null>(null);

  // Operational SystemConfig (Sleep Mode, Cashback 2%, Affiliate 5%)
  const [sysCfg, setSysCfg] = useState({
    sleep_mode: false,
    sleep_message:
      'Shop đang tạm nghỉ duyệt tay. Nạp ví Auto 24/7 vẫn hoạt động; đơn xử lý thủ công sẽ được duyệt ngay khi mở ca.',
    cashback_rate: 0.02,
    cashback_min_order: 20000,
    cashback_min_redeem: 5000,
    affiliate_rate: 0.05,
  });
  const [savingSys, setSavingSys] = useState(false);
  const [sysNotice, setSysNotice] = useState<string | null>(null);

  // Database connection status
  const [isDbConfigured, setIsDbConfigured] = useState(true);

  // Telegram Bot & Webhook Live Config
  // Bot 1: Shop Notice Bot
  const [tgToken, setTgToken] = useState('');
  const [tgAdminId, setTgAdminId] = useState('8960751162');
  const [tgWebhookSecret, setTgWebhookSecret] = useState('');
  const [tgBotUsername, setTgBotUsername] = useState('');
  const [tgIsConnected, setTgIsConnected] = useState(false);
  const [showTgToken, setShowTgToken] = useState(false);

  // Bot 2: Forgot Password OTP Bot
  const [tgOtpToken, setTgOtpToken] = useState('');
  const [tgOtpBotUsername, setTgOtpBotUsername] = useState('');
  const [tgOtpIsConnected, setTgOtpIsConnected] = useState(false);
  const [showTgOtpToken, setShowTgOtpToken] = useState(false);

  const [savingTgConfig, setSavingTgConfig] = useState(false);
  const [tgNotice, setTgNotice] = useState<{ type: 'ok' | 'err'; message: string } | null>(null);

  // Telegram Bots Status & Diagnostics
  const [botStatus, setBotStatus] = useState<any>(null);
  const [syncingBots, setSyncingBots] = useState(false);
  const [botNotice, setBotNotice] = useState<string | null>(null);
  const [testingPing, setTestingPing] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [testingMacro, setTestingMacro] = useState(false);
  const [telegramNotice, setTelegramNotice] = useState<{ type: 'ok' | 'err'; message: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [webhookDomainInput, setWebhookDomainInput] = useState('');

  // Partner CTV Codes + Affiliate Withdrawals
  const [ctvCodes, setCtvCodes] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [newCtvCode, setNewCtvCode] = useState('');
  const [newCtvOwner, setNewCtvOwner] = useState('');
  const [newCtvDiscountPct, setNewCtvDiscountPct] = useState(3);
  const [newCtvCommissionPct, setNewCtvCommissionPct] = useState(5);
  const [savingCtv, setSavingCtv] = useState(false);
  const [ctvNotice, setCtvNotice] = useState<string | null>(null);

  // Global Wallet Audit Ledger
  const [globalLedger, setGlobalLedger] = useState<any[]>([]);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Top Depositor Distribution & Spin Tickets Management
  const [distributingTopRewards, setDistributingTopRewards] = useState(false);
  const [topRewardNotice, setTopRewardNotice] = useState<any>(null);
  const [spinUserIdentifier, setSpinUserIdentifier] = useState('');
  const [spinTicketsDelta, setSpinTicketsDelta] = useState<number>(3);
  const [spinTicketsReason, setSpinTicketsReason] = useState('Admin tặng vé quay may mắn');
  const [adjustingSpinTickets, setAdjustingSpinTickets] = useState(false);
  const [spinTicketsNotice, setSpinTicketsNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadGlobalLedger = async (q = ledgerSearch) => {
    setLoadingLedger(true);
    try {
      const res = await fetch(`/api/admin/wallet-ledger?q=${encodeURIComponent(q)}&limit=100`);
      if (res.ok) {
        const json = await res.json();
        setGlobalLedger(Array.isArray(json.entries) ? json.entries : []);
      }
    } finally {
      setLoadingLedger(false);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [walletRes, macroRes, annRes, ctvRes, ledgerRes] = await Promise.all([
        fetch('/api/admin/wallet/adjust', { cache: 'no-store' }),
        fetch('/api/admin/macrodroid/logs', { cache: 'no-store' }),
        fetch('/api/settings/announcement', { cache: 'no-store' }),
        fetch('/api/admin/ctv-codes', { cache: 'no-store' }),
        fetch('/api/admin/wallet-ledger?limit=100', { cache: 'no-store' }),
      ]);
      if (walletRes.ok) {
        const wData = await walletRes.json();
        setUsers(Array.isArray(wData.users) ? wData.users : []);
        setBalanceLogs(Array.isArray(wData.logs) ? wData.logs : []);
      }
      if (macroRes.ok) {
        const mData = await macroRes.json();
        setMacroLogs(Array.isArray(mData.logs) ? mData.logs : []);
      }
      if (annRes.ok) {
        const aData = await annRes.json();
        if (aData?.data) {
          setAnnConfig((prev) => ({
            ...prev,
            ...aData.data,
            support_telegram_url:
              aData.data.support_telegram_url || aData.data.cta_link || ADMIN_TELEGRAM_URL,
          }));
        }
        if (aData?.systemConfig) {
          setSysCfg((prev) => ({ ...prev, ...aData.systemConfig }));
        }
      }
      if (ctvRes.ok) {
        const cData = await ctvRes.json();
        setCtvCodes(Array.isArray(cData.codes) ? cData.codes : []);
        setWithdrawals(Array.isArray(cData.withdrawals) ? cData.withdrawals : []);
      }
      if (ledgerRes.ok) {
        const lData = await ledgerRes.json();
        setGlobalLedger(Array.isArray(lData.entries) ? lData.entries : []);
      }
      await Promise.all([loadBotStatus(), loadTgConfig()]);
    } finally {
      setLoading(false);
    }
  };

  const loadTgConfig = async () => {
    try {
      const res = await fetch('/api/admin/telegram-config', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (typeof json.isDatabaseConfigured === 'boolean') {
          setIsDbConfigured(json.isDatabaseConfigured);
        }
        if (json.config) {
          if (json.config.bot_token) setTgToken(json.config.bot_token);
          if (json.config.admin_id) setTgAdminId(json.config.admin_id);
          if (json.config.webhook_secret) setTgWebhookSecret(json.config.webhook_secret);
          if (json.config.bot_username) setTgBotUsername(json.config.bot_username);
          setTgIsConnected(Boolean(json.config.is_connected));

          if (json.config.otp_bot_token) setTgOtpToken(json.config.otp_bot_token);
          if (json.config.otp_bot_username) setTgOtpBotUsername(json.config.otp_bot_username);
          setTgOtpIsConnected(Boolean(json.config.otp_is_connected));
        }
      }
    } catch (e) {
      console.warn('Error loading Telegram config:', e);
    }
  };

  const handleSaveTgConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tgToken.trim() && !tgOtpToken.trim()) {
      setTgNotice({
        type: 'err',
        message: 'Vui lòng nhập ít nhất 1 Token Bot Telegram (Shop Bot hoặc OTP Bot) trước khi lưu!',
      });
      return;
    }
    setSavingTgConfig(true);
    setTgNotice(null);
    try {
      const res = await fetch('/api/admin/telegram-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tgToken.trim(),
          otpToken: tgOtpToken.trim(),
          adminId: tgAdminId.trim(),
          webhookSecret: tgWebhookSecret.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.bot_username) {
          setTgIsConnected(true);
          setTgBotUsername(data.bot_username);
        }
        if (data.otp_bot_username) {
          setTgOtpIsConnected(true);
          setTgOtpBotUsername(data.otp_bot_username);
        }
        setTgNotice({
          type: 'ok',
          message: data.message || 'Đã kết nối và lưu cấu hình thành công cả 2 Bot vào Database! Đã gửi tin nhắn test tới Admin.',
        });
      } else {
        setTgNotice({
          type: 'err',
          message: data.error || 'Token không hợp lệ hoặc Telegram bị chặn.',
        });
      }
    } catch (err: any) {
      setTgNotice({
        type: 'err',
        message: 'Lỗi mạng khi kết nối Telegram: ' + err.message,
      });
    } finally {
      setSavingTgConfig(false);
    }
  };

  const handleSyncWebhookAll = async () => {
    setSyncingBots(true);
    setBotNotice(null);
    try {
      const originToUse =
        webhookDomainInput.trim() ||
        (typeof window !== 'undefined' ? window.location.origin : '');
      const res = await fetch('/api/admin/telegram/sync-bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: originToUse.startsWith('https://') ? 'set_webhook' : 'sync_all',
          publicDomain: originToUse,
        }),
      });
      const json = await res.json();
      setBotNotice(json.message || json.error || 'Đã đồng bộ Webhook & Menu lệnh 2 chiều.');
      await Promise.all([loadBotStatus(), loadTgConfig()]);
    } catch (e: any) {
      setBotNotice('Lỗi đồng bộ Webhook: ' + e.message);
    } finally {
      setSyncingBots(false);
    }
  };

  const handleWithdrawalAction = async (withdrawalId: string, action: 'approve' | 'reject') => {
    const label = action === 'approve' ? 'xác nhận ĐÃ CHUYỂN TIỀN' : 'TỪ CHỐI & hoàn lại số dư hoa hồng';
    const ok = await showConfirm(`Bạn chắc chắn muốn ${label} cho yêu cầu #${withdrawalId}?`, 'Xử Lý Rút Hoa Hồng');
    if (!ok) return;
    try {
      const res = await fetch('/api/admin/ctv-codes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId, action }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        await showAlert(data.error || 'Không thể xử lý yêu cầu.', 'Lỗi Xử Lý', 'error');
        return;
      }
      setWithdrawals((prev) =>
        prev.map((w) => (w.id === withdrawalId ? { ...w, status: data.status } : w))
      );
      await showAlert(data.message, 'Thành Công', 'success');
    } catch {
      await showAlert('Lỗi kết nối khi xử lý yêu cầu rút tiền.', 'Lỗi Mạng', 'error');
    }
  };

  const loadBotStatus = async () => {
    try {
      const res = await fetch('/api/admin/telegram/sync-bots');
      if (res.ok) {
        const json = await res.json();
        setBotStatus(json);
        if (json.detectedOrigin && !webhookDomainInput) {
          setWebhookDomainInput(json.detectedOrigin);
        }
      }
    } catch {}
  };

  const handleSyncBotCommands = async () => {
    setSyncingBots(true);
    setBotNotice(null);
    try {
      const res = await fetch('/api/admin/telegram/sync-bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_commands' }),
      });
      const json = await res.json();
      setBotNotice(json.message || 'Đã đồng bộ menu lệnh Bot thành công.');
      await loadBotStatus();
    } catch (e: any) {
      setBotNotice('Lỗi khi đồng bộ bot: ' + e.message);
    } finally {
      setSyncingBots(false);
    }
  };

  const handleTestPing = async () => {
    setTestingPing(true);
    setBotNotice(null);
    try {
      const res = await fetch('/api/admin/test-bot', { method: 'POST' });
      const json = await res.json();
      setBotNotice(json.message || (json.success ? 'Đã gửi test ping thành công!' : json.error));
      await loadBotStatus();
    } catch (e: any) {
      setBotNotice('Lỗi khi gửi test bot: ' + e.message);
    } finally {
      setTestingPing(false);
    }
  };

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    setTelegramNotice(null);
    try {
      const res = await fetch('/api/admin/test-telegram', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        setTelegramNotice({
          type: 'ok',
          message: json.message || 'Đã gửi thông báo kiểm thử tới Telegram Admin thành công!',
        });
      } else {
        setTelegramNotice({
          type: 'err',
          message: json.message || json.error || 'Gửi test Telegram thất bại.',
        });
      }
    } catch (e: any) {
      setTelegramNotice({
        type: 'err',
        message: 'Lỗi mạng khi kết nối test Telegram: ' + e.message,
      });
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleTestMacroDroid = async () => {
    setTestingMacro(true);
    setTelegramNotice(null);
    try {
      const res = await fetch('/api/admin/macrodroid/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '[ZaloPay Test] Nhan +50.000d ND: YUKISP_DH_TEST_ADMIN',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403 || res.status === 500) {
        setTelegramNotice({
          type: 'err',
          message: json.error || 'Test MacroDroid thất bại.',
        });
      } else {
        setTelegramNotice({
          type: 'ok',
          message: `Webhook MacroDroid phản hồi: ${json.message || 'OK (đã ghi log biến động số dư)'}`,
        });
        await loadAll();
      }
    } catch (e: any) {
      setTelegramNotice({
        type: 'err',
        message: 'Lỗi kết nối test Webhook MacroDroid: ' + e.message,
      });
    } finally {
      setTestingMacro(false);
    }
  };

  const handleDeleteWebhook = async () => {
    setSyncingBots(true);
    setBotNotice(null);
    try {
      const res = await fetch('/api/admin/telegram/sync-bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_webhook' }),
      });
      const json = await res.json();
      setBotNotice(json.message || 'Đã chuyển sang chế độ Long-Polling nội bộ.');
      await loadBotStatus();
    } catch (e: any) {
      setBotNotice('Lỗi xóa webhook: ' + e.message);
    } finally {
      setSyncingBots(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const formatVND = (n: number) =>
    new Intl.NumberFormat('vi-VN').format(n) + 'đ';

  const handleAdjustBalance = async (e: React.FormEvent, sign: 1 | -1) => {
    e.preventDefault();
    if (!identifier.trim() || !delta) return;
    const finalDelta = Math.abs(delta) * sign;

    setAdjusting(true);
    setWalletNotice(null);

    try {
      const res = await fetch('/api/admin/wallet/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          delta: finalDelta,
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Điều chỉnh số dư thất bại.');
      }

      if (data.log) {
        setBalanceLogs((prev) => [data.log, ...prev]);
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === data.log?.userId ? { ...u, balance: data.newBalance } : u
        )
      );
      setWalletNotice({ type: 'ok', text: data.message });
    } catch (err: any) {
      setWalletNotice({ type: 'err', text: err.message });
    } finally {
      setAdjusting(false);
    }
  };

  const handleDistributeTopRewards = async () => {
    const ok = await showConfirm(
      'Xác nhận chốt và tự động phát thưởng Top Nạp (Voucher + Ví Mua Hàng + Vé Quay) cho tất cả khách hàng đạt chuẩn mốc?',
      'Phát Thưởng Top Nạp Tháng'
    );
    if (!ok) return;
    setDistributingTopRewards(true);
    setTopRewardNotice(null);
    try {
      const res = await fetch('/api/admin/top-depositors/distribute-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Phát quà thất bại');
      setTopRewardNotice({
        type: 'ok',
        text: data.message,
        results: data.results,
      });
      loadAll();
    } catch (err: any) {
      setTopRewardNotice({ type: 'err', text: err.message });
    } finally {
      setDistributingTopRewards(false);
    }
  };

  const handleAdjustSpinTickets = async (e: React.FormEvent, sign: 1 | -1) => {
    e.preventDefault();
    if (!spinUserIdentifier.trim() || !spinTicketsDelta) return;
    setAdjustingSpinTickets(true);
    setSpinTicketsNotice(null);
    try {
      const res = await fetch('/api/admin/spin/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: spinUserIdentifier.trim(),
          delta: Math.abs(spinTicketsDelta) * sign,
          reason: spinTicketsReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Thao tác vé quay thất bại');
      setSpinTicketsNotice({ type: 'ok', text: data.message });
      loadAll();
    } catch (err: any) {
      setSpinTicketsNotice({ type: 'err', text: err.message });
    } finally {
      setAdjustingSpinTickets(false);
    }
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAnn(true);
    setAnnNotice(null);
    try {
      const res = await fetch('/api/admin/settings/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(annConfig),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Lỗi lưu cấu hình.');
      setAnnNotice('Đã lưu cấu hình thông báo & kênh hỗ trợ.');
    } catch (err: any) {
      setAnnNotice(err.message);
    } finally {
      setSavingAnn(false);
    }
  };

  const handleSaveSystemConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSys(true);
    setSysNotice(null);
    try {
      const res = await fetch('/api/admin/settings/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemConfig: sysCfg }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Không thể lưu cấu hình vận hành.');
      if (data.systemConfig) setSysCfg((prev) => ({ ...prev, ...data.systemConfig }));
      setSysNotice('Đã lưu cấu hình Sleep Mode, Hoàn Điểm & Hoa Hồng Affiliate!');
    } catch (err: any) {
      setSysNotice(err.message);
    } finally {
      setSavingSys(false);
    }
  };

  const handleCreateCtvCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCtv(true);
    setCtvNotice(null);
    try {
      const res = await fetch('/api/admin/ctv-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCtvCode,
          ownerIdentifier: newCtvOwner,
          discountPercent: newCtvDiscountPct,
          commissionPercent: newCtvCommissionPct,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Không thể tạo mã CTV.');
      setCtvCodes((prev) => [data.code, ...prev.filter((c) => c.code !== data.code.code)]);
      setNewCtvCode('');
      setNewCtvOwner('');
      setCtvNotice(`Đã lưu mã CTV ${data.code.code}!`);
    } catch (err: any) {
      setCtvNotice(err.message);
    } finally {
      setSavingCtv(false);
    }
  };

  const handleDeleteCtvCode = async (code: string) => {
    const res = await fetch(`/api/admin/ctv-codes?code=${encodeURIComponent(code)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setCtvCodes((prev) => prev.filter((c) => c.code !== code));
    }
  };

  return (
    <div className="space-y-6">
      {/* Cảnh báo chưa kết nối Database trên Vercel */}
      {!isDbConfigured && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border-2 border-rose-500/40 text-rose-300 flex items-start gap-3 shadow-[0_0_25px_rgba(244,63,94,0.15)] animate-pulse">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-rose-200 text-sm flex items-center gap-2">
              <span>⚠️ Chưa kết nối Database trên Vercel!</span>
            </div>
            <p className="text-xs text-rose-300/90 leading-relaxed">
              Hệ thống đang hoạt động ở chế độ tạm thời (In-memory). Sau khi F5 hoặc Vercel khởi động lại serverless container, các thay đổi (giá sản phẩm, voucher, telegram bot, sleep mode) sẽ không được lưu.
              <br />
              <strong>Cách khắc phục:</strong> Vào <strong>Vercel Dashboard &rarr; Project YukiShopMXH &rarr; Settings &rarr; Environment Variables</strong> (hoặc tab <strong>Storage</strong>) để kết nối <strong>Supabase</strong> (<code>NEXT_PUBLIC_SUPABASE_URL</code> + <code>SUPABASE_SERVICE_ROLE_KEY</code>) hoặc <strong>Postgres</strong> (<code>POSTGRES_URL</code>).
            </p>
          </div>
        </div>
      )}

      {/* 1. Cộng / Trừ Số Dư Ví với Log Trước -> Sau */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 p-5 rounded-2xl bg-[#0D1526]/90 border border-sky-200/[0.1] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#0EA5E9]" strokeWidth={1.75} />
              <span>Cộng / Trừ Số Dư Ví Khách</span>
            </h3>
            <button
              type="button"
              onClick={loadAll}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              aria-label="Làm mới"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <form className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-300 font-semibold">
                Email / Username / SĐT / Telegram ID
              </label>
              <input
                type="text"
                list="yuki-admin-users"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Chọn hoặc nhập thông tin khách..."
                className="w-full h-9 px-3 rounded-xl bg-[#060B16] border border-sky-200/[0.12] text-white"
              />
              <datalist id="yuki-admin-users">
                {users.map((u) => (
                  <option
                    key={u.id}
                    value={u.email || u.username || u.phone || u.id}
                  >
                    {u.fullName} ({formatVND(u.balance)})
                  </option>
                ))}
              </datalist>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-300 font-semibold">
                Số tiền điều chỉnh (VNĐ)
              </label>
              <input
                type="number"
                min={1000}
                step={1000}
                value={delta}
                onChange={(e) => setDelta(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-xl bg-[#060B16] border border-sky-200/[0.12] font-mono tabular-nums text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-300 font-semibold">Lý do</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-[#060B16] border border-sky-200/[0.12] text-white"
              />
            </div>

            {walletNotice && (
              <div
                className={`p-2.5 rounded-xl text-[11px] font-semibold border ${
                  walletNotice.type === 'ok'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                {walletNotice.text}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={adjusting}
                onClick={(e) => handleAdjustBalance(e, 1)}
                className="h-10 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 font-bold text-xs"
              >
                + Cộng Tiền
              </button>
              <button
                type="button"
                disabled={adjusting}
                onClick={(e) => handleAdjustBalance(e, -1)}
                className="h-10 rounded-xl bg-red-500/12 hover:bg-red-500/20 border border-red-500/30 text-red-300 font-bold text-xs"
              >
                - Trừ Tiền
              </button>
            </div>
          </form>
        </div>

        {/* Balance Logs: Số dư trước -> Số dư sau */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-[#0D1526]/90 border border-sky-200/[0.1] space-y-3">
          <h3 className="text-sm font-bold text-white">
            Nhật Ký Điều Chỉnh Số Dư (Số dư trước → Số dư sau)
          </h3>

          {balanceLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Chưa có giao dịch điều chỉnh số dư thủ công nào.
            </div>
          ) : (
            <div className="divide-y divide-sky-200/[0.06] max-h-72 overflow-y-auto">
              {balanceLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">
                      {log.userName}{' '}
                      <span
                        className={`font-mono tabular-nums ${
                          log.delta >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        ({log.delta >= 0 ? '+' : ''}
                        {formatVND(log.delta)})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{log.reason}</div>
                  </div>
                  <div className="text-right shrink-0 font-mono tabular-nums text-[11px] text-sky-300 flex items-center gap-1">
                    <span className="text-slate-400">{formatVND(log.previousBalance)}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                    <span className="text-white font-bold">{formatVND(log.newBalance)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 1.5. QUẢN TRỊ TOP NẠP PHÂN BẬC & VÉ VÒNG QUAY MAY MẮN (LUCKY SPIN) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Chốt & Phát Quà Top Nạp */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-[#0c101c]/95 border border-amber-400/25 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-amber-400/15">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-400/15 text-amber-300 flex items-center justify-center font-bold">
                🏆
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Chốt & Phát Quà Top Nạp</h3>
                <p className="text-[11px] text-slate-400">4 Mốc (2M - 1.5M - 1M - 500k) • Tự động hạ bậc</p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/[0.06] border border-amber-400/20 text-xs text-slate-300 space-y-1">
            <p>• <strong>Top 1 (≥2M):</strong> Voucher 10% (max 40k) + 50.000đ ví + 3 Vé Quay</p>
            <p>• <strong>Top 2 (≥1.5M):</strong> Voucher 8% (max 30k) + 25.000đ ví + 2 Vé Quay</p>
            <p>• <strong>Top 3 (≥1M):</strong> Voucher 7% (max 20k) + 15.000đ ví + 1 Vé Quay</p>
            <p>• <strong>Khuyến Khích (≥500k):</strong> Voucher 5% + 1 Vé Quay</p>
            <p className="text-[10px] text-amber-300 italic pt-1">
              *Tài khoản Admin đã được loại trừ tự động khỏi danh sách nhận thưởng.
            </p>
          </div>

          {topRewardNotice && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold border ${
                topRewardNotice.type === 'ok'
                  ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                  : 'bg-red-500/15 border-red-500/35 text-red-300'
              }`}
            >
              <p>{topRewardNotice.text}</p>
              {Array.isArray(topRewardNotice.results) && topRewardNotice.results.length > 0 && (
                <div className="mt-2 space-y-1 font-mono text-[11px]">
                  {topRewardNotice.results.map((r: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span>#{r.rank} {r.email}:</span>
                      <span className="text-amber-300">
                        {r.voucherCode ? `[${r.voucherCode}] ` : ''}
                        {r.walletReward > 0 ? `+${r.walletReward.toLocaleString('vi-VN')}đ ` : ''}
                        {r.spinTickets > 0 ? `+${r.spinTickets} Vé` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleDistributeTopRewards}
            disabled={distributingTopRewards}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 disabled:opacity-40"
          >
            {distributingTopRewards ? 'Đang Xử Lý Phát Quà...' : 'Tổng Kết & Phát Quà Tháng'}
          </button>
        </div>

        {/* Right: Quản Lý Vé Vòng Quay May Mắn */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-[#0c101c]/95 border border-sky-400/20 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-sky-400/15">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-400/15 text-sky-300 flex items-center justify-center font-bold">
                🎫
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Cấp / Thu Hồi Vé Vòng Quay May Mắn</h3>
                <p className="text-[11px] text-slate-400">Can thiệp số vé quay Lucky Spin cho khách hàng</p>
              </div>
            </div>
          </div>

          <form className="space-y-3">
            <div>
              <label className="text-xs text-slate-300 font-semibold mb-1 block">
                Email hoặc Tên tài khoản
              </label>
              <input
                type="text"
                placeholder="VD: user@gmail.com hoặc username"
                value={spinUserIdentifier}
                onChange={(e) => setSpinUserIdentifier(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#060B16] border border-sky-200/[0.12] text-xs text-white focus:border-sky-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold mb-1 block">
                  Số Lượng Vé
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={spinTicketsDelta}
                  onChange={(e) => setSpinTicketsDelta(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl bg-[#060B16] border border-sky-200/[0.12] text-xs font-mono text-white focus:border-sky-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold mb-1 block">
                  Lý Do / Ghi Chú
                </label>
                <input
                  type="text"
                  value={spinTicketsReason}
                  onChange={(e) => setSpinTicketsReason(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#060B16] border border-sky-200/[0.12] text-xs text-white focus:border-sky-400 focus:outline-none"
                />
              </div>
            </div>

            {spinTicketsNotice && (
              <div
                className={`p-2.5 rounded-xl text-xs font-semibold border ${
                  spinTicketsNotice.type === 'ok'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                {spinTicketsNotice.text}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={adjustingSpinTickets}
                onClick={(e) => handleAdjustSpinTickets(e, 1)}
                className="h-10 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/35 text-amber-300 font-bold text-xs"
              >
                + Cộng Vé Quay
              </button>
              <button
                type="button"
                disabled={adjustingSpinTickets}
                onClick={(e) => handleAdjustSpinTickets(e, -1)}
                className="h-10 rounded-xl bg-red-500/12 hover:bg-red-500/20 border border-red-500/30 text-red-300 font-bold text-xs"
              >
                - Trừ Vé Quay
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 2. Kết Nối MacroDroid & Telegram Bot (Production Ready) */}
      <div className="p-5 rounded-2xl liquid-glass-card space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Kết Nối MacroDroid &amp; Telegram Bot</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Webhook tự động tiếp nhận biến động số dư ngân hàng &amp; chuyển tiếp thông báo 1 chiều tới Telegram Admin (ID: <code className="text-sky-300 font-mono">8960751162</code>).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              disabled={testingMacro}
              onClick={handleTestMacroDroid}
              className="px-3.5 py-2 rounded-xl btn-ios-secondary text-xs flex items-center gap-1.5 font-bold text-amber-300 border-amber-400/30"
            >
              <Zap className={`w-3.5 h-3.5 ${testingMacro ? 'animate-spin' : ''}`} />
              <span>{testingMacro ? 'Đang test Macro...' : '🧪 Test MacroDroid'}</span>
            </button>
            <button
              type="button"
              disabled={testingTelegram}
              onClick={handleTestTelegram}
              className="px-4 py-2 rounded-xl btn-ios-blue text-xs flex items-center gap-1.5 font-bold shadow-lg shadow-sky-500/20"
            >
              <Send className={`w-3.5 h-3.5 ${testingTelegram ? 'animate-spin' : ''}`} />
              <span>{testingTelegram ? 'Đang gửi test...' : '🔔 Test Gửi Thông Báo Telegram'}</span>
            </button>
          </div>
        </div>

        {telegramNotice && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
              telegramNotice.type === 'ok'
                ? 'bg-emerald-500/12 border border-emerald-400/30 text-emerald-200'
                : 'bg-red-500/12 border border-red-400/30 text-red-200'
            }`}
          >
            <span>{telegramNotice.message}</span>
            <button
              type="button"
              onClick={() => setTelegramNotice(null)}
              className="text-slate-400 hover:text-white text-xs underline"
            >
              Đóng
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Dynamic Webhook URL */}
          <div className="p-3.5 rounded-xl bg-[#060B16] border border-sky-200/[0.08] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                URL Webhook MacroDroid Động
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                POST / GET
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Dán URL này vào Action <strong>HTTP Request</strong> trong MacroDroid (Hỗ trợ JSON, URL Encoded hoặc Query Param):
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/macrodroid` : '/api/webhook/macrodroid'}
                className="w-full h-9 px-3 rounded-xl bg-black/40 border border-sky-200/[0.12] text-sky-200 font-mono text-[11px] select-all"
              />
              <button
                type="button"
                onClick={() => {
                  const url = typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/macrodroid` : '/api/webhook/macrodroid';
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(url);
                    setCopiedUrl(true);
                    setTimeout(() => setCopiedUrl(false), 2000);
                  }
                }}
                className="h-9 px-3 rounded-xl btn-ios-secondary text-xs flex items-center gap-1 shrink-0 font-semibold"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Đã copy' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Sample JSON Body */}
          <div className="p-3.5 rounded-xl bg-[#060B16] border border-sky-200/[0.08] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                Mẫu JSON Body (Content-Type: application/json)
              </span>
              <button
                type="button"
                onClick={() => {
                  const sample = JSON.stringify(
                    {
                      content: '[ZaloPay] Nhan 50.000d ND: YUKISP_DH000001',
                      secret: tgWebhookSecret && !tgWebhookSecret.includes('••••') ? tgWebhookSecret : '<NHAP_SECRET_TRONG_BOT_CONFIG>',
                    },
                    null,
                    2
                  );
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(sample);
                    setCopiedJson(true);
                    setTimeout(() => setCopiedJson(false), 2000);
                  }
                }}
                className="px-2 py-0.5 rounded text-[10px] btn-ios-secondary flex items-center gap-1 font-semibold"
              >
                {copiedJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedJson ? 'Đã copy JSON' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="p-2.5 rounded-lg bg-black/50 border border-white/[0.06] text-[10px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
{`{
  "content": "[ZaloPay] Nhan 50.000d ND: YUKISP_DH000001",
  "secret": "${tgWebhookSecret ? '<SECRET_DA_CAU_HINH_AN_TOAN>' : '<CHUA_CAU_HINH_SECRET>'}"
}`}
            </pre>
          </div>
        </div>
      </div>

      {/* 3. MacroDroid Auto Topup Logs */}
      <div className="p-5 rounded-2xl bg-[#0D1526]/90 border border-sky-200/[0.1] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" strokeWidth={1.75} />
            <span>Lịch Sử Nạp Tự Động MacroDroid ({macroLogs.length})</span>
          </h3>
        </div>
        {macroLogs.length === 0 ? (
          <p className="text-xs text-slate-400">Chưa có log MacroDroid nào được ghi nhận.</p>
        ) : (
          <div className="divide-y divide-sky-200/[0.06] max-h-60 overflow-y-auto text-xs">
            {macroLogs.slice(0, 20).map((log, idx) => (
              <div key={log.id || idx} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-white truncate">{log.message || log.text}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {log.orderCode || '-'} • {log.time}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                    log.status === 'SUCCESS'
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Announcement 3h Popup & Support Telegram Link */}
      <form
        onSubmit={handleSaveAnnouncement}
        className="p-5 rounded-2xl bg-[#0D1526]/90 border border-sky-200/[0.1] space-y-4 text-xs"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BellRing className="w-4 h-4 text-[#0EA5E9]" strokeWidth={1.75} />
            <span>Popup Thông Báo 3h &amp; Link Telegram Hỗ Trợ</span>
          </h3>
          <button
            type="submit"
            disabled={savingAnn}
            className="px-4 py-2 rounded-xl btn-ios-blue text-xs flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingAnn ? 'Đang lưu...' : 'Lưu Cấu Hình'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#060B16] border border-sky-200/[0.08] cursor-pointer">
            <input
              type="checkbox"
              checked={annConfig.is_active}
              onChange={(e) => setAnnConfig({ ...annConfig, is_active: e.target.checked })}
              className="rounded border-slate-600 text-[#0EA5E9]"
            />
            <span className="font-semibold text-white">Bật Popup Thông Báo (Chu kỳ 3h)</span>
          </label>
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#060B16] border border-sky-200/[0.08] cursor-pointer">
            <input
              type="checkbox"
              checked={annConfig.banner_active}
              onChange={(e) => setAnnConfig({ ...annConfig, banner_active: e.target.checked })}
              className="rounded border-slate-600 text-[#0EA5E9]"
            />
            <span className="font-semibold text-white">Hiển thị Thanh Thông Báo Đầu Trang</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Tiêu đề Popup</label>
            <input
              type="text"
              value={annConfig.title}
              onChange={(e) => setAnnConfig({ ...annConfig, title: e.target.value })}
              className="w-full h-9 px-3 rounded-xl bg-[#060B16] border border-sky-200/[0.12] text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">
              Link Telegram Hỗ Trợ Chính Thức
            </label>
            <input
              type="url"
              value={annConfig.support_telegram_url}
              onChange={(e) =>
                setAnnConfig({ ...annConfig, support_telegram_url: e.target.value })
              }
              className="w-full h-9 px-3 rounded-xl bg-[#060B16] border border-sky-200/[0.12] font-mono text-white"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-300">Banner Đầu Trang</label>
          <input
            type="text"
            value={annConfig.banner_text}
            onChange={(e) => setAnnConfig({ ...annConfig, banner_text: e.target.value })}
            className="w-full h-9 px-3 rounded-xl bg-[#060B16] border border-sky-200/[0.12] text-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-300">Nội dung Popup</label>
          <textarea
            rows={3}
            value={annConfig.content}
            onChange={(e) => setAnnConfig({ ...annConfig, content: e.target.value })}
            className="w-full p-3 rounded-xl bg-[#060B16] border border-sky-200/[0.12] text-white"
          />
        </div>

        {annNotice && (
          <div className="p-2.5 rounded-xl bg-sky-500/12 border border-sky-400/30 text-sky-200 font-semibold">
            {annNotice}
          </div>
        )}
      </form>

      {/* 4. 🤖 Cấu Hình 2 Bot Telegram (Thông Báo Shop & Cấp OTP Quên Mật Khẩu) */}
      <form
        onSubmit={handleSaveTgConfig}
        className="p-5 rounded-2xl liquid-glass-card space-y-5 text-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white">
                Cấu Hình 2 Bot Telegram 2 Chiều (Shop Admin &amp; OTP Quên Mật Khẩu)
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Tự động đấu Webhook 2 chiều + Menu lệnh trên Vercel Serverless, lưu bền vững vào Database PostgreSQL.
            </p>
          </div>
          {botStatus && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-400/30">
                Bot 1: {botStatus.mainBot?.mode === 'WEBHOOK_2WAY' ? '🟢 Webhook 2 Chiều' : '🟡 Chưa gắn Webhook'}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-400/30">
                Bot 2: {botStatus.otpBot?.mode === 'WEBHOOK_2WAY' ? '🟢 Webhook 2 Chiều' : '🟡 Chưa gắn Webhook'}
              </span>
            </div>
          )}
        </div>

        {tgNotice && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
              tgNotice.type === 'ok'
                ? 'bg-emerald-500/12 border border-emerald-400/30 text-emerald-200'
                : 'bg-red-500/12 border border-red-400/30 text-red-200'
            }`}
          >
            <span>{tgNotice.message}</span>
            <button
              type="button"
              onClick={() => setTgNotice(null)}
              className="text-slate-400 hover:text-white text-xs underline shrink-0"
            >
              Đóng
            </button>
          </div>
        )}

        {(botNotice || telegramNotice) && (
          <div className="p-3 rounded-xl bg-sky-500/12 border border-sky-400/30 text-sky-200 text-xs font-semibold flex items-center justify-between gap-2">
            <span>{telegramNotice?.message || botNotice}</span>
            <button
              type="button"
              onClick={() => {
                setBotNotice(null);
                setTelegramNotice(null);
              }}
              className="text-slate-400 hover:text-white text-xs underline shrink-0"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Khung 1: Bot Quản Trị & Giao Hàng Shop (2 Chiều) */}
        <div className="p-4 rounded-xl bg-[#060B16]/80 border border-sky-400/20 space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-white text-xs">Bot 1: Bot Quản Trị &amp; Giao Hàng Shop (2 Chiều)</span>
            </div>
            <div>
              {tgIsConnected ? (
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>🟢 ĐÃ KẾT NỐI {tgBotUsername ? `(@${tgBotUsername})` : ''}</span>
                </span>
              ) : tgToken ? (
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>🟡 CHƯA XÁC MINH</span>
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-red-500/15 text-red-300 border border-red-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span>🔴 CHƯA NHẬP TOKEN</span>
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Telegram Bot Token */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                <span>Shop Bot Token</span>
                <span className="text-[10px] text-amber-400 font-normal">HTTP API</span>
              </label>
              <div className="relative">
                <input
                  type={showTgToken ? 'text' : 'password'}
                  value={tgToken}
                  onChange={(e) => setTgToken(e.target.value)}
                  placeholder="Ví dụ: 7891234567:AAFnK..."
                  className="w-full h-10 px-3 pr-10 rounded-xl bg-[#030712] border border-sky-200/[0.12] text-white font-mono text-xs focus:border-sky-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowTgToken(!showTgToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                  title={showTgToken ? 'Ẩn Token' : 'Hiện Token'}
                >
                  {showTgToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Nhận token từ <strong>@BotFather</strong> trên Telegram.
              </p>
            </div>

            {/* Admin Chat ID */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                <span>Admin Chat ID (Nhận Tin)</span>
                <span className="text-[10px] text-sky-400 font-mono">8960751162</span>
              </label>
              <input
                type="text"
                value={tgAdminId}
                onChange={(e) => setTgAdminId(e.target.value)}
                placeholder="8960751162"
                className="w-full h-10 px-3 rounded-xl bg-[#030712] border border-sky-200/[0.12] text-white font-mono text-xs focus:border-sky-400 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400">
                ID Telegram nhận thông báo nạp tiền, đơn mua hàng &amp; rút hoa hồng.
              </p>
            </div>

            {/* Webhook Secret */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                <span>Mã Bảo Mật Webhook &amp; MacroDroid</span>
                <span className="text-[10px] text-emerald-400 font-mono">Secret Key</span>
              </label>
              <input
                type="text"
                value={tgWebhookSecret}
                onChange={(e) => setTgWebhookSecret(e.target.value)}
                placeholder="Để trống để hệ thống tự sinh mã bảo mật ngẫu nhiên"
                className="w-full h-10 px-3 rounded-xl bg-[#030712] border border-sky-200/[0.12] text-white font-mono text-xs focus:border-sky-400 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400">
                Dùng chung bảo vệ Webhook Telegram 2 chiều và trường <code>secret</code> trong MacroDroid.
              </p>
            </div>
          </div>
        </div>

        {/* Khung 2: Bot Cấp OTP Quên Mật Khẩu */}
        <div className="p-4 rounded-xl bg-[#060B16]/80 border border-purple-400/20 space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-white text-xs">Bot 2: Bot Cấp OTP Quên Mật Khẩu (24/7)</span>
            </div>
            <div>
              {tgOtpIsConnected ? (
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>🟢 ĐÃ KẾT NỐI {tgOtpBotUsername ? `(@${tgOtpBotUsername})` : ''}</span>
                </span>
              ) : tgOtpToken ? (
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>🟡 CHƯA XÁC MINH</span>
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-red-500/15 text-red-300 border border-red-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span>🔴 CHƯA NHẬP TOKEN</span>
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Telegram OTP Bot Token */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                <span>Forgot Password Bot Token</span>
                <span className="text-[10px] text-purple-400 font-normal">HTTP API</span>
              </label>
              <div className="relative">
                <input
                  type={showTgOtpToken ? 'text' : 'password'}
                  value={tgOtpToken}
                  onChange={(e) => setTgOtpToken(e.target.value)}
                  placeholder="Ví dụ: 7891234567:AAFnK..."
                  className="w-full h-10 px-3 pr-10 rounded-xl bg-[#030712] border border-sky-200/[0.12] text-white font-mono text-xs focus:border-purple-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowTgOtpToken(!showTgOtpToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                  title={showTgOtpToken ? 'Ẩn Token' : 'Hiện Token'}
                >
                  {showTgOtpToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Bot chuyên biệt để gửi mã xác thực OTP khi người dùng khôi phục mật khẩu.
              </p>
            </div>

            <div className="space-y-1.5 flex flex-col justify-center">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-200/90 leading-relaxed">
                ℹ️ Khi người dùng quên mật khẩu tại <strong>/forgot-password</strong>, hệ thống sẽ sử dụng Bot này để gửi mã OTP 8 ký tự hoặc hướng dẫn mở Bot để nhận mã tự động.
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#060B16]/70 border border-white/[0.08] grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">
              Domain HTTPS Public gắn Webhook 2 Chiều (Vercel)
            </label>
            <input
              type="url"
              value={webhookDomainInput}
              onChange={(e) => setWebhookDomainInput(e.target.value)}
              placeholder="https://yukishopmxh.vercel.app"
              className="w-full h-10 px-3 rounded-xl bg-[#030712] border border-sky-200/[0.12] text-white font-mono text-xs focus:border-sky-400 focus:outline-none"
            />
          </div>
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <div>Bot 1 Webhook: <span className="font-mono text-sky-300">{botStatus?.mainBot?.webhookUrl ? 'Đã gắn' : 'Chưa gắn'}</span></div>
            <div>Bot 2 Webhook: <span className="font-mono text-purple-300">{botStatus?.otpBot?.webhookUrl ? 'Đã gắn' : 'Chưa gắn'}</span></div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 flex-wrap gap-2 border-t border-white/[0.06]">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Mô hình 2 Chiều Serverless: Duyệt đơn, /pending, /status, /sleep, /doimk trực tiếp trên Telegram.</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={syncingBots}
              onClick={handleSyncWebhookAll}
              className="min-h-[44px] px-3.5 py-2 rounded-xl btn-ios-secondary text-xs flex items-center gap-1.5 font-bold text-sky-300 border-sky-400/30"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingBots ? 'animate-spin' : ''}`} />
              <span>{syncingBots ? 'Đang đồng bộ...' : '🔗 Đấu Webhook & Menu Lệnh'}</span>
            </button>
            <button
              type="button"
              disabled={syncingBots}
              onClick={handleDeleteWebhook}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-slate-300"
            >
              Gỡ Webhook (Polling)
            </button>
            <button
              type="button"
              disabled={testingTelegram || testingPing}
              onClick={async () => {
                await handleTestTelegram();
                await handleTestPing();
              }}
              className="min-h-[44px] px-3.5 py-2 rounded-xl btn-ios-secondary text-xs flex items-center gap-1.5 font-bold text-emerald-300 border-emerald-400/30 hover:bg-emerald-500/10"
            >
              <Send className={`w-3.5 h-3.5 text-emerald-400 ${testingTelegram ? 'animate-spin' : ''}`} />
              <span>{testingTelegram ? 'Đang gửi...' : '🔔 Test Gửi Thông Báo'}</span>
            </button>
            <button
              type="submit"
              disabled={savingTgConfig}
              className="min-h-[44px] px-4 py-2 rounded-xl btn-ios-blue text-xs flex items-center gap-1.5 font-bold shadow-lg shadow-sky-500/20"
            >
              <Save className={`w-3.5 h-3.5 ${savingTgConfig ? 'animate-spin' : ''}`} />
              <span>{savingTgConfig ? 'Đang lưu & xác thực...' : '💾 Lưu & Kết Nối 2 Chiều'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* 5. Operational Config: Sleep Mode, Cashback 2%, Affiliate 5% */}
      <form
        onSubmit={handleSaveSystemConfig}
        className="p-5 rounded-2xl liquid-glass-card space-y-4 text-xs"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Percent className="w-4 h-4 text-emerald-400" />
            <span>Chế Độ Nghỉ (Sleep Mode), Hoàn Điểm &amp; Affiliate</span>
          </h3>
          <button
            type="submit"
            disabled={savingSys}
            className="px-4 py-2 rounded-xl btn-ios-blue text-xs flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingSys ? 'Đang lưu...' : 'Lưu Tham Số'}</span>
          </button>
        </div>

        <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#07090E] border border-white/[0.08] cursor-pointer">
          <input
            type="checkbox"
            checked={sysCfg.sleep_mode}
            onChange={(e) => setSysCfg({ ...sysCfg, sleep_mode: e.target.checked })}
            className="rounded border-slate-600 text-amber-400"
          />
          <Moon className="w-4 h-4 text-amber-300 shrink-0" />
          <span className="font-semibold text-white">
            Bật Sleep Mode (Đồng bộ tức thì thanh trạng thái web &amp; lệnh Telegram /sleep)
          </span>
        </label>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-300">Thông điệp khi bật Sleep Mode</label>
          <input
            type="text"
            value={sysCfg.sleep_message}
            onChange={(e) => setSysCfg({ ...sysCfg, sleep_message: e.target.value })}
            className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.12] text-white"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Tỷ lệ hoàn điểm (%)</label>
            <input
              type="number"
              step="0.5"
              min={0}
              max={20}
              value={Number((sysCfg.cashback_rate * 100).toFixed(2))}
              onChange={(e) => setSysCfg({ ...sysCfg, cashback_rate: (Number(e.target.value) || 0) / 100 })}
              className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.12] font-mono text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Đơn tối thiểu hoàn (đ)</label>
            <input
              type="number"
              step={1000}
              min={0}
              value={sysCfg.cashback_min_order}
              onChange={(e) => setSysCfg({ ...sysCfg, cashback_min_order: Number(e.target.value) || 0 })}
              className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.12] font-mono text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Đổi điểm tối thiểu (đ)</label>
            <input
              type="number"
              step={1000}
              min={1000}
              value={sysCfg.cashback_min_redeem}
              onChange={(e) => setSysCfg({ ...sysCfg, cashback_min_redeem: Number(e.target.value) || 5000 })}
              className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.12] font-mono text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Hoa hồng Affiliate (%)</label>
            <input
              type="number"
              step="0.5"
              min={0}
              max={30}
              value={Number((sysCfg.affiliate_rate * 100).toFixed(2))}
              onChange={(e) => setSysCfg({ ...sysCfg, affiliate_rate: (Number(e.target.value) || 0) / 100 })}
              className="w-full h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.12] font-mono text-white"
            />
          </div>
        </div>

        {sysNotice && (
          <div className="p-2.5 rounded-xl bg-emerald-500/12 border border-emerald-500/30 text-emerald-300 font-semibold">
            {sysNotice}
          </div>
        )}
      </form>

      {/* 5. Partner CTV Codes Manager */}
      <div className="p-5 rounded-2xl liquid-glass-card space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#0EA5E9]" />
            <span>Quản Lý Mã CTV Partner ({ctvCodes.length})</span>
          </h3>
        </div>

        <form onSubmit={handleCreateCtvCode} className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
          <input
            type="text"
            value={newCtvCode}
            onChange={(e) => setNewCtvCode(e.target.value.toUpperCase())}
            placeholder="Mã CTV (VD: YUKICT5)"
            className="h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.1] font-mono text-white uppercase"
            required
          />
          <input
            type="text"
            value={newCtvOwner}
            onChange={(e) => setNewCtvOwner(e.target.value)}
            placeholder="Username / Email CTV"
            className="h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.1] text-white"
            required
          />
          <input
            type="number"
            min={0}
            max={50}
            value={newCtvDiscountPct}
            onChange={(e) => setNewCtvDiscountPct(Number(e.target.value) || 0)}
            placeholder="% Giảm khách"
            title="% Giảm cho người mua"
            className="h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.1] font-mono text-white"
          />
          <input
            type="number"
            min={0}
            max={30}
            value={newCtvCommissionPct}
            onChange={(e) => setNewCtvCommissionPct(Number(e.target.value) || 0)}
            placeholder="% Hoa hồng CTV"
            title="% Hoa hồng cho chủ CTV"
            className="h-9 px-3 rounded-xl bg-[#07090E] border border-white/[0.1] font-mono text-white"
          />
          <button
            type="submit"
            disabled={savingCtv}
            className="h-9 rounded-xl btn-ios-blue font-bold"
          >
            {savingCtv ? 'Đang lưu...' : 'Tạo / Cập nhật Mã'}
          </button>
        </form>

        {ctvNotice && <p className="text-[11px] font-semibold text-sky-300">{ctvNotice}</p>}

        {ctvCodes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {ctvCodes.map((c) => (
              <div
                key={c.code}
                className="p-3 rounded-xl bg-[#07090E]/90 border border-white/[0.08] flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="font-mono font-bold text-sky-300">{c.code}</div>
                  <div className="text-[11px] text-slate-400 truncate">
                    CTV: {c.ownerUsername || c.ownerUserId} • Lượt dùng: {c.usedCount || 0}
                  </div>
                  <div className="text-[10px] font-mono text-emerald-300 mt-0.5">
                    Giảm {c.discountPercent}% | HH {c.commissionPercent}%
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteCtvCode(c.code)}
                  aria-label={`Xóa mã ${c.code}`}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {withdrawals.length > 0 && (
          <div className="pt-3 border-t border-white/[0.08] space-y-2">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-emerald-400" />
              <span>Yêu Cầu Rút Tiền Affiliate Gần Đây ({withdrawals.length})</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {withdrawals.slice(0, 10).map((w) => (
                <div key={w.id} className="p-3 rounded-xl bg-[#07090E]/85 border border-white/[0.08] flex flex-col gap-2 text-[11px]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">{w.username || w.userId}</div>
                      <div className="text-slate-400 font-mono truncate">{w.bankName} • {w.bankAccount} ({w.accountHolder})</div>
                    </div>
                    <span className="font-mono tabular-nums font-bold text-emerald-300 shrink-0">{formatVND(w.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      w.status === 'approved'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : w.status === 'rejected'
                        ? 'bg-red-500/15 text-red-300'
                        : 'bg-amber-500/15 text-amber-300'
                    }`}>
                      {w.status === 'approved' ? 'Đã chuyển' : w.status === 'rejected' ? 'Đã từ chối' : 'Chờ duyệt'}
                    </span>
                    {w.status === 'pending' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleWithdrawalAction(w.id, 'approve')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold transition"
                        >
                          ✅ Duyệt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWithdrawalAction(w.id, 'reject')}
                          className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold transition"
                        >
                          ❌ Từ chối
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 6. Global Wallet Audit Ledger */}
      <div className="p-5 rounded-2xl liquid-glass-card space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#0EA5E9]" />
              <span>Nhật Ký Kiểm Toán Ví Toàn Hệ Thống ({globalLedger.length})</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Lưu vết bất biến mọi biến động ví: Số dư trước → Số dư sau.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadGlobalLedger(ledgerSearch);
                }}
                placeholder="Tìm user, mã GD..."
                className="h-8 pl-8 pr-2.5 rounded-xl bg-[#07090E] border border-white/[0.1] text-white text-[11px]"
              />
            </div>
            <button
              type="button"
              onClick={() => loadGlobalLedger(ledgerSearch)}
              disabled={loadingLedger}
              className="h-8 px-3 rounded-xl btn-ios-secondary text-[11px]"
            >
              {loadingLedger ? '...' : 'Lọc'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-[#07090E]/90 text-slate-400 uppercase border-b border-white/[0.08] sticky top-0">
              <tr>
                <th className="p-2.5">Thời gian</th>
                <th className="p-2.5">Khách hàng</th>
                <th className="p-2.5">Loại</th>
                <th className="p-2.5">Biến động</th>
                <th className="p-2.5">Trước → Sau</th>
                <th className="p-2.5">Nội dung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {globalLedger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    Chưa có bản ghi kiểm toán ví nào trong nhật ký mới.
                  </td>
                </tr>
              ) : (
                globalLedger.map((entry) => {
                  const isPos = Number(entry.delta) >= 0;
                  return (
                    <tr key={entry.id} className="hover:bg-white/[0.03]">
                      <td className="p-2.5 font-mono text-slate-400 whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                      </td>
                      <td className="p-2.5 font-semibold text-white whitespace-nowrap">
                        {entry.userName || entry.userId}
                      </td>
                      <td className="p-2.5 font-mono text-sky-300 whitespace-nowrap">{entry.type}</td>
                      <td className={`p-2.5 font-mono tabular-nums font-bold whitespace-nowrap ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPos ? '+' : '-'}{formatVND(Math.abs(Number(entry.delta)))}
                      </td>
                      <td className="p-2.5 font-mono tabular-nums text-slate-300 whitespace-nowrap">
                        {formatVND(Number(entry.balanceBefore))} →{' '}
                        <strong className="text-white">{formatVND(Number(entry.balanceAfter))}</strong>
                      </td>
                      <td className="p-2.5 text-slate-300 min-w-[200px]">{entry.description}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
