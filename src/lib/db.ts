// ==============================================================================
// YUKISHOPMXH — UNIFIED DATABASE LAYER (POSTGRESQL & SUPABASE LAZY INIT)
// Re-exports functions from autoMigrate.ts and provides unified DB helpers
// ==============================================================================

import {
  ensureDatabaseReady,
  getPostgresConnectionString,
  getPostgresPool,
  isDatabaseConfigured,
  queryPostgres,
} from '@/lib/autoMigrate';

export {
  ensureDatabaseReady,
  getPostgresConnectionString,
  getPostgresPool,
  isDatabaseConfigured,
  queryPostgres,
};

/**
 * Backward compatibility alias for autoEnsureTables
 */
export async function autoEnsureTables(): Promise<boolean> {
  return await ensureDatabaseReady();
}
