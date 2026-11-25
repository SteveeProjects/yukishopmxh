// ==============================================================================
// YUKISHOPMXH — NEXT.JS APPLICATION INSTRUMENTATION
// Automatically ensures DB readiness & 2-way Telegram webhooks on production start
// ==============================================================================

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const isProductionDeploy =
      process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'production';

    if (isProductionDeploy) {
      // Non-blocking background sync so cold start never stalls
      Promise.all([
        import('@/lib/autoMigrate').then((m) => m.ensureDatabaseReady().catch(() => {})),
        import('@/lib/telegram/sync-service').then(async (m) => {
          const origin = m.resolvePublicOrigin();
          if (origin.startsWith('https://')) {
            await m.syncTelegramBotsTwoWay({
              originUrl: origin,
              registerWebhook: true,
              syncCommands: true,
            }).catch(() => {});
          }
        }),
      ]).catch(() => {});
    }
  }
}
