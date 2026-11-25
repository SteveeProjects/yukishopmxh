// ==============================================================================
// YUKI WEB V4 — WALLET & FINANCIAL LEDGER TYPES
// ==============================================================================

export type LedgerTransactionType =
  | 'TOPUP'
  | 'ORDER_PAYMENT'
  | 'REFUND'
  | 'ADMIN_ADJUSTMENT';

export type TopupStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
export type RefundStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export interface WalletAccount {
  userId: string;
  balance: number; // BigInt converted to number in TS (or bigint)
  currency: 'VND';
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  transactionType: LedgerTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface TopupRequest {
  id: string;
  userId: string;
  referenceCode: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: TopupStatus;
  adminNote?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface RefundRequest {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  adminResponse?: string | null;
  processedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}
