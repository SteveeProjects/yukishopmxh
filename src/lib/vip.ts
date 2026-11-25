export type VipTierType = 'MEMBER' | 'SILVER' | 'GOLD' | 'DIAMOND';

export interface VipTierInfo {
  tier: VipTierType;
  title: string;
  badge: string;
  discountPercent: number;
  minDeposit: number;
  color: string;
}

export const VIP_TIERS: Record<VipTierType, VipTierInfo> = {
  MEMBER: {
    tier: 'MEMBER',
    title: 'Thành Viên',
    badge: 'MEMBER',
    discountPercent: 0,
    minDeposit: 0,
    color: 'text-slate-400 bg-slate-800/80 border-slate-700',
  },
  SILVER: {
    tier: 'SILVER',
    title: 'VIP Bạc',
    badge: 'SILVER VIP',
    discountPercent: 2,
    minDeposit: 500000,
    color: 'text-slate-200 bg-slate-700/60 border-slate-400',
  },
  GOLD: {
    tier: 'GOLD',
    title: 'VIP Vàng',
    badge: 'GOLD VIP',
    discountPercent: 4,
    minDeposit: 2000000,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  DIAMOND: {
    tier: 'DIAMOND',
    title: 'VIP Kim Cương',
    badge: 'DIAMOND VIP',
    discountPercent: 6,
    minDeposit: 5000000,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/40 shadow-sm',
  },
};

/**
 * Calculates user VIP Tier from their total deposited amount
 */
export function calculateVipTier(totalDeposited: number): VipTierInfo {
  const amt = Number(totalDeposited) || 0;
  if (amt >= 5000000) return VIP_TIERS.DIAMOND;
  if (amt >= 2000000) return VIP_TIERS.GOLD;
  if (amt >= 500000) return VIP_TIERS.SILVER;
  return VIP_TIERS.MEMBER;
}

/**
 * Check if VIP discount is applicable to the item
 * Strictly 0% for: Buff MXH, Spotify, Locket, Muse AI
 */
export function isVipDiscountApplicable(item: { sku?: string; name?: string; serviceType?: string; category?: string }): boolean {
  const text = `${item.sku || ''} ${item.name || ''} ${item.serviceType || ''} ${item.category || ''}`.toLowerCase();
  if (
    text.includes('buff') ||
    text.includes('spotify') ||
    text.includes('locket') ||
    text.includes('muse')
  ) {
    return false;
  }
  return true;
}
