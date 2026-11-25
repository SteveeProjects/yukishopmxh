/**
 * YUKI WEB V4 - VIP TIER SYSTEM
 * Tiers based on lifetime deposits:
 * - Member (< 500.000đ): 0% discount
 * - VIP Bạc (>= 500.000đ): 2% discount
 * - VIP Vàng (>= 1.500.000đ): 4% discount
 * - VIP Kim Cương (>= 3.000.000đ): 6% discount
 *
 * Exclusions:
 * - 100% Buff MXH (/buff)
 * - Spotify, Locket, Muse AI
 */

export type VipTierLevel = 'MEMBER' | 'SILVER' | 'GOLD' | 'DIAMOND';

export interface VipTierInfo {
  tier: VipTierLevel;
  name: string;
  badge: string;
  discountPercent: number;
  minDeposit: number;
  nextTierName: string | null;
  nextTierThreshold: number | null;
  currentDeposit: number;
  remainingToNextTier: number;
  progressPercent: number;
  colorClass: string;
  badgeClass: string;
}

export const VIP_TIERS: Record<VipTierLevel, { name: string; badge: string; discountPercent: number; minDeposit: number; colorClass: string; badgeClass: string }> = {
  MEMBER: {
    name: 'Thành Viên',
    badge: 'MEMBER',
    discountPercent: 0,
    minDeposit: 0,
    colorClass: 'text-slate-400',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
  },
  SILVER: {
    name: 'VIP Bạc',
    badge: 'SILVER VIP',
    discountPercent: 2,
    minDeposit: 500000,
    colorClass: 'text-slate-200',
    badgeClass: 'bg-slate-700/80 text-white border-slate-400/50 shadow-[0_0_12px_rgba(203,213,225,0.25)]',
  },
  GOLD: {
    name: 'VIP Vàng',
    badge: 'GOLD VIP',
    discountPercent: 4,
    minDeposit: 2000000,
    colorClass: 'text-amber-400',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.25)]',
  },
  DIAMOND: {
    name: 'VIP Kim Cương',
    badge: 'DIAMOND VIP',
    discountPercent: 6,
    minDeposit: 5000000,
    colorClass: 'text-cyan-400',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.35)]',
  },
};

/**
 * Check if a product is eligible for VIP discount
 * Strictly excludes:
 * - Buff MXH
 * - Spotify
 * - Locket / Locket Gold
 * - Muse AI
 */
export function isVipDiscountApplicable(category?: string, skuOrSlug?: string, productName?: string): boolean {
  const cat = (category || '').toLowerCase();
  const id = (skuOrSlug || '').toLowerCase();
  const name = (productName || '').toLowerCase();

  // Exclude Buff MXH
  if (cat.includes('buff') || cat.includes('smm') || id.startsWith('buff-')) {
    return false;
  }

  // Exclude Spotify
  if (id.includes('spotify') || name.includes('spotify') || cat.includes('spotify')) {
    return false;
  }

  // Exclude Locket / Locket Gold
  if (id.includes('locket') || name.includes('locket') || cat.includes('locket')) {
    return false;
  }

  // Exclude Muse AI
  if (id.includes('muse') || name.includes('muse ai') || cat.includes('muse')) {
    return false;
  }

  return true;
}

/**
 * Calculate VIP Tier and progression from lifetime deposit amount
 */
export function calculateVipTier(totalDeposit: number = 0): VipTierInfo {
  const deposit = Math.max(0, Number(totalDeposit) || 0);

  if (deposit >= VIP_TIERS.DIAMOND.minDeposit) {
    return {
      tier: 'DIAMOND',
      ...VIP_TIERS.DIAMOND,
      currentDeposit: deposit,
      nextTierName: null,
      nextTierThreshold: null,
      remainingToNextTier: 0,
      progressPercent: 100,
    };
  }

  if (deposit >= VIP_TIERS.GOLD.minDeposit) {
    const nextTierThreshold = VIP_TIERS.DIAMOND.minDeposit;
    const currentTierBase = VIP_TIERS.GOLD.minDeposit;
    const progress = Math.min(100, Math.round(((deposit - currentTierBase) / (nextTierThreshold - currentTierBase)) * 100));
    return {
      tier: 'GOLD',
      ...VIP_TIERS.GOLD,
      currentDeposit: deposit,
      nextTierName: VIP_TIERS.DIAMOND.name,
      nextTierThreshold,
      remainingToNextTier: Math.max(0, nextTierThreshold - deposit),
      progressPercent: progress,
    };
  }

  if (deposit >= VIP_TIERS.SILVER.minDeposit) {
    const nextTierThreshold = VIP_TIERS.GOLD.minDeposit;
    const currentTierBase = VIP_TIERS.SILVER.minDeposit;
    const progress = Math.min(100, Math.round(((deposit - currentTierBase) / (nextTierThreshold - currentTierBase)) * 100));
    return {
      tier: 'SILVER',
      ...VIP_TIERS.SILVER,
      currentDeposit: deposit,
      nextTierName: VIP_TIERS.GOLD.name,
      nextTierThreshold,
      remainingToNextTier: Math.max(0, nextTierThreshold - deposit),
      progressPercent: progress,
    };
  }

  // Member
  const nextTierThreshold = VIP_TIERS.SILVER.minDeposit;
  const progress = Math.min(100, Math.round((deposit / nextTierThreshold) * 100));
  return {
    tier: 'MEMBER',
    ...VIP_TIERS.MEMBER,
    currentDeposit: deposit,
    nextTierName: VIP_TIERS.SILVER.name,
    nextTierThreshold,
    remainingToNextTier: Math.max(0, nextTierThreshold - deposit),
    progressPercent: progress,
  };
}

/**
 * Calculate final price after VIP discount
 */
export function calculateVipPrice(
  originalPrice: number,
  discountPercent: number,
  category?: string,
  skuOrSlug?: string,
  productName?: string
): { finalPrice: number; discountAmount: number; isApplied: boolean } {
  if (discountPercent <= 0 || !isVipDiscountApplicable(category, skuOrSlug, productName)) {
    return { finalPrice: originalPrice, discountAmount: 0, isApplied: false };
  }

  const discountAmount = Math.round((originalPrice * discountPercent) / 100);
  const finalPrice = Math.max(0, originalPrice - discountAmount);

  return {
    finalPrice,
    discountAmount,
    isApplied: true,
  };
}
