import { NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';
import { getSiteSettings, getSystemSetting } from '@/lib/system-settings';
import type { AnnouncementPopupConfig } from '@/types/settings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const fallbackConfig: AnnouncementPopupConfig = serverStore.getAnnouncementConfig();
    const config = await getSystemSetting<AnnouncementPopupConfig>('announcement_popup', fallbackConfig);
    const systemConfig = await getSiteSettings();

    return NextResponse.json({
      success: true,
      data: config,
      config,
      systemConfig,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[settings/announcement GET error]:', err);
    return NextResponse.json(
      { success: false, error: 'Lỗi tải cấu hình thông báo: ' + err.message },
      { status: 500 }
    );
  }
}
