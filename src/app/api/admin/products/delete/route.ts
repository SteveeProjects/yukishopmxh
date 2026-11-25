import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { DELETE as catalogDelete } from '@/app/api/admin/catalog/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  if (!(await verifyAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized. Yêu cầu quyền Quản Trị Viên.' }, { status: 401 });
  }
  return catalogDelete(req as any);
}

export async function DELETE(req: Request) {
  if (!(await verifyAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized. Yêu cầu quyền Quản Trị Viên.' }, { status: 401 });
  }
  return catalogDelete(req as any);
}
