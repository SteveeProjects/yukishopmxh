// ==============================================================================
// YUKI WEB V4 — WEIGHTED FAIR QUEUE (WFQ) MATHEMATICAL MODEL & AGING LOGIC
// ==============================================================================

export const WFQ_CONFIG = {
  WEIGHT_SVIP: 50,
  WEIGHT_VIP: 30,
  WEIGHT_REGULAR: 10,
  AGING_FACTOR_PER_MINUTE: 3, // Each minute of waiting adds +3 points to priority
  STARVATION_THRESHOLD_MINUTES: 15, // Beyond 15 min, Regular overtakes fresh VIP/SVIP
  JOB_LEASE_TIMEOUT_SECONDS: 120, // 2 minutes auto-reclaim on worker crash
  WORKER_HEARTBEAT_INTERVAL_MS: 15000, // 15 seconds
  TARGET_WORKERS_COUNT: 5,
};

/**
 * Calculates the dynamic effective priority score for any queued job.
 * Ensures strict fairness while honoring paid tier priority.
 */
export function calculateEffectivePriority(
  baseTierWeight: number,
  waitingSeconds: number,
  agingFactor: number = WFQ_CONFIG.AGING_FACTOR_PER_MINUTE
): number {
  const waitingMinutes = Math.floor(waitingSeconds / 60);
  return baseTierWeight + waitingMinutes * agingFactor;
}

/**
 * Validates whether a Regular job has aged enough to surpass a fresh SVIP job.
 * Example:
 * Fresh SVIP: 50 points
 * Regular at 14 minutes: 10 + (14 * 3) = 52 points -> Prioritized over fresh SVIP!
 */
export function isRegularJobAgedOverSvip(waitingMinutes: number): boolean {
  const regularScore = calculateEffectivePriority(
    WFQ_CONFIG.WEIGHT_REGULAR,
    waitingMinutes * 60
  );
  return regularScore > WFQ_CONFIG.WEIGHT_SVIP;
}
