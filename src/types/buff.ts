// ==============================================================================
// YUKI WEB V4 — BUFF MXH & SERVICE TYPES
// ==============================================================================

export type SocialPlatform = 'YOUTUBE' | 'TIKTOK' | 'FACEBOOK' | 'INSTAGRAM' | 'TELEGRAM';

export type BuffRequestStatus =
  | 'PENDING_QUOTE'
  | 'QUOTED'
  | 'ACCEPTED_PAID'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export interface BuffServiceReference {
  code: string;
  platform: SocialPlatform;
  name: string;
  description: string;
  unit: string;
  isLegalOnly: true;
}

export interface BuffRequest {
  id: string;
  userId: string;
  platform: SocialPlatform;
  serviceCode: string;
  targetUrl: string;
  quantity: number;
  userNotes: string | null;
  quotedPrice: number | null;
  totalQuoteAmount: number | null;
  status: BuffRequestStatus;
  adminNotes: string | null;
  orderId: string | null;
  createdAt: string;
  updatedAt: string;
}
