// ==============================================================================
// YUKI WEB V4 — MEMBERSHIP & RANK TYPES
// ==============================================================================

export type MembershipTier = 'FREE' | 'VIP' | 'SVIP';

export interface VipPlan {
  id: string;
  tier: MembershipTier;
  name: string;
  durationDays: number | null; // null = Lifetime
  price: number; // 20k, 100k, 35k, 150k VND
  dailyQuota: number; // 5 (free), 40 (VIP), -1 (SVIP unlimited)
  commandLoopLimit: number; // 8 (free), 20 (VIP), 100 (SVIP)
  queueWeight: number; // 20 (free), 30 (VIP), 50 (SVIP)
  isActive: boolean;
}

export interface UserMembership {
  userId: string;
  tier: MembershipTier;
  planId: string | null;
  startedAt: string;
  expiresAt: string | null;
  dailyQuotaUsed: number;
  lastQuotaResetDate: string;
  updatedAt: string;
}

export type RankTierName = 'NONE' | 'DONG' | 'BAC' | 'VANG' | 'KIM_CUONG';

export interface RankTier {
  id: string;
  tier: RankTierName;
  name: string;
  minContribution: number;
  discountPercent: number;
}

export interface ContributionRecord {
  id: string;
  userId: string;
  amount: number;
  sourceType: 'TOPUP' | 'DONATION';
  sourceId: string;
  createdAt: string;
}
