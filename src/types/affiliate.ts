// ==============================================================================
// YUKISHOPMXH — AFFILIATE & REFERRAL TYPES
// ==============================================================================

export interface ReferralLogRecord {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  deposit_order_id?: string;
  deposit_amount: number;
  commission_rate: number; // e.g. 0.05 = 5%
  commission_amount: number;
  status: 'PENDING' | 'DISTRIBUTED' | 'CANCELLED';
  referee_email?: string; // Masked for privacy: e.g. "minh***@gmail.com"
  created_at: string;
}

export interface PartnerCtvCode {
  code: string;
  ownerUserId: string;
  ownerUsername?: string;
  discountPercent: number; // Buyer discount % (e.g. 5)
  commissionPercent: number; // CTV commission % (e.g. 5)
  maxUses?: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface AffiliateWithdrawalRecord {
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
  createdAt: string;
  updatedAt?: string;
  processedAt?: string;
}

export interface AffiliateSummary {
  referralCode: string;
  referralLink: string;
  totalReferred: number;
  totalEarnings: number;
  affiliateBalance?: number;
  commissionRate: number; // e.g. 0.05 (5%)
  recentLogs: ReferralLogRecord[];
  referredBy?: string;
  referredByUsername?: string;
}

export interface AffiliateApiResponse {
  success: boolean;
  data?: AffiliateSummary;
  error?: string;
}
