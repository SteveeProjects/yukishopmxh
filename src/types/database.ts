// ==============================================================================
// YUKI WEB V4 — SUPABASE DATABASE TYPE DEFINITIONS
// ==============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          telegram_username: string | null;
          phone_number: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          telegram_username?: string | null;
          phone_number?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
          telegram_username?: string | null;
          phone_number?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: 'USER' | 'ADMIN';
          assigned_by: string | null;
          created_at: string;
        };
      };
      wallet_accounts: {
        Row: {
          user_id: string;
          balance: number;
          currency: string;
          is_locked: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      wallet_transactions: {
        Row: {
          id: string;
          user_id: string;
          transaction_type: 'TOPUP' | 'ORDER_PAYMENT' | 'REFUND' | 'ADMIN_ADJUSTMENT';
          amount: number;
          balance_before: number;
          balance_after: number;
          reference_id: string;
          description: string;
          metadata: Json;
          created_at: string;
        };
      };
      topup_requests: {
        Row: {
          id: string;
          user_id: string;
          reference_code: string;
          amount: number;
          bank_name: string;
          account_number: string;
          account_name: string;
          status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
          admin_note: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          expires_at: string;
          created_at: string;
        };
      };
      orders: {
        Row: {
          id: string;
          order_code: string;
          user_id: string;
          subtotal_amount: number;
          coupon_discount_amount: number;
          rank_discount_amount: number;
          final_amount: number;
          status: 'PENDING_PAYMENT' | 'PAID' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'EXPIRED' | 'REFUND_PENDING' | 'REFUNDED';
          coupon_id: string | null;
          user_note: string | null;
          admin_note: string | null;
          idempotency_key: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      queue_jobs: {
        Row: {
          id: string;
          user_id: string;
          job_type: string;
          payload: Json;
          tier_priority: number;
          effective_priority: number;
          status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
          retry_count: number;
          max_retries: number;
          locked_by_worker: string | null;
          locked_until: string | null;
          last_error: string | null;
          result_data: Json | null;
          created_at: string;
          completed_at: string | null;
        };
      };
    };
  };
}
