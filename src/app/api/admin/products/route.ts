import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { GET as catalogGet, POST as catalogPost, PUT as catalogPut, DELETE as catalogDelete } from '@/app/api/admin/catalog/route';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  if (!(await verifyAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized. Yêu cầu quyền Quản Trị Viên.' }, { status: 401 });
  }
  return catalogGet();
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized. Yêu cầu quyền Quản Trị Viên.' }, { status: 401 });
  }
  return catalogPost(req);
}

export async function PUT(req: NextRequest) {
  if (!(await verifyAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized. Yêu cầu quyền Quản Trị Viên.' }, { status: 401 });
  }
  return catalogPut(req);
}

export async function DELETE(req: NextRequest) {
  if (!(await verifyAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized. Yêu cầu quyền Quản Trị Viên.' }, { status: 401 });
  }
  return catalogDelete(req);
}
