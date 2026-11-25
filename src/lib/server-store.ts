import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { hashPassword } from '@/lib/password-hash';

const seedDataDir = path.join(process.cwd(), 'data');
let resolvedDataDir: string | null = null;

function isDirWritable(dir: string): boolean {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const probe = path.join(dir, `.probe_${process.pid}_${Date.now()}`);
    fs.writeFileSync(probe, 'ok', 'utf8');
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

export function getWritableDataDir(): string {
  if (resolvedDataDir) return resolvedDataDir;
  if (process.env.VERCEL === '1' || process.env.VERCEL_ENV) {
    resolvedDataDir = path.join(os.tmpdir(), 'yuki-web-v4-data');
    try {
      fs.mkdirSync(resolvedDataDir, { recursive: true });
    } catch {}
    return resolvedDataDir;
  }
  resolvedDataDir = isDirWritable(seedDataDir)
    ? seedDataDir
    : path.join(os.tmpdir(), 'yuki-web-v4-data');
  try {
    fs.mkdirSync(resolvedDataDir, { recursive: true });
  } catch {}
  return resolvedDataDir;
}

function dataFilePath(filename: string): string {
  return path.join(getWritableDataDir(), filename);
}

const usersPath = dataFilePath('users.json');
const ordersPath = dataFilePath('orders.json');
const topupsPath = dataFilePath('topups.json');
const overridesPath = dataFilePath('catalog_overrides.json');
const macrodroidLogsPath = dataFilePath('macrodroid_logs.json');
const couponsPath = dataFilePath('coupons.json');
const otpsPath = dataFilePath('password_reset_otps.json');
const resetTokensPath = dataFilePath('password_reset_tokens.json');
const spinLogsPath = dataFilePath('spin_logs.json');
const categoriesPath = dataFilePath('categories.json');
const referralLogsPath = dataFilePath('referral_logs.json');
const siteSettingsPath = dataFilePath('site_settings.json');
const walletLedgerPath = dataFilePath('wallet_ledger.json');
const partnerCodesPath = dataFilePath('partner_codes.json');
const affiliateWithdrawalsPath = dataFilePath('affiliate_withdrawals.json');
const savedPayoutAccountsPath = dataFilePath('saved_payout_accounts.json');
const monthlyTopHistoryPath = dataFilePath('monthly_top_history.json');
const monthlyNotificationsPath = dataFilePath('monthly_reward_notifications.json');

export function getVietnamMonth(dateOrIso?: string): string {
  try {
    const d = dateOrIso ? new Date(dateOrIso) : new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(d);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    return `${year}-${month}`;
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}

export interface MonthlyRewardNotification {
  id: string;
  userId: string;
  userEmail: string;
  month: string;
  rank: number;
  totalDeposit: number;
  tierName: string;
  rewardDescription: string;
  walletReward: number;
  voucherCode?: string;
  voucherPercent?: number;
  voucherMinOrder?: number;
  voucherMaxDiscount?: number;
  spinTickets: number;
  isSeen: boolean;
  claimedAt?: string;
  createdAt: string;
}

export interface MonthlyTopHistoryRecord {
  month: string;
  concludedAt: string;
  concludedBy: string;
  totalDepositors: number;
  topList: Array<{
    rank: number;
    userId: string;
    email: string;
    maskedName: string;
    totalDeposit: number;
    tierName: string;
    rewardDescription: string;
    walletReward: number;
    voucherCode?: string;
    spinTickets: number;
  }>;
}

export interface PasswordResetToken {
  id: string;
  token: string;
  email: string;
  userId?: string;
  telegramId?: string;
  tokenType?: 'SHORT_OTP' | 'MAGIC_LINK';
  verifiedTelegram?: boolean;
  expiresAt: number;
  used: boolean;
  createdAt: string;
}

export interface UserVoucher {
  id: string;
  code: string;
  discountPercent: number;
  maxDiscount?: number;
  minOrder: number;
  expiresAt: string;
  isUsed: boolean;
  createdAt: string;
  source: 'SPIN' | 'TOP_DEPOSITOR' | 'SYSTEM';
}

export interface SpinLogRecord {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  prizeIndex: number;
  prizeName: string;
  prizeType: 'NOTHING' | 'VOUCHER' | 'WALLET' | 'CASH';
  prizeValue: number;
  voucherCode?: string;
  createdAt: string;
}

export interface PasswordResetOtp {
  id: string;
  email: string;
  telegramId: string;
  otp: string;
  expiresAt: number;
  used: boolean;
  createdAt: string;
}

export interface LocalCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  badge?: string;
  createdAt: string;
}

// In-memory state tracking for Telegram Bot multi-step dialogues
const telegramUserSteps = new Map<string, { step: string; email?: string; updatedAt: number }>();

// In-memory state tracking for Admin Bot 2-step delivery
const adminPendingDeliveries = new Map<string, { orderCode: string; timestamp: number }>();

export interface LocalCoupon {
  id: string;
  code: string;
  discount_type: 'PERCENT' | 'FIXED';
  discount_value: number;
  max_discount?: number | null;
  min_order_amount: number;
  usage_limit?: number | null;
  used_count: number;
  applicable_to: 'ALL' | 'PRODUCT' | 'BUFF';
  is_active: boolean;
  expires_at?: string | null;
  created_at: string;
}

export interface MacroDroidLog {
  id: string;
  time: string;
  method: string;
  title?: string;
  text?: string;
  rawSnippet?: string;
  receivedAmount?: number;
  orderCode?: string;
  status: 'SUCCESS' | 'WARNING' | 'IGNORED' | 'ERROR';
  message: string;
}

export interface LocalSavedProfile {
  id: string;
  label: string;
  email?: string;
  socialLink?: string;
  telegram?: string;
  note?: string;
  createdAt: string;
}

export interface LocalWalletLedgerEntry {
  id: string;
  userId: string;
  userName?: string;
  type:
    | 'DEPOSIT'
    | 'PURCHASE'
    | 'REFUND'
    | 'ADMIN_ADJUSTMENT'
    | 'ORDER_PAYMENT'
    | 'CASHBACK_REDEEM'
    | 'AFFILIATE_TRANSFER';
  delta: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId: string;
  description: string;
  createdAt: string;
}

export interface LocalPartnerCtvCode {
  code: string;
  ownerUserId: string;
  ownerUsername?: string;
  discountPercent: number;
  commissionPercent: number;
  maxUses?: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface LocalAffiliateWithdrawal {
  id: string;
  userId: string;
  username?: string;
  amount: number;
  fee?: number;
  netAmount?: number;
  bankName: string;
  bankAccount: string;
  accountHolder: string;
  contact?: string;
  qrCodeUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  createdAt: string;
  updatedAt?: string;
  processedAt?: string;
}

export interface LocalSavedPayoutAccount {
  id: string;
  userId: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  contact?: string;
  qrCodeUrl?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocalSystemConfig {
  sleep_mode: boolean;
  sleep_message: string;
  cashback_rate: number;
  cashback_min_order: number;
  cashback_min_redeem: number;
  affiliate_rate: number;
  updated_at: string;
}

export interface LocalUser {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  telegramId: string;
  phone: string;
  email: string;
  role: 'admin' | 'user';
  balance: number;
  cashbackPoints?: number;
  totalCashbackEarned?: number;
  affiliateBalance?: number;
  savedProfiles?: LocalSavedProfile[];
  referralCode?: string;
  referredBy?: string;
  referralEarnings?: number;
  sessionVersion?: number;
  spinTickets?: number;
  depositSpinProgress?: number;
  affiSpinProgress?: number;
  withdrawableBalance?: number;
  freeWithdrawalBalance?: number;
  vouchers?: UserVoucher[];
  createdAt: string;
}

export interface LocalReferralLog {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  deposit_order_id?: string;
  deposit_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: 'DISTRIBUTED' | 'PENDING' | 'CANCELLED';
  referee_email?: string;
  created_at: string;
}

export interface LocalAnnouncementPopup {
  is_active: boolean;
  banner_active: boolean;
  title: string;
  content: string;
  cta_text: string;
  cta_link: string;
  banner_text: string;
  support_telegram_url?: string;
  updated_at: string;
}

export interface LocalOrder {
  id: string;
  order_code: string;
  user_id: string;
  user_name: string;
  user_contact?: string;
  delivery_contact: string;
  telegram_id?: string;
  zalo_phone?: string;
  supplier_name?: string;
  cost_price?: number;
  warranty_days?: number;
  delivery_info?: string;
  warranty_claimed?: boolean;
  warranty_claim_reason?: string;
  warranty_status?: 'PENDING' | 'RESOLVED_REPLACED' | 'RESOLVED_REFUNDED' | 'REJECTED';
  warranty_resolution_note?: string;
  warranty_resolved_at?: string;
  service_type: string;
  item_name: string;
  sku: string;
  quantity: number;
  target_link: string;
  total_amount: number;
  paid?: boolean;
  deducted_balance?: number;
  balance_before?: number;
  balance_after?: number;
  coupon_code?: string;
  discount_amount?: number;
  partner_code?: string;
  cashback_awarded?: number;
  partner_commission_awarded?: number;
  refunded?: boolean;
  telegram_notified?: boolean;
  account_credentials?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LocalTopup {
  id: string;
  code: string;
  user_id: string;
  user_name: string;
  user_contact: string;
  amount: number;
  balance_before?: number;
  balance_after?: number;
  bank: string;
  account_number: string;
  account_name: string;
  telegram_notified?: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

const DEFAULT_ADMIN_SHA256_HASH =
  '5336920e4f15951ece7bc9703fa3007fde69bd973e92cb544e0c37effc8605c5';

function buildInitialAdmin(): LocalUser {
  const initialRaw = (
    process.env.ADMIN_INITIAL_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    ''
  ).trim();
  return {
    id: '00000000-0000-0000-0000-000000000001',
    username: 'YukiIsMe2311',
    password: initialRaw ? hashPassword(initialRaw) : DEFAULT_ADMIN_SHA256_HASH,
    fullName: 'Yuki Admin',
    telegramId: '8960751162',
    phone: '8960751162',
    email: 'kyomeyuki2k@gmail.com',
    role: 'admin',
    balance: 0,
    cashbackPoints: 0,
    totalCashbackEarned: 0,
    affiliateBalance: 0,
    referralCode: 'YUKIADMIN',
    referralEarnings: 0,
    sessionVersion: 1,
    createdAt: '2026-11-14 00:00:00',
  };
}

function readJsonSafe<T>(file: string, defaultVal: T): T {
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      return JSON.parse(content) as T;
    }
    const seedFile = path.join(seedDataDir, path.basename(file));
    if (seedFile !== file && fs.existsSync(seedFile)) {
      const content = fs.readFileSync(seedFile, 'utf8');
      return JSON.parse(content) as T;
    }
  } catch (e: any) {
    console.warn(`[STORE] Read fallback for ${path.basename(file)}:`, e.message);
  }
  return defaultVal;
}

function writeJsonSafe(file: string, data: any): boolean {
  try {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e: any) {
    console.warn(`[STORE] Write warning (${path.basename(file)}):`, e.message);
    return false;
  }
}

export const serverStore = {
  loadUsers(): LocalUser[] {
    const users = readJsonSafe<LocalUser[]>(usersPath, []);
    const hasAdmin = users.some(
      (u) =>
        u.username === 'YukiIsMe2311' ||
        u.role === 'admin' ||
        u.phone === '8960751162' ||
        u.email === 'kyomeyuki2k@gmail.com'
    );
    if (!hasAdmin) {
      users.unshift(buildInitialAdmin());
      writeJsonSafe(usersPath, users);
    }
    return users;
  },

  saveUsers(users: LocalUser[]): boolean {
    return writeJsonSafe(usersPath, users);
  },

  findUserById(id: string): LocalUser | null {
    if (!id) return null;
    const users = this.loadUsers();
    return users.find((u) => u.id === id) || null;
  },

  findUserByIdentifier(identifier: string): LocalUser | null {
    if (!identifier) return null;
    const clean = identifier.trim().toLowerCase().replace(/^@/, '');
    const users = this.loadUsers();

    return (
      users.find((u) => {
        const uName = (u.username || '').toLowerCase().replace(/^@/, '');
        const uTele = (u.telegramId || '').toLowerCase().replace(/^@/, '');
        const uPhone = (u.phone || '').trim();
        const uEmail = (u.email || '').toLowerCase().trim();

        return (
          uName === clean ||
          uTele === clean ||
          uPhone === clean ||
          uEmail === clean ||
          (clean === 'admin' && u.role === 'admin') ||
          (clean === '8960751162' &&
            (u.phone === '8960751162' || u.telegramId === '8960751162' || u.role === 'admin')) ||
          (clean === 'yukiisme2311' && (u.username === 'YukiIsMe2311' || u.role === 'admin'))
        );
      }) || null
    );
  },

  findUserByReferralCode(code: string): LocalUser | null {
    if (!code) return null;
    const clean = code.trim().toUpperCase();
    const users = this.loadUsers();
    return users.find((u) => (u.referralCode || '').toUpperCase() === clean) || null;
  },

  createUser(userData: Partial<LocalUser>): LocalUser {
    const users = this.loadUsers();
    const existing = this.findUserByIdentifier(
      userData.username || userData.email || userData.phone || ''
    );
    if (existing) {
      throw new Error('Tài khoản, Email hoặc Số điện thoại này đã được đăng ký!');
    }

    const cleanUser = (
      userData.telegramId ||
      userData.email ||
      userData.phone ||
      userData.fullName ||
      'user'
    ).replace(/[^a-zA-Z0-9_]/g, '');

    let refCode = (userData.referralCode || '').trim().toUpperCase();
    if (!refCode) {
      refCode = 'YUKI' + Math.random().toString(36).substring(2, 7).toUpperCase();
    }

    const newUser: LocalUser = {
      id: (userData.id && String(userData.id).trim()) || ('usr_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
      username: (userData.username && String(userData.username).trim()) || cleanUser,
      password: userData.password || '',
      fullName: userData.fullName || cleanUser,
      telegramId: userData.telegramId || '',
      phone: userData.phone || '',
      email: userData.email || '',
      role: 'user',
      balance: 0,
      referralCode: refCode,
      referredBy: userData.referredBy || undefined,
      referralEarnings: 0,
      sessionVersion: 1,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  },

  updateUserBalance(userId: string, deltaAmount: number): number | null {
    const users = this.loadUsers();
    const user = users.find((u) => u.id === userId);
    if (user) {
      user.balance = Math.max(0, (user.balance || 0) + Number(deltaAmount));
      this.saveUsers(users);
      return user.balance;
    }
    return null;
  },

  bumpUserSessionVersion(userId: string): number {
    const users = this.loadUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return 1;
    const nextVersion = (Number(user.sessionVersion) || 1) + 1;
    user.sessionVersion = nextVersion;
    this.saveUsers(users);
    return nextVersion;
  },

  loadOrders(): LocalOrder[] {
    return readJsonSafe<LocalOrder[]>(ordersPath, []);
  },

  saveOrders(orders: LocalOrder[]): boolean {
    return writeJsonSafe(ordersPath, orders);
  },

  createOrder(orderData: Partial<LocalOrder>): LocalOrder {
    const orders = this.loadOrders();
    const order: LocalOrder = {
      id: 'ord_' + Date.now(),
      order_code:
        orderData.order_code ||
        ((orderData.service_type === 'BUFF_MXH' ? 'BUFF-' : 'YUKI-') +
          Math.floor(100000 + Math.random() * 900000)),
      user_id: orderData.user_id || 'anonymous',
      user_name: orderData.user_name || 'Khách Hàng',
      user_contact: orderData.user_contact || orderData.delivery_contact || 'Chưa cập nhật',
      delivery_contact: orderData.delivery_contact || orderData.user_contact || 'Chưa cập nhật',
      telegram_id: orderData.telegram_id,
      zalo_phone: orderData.zalo_phone,
      supplier_name: orderData.supplier_name || 'Kho Tổng Yuki',
      cost_price: Number(orderData.cost_price) || 0,
      warranty_days: orderData.warranty_days !== undefined ? Number(orderData.warranty_days) : 30,
      delivery_info: orderData.delivery_info,
      service_type: orderData.service_type || 'MUA_SAN_PHAM',
      item_name: orderData.item_name || 'Dịch vụ YukiShopMXH',
      sku: orderData.sku || 'SKU',
      quantity: Number(orderData.quantity) || 1,
      target_link: orderData.target_link || 'Website',
      total_amount: Number(orderData.total_amount) || 0,
      paid: !!orderData.paid,
      deducted_balance: Number(orderData.deducted_balance) || 0,
      balance_before: orderData.balance_before,
      balance_after: orderData.balance_after,
      coupon_code: orderData.coupon_code,
      discount_amount: orderData.discount_amount,
      refunded: false,
      telegram_notified: !!orderData.telegram_notified,
      account_credentials: orderData.account_credentials ? String(orderData.account_credentials).trim() : undefined,
      status: (orderData.status as any) || 'pending',
      notes: orderData.notes || '',
      created_at: orderData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    orders.unshift(order);
    this.saveOrders(orders);
    return order;
  },

  setAdminPendingDelivery(chatId: string | number, orderCode: string): void {
    adminPendingDeliveries.set(String(chatId), { orderCode, timestamp: Date.now() });
  },

  getAdminPendingDelivery(chatId: string | number): string | null {
    const entry = adminPendingDeliveries.get(String(chatId));
    if (!entry) return null;
    if (Date.now() - entry.timestamp > 2 * 60 * 60 * 1000) {
      adminPendingDeliveries.delete(String(chatId));
      return null;
    }
    return entry.orderCode;
  },

  clearAdminPendingDelivery(chatId: string | number): void {
    adminPendingDeliveries.delete(String(chatId));
  },

  findOrderByCode(orderCode: string): LocalOrder | undefined {
    const orders = this.loadOrders();
    return orders.find((o) => o.order_code === orderCode || o.id === orderCode);
  },

  updateOrderDeliveryInfo(orderCode: string, deliveryInfo: string): LocalOrder | null {
    return this.updateOrderStatus(orderCode, 'completed', { delivery_info: deliveryInfo });
  },

  updateOrderStatus(orderCode: string, newStatus: string | undefined, extraData: any = {}): LocalOrder | null {
    const orders = this.loadOrders();
    const order = orders.find((o) => o.order_code === orderCode || o.id === orderCode);
    if (order) {
      if (newStatus) order.status = newStatus as any;
      if (extraData && typeof extraData === 'object') {
        Object.assign(order, extraData);
      }
      order.updated_at = new Date().toISOString();
      this.saveOrders(orders);
      return order;
    }
    return null;
  },

  loadTopups(): LocalTopup[] {
    return readJsonSafe<LocalTopup[]>(topupsPath, []);
  },

  saveTopups(topups: LocalTopup[]): boolean {
    return writeJsonSafe(topupsPath, topups);
  },

  createTopup(topupData: Partial<LocalTopup>): LocalTopup {
    const topups = this.loadTopups();
    const nextSeq = topups.length + 1;
    const topup: LocalTopup = {
      id: 'tp_' + Date.now(),
      code: topupData.code || 'YukiSp_' + String(nextSeq).padStart(6, '0'),
      user_id: topupData.user_id || 'anonymous',
      user_name: topupData.user_name || 'Khách Hàng',
      user_contact: topupData.user_contact || 'ZaloPay',
      amount: Number(topupData.amount) || 0,
      bank: topupData.bank || 'ZaloPay',
      account_number: topupData.account_number || '99ZP26265M78019191',
      account_name: topupData.account_name || 'ZALOPAY_NGUYEN THAI TU',
      telegram_notified: !!topupData.telegram_notified,
      status: 'pending',
      created_at: topupData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    topups.unshift(topup);
    this.saveTopups(topups);
    return topup;
  },

  updateTopupStatus(code: string, newStatus: string, extraData: any = {}): LocalTopup | null {
    const topups = this.loadTopups();
    const topup = topups.find((t) => t.code === code || t.id === code);
    if (topup) {
      topup.status = newStatus as any;
      if (extraData && typeof extraData === 'object') {
        Object.assign(topup, extraData);
      }
      topup.updated_at = new Date().toISOString();
      this.saveTopups(topups);
      return topup;
    }
    return null;
  },

  loadCatalogOverrides(): { customItems: any[]; updatedItems: Record<string, any>; deletedIds: string[] } {
    return readJsonSafe(overridesPath, { customItems: [], updatedItems: {}, deletedIds: [] });
  },

  loadProducts(): any[] {
    const brandsPath = path.join(process.cwd(), 'public', 'brands-catalog.json');
    let brands: any[] = [];
    try {
      if (fs.existsSync(brandsPath)) {
        brands = JSON.parse(fs.readFileSync(brandsPath, 'utf8'));
      }
    } catch (e) {
      console.error('Error loading brands in serverStore.loadProducts:', e);
    }
    const overrides = this.loadCatalogOverrides();
    const deletedSet = new Set(overrides.deletedIds || []);
    const updatedMap = overrides.updatedItems || {};
    const flat: any[] = [];

    for (const b of brands) {
      for (const pkg of b.packages || []) {
        if (deletedSet.has(pkg.sku)) continue;
        const ov = updatedMap[pkg.sku];
        flat.push({
          id: pkg.sku,
          sku: pkg.sku,
          name: ov?.name || pkg.name,
          category: ov?.category || b.name,
          price: Number(ov?.price ?? ov?.sell_price ?? pkg.price),
          sell_price: Number(ov?.price ?? ov?.sell_price ?? pkg.price),
          stock: Number(ov?.stock ?? pkg.stock ?? 50),
          status: (ov?.status || pkg.status || 'ACTIVE').toUpperCase() === 'HIDDEN' ? 'HIDDEN' : 'ACTIVE',
          supplier_name: ov?.supplier_name || 'Kho Bản Quyền Yuki',
          cost_price: Number(ov?.cost_price ?? Math.round(Number(pkg.price) * 0.7)),
          warranty_days: ov?.warranty_days !== undefined ? Number(ov.warranty_days) : 30,
        });
      }
    }

    for (const custom of overrides.customItems || []) {
      if (deletedSet.has(custom.id) || deletedSet.has(custom.sku)) continue;
      const ov = updatedMap[custom.sku] || updatedMap[custom.id];
      flat.push({
        id: custom.id || custom.sku,
        sku: custom.sku || custom.id,
        name: ov?.name || custom.name,
        category: ov?.category || custom.category,
        price: Number(ov?.price ?? ov?.sell_price ?? custom.price),
        sell_price: Number(ov?.price ?? ov?.sell_price ?? custom.price),
        stock: Number(ov?.stock ?? custom.stock ?? 50),
        status: (ov?.status || custom.status || 'ACTIVE').toUpperCase() === 'HIDDEN' ? 'HIDDEN' : 'ACTIVE',
        supplier_name: ov?.supplier_name || custom.supplier_name || 'Kho Bản Quyền Yuki',
        cost_price: Number(ov?.cost_price ?? custom.cost_price ?? Math.round(Number(custom.price || 0) * 0.7)),
        warranty_days: ov?.warranty_days !== undefined ? Number(ov.warranty_days) : (custom.warranty_days !== undefined ? Number(custom.warranty_days) : 30),
      });
    }

    return flat;
  },

  saveCatalogOverrides(data: any): boolean {
    return writeJsonSafe(overridesPath, data);
  },

  loadMacroDroidLogs(): MacroDroidLog[] {
    return readJsonSafe<MacroDroidLog[]>(macrodroidLogsPath, []);
  },

  addMacroDroidLog(
    log: Omit<MacroDroidLog, 'id' | 'time'> & { id?: string; time?: string }
  ): MacroDroidLog {
    const logs = this.loadMacroDroidLogs();
    const newLog: MacroDroidLog = {
      id: log.id || 'mdlog_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      time: log.time || new Date().toISOString(),
      method: log.method || 'POST',
      title: log.title || '',
      text: log.text || '',
      rawSnippet: (log.rawSnippet || '').slice(0, 300),
      receivedAmount: Number(log.receivedAmount) || 0,
      orderCode: log.orderCode || '',
      status: log.status,
      message: log.message,
    };
    logs.unshift(newLog);
    const trimmed = logs.slice(0, 10);
    writeJsonSafe(macrodroidLogsPath, trimmed);
    return newLog;
  },

  loadCoupons(): LocalCoupon[] {
    const defaultCoupons: LocalCoupon[] = [
      {
        id: 'coup_yuki10',
        code: 'YUKI10',
        discount_type: 'PERCENT',
        discount_value: 10,
        max_discount: 50000,
        min_order_amount: 20000,
        usage_limit: 1000,
        used_count: 0,
        applicable_to: 'ALL',
        is_active: true,
        expires_at: null,
        created_at: new Date().toISOString(),
      },
    ];
    const coupons = readJsonSafe<LocalCoupon[]>(couponsPath, []);
    if (coupons.length === 0) {
      writeJsonSafe(couponsPath, defaultCoupons);
      return defaultCoupons;
    }
    return coupons;
  },

  saveCoupons(coupons: LocalCoupon[]): boolean {
    return writeJsonSafe(couponsPath, coupons);
  },

  findCouponByCode(code: string): LocalCoupon | null {
    if (!code) return null;
    const clean = code.trim().toUpperCase();
    const coupons = this.loadCoupons();
    return coupons.find((c) => c.code.toUpperCase() === clean) || null;
  },

  createCoupon(couponData: Partial<LocalCoupon>): LocalCoupon {
    const coupons = this.loadCoupons();
    const cleanCode = (couponData.code || '').trim().toUpperCase();
    if (!cleanCode) throw new Error('Mã giảm giá không được để trống.');

    const existing = coupons.find((c) => c.code.toUpperCase() === cleanCode);
    if (existing) throw new Error(`Mã giảm giá "${cleanCode}" đã tồn tại.`);

    const newCoupon: LocalCoupon = {
      id: 'coup_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      code: cleanCode,
      discount_type: couponData.discount_type === 'FIXED' ? 'FIXED' : 'PERCENT',
      discount_value: Number(couponData.discount_value) || 0,
      max_discount: couponData.max_discount ? Number(couponData.max_discount) : null,
      min_order_amount: Number(couponData.min_order_amount) || 0,
      usage_limit: couponData.usage_limit ? Number(couponData.usage_limit) : null,
      used_count: 0,
      applicable_to: (couponData.applicable_to as any) || 'ALL',
      is_active: couponData.is_active !== false,
      expires_at: couponData.expires_at || null,
      created_at: new Date().toISOString(),
    };

    coupons.unshift(newCoupon);
    this.saveCoupons(coupons);
    return newCoupon;
  },

  updateCoupon(code: string, data: Partial<LocalCoupon>): LocalCoupon | null {
    const coupons = this.loadCoupons();
    const cleanCode = code.trim().toUpperCase();
    const coupon = coupons.find((c) => c.code.toUpperCase() === cleanCode || c.id === code);
    if (!coupon) return null;

    if (data.discount_type !== undefined) coupon.discount_type = data.discount_type;
    if (data.discount_value !== undefined) coupon.discount_value = Number(data.discount_value);
    if (data.max_discount !== undefined) coupon.max_discount = data.max_discount ? Number(data.max_discount) : null;
    if (data.min_order_amount !== undefined) coupon.min_order_amount = Number(data.min_order_amount);
    if (data.usage_limit !== undefined) coupon.usage_limit = data.usage_limit ? Number(data.usage_limit) : null;
    if (data.applicable_to !== undefined) coupon.applicable_to = data.applicable_to;
    if (data.is_active !== undefined) coupon.is_active = !!data.is_active;
    if (data.expires_at !== undefined) coupon.expires_at = data.expires_at;

    this.saveCoupons(coupons);
    return coupon;
  },

  deleteCoupon(code: string): boolean {
    const coupons = this.loadCoupons();
    const cleanCode = code.trim().toUpperCase();
    const filtered = coupons.filter((c) => c.code.toUpperCase() !== cleanCode && c.id !== code);
    if (filtered.length !== coupons.length) {
      this.saveCoupons(filtered);
      return true;
    }
    return false;
  },

  incrementCouponUsage(code: string): boolean {
    const coupons = this.loadCoupons();
    const cleanCode = code.trim().toUpperCase();
    const coupon = coupons.find((c) => c.code.toUpperCase() === cleanCode);
    if (coupon) {
      coupon.used_count = (coupon.used_count || 0) + 1;
      this.saveCoupons(coupons);
      return true;
    }
    return false;
  },

  // ---------------------------------------------------------------------------
  // USER QUERY & PASSWORD MANAGEMENT
  // ---------------------------------------------------------------------------
  findUserByEmail(email: string): LocalUser | null {
    if (!email) return null;
    const clean = email.trim().toLowerCase();
    const users = this.loadUsers();
    return users.find((u) => (u.email || '').toLowerCase().trim() === clean) || null;
  },

  findUserByTelegramId(telegramId: string): LocalUser | null {
    if (!telegramId) return null;
    const clean = telegramId.trim().toLowerCase().replace(/^@/, '');
    const users = this.loadUsers();
    return (
      users.find((u) => {
        const uTele = (u.telegramId || '').toLowerCase().replace(/^@/, '').trim();
        return uTele === clean;
      }) || null
    );
  },

  updateUserPassword(identifierOrId: string, newPassword: string): boolean {
    if (!identifierOrId || !newPassword) return false;
    const users = this.loadUsers();
    const clean = identifierOrId.trim().toLowerCase();

    const user = users.find(
      (u) =>
        u.id === identifierOrId ||
        (u.email || '').toLowerCase().trim() === clean ||
        (u.username || '').toLowerCase().trim() === clean ||
        (u.telegramId || '').toLowerCase().replace(/^@/, '').trim() === clean.replace(/^@/, '')
    );

    if (user) {
      user.password = hashPassword(newPassword);
      user.sessionVersion = Number(user.sessionVersion || 1) + 1;
      this.saveUsers(users);
      return true;
    }
    return false;
  },

  // ---------------------------------------------------------------------------
  // PASSWORD RESET OTP MANAGEMENT (3-MINUTE TTL, SINGLE-USE)
  // ---------------------------------------------------------------------------
  loadOtps(): PasswordResetOtp[] {
    return readJsonSafe<PasswordResetOtp[]>(otpsPath, []);
  },

  saveOtps(otps: PasswordResetOtp[]): boolean {
    return writeJsonSafe(otpsPath, otps);
  },

  createPasswordResetOtp(email: string, telegramId: string, otp: string): PasswordResetOtp {
    const otps = this.loadOtps();
    const cleanEmail = email.trim().toLowerCase();
    const cleanTele = telegramId.trim().replace(/^@/, '');

    // Invalidate previous unexpired OTPs for this email
    const now = Date.now();
    otps.forEach((o) => {
      if (o.email.toLowerCase() === cleanEmail && !o.used) {
        o.used = true;
      }
    });

    const newOtp: PasswordResetOtp = {
      id: 'otp_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      email: cleanEmail,
      telegramId: cleanTele,
      otp: String(otp).trim(),
      expiresAt: now + 3 * 60 * 1000, // 3 minutes
      used: false,
      createdAt: new Date().toISOString(),
    };

    otps.unshift(newOtp);
    // Keep last 100 records
    this.saveOtps(otps.slice(0, 100));
    return newOtp;
  },

  verifyAndConsumePasswordResetOtp(email: string, otp: string): { valid: boolean; error?: string } {
    const otps = this.loadOtps();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOtp = String(otp || '').trim();

    const record = otps.find(
      (o) => o.email.toLowerCase() === cleanEmail && o.otp === cleanOtp && !o.used
    );

    if (!record) {
      return { valid: false, error: 'Mã OTP không chính xác hoặc đã được sử dụng.' };
    }

    if (Date.now() > record.expiresAt) {
      record.used = true;
      this.saveOtps(otps);
      return { valid: false, error: 'Mã OTP đã hết hạn (quá 3 phút). Vui lòng yêu cầu mã mới trên Bot Telegram.' };
    }

    // Mark as consumed
    record.used = true;
    this.saveOtps(otps);
    return { valid: true };
  },

  // ---------------------------------------------------------------------------
  // PASSWORD RESET TOKENS (15-MINUTE TTL, MAGIC LINK WEB ĐỔI MK)
  // ---------------------------------------------------------------------------
  loadPasswordResetTokens(): PasswordResetToken[] {
    return readJsonSafe<PasswordResetToken[]>(resetTokensPath, []);
  },

  savePasswordResetTokens(tokens: PasswordResetToken[]): boolean {
    return writeJsonSafe(resetTokensPath, tokens);
  },

  createPasswordResetToken(email: string): string {
    const tokens = this.loadPasswordResetTokens();
    const cleanEmail = email.trim().toLowerCase();
    const now = Date.now();

    // Invalidate prior unused tokens for this email
    tokens.forEach((t) => {
      if (t.email.toLowerCase() === cleanEmail && !t.used) {
        t.used = true;
      }
    });

    const token = crypto.randomBytes(24).toString('hex');
    const newRecord: PasswordResetToken = {
      id: 'prt_' + now + '_' + Math.floor(Math.random() * 1000),
      token,
      email: cleanEmail,
      tokenType: 'MAGIC_LINK',
      verifiedTelegram: true,
      expiresAt: now + 15 * 60 * 1000, // 15 mins
      used: false,
      createdAt: new Date().toISOString(),
    };

    tokens.unshift(newRecord);
    this.savePasswordResetTokens(tokens.slice(0, 200));
    return token;
  },

  validatePasswordResetToken(token: string): { valid: boolean; email?: string; error?: string } {
    if (!token) return { valid: false, error: 'Thiếu mã token xác thực.' };
    const tokens = this.loadPasswordResetTokens();
    const record = tokens.find((t) => t.token === token && !t.used);
    if (!record) {
      return { valid: false, error: 'Link đặt lại mật khẩu không hợp lệ hoặc đã được sử dụng.' };
    }
    if (Date.now() > record.expiresAt) {
      return { valid: false, error: 'Link đặt lại mật khẩu đã hết hạn (quá 15 phút). Vui lòng yêu cầu link mới trên Bot Telegram.' };
    }
    return { valid: true, email: record.email };
  },

  verifyAndConsumePasswordResetToken(token: string): { valid: boolean; email?: string; error?: string } {
    if (!token) return { valid: false, error: 'Thiếu mã token xác thực.' };
    const tokens = this.loadPasswordResetTokens();
    const record = tokens.find((t) => t.token === token && !t.used);
    if (!record) {
      return { valid: false, error: 'Link đặt lại mật khẩu không hợp lệ hoặc đã được sử dụng.' };
    }
    if (Date.now() > record.expiresAt) {
      record.used = true;
      this.savePasswordResetTokens(tokens);
      return { valid: false, error: 'Link đặt lại mật khẩu đã hết hạn (quá 15 phút). Vui lòng yêu cầu link mới trên Bot Telegram.' };
    }
    record.used = true;
    this.savePasswordResetTokens(tokens);
    return { valid: true, email: record.email };
  },

  createPasswordResetShortToken(
    email: string,
    options?: { userId?: string; telegramId?: string }
  ): { token: string; expiresAt: number; id: string } {
    const tokens = this.loadPasswordResetTokens();
    const cleanEmail = email.trim().toLowerCase();
    const now = Date.now();

    // Invalidate prior unused tokens for this email
    tokens.forEach((t) => {
      if (t.email.toLowerCase() === cleanEmail && !t.used) {
        t.used = true;
      }
    });

    // 8-character token in format YK-XXXXXX (YK- followed by 6 hex uppercase chars)
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const token = `YK-${randomHex}`;
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes TTL

    const newRecord: PasswordResetToken = {
      id: 'prt_' + now + '_' + Math.floor(Math.random() * 1000),
      token,
      email: cleanEmail,
      userId: options?.userId,
      telegramId: options?.telegramId,
      tokenType: 'SHORT_OTP',
      verifiedTelegram: false,
      expiresAt,
      used: false,
      createdAt: new Date().toISOString(),
    };

    tokens.unshift(newRecord);
    this.savePasswordResetTokens(tokens.slice(0, 200));
    return { token, expiresAt, id: newRecord.id };
  },

  findPasswordResetToken(token: string): PasswordResetToken | null {
    if (!token) return null;
    const cleanToken = token.trim().toUpperCase();
    const tokens = this.loadPasswordResetTokens();
    const record = tokens.find(
      (t) => (t.token.toUpperCase() === cleanToken || t.id === token) && !t.used
    );
    if (!record) return null;
    if (Date.now() > record.expiresAt) return null;
    return record;
  },

  markPasswordResetTokenUsed(tokenOrId: string): boolean {
    if (!tokenOrId) return false;
    const clean = tokenOrId.trim().toUpperCase();
    const tokens = this.loadPasswordResetTokens();
    const record = tokens.find(
      (t) => t.token.toUpperCase() === clean || t.id === tokenOrId
    );
    if (!record) return false;
    record.used = true;
    this.savePasswordResetTokens(tokens);
    return true;
  },

  // ---------------------------------------------------------------------------
  // LUCKY SPIN SYSTEM (NẠP 100K = +1 VÉ, TUYẾN DƯỚI NẠP 200K = +1 VÉ, 8 Ô GIẢI THƯỞNG)
  // ---------------------------------------------------------------------------
  loadSpinLogs(): SpinLogRecord[] {
    return readJsonSafe<SpinLogRecord[]>(spinLogsPath, []);
  },

  saveSpinLogs(logs: SpinLogRecord[]): boolean {
    return writeJsonSafe(spinLogsPath, logs);
  },

  creditSpinTicketsForDeposit(userId: string, depositAmount: number): { newTickets: number; totalTickets: number; progress: number } {
    if (!userId || depositAmount <= 0) return { newTickets: 0, totalTickets: 0, progress: 0 };
    const users = this.loadUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return { newTickets: 0, totalTickets: 0, progress: 0 };

    const currentProg = Number(user.depositSpinProgress || 0);
    const totalProg = currentProg + Number(depositAmount);
    const newTickets = Math.floor(totalProg / 100000);
    user.depositSpinProgress = totalProg % 100000;
    user.spinTickets = Math.max(0, Number(user.spinTickets || 0) + newTickets);

    this.saveUsers(users);
    return {
      newTickets,
      totalTickets: user.spinTickets,
      progress: user.depositSpinProgress,
    };
  },

  creditSpinTicketsForAffiliate(referrerId: string, depositAmount: number): { newTickets: number; totalTickets: number; progress: number } {
    if (!referrerId || depositAmount <= 0) return { newTickets: 0, totalTickets: 0, progress: 0 };
    const users = this.loadUsers();
    const referrer = users.find((u) => u.id === referrerId);
    if (!referrer) return { newTickets: 0, totalTickets: 0, progress: 0 };

    const currentProg = Number(referrer.affiSpinProgress || 0);
    const totalProg = currentProg + Number(depositAmount);
    const newTickets = Math.floor(totalProg / 200000);
    referrer.affiSpinProgress = totalProg % 200000;
    referrer.spinTickets = Math.max(0, Number(referrer.spinTickets || 0) + newTickets);

    this.saveUsers(users);
    return {
      newTickets,
      totalTickets: referrer.spinTickets,
      progress: referrer.affiSpinProgress,
    };
  },

  adminAdjustSpinTickets(userId: string, deltaTickets: number, reason?: string): { success: boolean; spinTickets: number; user?: LocalUser; error?: string } {
    const users = this.loadUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return { success: false, spinTickets: 0, error: 'Không tìm thấy tài khoản người dùng.' };

    user.spinTickets = Math.max(0, Number(user.spinTickets || 0) + Number(deltaTickets));
    this.saveUsers(users);
    return { success: true, spinTickets: user.spinTickets, user };
  },

  getUserSpinState(userId: string) {
    const user = this.findUserById(userId);
    if (!user) return null;
    return {
      spinTickets: Number(user.spinTickets || 0),
      depositSpinProgress: Number(user.depositSpinProgress || 0),
      depositNeedForNext: Math.max(0, 100000 - Number(user.depositSpinProgress || 0)),
      affiSpinProgress: Number(user.affiSpinProgress || 0),
      affiNeedForNext: Math.max(0, 200000 - Number(user.affiSpinProgress || 0)),
      withdrawableBalance: Number(user.affiliateBalance || user.withdrawableBalance || 0),
      freeWithdrawalBalance: Number(user.freeWithdrawalBalance || 0),
      balance: Number(user.balance || 0),
      vouchers: user.vouchers || [],
    };
  },

  rollSpin(userId: string): {
    success: boolean;
    error?: string;
    prizeIndex?: number;
    prize?: any;
    remainingTickets?: number;
    userBalance?: number;
    withdrawableBalance?: number;
    freeWithdrawalBalance?: number;
  } {
    const users = this.loadUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return { success: false, error: 'Không tìm thấy tài khoản người dùng.' };

    const tickets = Number(user.spinTickets || 0);
    if (tickets < 1) {
      return { success: false, error: 'Bạn đã hết vé quay! Nạp từ 100.000đ hoặc giới thiệu bạn bè nạp để nhận thêm vé quay.' };
    }

    user.spinTickets = tickets - 1;

    const PRIZES = [
      { index: 0, name: 'Chúc bạn may mắn lần sau', type: 'NOTHING', weight: 340, value: 0 },
      { index: 1, name: 'Voucher Giảm 3%', type: 'VOUCHER', weight: 250, value: 3, minOrder: 50000, days: 7 },
      { index: 2, name: 'Voucher Giảm 5%', type: 'VOUCHER', weight: 180, value: 5, minOrder: 100000, days: 7 },
      { index: 3, name: '+5.000đ vào Ví Mua Hàng', type: 'WALLET', weight: 120, value: 5000 },
      { index: 4, name: 'Voucher Giảm 10%', type: 'VOUCHER', weight: 70, value: 10, maxDiscount: 25000, minOrder: 150000, days: 7 },
      { index: 5, name: '+10.000đ Tiền Mặt (Rút Bank)', type: 'CASH', weight: 30, value: 10000 },
      { index: 6, name: '+50.000đ Tiền Mặt (Rút Bank)', type: 'CASH', weight: 9, value: 50000 },
      { index: 7, name: 'JACKPOT +200.000đ Tiền Mặt', type: 'CASH', weight: 1, value: 200000 },
    ];

    const totalWeight = PRIZES.reduce((acc, p) => acc + p.weight, 0);
    const rand = Math.floor(Math.random() * totalWeight);

    let cum = 0;
    let selectedPrize = PRIZES[0];
    for (const p of PRIZES) {
      cum += p.weight;
      if (rand < cum) {
        selectedPrize = p;
        break;
      }
    }

    const nowISO = new Date().toISOString();
    let voucherCode: string | undefined;

    if (selectedPrize.type === 'VOUCHER') {
      const vRand = crypto.randomBytes(3).toString('hex').toUpperCase();
      voucherCode = `SPIN${selectedPrize.value}-${vRand}`;
      const expiresAt = new Date(Date.now() + (selectedPrize.days || 7) * 24 * 3600 * 1000).toISOString();

      const coupons = this.loadCoupons();
      coupons.unshift({
        id: 'cpn_' + Date.now(),
        code: voucherCode,
        discount_type: 'PERCENT',
        discount_value: selectedPrize.value,
        max_discount: selectedPrize.maxDiscount || null,
        min_order_amount: selectedPrize.minOrder || 0,
        applicable_to: 'ALL',
        usage_limit: 1,
        used_count: 0,
        is_active: true,
        expires_at: expiresAt,
        created_at: nowISO,
      });
      this.saveCoupons(coupons);

      if (!user.vouchers) user.vouchers = [];
      user.vouchers.unshift({
        id: 'vch_' + Date.now(),
        code: voucherCode,
        discountPercent: selectedPrize.value,
        maxDiscount: selectedPrize.maxDiscount,
        minOrder: selectedPrize.minOrder || 0,
        expiresAt,
        isUsed: false,
        createdAt: nowISO,
        source: 'SPIN',
      });
    } else if (selectedPrize.type === 'WALLET') {
      user.balance = Number(user.balance || 0) + selectedPrize.value;
      this.appendWalletLedger({
        userId: user.id,
        type: 'SPIN_REWARD' as any,
        delta: selectedPrize.value,
        balanceBefore: user.balance - selectedPrize.value,
        balanceAfter: user.balance,
        referenceId: `SPIN_${Date.now()}`,
        description: `Trúng thưởng +${selectedPrize.value.toLocaleString('vi-VN')}đ Ví Mua Hàng từ Vòng Quay May Mắn`,
        createdAt: nowISO,
      });
    } else if (selectedPrize.type === 'CASH') {
      user.affiliateBalance = Number(user.affiliateBalance || 0) + selectedPrize.value;
      user.withdrawableBalance = Number(user.withdrawableBalance || 0) + selectedPrize.value;
      user.freeWithdrawalBalance = Number(user.freeWithdrawalBalance || 0) + selectedPrize.value;
      this.appendWalletLedger({
        userId: user.id,
        type: 'SPIN_CASH' as any,
        delta: selectedPrize.value,
        balanceBefore: user.affiliateBalance - selectedPrize.value,
        balanceAfter: user.affiliateBalance,
        referenceId: `SPIN_CASH_${Date.now()}`,
        description: `Trúng thưởng Tiền Mặt +${selectedPrize.value.toLocaleString('vi-VN')}đ (Miễn phí rút 0đ về Bank) từ Vòng Quay May Mắn`,
        createdAt: nowISO,
      });
    }

    this.saveUsers(users);

    const spinLogs = this.loadSpinLogs();
    spinLogs.unshift({
      id: 'spl_' + Date.now(),
      userId: user.id,
      userEmail: user.email,
      userName: user.fullName || user.username || 'Khách Hàng',
      prizeIndex: selectedPrize.index,
      prizeName: selectedPrize.name,
      prizeType: selectedPrize.type as any,
      prizeValue: selectedPrize.value,
      voucherCode,
      createdAt: nowISO,
    });
    this.saveSpinLogs(spinLogs.slice(0, 100));

    return {
      success: true,
      prizeIndex: selectedPrize.index,
      prize: {
        ...selectedPrize,
        voucherCode,
      },
      remainingTickets: user.spinTickets,
      userBalance: user.balance,
      withdrawableBalance: user.affiliateBalance || user.withdrawableBalance || 0,
      freeWithdrawalBalance: user.freeWithdrawalBalance || 0,
    };
  },

  getUserVouchers(userId: string): UserVoucher[] {
    const user = this.findUserById(userId);
    return user?.vouchers || [];
  },

  getRecentSpinLogs(limit = 20): SpinLogRecord[] {
    const logs = this.loadSpinLogs();
    return logs.slice(0, limit);
  },

  // ---------------------------------------------------------------------------
  // SMART TOP DEPOSITOR TIERS (NGƯỠNG 2M / 1.5M / 1M / 500K - TỰ ĐỘNG HẠ BẬC)
  // ---------------------------------------------------------------------------
  evaluateTopDepositorTier(rank: number, totalDeposit: number): {
    tierName: string;
    targetThreshold: number;
    isDowngraded: boolean;
    rewardDescription: string;
    voucherPercent: number;
    voucherMinOrder: number;
    voucherMaxDiscount?: number;
    walletReward: number;
    spinTickets: number;
    missingForTarget: number;
  } {
    if (rank === 1) {
      if (totalDeposit >= 2000000) {
        return {
          tierName: 'Quán Quân Top 1 (Đạt Chuẩn)',
          targetThreshold: 2000000,
          isDowngraded: false,
          rewardDescription: 'Voucher 10% (tối đa 40k, đơn từ 200k) + 50.000đ Ví + 3 Vé Quay',
          voucherPercent: 10,
          voucherMinOrder: 200000,
          voucherMaxDiscount: 40000,
          walletReward: 50000,
          spinTickets: 3,
          missingForTarget: 0,
        };
      }
      if (totalDeposit >= 1500000) {
        return {
          tierName: 'Top 1 (Hạ Bậc sang Quà Top 2)',
          targetThreshold: 2000000,
          isDowngraded: true,
          rewardDescription: 'Voucher 8% (đơn từ 150k) + 25.000đ Ví + 2 Vé Quay (Chưa đạt mốc 2M)',
          voucherPercent: 8,
          voucherMinOrder: 150000,
          walletReward: 25000,
          spinTickets: 2,
          missingForTarget: 2000000 - totalDeposit,
        };
      }
      if (totalDeposit >= 1000000) {
        return {
          tierName: 'Top 1 (Hạ Bậc sang Quà Top 3)',
          targetThreshold: 2000000,
          isDowngraded: true,
          rewardDescription: 'Voucher 7% (đơn từ 150k) + 15.000đ Ví + 1 Vé Quay (Chưa đạt mốc 2M)',
          voucherPercent: 7,
          voucherMinOrder: 150000,
          walletReward: 15000,
          spinTickets: 1,
          missingForTarget: 2000000 - totalDeposit,
        };
      }
      if (totalDeposit >= 500000) {
        return {
          tierName: 'Top 1 (Hạ Bậc sang Mốc Khuyến Khích)',
          targetThreshold: 2000000,
          isDowngraded: true,
          rewardDescription: 'Voucher 5% (đơn từ 100k) + 1 Vé Quay (Chưa đạt mốc 1M)',
          voucherPercent: 5,
          voucherMinOrder: 100000,
          walletReward: 0,
          spinTickets: 1,
          missingForTarget: 2000000 - totalDeposit,
        };
      }
      return {
        tierName: 'Top 1 (Chưa đủ điều kiện nhận quà)',
        targetThreshold: 2000000,
        isDowngraded: true,
        rewardDescription: 'Cần nạp tối thiểu từ 500.000đ để kích hoạt nhận quà Top Nạp',
        voucherPercent: 0,
        voucherMinOrder: 0,
        walletReward: 0,
        spinTickets: 0,
        missingForTarget: 2000000 - totalDeposit,
      };
    }

    if (rank === 2) {
      if (totalDeposit >= 1500000) {
        return {
          tierName: 'Á Quân Top 2 (Đạt Chuẩn)',
          targetThreshold: 1500000,
          isDowngraded: false,
          rewardDescription: 'Voucher 8% (đơn từ 150k) + 25.000đ Ví + 2 Vé Quay',
          voucherPercent: 8,
          voucherMinOrder: 150000,
          walletReward: 25000,
          spinTickets: 2,
          missingForTarget: 0,
        };
      }
      if (totalDeposit >= 1000000) {
        return {
          tierName: 'Top 2 (Hạ Bậc sang Quà Top 3)',
          targetThreshold: 1500000,
          isDowngraded: true,
          rewardDescription: 'Voucher 7% (đơn từ 150k) + 15.000đ Ví + 1 Vé Quay (Chưa đạt mốc 1.5M)',
          voucherPercent: 7,
          voucherMinOrder: 150000,
          walletReward: 15000,
          spinTickets: 1,
          missingForTarget: 1500000 - totalDeposit,
        };
      }
      if (totalDeposit >= 500000) {
        return {
          tierName: 'Top 2 (Hạ Bậc sang Mốc Khuyến Khích)',
          targetThreshold: 1500000,
          isDowngraded: true,
          rewardDescription: 'Voucher 5% (đơn từ 100k) + 1 Vé Quay (Chưa đạt mốc 1M)',
          voucherPercent: 5,
          voucherMinOrder: 100000,
          walletReward: 0,
          spinTickets: 1,
          missingForTarget: 1500000 - totalDeposit,
        };
      }
      return {
        tierName: 'Top 2 (Chưa đủ điều kiện nhận quà)',
        targetThreshold: 1500000,
        isDowngraded: true,
        rewardDescription: 'Cần nạp tối thiểu từ 500.000đ để kích hoạt nhận quà Top Nạp',
        voucherPercent: 0,
        voucherMinOrder: 0,
        walletReward: 0,
        spinTickets: 0,
        missingForTarget: 1500000 - totalDeposit,
      };
    }

    if (rank === 3) {
      if (totalDeposit >= 1000000) {
        return {
          tierName: 'Quý Quân Top 3 (Đạt Chuẩn)',
          targetThreshold: 1000000,
          isDowngraded: false,
          rewardDescription: 'Voucher 7% (đơn từ 150k) + 15.000đ Ví + 1 Vé Quay',
          voucherPercent: 7,
          voucherMinOrder: 150000,
          walletReward: 15000,
          spinTickets: 1,
          missingForTarget: 0,
        };
      }
      if (totalDeposit >= 500000) {
        return {
          tierName: 'Top 3 (Hạ Bậc sang Mốc Khuyến Khích)',
          targetThreshold: 1000000,
          isDowngraded: true,
          rewardDescription: 'Voucher 5% (đơn từ 100k) + 1 Vé Quay (Chưa đạt mốc 1M)',
          voucherPercent: 5,
          voucherMinOrder: 100000,
          walletReward: 0,
          spinTickets: 1,
          missingForTarget: 1000000 - totalDeposit,
        };
      }
      return {
        tierName: 'Top 3 (Chưa đủ điều kiện nhận quà)',
        targetThreshold: 1000000,
        isDowngraded: true,
        rewardDescription: 'Cần nạp tối thiểu từ 500.000đ để kích hoạt nhận quà Top Nạp',
        voucherPercent: 0,
        voucherMinOrder: 0,
        walletReward: 0,
        spinTickets: 0,
        missingForTarget: 1000000 - totalDeposit,
      };
    }

    if (totalDeposit >= 500000) {
      return {
        tierName: 'Mốc Khuyến Khích (Đạt Chuẩn)',
        targetThreshold: 500000,
        isDowngraded: false,
        rewardDescription: 'Voucher 5% (đơn từ 100k) + 1 Vé Quay May Mắn',
        voucherPercent: 5,
        voucherMinOrder: 100000,
        walletReward: 0,
        spinTickets: 1,
        missingForTarget: 0,
      };
    }

    return {
      tierName: `Hạng #${rank}`,
      targetThreshold: 500000,
      isDowngraded: false,
      rewardDescription: 'Cần nạp thêm để đạt Mốc Khuyến Khích (tối thiểu 500.000đ)',
      voucherPercent: 0,
      voucherMinOrder: 0,
      walletReward: 0,
      spinTickets: 0,
      missingForTarget: Math.max(0, 500000 - totalDeposit),
    };
  },

  distributeTopDepositorRewards(targetMonth?: string): {
    success: boolean;
    month?: string;
    distributedCount: number;
    results: any[];
    error?: string;
  } {
    return this.distributeMonthlyTopDepositorRewards(targetMonth, 'ADMIN');
  },

  distributeMonthlyTopDepositorRewards(
    targetMonth?: string,
    concludedBy: string = 'ADMIN'
  ): {
    success: boolean;
    month?: string;
    distributedCount: number;
    results: any[];
    error?: string;
  } {
    const activeMonth = targetMonth || getVietnamMonth();
    const history = this.loadMonthlyTopHistory();

    const alreadyConcluded = history.find((h) => h.month === activeMonth);
    if (alreadyConcluded) {
      return {
        success: false,
        month: activeMonth,
        distributedCount: 0,
        results: [],
        error: `Tháng ${activeMonth} đã được tổng kết và phát thưởng trước đó (vào lúc ${alreadyConcluded.concludedAt}).`,
      };
    }

    const depositors = this.getTopDepositors(10, activeMonth);
    const results: any[] = [];
    const notifications = this.loadMonthlyNotifications();
    const nowISO = new Date().toISOString();

    depositors.forEach((d, idx) => {
      const rank = idx + 1;
      const totalDep = Number(d.totalDeposit || 0);
      const tierInfo = this.evaluateTopDepositorTier(rank, totalDep);

      if (tierInfo.voucherPercent > 0 || tierInfo.walletReward > 0 || tierInfo.spinTickets > 0) {
        const users = this.loadUsers();
        const user = users.find((u) => u.id === d.userId || u.username === d.userId || u.email === d.userId);
        if (user) {
          if (tierInfo.walletReward > 0) {
            user.balance = Number(user.balance || 0) + tierInfo.walletReward;
            this.appendWalletLedger({
              userId: user.id,
              type: 'TOP_DEPOSITOR_REWARD' as any,
              delta: tierInfo.walletReward,
              balanceBefore: user.balance - tierInfo.walletReward,
              balanceAfter: user.balance,
              referenceId: `TOP_DEP_${Date.now()}_${rank}`,
              description: `Thưởng Top #${rank} Nạp Tiền Tháng ${activeMonth}: +${tierInfo.walletReward.toLocaleString('vi-VN')}đ vào Ví Mua Hàng`,
              createdAt: nowISO,
            });
          }

          if (tierInfo.spinTickets > 0) {
            user.spinTickets = Number(user.spinTickets || 0) + tierInfo.spinTickets;
          }

          let voucherCode: string | undefined;
          if (tierInfo.voucherPercent > 0) {
            const vRand = crypto.randomBytes(3).toString('hex').toUpperCase();
            voucherCode = `TOP${rank}-${tierInfo.voucherPercent}PCT-${vRand}`;
            const expiresAt = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();

            const coupons = this.loadCoupons();
            coupons.unshift({
              id: 'cpn_top_' + Date.now() + '_' + rank,
              code: voucherCode,
              discount_type: 'PERCENT',
              discount_value: tierInfo.voucherPercent,
              max_discount: tierInfo.voucherMaxDiscount || null,
              min_order_amount: tierInfo.voucherMinOrder || 0,
              applicable_to: 'ALL',
              usage_limit: 1,
              used_count: 0,
              is_active: true,
              expires_at: expiresAt,
              created_at: nowISO,
            });
            this.saveCoupons(coupons);

            if (!user.vouchers) user.vouchers = [];
            user.vouchers.unshift({
              id: 'vch_top_' + Date.now() + '_' + rank,
              code: voucherCode,
              discountPercent: tierInfo.voucherPercent,
              maxDiscount: tierInfo.voucherMaxDiscount,
              minOrder: tierInfo.voucherMinOrder || 0,
              expiresAt,
              isUsed: false,
              createdAt: nowISO,
              source: 'TOP_DEPOSITOR',
            });
          }

          this.saveUsers(users);

          // Add notification with isSeen = false for winning user
          const notif: MonthlyRewardNotification = {
            id: `mrn_${Date.now()}_${rank}_${user.id.slice(-6)}`,
            userId: user.id,
            userEmail: user.email || '',
            month: activeMonth,
            rank,
            totalDeposit: totalDep,
            tierName: tierInfo.tierName,
            rewardDescription: tierInfo.rewardDescription,
            walletReward: tierInfo.walletReward,
            voucherCode,
            voucherPercent: tierInfo.voucherPercent,
            voucherMinOrder: tierInfo.voucherMinOrder,
            voucherMaxDiscount: tierInfo.voucherMaxDiscount,
            spinTickets: tierInfo.spinTickets,
            isSeen: false,
            createdAt: nowISO,
          };
          notifications.unshift(notif);

          results.push({
            rank,
            userId: user.id,
            email: user.email,
            maskedName: d.maskedName,
            totalDeposit: totalDep,
            tierName: tierInfo.tierName,
            rewardDescription: tierInfo.rewardDescription,
            voucherCode,
            walletReward: tierInfo.walletReward,
            spinTickets: tierInfo.spinTickets,
          });
        }
      }
    });

    this.saveMonthlyNotifications(notifications);

    // Record snapshot to monthly_top_history.json
    history.unshift({
      month: activeMonth,
      concludedAt: nowISO,
      concludedBy,
      totalDepositors: results.length,
      topList: results,
    });
    this.saveMonthlyTopHistory(history);

    return {
      success: true,
      month: activeMonth,
      distributedCount: results.length,
      results,
    };
  },

  // ---------------------------------------------------------------------------
  // TELEGRAM BOT STEP TRACKING
  // ---------------------------------------------------------------------------
  getTelegramUserStep(chatId: string | number): { step: string; email?: string; updatedAt: number } | null {
    const key = String(chatId);
    const item = telegramUserSteps.get(key);
    if (!item) return null;
    // Step timeout after 10 minutes
    if (Date.now() - item.updatedAt > 10 * 60 * 1000) {
      telegramUserSteps.delete(key);
      return null;
    }
    return item;
  },

  setTelegramUserStep(chatId: string | number, step: string, email?: string): void {
    const key = String(chatId);
    telegramUserSteps.set(key, {
      step,
      email,
      updatedAt: Date.now(),
    });
  },

  clearTelegramUserStep(chatId: string | number): void {
    telegramUserSteps.delete(String(chatId));
  },

  // ---------------------------------------------------------------------------
  // CATEGORIES MANAGEMENT
  // ---------------------------------------------------------------------------
  loadCategories(): LocalCategory[] {
    const defaultCategories: LocalCategory[] = [
      { id: 'cat_ai_tech', name: 'AI & Công Nghệ', slug: 'ai-cong-nghe', description: 'Google Gemini, công cụ AI và công nghệ', icon: 'Bot', createdAt: new Date().toISOString() },
      { id: 'cat_ai_models', name: 'Trí Tuệ Nhân Tạo AI', slug: 'tri-tue-nhan-tao-ai', description: 'ChatGPT, Claude, Grok, DeepSeek...', icon: 'Sparkles', createdAt: new Date().toISOString() },
      { id: 'cat_entertainment', name: 'Giải Trí & Video', slug: 'giai-tri-video', description: 'YouTube, Netflix...', icon: 'Tv', createdAt: new Date().toISOString() },
      { id: 'cat_design', name: 'Đồ Họa & Biên Tập', slug: 'do-hoa-bien-tap', description: 'Canva Pro, CapCut Pro...', icon: 'Layers', createdAt: new Date().toISOString() },
      { id: 'cat_finance', name: 'Tài Chính & Ngân Hàng', slug: 'tai-chinh-ngan-hang', description: 'MB Bank Số Đẹp', icon: 'Wallet', createdAt: new Date().toISOString() },
      { id: 'cat_music', name: 'Âm Nhạc & Giải Trí', slug: 'am-nhac-giai-tri', description: 'Spotify Premium', icon: 'Music', createdAt: new Date().toISOString() },
      { id: 'cat_learning', name: 'Học Tập & Ngôn Ngữ', slug: 'hoc-tap-ngon-ngu', description: 'Super Duolingo', icon: 'GraduationCap', createdAt: new Date().toISOString() },
      { id: 'cat_vpn', name: 'Bảo Mật & Tiện Ích', slug: 'bao-mat-tien-ich', description: 'VPN & Bảo mật', icon: 'ShieldCheck', createdAt: new Date().toISOString() },
      { id: 'cat_social', name: 'Mạng Xã Hội & Đời Sống', slug: 'mang-xa-hoi-doi-song', description: 'Locket Gold (iOS)', icon: 'Share2', createdAt: new Date().toISOString() },
      { id: 'cat_api', name: 'API & Công Cụ Tool', slug: 'api-cong-cu-tool', description: 'API Tool SMS Gateway', icon: 'Terminal', createdAt: new Date().toISOString() },
    ];

    const categories = readJsonSafe<LocalCategory[]>(categoriesPath, []);
    if (categories.length === 0) {
      writeJsonSafe(categoriesPath, defaultCategories);
      return defaultCategories;
    }
    return categories;
  },

  saveCategories(categories: LocalCategory[]): boolean {
    return writeJsonSafe(categoriesPath, categories);
  },

  createCategory(categoryData: Partial<LocalCategory>): LocalCategory {
    const categories = this.loadCategories();
    const name = (categoryData.name || '').trim();
    if (!name) throw new Error('Tên danh mục không được để trống.');

    const normalizedSlug = (categoryData.slug || name)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const slug = normalizedSlug || `cat-${Date.now()}`;
    const existing = categories.find((c) => c.slug === slug || c.name.toLowerCase() === name.toLowerCase());
    if (existing) throw new Error(`Danh mục "${name}" đã tồn tại.`);

    const newCat: LocalCategory = {
      id: 'cat_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name,
      slug,
      description: categoryData.description || '',
      icon: categoryData.icon || 'Folder',
      badge: categoryData.badge || '',
      createdAt: new Date().toISOString(),
    };

    categories.push(newCat);
    this.saveCategories(categories);
    return newCat;
  },

  updateCategory(id: string, patch: { name: string; description?: string }): LocalCategory | null {
    const categories = this.loadCategories();
    const idx = categories.findIndex((c) => c.id === id || c.slug === id);
    if (idx < 0) return null;

    const oldName = categories[idx].name;
    const nextName = String(patch.name || '').trim();
    if (!nextName) throw new Error('Tên danh mục không được để trống.');

    const duplicate = categories.find(
      (c, i) => i !== idx && c.name.toLowerCase() === nextName.toLowerCase()
    );
    if (duplicate) throw new Error(`Danh mục "${nextName}" đã tồn tại.`);

    const nextSlug =
      nextName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || categories[idx].slug;

    categories[idx] = {
      ...categories[idx],
      name: nextName,
      slug: nextSlug,
      ...(patch.description !== undefined ? { description: String(patch.description).trim() } : {}),
    };
    this.saveCategories(categories);

    // Cascade rename in catalog_overrides customItems / updatedItems
    if (oldName !== nextName) {
      const overrides = this.loadCatalogOverrides();
      let changed = false;
      if (Array.isArray(overrides.customItems)) {
        overrides.customItems = overrides.customItems.map((item: any) => {
          if (item.category === oldName) {
            changed = true;
            return { ...item, category: nextName, display_section: nextName };
          }
          return item;
        });
      }
      if (overrides.updatedItems) {
        for (const sku of Object.keys(overrides.updatedItems)) {
          if (overrides.updatedItems[sku]?.category === oldName) {
            changed = true;
            overrides.updatedItems[sku] = {
              ...overrides.updatedItems[sku],
              category: nextName,
              display_section: nextName,
            };
          }
        }
      }
      if (changed) this.saveCatalogOverrides(overrides);
    }

    return categories[idx];
  },

  deleteCategory(id: string): boolean {
    const categories = this.loadCategories();
    const next = categories.filter((c) => c.id !== id && c.slug !== id);
    if (next.length === categories.length) return false;
    return this.saveCategories(next);
  },

  // ---------------------------------------------------------------------------
  // LIFETIME DEPOSITS & TOP DEPOSITORS LEADERBOARD
  // ---------------------------------------------------------------------------
  getUserLifetimeDeposit(userId: string): number {
    const topups = this.loadTopups();
    const approved = topups.filter(
      (t) => (t.user_id === userId || t.user_name === userId) && t.status === 'approved'
    );
    return approved.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  },

  getTopDepositors(
    limit: number = 10,
    targetMonth?: string
  ): Array<{
    rank: number;
    userId: string;
    maskedName: string;
    totalDeposit: number;
    vipTier: 'MEMBER' | 'SILVER' | 'GOLD' | 'DIAMOND';
    vipBadge: string;
    month: string;
  }> {
    const topups = this.loadTopups();
    const users = this.loadUsers();

    const activeMonth = targetMonth === 'all' ? null : (targetMonth || getVietnamMonth());

    // Map user deposit sums
    const depositMap = new Map<string, number>();

    topups.forEach((t) => {
      if (t.status === 'approved') {
        if (activeMonth) {
          const topupMonth = getVietnamMonth(t.created_at);
          if (topupMonth !== activeMonth) return;
        }
        const uId = t.user_id || t.user_name || 'unknown';
        const amt = Number(t.amount) || 0;
        depositMap.set(uId, (depositMap.get(uId) || 0) + amt);
      }
    });

    // Map real deposits from approved topups only (exclude demo and exclude admin)
    const sorted = Array.from(depositMap.entries())
      .filter(([id, amt]) => {
        if (amt <= 0 || id.startsWith('demo_')) return false;
        const matched = users.find((u) => u.id === id || u.username === id || u.email === id);
        if (matched) {
          if (
            matched.role?.toLowerCase() === 'admin' ||
            matched.email?.toLowerCase() === 'kyomeyuki2k@gmail.com' ||
            matched.id === '00000000-0000-0000-0000-000000000001' ||
            matched.username === 'YukiIsMe2311' ||
            matched.phone === '8960751162' ||
            matched.telegramId === '8960751162'
          ) {
            return false;
          }
        }
        if (
          id === '00000000-0000-0000-0000-000000000001' ||
          id === 'YukiIsMe2311' ||
          id === '8960751162' ||
          id === 'kyomeyuki2k@gmail.com'
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    const monthLabel = activeMonth || getVietnamMonth();

    return sorted.map(([id, totalDeposit], idx) => {
      const matchedUser = users.find((u) => u.id === id || u.username === id);
      let rawName = matchedUser?.email || matchedUser?.telegramId || matchedUser?.username || id;

      // Mask name for privacy (e.g., user***@gmail.com, ID ***89)
      let maskedName = 'VIP Member';
      if (rawName.includes('@')) {
        const [prefix, domain] = rawName.split('@');
        const visibleLen = Math.min(3, prefix.length);
        maskedName = `${prefix.slice(0, visibleLen)}***@${domain}`;
      } else if (/^\d+$/.test(rawName)) {
        maskedName = `ID ***${rawName.slice(-4)}`;
      } else if (rawName.length > 4) {
        maskedName = `${rawName.slice(0, 3)}***${rawName.slice(-2)}`;
      } else {
        maskedName = `${rawName}***`;
      }

      let vipTier: 'MEMBER' | 'SILVER' | 'GOLD' | 'DIAMOND' = 'MEMBER';
      let vipBadge = 'MEMBER';
      if (totalDeposit >= 3000000) {
        vipTier = 'DIAMOND';
        vipBadge = 'DIAMOND VIP';
      } else if (totalDeposit >= 1500000) {
        vipTier = 'GOLD';
        vipBadge = 'GOLD VIP';
      } else if (totalDeposit >= 500000) {
        vipTier = 'SILVER';
        vipBadge = 'SILVER VIP';
      }

      return {
        rank: idx + 1,
        userId: id,
        maskedName,
        totalDeposit,
        vipTier,
        vipBadge,
        month: monthLabel,
      };
    });
  },

  loadMonthlyTopHistory(): MonthlyTopHistoryRecord[] {
    return readJsonSafe<MonthlyTopHistoryRecord[]>(monthlyTopHistoryPath, []);
  },

  saveMonthlyTopHistory(history: MonthlyTopHistoryRecord[]): boolean {
    return writeJsonSafe(monthlyTopHistoryPath, history);
  },

  loadMonthlyNotifications(): MonthlyRewardNotification[] {
    return readJsonSafe<MonthlyRewardNotification[]>(monthlyNotificationsPath, []);
  },

  saveMonthlyNotifications(notifications: MonthlyRewardNotification[]): boolean {
    return writeJsonSafe(monthlyNotificationsPath, notifications);
  },

  getUnseenMonthlyReward(userId: string): MonthlyRewardNotification | null {
    const notifications = this.loadMonthlyNotifications();
    const users = this.loadUsers();
    const user = users.find((u) => u.id === userId || u.username === userId || u.email === userId);
    const uEmail = user?.email?.toLowerCase();

    const unseen = notifications.find(
      (n) =>
        !n.isSeen &&
        (n.userId === userId ||
          (user && n.userId === user.id) ||
          (uEmail && n.userEmail?.toLowerCase() === uEmail))
    );
    return unseen || null;
  },

  markMonthlyRewardClaimed(notificationId: string, userId: string): boolean {
    const notifications = this.loadMonthlyNotifications();
    const users = this.loadUsers();
    const user = users.find((u) => u.id === userId || u.username === userId || u.email === userId);
    const uEmail = user?.email?.toLowerCase();

    let found = false;
    notifications.forEach((n) => {
      if (
        n.id === notificationId &&
        (n.userId === userId ||
          (user && n.userId === user.id) ||
          (uEmail && n.userEmail?.toLowerCase() === uEmail))
      ) {
        n.isSeen = true;
        n.claimedAt = new Date().toISOString();
        found = true;
      }
    });

    if (found) {
      this.saveMonthlyNotifications(notifications);
    }
    return found;
  },

  loadReferralLogs(): LocalReferralLog[] {
    return readJsonSafe<LocalReferralLog[]>(referralLogsPath, []);
  },

  saveReferralLogs(logs: LocalReferralLog[]): boolean {
    return writeJsonSafe(referralLogsPath, logs);
  },

  addReferralLog(
    log: Omit<LocalReferralLog, 'id' | 'created_at'> & { id?: string; created_at?: string }
  ): LocalReferralLog {
    const logs = this.loadReferralLogs();
    const newLog: LocalReferralLog = {
      id: log.id || 'reflog_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      referrer_id: log.referrer_id,
      referred_user_id: log.referred_user_id,
      deposit_order_id: log.deposit_order_id,
      deposit_amount: Number(log.deposit_amount) || 0,
      commission_rate: Number(log.commission_rate) || 0.05,
      commission_amount: Number(log.commission_amount) || 0,
      status: log.status || 'DISTRIBUTED',
      referee_email: log.referee_email,
      created_at: log.created_at || new Date().toISOString(),
    };
    logs.unshift(newLog);
    this.saveReferralLogs(logs);

    // Update referrer's referralEarnings in user record
    const users = this.loadUsers();
    const referrer = users.find((u) => u.id === log.referrer_id);
    if (referrer) {
      referrer.referralEarnings = (Number(referrer.referralEarnings) || 0) + newLog.commission_amount;
      this.saveUsers(users);
    }

    return newLog;
  },

  getReferralLogsForUser(userId: string): LocalReferralLog[] {
    const logs = this.loadReferralLogs();
    return logs.filter((l) => l.referrer_id === userId);
  },

  getReferralSummary(userId: string) {
    const users = this.loadUsers();
    const user = users.find((u) => u.id === userId);
    const logs = this.getReferralLogsForUser(userId);
    const referredUsers = users.filter((u) => u.referredBy === userId);
    const totalEarnings = logs.reduce((sum, l) => sum + (Number(l.commission_amount) || 0), 0);

    const sysCfg = this.getSystemConfig();
    return {
      referralCode: user?.referralCode || 'YUKI' + (user?.id ? user.id.slice(-4).toUpperCase() : '8888'),
      totalReferred: referredUsers.length,
      totalEarnings,
      affiliateBalance: Number(user?.affiliateBalance || 0),
      commissionRate: Number(sysCfg.affiliate_rate ?? 0.05),
      recentLogs: logs.slice(0, 20),
    };
  },

  loadSiteSettings(): Record<string, any> {
    const defaultSettings = {
      announcement_popup: {
        is_active: false,
        banner_active: true,
        title: 'Thông Báo Hệ Thống YukiShopMXH',
        content: 'Hệ thống vận hành kiểm duyệt thủ công 24/7 an toàn và chuẩn xác.',
        cta_text: 'Tham Gia Kênh Telegram',
        cta_link: 'https://t.me/yukismsnotice',
        support_telegram_url: 'https://t.me/yukismsnotice',
        banner_text: 'YukiShopMXH — Hệ thống nạp ví tự động và kiểm duyệt đơn hàng minh bạch 24/7.',
        updated_at: new Date().toISOString(),
      },
    };
    return readJsonSafe<Record<string, any>>(siteSettingsPath, defaultSettings);
  },

  saveSiteSettings(settings: Record<string, any>): boolean {
    return writeJsonSafe(siteSettingsPath, settings);
  },

  getAnnouncementConfig(): LocalAnnouncementPopup {
    const all = this.loadSiteSettings();
    const defaultCfg: LocalAnnouncementPopup = {
      is_active: false,
      banner_active: true,
      title: 'Thông Báo Hệ Thống YukiShopMXH',
      content: 'Hệ thống vận hành kiểm duyệt thủ công 24/7 an toàn và chuẩn xác.',
      cta_text: 'Tham Gia Kênh Telegram',
      cta_link: 'https://t.me/yukismsnotice',
      support_telegram_url: 'https://t.me/yukismsnotice',
      banner_text: 'YukiShopMXH — Hệ thống nạp ví tự động và kiểm duyệt đơn hàng minh bạch 24/7.',
      updated_at: new Date().toISOString(),
    };
    return all.announcement_popup || defaultCfg;
  },

  updateAnnouncementConfig(config: Partial<LocalAnnouncementPopup>): LocalAnnouncementPopup {
    const all = this.loadSiteSettings();
    const current = this.getAnnouncementConfig();
    const updated: LocalAnnouncementPopup = {
      ...current,
      ...config,
      updated_at: new Date().toISOString(),
    };
    all.announcement_popup = updated;
    this.saveSiteSettings(all);
    return updated;
  },

  getSystemConfig(): LocalSystemConfig {
    const all = this.loadSiteSettings();
    const defaults: LocalSystemConfig = {
      sleep_mode: false,
      sleep_message:
        'Shop đang tạm nghỉ duyệt tay. Nạp ví Auto 24/7 vẫn hoạt động; đơn xử lý thủ công sẽ được duyệt ngay khi mở ca.',
      cashback_rate: 0.02,
      cashback_min_order: 20000,
      cashback_min_redeem: 5000,
      affiliate_rate: 0.05,
      updated_at: new Date().toISOString(),
    };
    const saved = all.system_config || {};
    return {
      ...defaults,
      ...saved,
      cashback_rate: Number.isFinite(Number(saved.cashback_rate)) ? Number(saved.cashback_rate) : defaults.cashback_rate,
      cashback_min_order: Number.isFinite(Number(saved.cashback_min_order))
        ? Number(saved.cashback_min_order)
        : defaults.cashback_min_order,
      cashback_min_redeem: Number.isFinite(Number(saved.cashback_min_redeem))
        ? Number(saved.cashback_min_redeem)
        : defaults.cashback_min_redeem,
      affiliate_rate: Number.isFinite(Number(saved.affiliate_rate))
        ? Number(saved.affiliate_rate)
        : defaults.affiliate_rate,
    };
  },

  updateSystemConfig(patch: Partial<LocalSystemConfig>): LocalSystemConfig {
    const all = this.loadSiteSettings();
    const current = this.getSystemConfig();
    const updated: LocalSystemConfig = {
      ...current,
      ...patch,
      updated_at: new Date().toISOString(),
    };
    all.system_config = updated;
    this.saveSiteSettings(all);
    return updated;
  },

  adjustCashbackPoints(userId: string, deltaPoints: number, earnIncrement = 0): number {
    const users = this.loadUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return 0;
    const next = Math.max(0, Math.round((Number(user.cashbackPoints) || 0) + Number(deltaPoints)));
    user.cashbackPoints = next;
    if (earnIncrement > 0) {
      user.totalCashbackEarned = (Number(user.totalCashbackEarned) || 0) + Number(earnIncrement);
    }
    this.saveUsers(users);
    return next;
  },

  adjustAffiliateBalance(userId: string, deltaAmount: number, earnIncrement = 0): number {
    const users = this.loadUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return 0;
    const next = Math.max(0, Math.round((Number(user.affiliateBalance) || 0) + Number(deltaAmount)));
    user.affiliateBalance = next;
    if (earnIncrement > 0) {
      user.referralEarnings = (Number(user.referralEarnings) || 0) + Number(earnIncrement);
    }
    this.saveUsers(users);
    return next;
  },

  markOrderCashbackAwarded(orderCode: string, points: number, partnerCommission = 0): void {
    const orders = this.loadOrders();
    const target = orders.find((o) => o.order_code === orderCode);
    if (!target) return;
    target.cashback_awarded = points;
    if (partnerCommission > 0) {
      target.partner_commission_awarded = partnerCommission;
    }
    this.saveOrders(orders);
  },

  getSavedProfiles(userId: string): LocalSavedProfile[] {
    const user = this.findUserById(userId);
    return Array.isArray(user?.savedProfiles) ? user.savedProfiles : [];
  },

  saveUserProfilePreset(
    userId: string,
    preset: Omit<LocalSavedProfile, 'id' | 'createdAt'> & { id?: string }
  ): LocalSavedProfile[] {
    const users = this.loadUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return [];
    const list = Array.isArray(user.savedProfiles) ? [...user.savedProfiles] : [];
    const now = new Date().toISOString();
    if (preset.id) {
      const idx = list.findIndex((p) => p.id === preset.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...preset };
      } else {
        list.unshift({
          id: preset.id,
          label: preset.label,
          email: preset.email,
          socialLink: preset.socialLink,
          telegram: preset.telegram,
          note: preset.note,
          createdAt: now,
        });
      }
    } else {
      list.unshift({
        id: 'prof_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        label: preset.label,
        email: preset.email,
        socialLink: preset.socialLink,
        telegram: preset.telegram,
        note: preset.note,
        createdAt: now,
      });
    }
    user.savedProfiles = list.slice(0, 15);
    this.saveUsers(users);
    return user.savedProfiles;
  },

  deleteUserProfilePreset(userId: string, presetId: string): LocalSavedProfile[] {
    const users = this.loadUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return [];
    const list = (Array.isArray(user.savedProfiles) ? user.savedProfiles : []).filter((p) => p.id !== presetId);
    user.savedProfiles = list;
    this.saveUsers(users);
    return list;
  },

  loadWalletLedger(): LocalWalletLedgerEntry[] {
    return readJsonSafe<LocalWalletLedgerEntry[]>(walletLedgerPath, []);
  },

  appendWalletLedger(
    entry: Omit<LocalWalletLedgerEntry, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
  ): LocalWalletLedgerEntry {
    const list = this.loadWalletLedger();
    const user = this.findUserById(entry.userId);
    const created: LocalWalletLedgerEntry = {
      id: entry.id || 'wl_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      userId: entry.userId,
      userName: entry.userName || user?.username || user?.fullName || entry.userId,
      type: entry.type,
      delta: Number(entry.delta) || 0,
      balanceBefore: Number(entry.balanceBefore) || 0,
      balanceAfter: Number(entry.balanceAfter) || 0,
      referenceId: entry.referenceId,
      description: entry.description,
      createdAt: entry.createdAt || new Date().toISOString(),
    };
    list.unshift(created);
    writeJsonSafe(walletLedgerPath, list.slice(0, 2000));
    return created;
  },

  getWalletLedgerForUser(userId: string, limit = 100): LocalWalletLedgerEntry[] {
    return this.loadWalletLedger()
      .filter((e) => e.userId === userId)
      .slice(0, limit);
  },

  loadPartnerCodes(): LocalPartnerCtvCode[] {
    return readJsonSafe<LocalPartnerCtvCode[]>(partnerCodesPath, []);
  },

  savePartnerCodes(codes: LocalPartnerCtvCode[]): boolean {
    return writeJsonSafe(partnerCodesPath, codes);
  },

  findPartnerCode(code: string): LocalPartnerCtvCode | undefined {
    const norm = String(code || '').trim().toUpperCase();
    if (!norm) return undefined;
    return this.loadPartnerCodes().find((c) => c.code.toUpperCase() === norm);
  },

  upsertPartnerCode(
    input: Partial<LocalPartnerCtvCode> & { code: string; ownerUserId: string }
  ): LocalPartnerCtvCode {
    const codes = this.loadPartnerCodes();
    const norm = input.code.trim().toUpperCase();
    const owner = this.findUserById(input.ownerUserId);
    const existingIdx = codes.findIndex((c) => c.code.toUpperCase() === norm);
    const record: LocalPartnerCtvCode = {
      code: norm,
      ownerUserId: input.ownerUserId,
      ownerUsername: input.ownerUsername || owner?.username || owner?.fullName || input.ownerUserId,
      discountPercent: Math.max(0, Math.min(50, Number(input.discountPercent ?? 3))),
      commissionPercent: Math.max(0, Math.min(30, Number(input.commissionPercent ?? 5))),
      maxUses: input.maxUses ? Number(input.maxUses) : undefined,
      usedCount: existingIdx >= 0 ? codes[existingIdx].usedCount : 0,
      isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
      createdAt: existingIdx >= 0 ? codes[existingIdx].createdAt : new Date().toISOString(),
    };
    if (existingIdx >= 0) {
      codes[existingIdx] = record;
    } else {
      codes.unshift(record);
    }
    this.savePartnerCodes(codes);
    return record;
  },

  deletePartnerCode(code: string): boolean {
    const norm = String(code || '').trim().toUpperCase();
    const codes = this.loadPartnerCodes();
    const filtered = codes.filter((c) => c.code.toUpperCase() !== norm);
    if (filtered.length === codes.length) return false;
    return this.savePartnerCodes(filtered);
  },

  incrementPartnerCodeUsage(code: string): void {
    const norm = String(code || '').trim().toUpperCase();
    const codes = this.loadPartnerCodes();
    const target = codes.find((c) => c.code.toUpperCase() === norm);
    if (!target) return;
    target.usedCount = (Number(target.usedCount) || 0) + 1;
    this.savePartnerCodes(codes);
  },

  loadAffiliateWithdrawals(): LocalAffiliateWithdrawal[] {
    return readJsonSafe<LocalAffiliateWithdrawal[]>(affiliateWithdrawalsPath, []);
  },

  saveAffiliateWithdrawals(withdrawals: LocalAffiliateWithdrawal[]): boolean {
    return writeJsonSafe(affiliateWithdrawalsPath, withdrawals.slice(0, 500));
  },

  findAffiliateWithdrawalById(id: string): LocalAffiliateWithdrawal | null {
    if (!id) return null;
    const list = this.loadAffiliateWithdrawals();
    return list.find((w) => w.id === id) || null;
  },

  createAffiliateWithdrawal(
    item: Omit<LocalAffiliateWithdrawal, 'id' | 'status' | 'createdAt'>
  ): LocalAffiliateWithdrawal {
    const list = this.loadAffiliateWithdrawals();
    const fee = item.fee !== undefined ? Number(item.fee) : 0;
    const amount = Number(item.amount) || 0;
    const netAmount = item.netAmount !== undefined ? Number(item.netAmount) : Math.max(0, amount - fee);

    const record: LocalAffiliateWithdrawal = {
      id: 'aw_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      userId: item.userId,
      username: item.username,
      amount,
      fee,
      netAmount,
      bankName: item.bankName,
      bankAccount: item.bankAccount,
      accountHolder: item.accountHolder,
      contact: item.contact || '',
      qrCodeUrl: item.qrCodeUrl || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.unshift(record);
    this.saveAffiliateWithdrawals(list);
    return record;
  },

  updateAffiliateWithdrawalStatus(
    id: string,
    status: 'approved' | 'rejected',
    adminNote?: string
  ): LocalAffiliateWithdrawal | null {
    const list = this.loadAffiliateWithdrawals();
    const target = list.find((w) => w.id === id);
    if (!target) return null;

    target.status = status;
    target.updatedAt = new Date().toISOString();
    target.processedAt = new Date().toISOString();
    if (adminNote) target.adminNote = adminNote;

    this.saveAffiliateWithdrawals(list);
    return target;
  },

  // ---------------------------------------------------------------------------
  // SAVED PAYOUT ACCOUNTS (SỔ LƯU TÀI KHOẢN NHẬN TIỀN)
  // ---------------------------------------------------------------------------
  loadSavedPayoutAccounts(): LocalSavedPayoutAccount[] {
    return readJsonSafe<LocalSavedPayoutAccount[]>(savedPayoutAccountsPath, []);
  },

  saveSavedPayoutAccounts(accounts: LocalSavedPayoutAccount[]): boolean {
    return writeJsonSafe(savedPayoutAccountsPath, accounts.slice(0, 1000));
  },

  getUserPayoutAccounts(userId: string): LocalSavedPayoutAccount[] {
    if (!userId) return [];
    const all = this.loadSavedPayoutAccounts();
    return all.filter((a) => a.userId === userId);
  },

  saveUserPayoutAccount(
    userId: string,
    data: Partial<LocalSavedPayoutAccount> & {
      bankCode: string;
      bankName: string;
      accountNumber: string;
      accountHolder: string;
    }
  ): LocalSavedPayoutAccount {
    const all = this.loadSavedPayoutAccounts();
    const userAccounts = all.filter((a) => a.userId === userId);
    const isFirst = userAccounts.length === 0;

    let target: LocalSavedPayoutAccount | undefined;
    if (data.id) {
      target = all.find((a) => a.id === data.id && a.userId === userId);
    }

    const shouldBeDefault = data.isDefault !== undefined ? data.isDefault : isFirst;
    if (shouldBeDefault) {
      // Clear default on other accounts of this user
      all.forEach((a) => {
        if (a.userId === userId) a.isDefault = false;
      });
    }

    if (target) {
      target.bankCode = data.bankCode || target.bankCode;
      target.bankName = data.bankName || target.bankName;
      target.accountNumber = data.accountNumber || target.accountNumber;
      target.accountHolder = data.accountHolder || target.accountHolder;
      target.contact = data.contact !== undefined ? data.contact : target.contact;
      target.qrCodeUrl = data.qrCodeUrl !== undefined ? data.qrCodeUrl : target.qrCodeUrl;
      target.isDefault = shouldBeDefault;
      target.updatedAt = new Date().toISOString();
      this.saveSavedPayoutAccounts(all);
      return target;
    }

    const created: LocalSavedPayoutAccount = {
      id: 'pa_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      userId,
      bankCode: data.bankCode,
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      accountHolder: data.accountHolder,
      contact: data.contact || '',
      qrCodeUrl: data.qrCodeUrl || '',
      isDefault: shouldBeDefault,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    all.unshift(created);
    this.saveSavedPayoutAccounts(all);
    return created;
  },

  deleteUserPayoutAccount(userId: string, accountId: string): boolean {
    const all = this.loadSavedPayoutAccounts();
    const index = all.findIndex((a) => a.id === accountId && a.userId === userId);
    if (index === -1) return false;

    const removed = all.splice(index, 1)[0];
    if (removed.isDefault) {
      const remainingUserAcc = all.find((a) => a.userId === userId);
      if (remainingUserAcc) remainingUserAcc.isDefault = true;
    }

    this.saveSavedPayoutAccounts(all);
    return true;
  },

  setDefaultPayoutAccount(userId: string, accountId: string): boolean {
    const all = this.loadSavedPayoutAccounts();
    let found = false;
    all.forEach((a) => {
      if (a.userId === userId) {
        if (a.id === accountId) {
          a.isDefault = true;
          found = true;
        } else {
          a.isDefault = false;
        }
      }
    });
    if (found) {
      this.saveSavedPayoutAccounts(all);
    }
    return found;
  },

  // ---------------------------------------------------------------------------
  // REFERRAL BINDING & TELEGRAM ID SYNC
  // ---------------------------------------------------------------------------
  bindUserReferrer(
    userId: string,
    referrerCodeOrUsername: string
  ): { success: boolean; error?: string; referrer?: any } {
    if (!userId || !referrerCodeOrUsername) {
      return { success: false, error: 'Vui lòng cung cấp mã giới thiệu hoặc tên người mời.' };
    }
    const users = this.loadUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return { success: false, error: 'Không tìm thấy tài khoản người dùng.' };
    }
    if (user.referredBy) {
      return {
        success: false,
        error: 'Tài khoản của bạn đã được gắn mã giới thiệu từ trước, không thể thay đổi.',
      };
    }

    const cleanInput = referrerCodeOrUsername.trim();
    const upperInput = cleanInput.toUpperCase();
    const lowerInput = cleanInput.toLowerCase();
    const strippedInput = upperInput.replace(/^YUKI[-_]?/i, '');

    // Flexible search: referral code, username, email prefix, user ID suffix, telegram ID
    const referrer = users.find((u) => {
      // 1. ReferralCode exact or stripped match
      const uRef = (u.referralCode || '').toUpperCase();
      if (uRef) {
        if (uRef === upperInput) return true;
        if (strippedInput && uRef.replace(/^YUKI[-_]?/i, '') === strippedInput) return true;
      }
      // 2. Username exact or stripped match
      const uName = (u.username || '').toLowerCase();
      if (uName) {
        if (uName === lowerInput) return true;
        if (strippedInput && uName === strippedInput.toLowerCase()) return true;
      }
      // 3. Email full or prefix match
      const uEmail = (u.email || '').toLowerCase();
      if (uEmail) {
        if (uEmail === lowerInput) return true;
        const prefix = uEmail.split('@')[0];
        if (prefix && (prefix === lowerInput || (strippedInput && prefix === strippedInput.toLowerCase()))) {
          return true;
        }
      }
      // 4. User ID exact or suffix match
      if (u.id === cleanInput || u.id.toLowerCase() === lowerInput) return true;
      if (strippedInput && strippedInput.length >= 4 && u.id.toUpperCase().endsWith(strippedInput)) return true;

      // 5. Telegram ID match
      const uTele = (u.telegramId || '').replace(/^@/, '').toLowerCase();
      const inputTele = lowerInput.replace(/^@/, '');
      if (uTele && (uTele === inputTele || (strippedInput && uTele === strippedInput.toLowerCase()))) {
        return true;
      }

      return false;
    });

    if (!referrer) {
      return { success: false, error: 'Không tìm thấy người giới thiệu phù hợp trên hệ thống.' };
    }

    if (referrer.id === user.id) {
      return { success: false, error: 'Bạn không thể tự giới thiệu chính mình!' };
    }

    if (referrer.referredBy === user.id) {
      return { success: false, error: 'Không thể tạo vòng giới thiệu chéo giữa 2 tài khoản.' };
    }

    user.referredBy = referrer.id;
    this.saveUsers(users);

    return {
      success: true,
      referrer: {
        id: referrer.id,
        username: referrer.username || referrer.fullName,
        referralCode: referrer.referralCode,
      },
    };
  },

  updateUserTelegramId(userId: string, telegramId: string): boolean {
    if (!userId || !telegramId) return false;
    const users = this.loadUsers();
    const user = users.find((u) => u.id === userId);
    if (user) {
      user.telegramId = telegramId;
      this.saveUsers(users);
      return true;
    }
    return false;
  },
};
