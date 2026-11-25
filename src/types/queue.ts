// ==============================================================================
// YUKI WEB V4 — QUEUE, WORKER & EXTENSIBLE SMS TYPES
// ==============================================================================

export type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type WorkerStatus = 'ONLINE' | 'BUSY' | 'OFFLINE';

export interface QueueJob<T = Record<string, unknown>> {
  id: string;
  userId: string;
  jobType: string;
  payload: T;
  tierPriority: number; // 50 (SVIP), 30 (VIP), 10 (Regular)
  effectivePriority: number;
  status: JobStatus;
  retryCount: number;
  maxRetries: number;
  lockedByWorker: string | null;
  lockedUntil: string | null;
  lastError: string | null;
  resultData?: Record<string, unknown> | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface WorkerLog {
  workerId: string;
  hostname: string | null;
  lastHeartbeat: string;
  currentJobId: string | null;
  jobsProcessedCount: number;
  status: WorkerStatus;
}

export interface DeadLetterJob {
  id: string;
  originalJobId: string;
  userId: string;
  jobType: string;
  payload: Record<string, unknown>;
  failureReason: string;
  movedAt: string;
}

// Extensible SMS Interface (Default SMS_ENABLED=false)
export interface ISmsProvider {
  name: string;
  isEnabled: boolean;
  sendSms(phoneNumber: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
  getBalance(): Promise<number>;
}
