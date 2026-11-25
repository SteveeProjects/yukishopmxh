import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { serverStore } from '@/lib/server-store';
import { sanitizePlainText } from '@/lib/security-sanitize';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const isAdmin = await verifyAdminRequest();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Quyền truy cập bị từ chối (Admin required).' }, { status: 403 });
    }
    const categories = serverStore.loadCategories();
    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await verifyAdminRequest();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Quyền truy cập bị từ chối (Admin required).' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const newCat = serverStore.createCategory({
      name: sanitizePlainText(body.name, 80),
      description: sanitizePlainText(body.description, 240),
      icon: sanitizePlainText(body.icon || 'Folder', 60),
    });

    return NextResponse.json({
      success: true,
      category: newCat,
      categories: serverStore.loadCategories(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const isAdmin = await verifyAdminRequest();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Quyền truy cập bị từ chối (Admin required).' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const id = sanitizePlainText(body.id, 80);
    const name = sanitizePlainText(body.name, 80);
    const description =
      body.description !== undefined ? sanitizePlainText(body.description, 240) : undefined;

    if (!id || !name) {
      return NextResponse.json({ error: 'Thiếu ID hoặc tên danh mục mới.' }, { status: 400 });
    }

    const updated = serverStore.updateCategory(id, { name, description });
    if (!updated) {
      return NextResponse.json({ error: 'Không tìm thấy danh mục cần sửa.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      category: updated,
      categories: serverStore.loadCategories(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const isAdmin = await verifyAdminRequest();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Quyền truy cập bị từ chối (Admin required).' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const id = String(searchParams.get('id') || body.id || '').trim();

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID danh mục cần xóa.' }, { status: 400 });
    }

    const deleted = serverStore.deleteCategory(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Không tìm thấy danh mục cần xóa.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      categories: serverStore.loadCategories(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
