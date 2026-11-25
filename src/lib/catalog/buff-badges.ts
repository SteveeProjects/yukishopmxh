export type BuffOriginBadge = 'Việt' | 'Tây';
export type BuffSpeedBadge = 'Tức thì' | 'Nhanh' | 'Ổn định' | 'Chậm';

export interface BuffServerOverride {
  retailPrice?: number;
  status?: 'ACTIVE' | 'HIDDEN';
  originBadge?: BuffOriginBadge;
  speedBadge?: BuffSpeedBadge;
  warrantyBadge?: string;
  note?: string;
  updatedAt?: string;
}

export interface BuffBadgeInput {
  id: number;
  name: string;
  retailPrice: number;
  minQty: number;
  maxQty: number;
  symbols?: string[];
  note?: string;
}

export interface ResolvedBuffServerMeta {
  retailPrice: number;
  status: 'ACTIVE' | 'HIDDEN';
  cleanName: string;
  originBadge: BuffOriginBadge;
  speedBadge: BuffSpeedBadge;
  warrantyBadge: string;
  isNoWarranty: boolean;
  serverNote: string;
}

export function cleanBuffText(raw?: string | null): string {
  return String(raw || '')
    .replace(/[⚡⚠️♻️🌐😡🇻🇳🔥✨📦💎🚀]/g, '')
    .replace(/\s*,\s*,+/g, ',')
    .replace(/^[,\s-]+|[,\s-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function resolveBuffServerMeta(
  srv: BuffBadgeInput,
  override?: BuffServerOverride
): ResolvedBuffServerMeta {
  const rawMeta = `${srv.name} ${srv.note || ''} ${(srv.symbols || []).join(' ')}`;

  const retailPrice =
    override?.retailPrice !== undefined && !Number.isNaN(Number(override.retailPrice))
      ? Number(override.retailPrice)
      : srv.retailPrice;

  const status: 'ACTIVE' | 'HIDDEN' =
    override?.status === 'HIDDEN' ? 'HIDDEN' : 'ACTIVE';

  const cleanName = cleanBuffText(srv.name) || srv.name;

  const originBadge: BuffOriginBadge =
    override?.originBadge === 'Việt' || override?.originBadge === 'Tây'
      ? override.originBadge
      : /🇻🇳|\bviệt\b|\bvn\b|người việt|vietnam/i.test(rawMeta)
      ? 'Việt'
      : 'Tây';

  let speedBadge: BuffSpeedBadge;
  if (
    override?.speedBadge === 'Tức thì' ||
    override?.speedBadge === 'Nhanh' ||
    override?.speedBadge === 'Ổn định' ||
    override?.speedBadge === 'Chậm'
  ) {
    speedBadge = override.speedBadge;
  } else if (/siêu tốc|tức thì|instant/i.test(rawMeta)) {
    speedBadge = 'Tức thì';
  } else if (/⚡|\bnhanh\b|\bfast\b/i.test(rawMeta)) {
    speedBadge = 'Nhanh';
  } else if (/\bchậm\b|\bslow\b|từ từ|thủ công/i.test(rawMeta)) {
    speedBadge = 'Chậm';
  } else {
    speedBadge = 'Ổn định';
  }

  let warrantyBadge: string;
  if (override?.warrantyBadge && override.warrantyBadge.trim()) {
    warrantyBadge = cleanBuffText(override.warrantyBadge);
  } else if (/⚠️|không bảo hành|\bkbh\b/i.test(rawMeta)) {
    warrantyBadge = 'KBH';
  } else if (/trọn đời|vĩnh viễn/i.test(rawMeta)) {
    warrantyBadge = 'BH Trọn đời';
  } else {
    const daysMatch = rawMeta.match(/(\d+)\s*(?:day|ngày)/i);
    if (daysMatch) {
      warrantyBadge = `BH ${daysMatch[1]} ngày`;
    } else if (/♻️|bảo hành|\bbh\b/i.test(rawMeta)) {
      warrantyBadge = 'BH 30 ngày';
    } else {
      warrantyBadge = 'KBH';
    }
  }

  const isNoWarranty =
    warrantyBadge.toUpperCase() === 'KBH' ||
    /không bảo hành/i.test(warrantyBadge);

  const serverNote =
    override?.note !== undefined
      ? cleanBuffText(override.note)
      : cleanBuffText(srv.note || '');

  return {
    retailPrice,
    status,
    cleanName,
    originBadge,
    speedBadge,
    warrantyBadge,
    isNoWarranty,
    serverNote,
  };
}
