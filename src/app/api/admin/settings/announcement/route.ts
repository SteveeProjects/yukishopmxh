import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { serverStore } from '@/lib/server-store';
import { setSiteSettings, setSystemSetting } from '@/lib/system-settings';
import type { AnnouncementPopupConfig } from '@/types/settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    // 1. Authorize admin safely
    const isAdmin = await verifyAdminRequest();

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Chỉ Quản trị viên Yuki mới có quyền cập nhật cấu hình thông báo.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const nowISO = new Date().toISOString();

    let updatedSystemConfig = serverStore.getSystemConfig();
    if (body.systemConfig && typeof body.systemConfig === 'object') {
      const sc = body.systemConfig;
      updatedSystemConfig = serverStore.updateSystemConfig({
        ...(sc.sleep_mode !== undefined ? { sleep_mode: Boolean(sc.sleep_mode) } : {}),
        ...(sc.sleep_message !== undefined ? { sleep_message: String(sc.sleep_message).trim() } : {}),
        ...(sc.cashback_rate !== undefined ? { cashback_rate: Math.max(0, Math.min(0.2, Number(sc.cashback_rate))) } : {}),
        ...(sc.cashback_min_order !== undefined
          ? { cashback_min_order: Math.max(0, Number(sc.cashback_min_order)) }
          : {}),
        ...(sc.cashback_min_redeem !== undefined
          ? { cashback_min_redeem: Math.max(1000, Number(sc.cashback_min_redeem)) }
          : {}),
        ...(sc.affiliate_rate !== undefined
          ? { affiliate_rate: Math.max(0, Math.min(0.3, Number(sc.affiliate_rate))) }
          : {}),
      });

      // Persist to Supabase PostgreSQL system_settings immediately!
      await setSiteSettings(updatedSystemConfig);
    }

    const isSystemConfigOnly =
      Boolean(body.systemConfig) &&
      body.is_active === undefined &&
      body.banner_active === undefined &&
      body.title === undefined &&
      body.banner_text === undefined;

    let updated = serverStore.getAnnouncementConfig();
    if (!isSystemConfigOnly) {
      const partialConfig: Partial<AnnouncementPopupConfig> = {
        is_active: Boolean(body.is_active),
        banner_active: Boolean(body.banner_active),
        title: String(body.title || 'Thông Báo Hệ Thống YukiShopMXH').trim(),
        content: String(body.content || '').trim(),
        cta_text: String(body.cta_text || 'Tham Gia Kênh Telegram').trim(),
        cta_link: String(body.cta_link || 'https://t.me/YukiIsMe2311').trim(),
        support_telegram_url: String(
          body.support_telegram_url || body.cta_link || 'https://t.me/YukiIsMe2311'
        ).trim(),
        banner_text: String(body.banner_text || '').trim(),
        updated_at: nowISO,
      };

      // 2. Update local store
      updated = serverStore.updateAnnouncementConfig(partialConfig);

      // 3. Persist to Supabase PostgreSQL system_settings immediately!
      await setSystemSetting('announcement_popup', updated);
    }

    return NextResponse.json({
      success: true,
      message: isSystemConfigOnly
        ? 'Cập nhật cấu hình vận hành (Sleep Mode) thành công và đã lưu bền vững vào Supabase!'
        : 'Cập nhật cấu hình thông báo & popup thành công và đã lưu bền vững vào Supabase!',
      config: updated,
      systemConfig: updatedSystemConfig,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[admin/settings/announcement error]:', err);
    return NextResponse.json(
      { success: false, error: 'Lỗi máy chủ: ' + err.message },
      { status: 500 }
    );
  }
}
