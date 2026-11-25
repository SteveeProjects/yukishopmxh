import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { POST as catalogPost, PUT as catalogPut } from '@/app/api/admin/catalog/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  if (!(await verifyAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized. Yêu cầu quyền Quản Trị Viên.' }, { status: 401 });
  }
  const cloned = req.clone();
  const body = await cloned.json().catch(() => ({}));

  if (body.sku || body.id) {
    return catalogPut(req as any);
  }
  return catalogPost(req as any);
}
