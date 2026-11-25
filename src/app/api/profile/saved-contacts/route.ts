import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-auth';
import { serverStore } from '@/lib/server-store';
import { sanitizePlainText, sanitizeUrlInput } from '@/lib/security-sanitize';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.id) {
    return NextResponse.json({ success: true, profiles: [] });
  }

  return NextResponse.json({
    success: true,
    profiles: serverStore.getSavedProfiles(sessionUser.id),
  });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.id) {
    return NextResponse.json({ error: 'Vui lòng đăng nhập để lưu hồ sơ đặt nhanh.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const label = sanitizePlainText(body.label, 80);
  const email = sanitizePlainText(body.email, 160);
  const socialLink = sanitizeUrlInput(body.socialLink, 500);
  const telegram = sanitizePlainText(body.telegram, 80);
  const note = sanitizePlainText(body.note, 300);
  const id = body.id ? sanitizePlainText(body.id, 64) : undefined;

  if (!label) {
    return NextResponse.json({ error: 'Vui lòng nhập tên gợi nhớ cho hồ sơ.' }, { status: 400 });
  }

  if (!email && !socialLink && !telegram) {
    return NextResponse.json(
      { error: 'Cần nhập ít nhất 1 thông tin (Email / Link MXH / Telegram).' },
      { status: 400 }
    );
  }

  const profiles = serverStore.saveUserProfilePreset(sessionUser.id, {
    id,
    label,
    email,
    socialLink,
    telegram,
    note,
  });

  return NextResponse.json({ success: true, profiles });
}

export async function DELETE(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const body = await req.json().catch(() => ({}));
  const id = String(searchParams.get('id') || body.id || '').trim();

  if (!id) {
    return NextResponse.json({ error: 'Thiếu ID hồ sơ cần xóa.' }, { status: 400 });
  }

  const profiles = serverStore.deleteUserProfilePreset(sessionUser.id, id);
  return NextResponse.json({ success: true, profiles });
}
