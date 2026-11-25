import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { serverStore } from '@/lib/server-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const isAdmin = await verifyAdminRequest();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const query = String(searchParams.get('q') || '').trim().toLowerCase();
  const limit = Math.min(300, Math.max(20, Number(searchParams.get('limit') || 120)));

  let entries = serverStore.loadWalletLedger();
  if (query) {
    entries = entries.filter(
      (e) =>
        (e.userName || '').toLowerCase().includes(query) ||
        e.userId.toLowerCase().includes(query) ||
        e.referenceId.toLowerCase().includes(query) ||
        e.description.toLowerCase().includes(query)
    );
  }

  return NextResponse.json({
    success: true,
    entries: entries.slice(0, limit),
    total: entries.length,
  });
}
