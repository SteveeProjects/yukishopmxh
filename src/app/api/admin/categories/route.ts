import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { serverStore } from '@/lib/server-store';
import { sanitizePlainText } from '@/lib/security-sanitize';
import { ensureDatabaseReady, isDatabaseConfigured, queryPostgres } from '@/lib/autoMigrate';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isUuid } from '@/lib/supabase/env';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function toSlug(val: string): string {
  return (
    val
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `cat-${Date.now()}`
  );
}

async function fetchAllCategories() {
  await ensureDatabaseReady().catch(() => {});
  try {
    const pg = await queryPostgres(
      `SELECT id::text AS id, name, slug, COALESCE(icon, 'Folder') AS icon, COALESCE(description, '') AS description, COALESCE(sort_order, 0) AS sort_order
       FROM public.categories
       ORDER BY sort_order ASC, name ASC`
    );
    if (pg?.rows?.length) {
      return pg.rows;
    }
  } catch {}

  try {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data } = await (sb as any)
        .from('categories')
        .select('id, name, slug, icon, description, sort_order')
        .order('sort_order', { ascending: true });
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch {}

  return serverStore.loadCategories();
}

export async function GET() {
  try {
    const isAdmin = await verifyAdminRequest();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Quyền truy cập bị từ chối (Admin required).' }, { status: 403 });
    }
    const categories = await fetchAllCategories();
    return NextResponse.json(
      { success: true, categories },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
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
    const name = sanitizePlainText(body.name, 80);
    const description = sanitizePlainText(body.description || '', 240);
    const icon = sanitizePlainText(body.icon || 'Folder', 60) || 'Folder';
    const sort_order = Number.isFinite(Number(body.sort_order)) ? Math.max(0, Math.floor(Number(body.sort_order))) : 0;

    if (!name) {
      return NextResponse.json({ error: 'Tên thư mục / danh mục không được để trống.' }, { status: 400 });
    }

    await ensureDatabaseReady().catch(() => {});
    const slug = toSlug(name);
    let dbOk = false;

    try {
      const pgRes = await queryPostgres(
        `INSERT INTO public.categories (id, name, slug, icon, description, sort_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         ON CONFLICT (name) DO NOTHING
         RETURNING id::text AS id, name, slug, icon, description, sort_order`,
        [crypto.randomUUID(), name, slug, icon, description, sort_order]
      );
      if (pgRes && !pgRes.rows?.length) {
        return NextResponse.json({ error: `Thư mục "${name}" đã tồn tại.` }, { status: 409 });
      }
      if (pgRes !== null) dbOk = true;
    } catch (pgErr: any) {
      if (String(pgErr?.code || '') === '23505') {
        return NextResponse.json({ error: `Thư mục "${name}" đã tồn tại.` }, { status: 409 });
      }
    }

    if (!dbOk) {
      try {
        const sb = getSupabaseAdmin();
        if (sb) {
          const { error } = await (sb as any)
            .from('categories')
            .insert({ name, slug, icon, description, sort_order });
          if (error) {
            if (error.code === '23505') {
              return NextResponse.json({ error: `Thư mục "${name}" đã tồn tại.` }, { status: 409 });
            }
          } else {
            dbOk = true;
          }
        }
      } catch {}
    }

    if (isDatabaseConfigured() && !dbOk) {
      return NextResponse.json({ error: 'Không thể lưu thư mục mới vào Database.' }, { status: 500 });
    }

    let createdLocal: any = null;
    try {
      createdLocal = serverStore.createCategory({ name, description, icon, slug });
    } catch {}

    const categories = await fetchAllCategories();
    return NextResponse.json({
      success: true,
      category: createdLocal || categories.find((c: any) => c.name === name),
      categories,
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
    const oldNameInput = sanitizePlainText(body.oldName || '', 80);
    const icon = body.icon !== undefined ? sanitizePlainText(body.icon, 60) : undefined;
    const sort_order = body.sort_order !== undefined ? Math.max(0, Math.floor(Number(body.sort_order))) : undefined;
    const description =
      body.description !== undefined ? sanitizePlainText(body.description, 240) : undefined;

    if (!id || !name) {
      return NextResponse.json({ error: 'Thiếu ID hoặc tên thư mục mới.' }, { status: 400 });
    }

    await ensureDatabaseReady().catch(() => {});
    const slug = toSlug(name);
    let oldName = oldNameInput;
    let dbOk = false;

    try {
      const existing = await queryPostgres(
        `SELECT id::text AS id, name FROM public.categories WHERE id::text = $1 OR slug = $1 OR name = $1 LIMIT 1`,
        [id]
      );
      if (existing?.rows?.[0]) {
        oldName = oldName || existing.rows[0].name;
      }

      const pgUpd = await queryPostgres(
        `UPDATE public.categories
         SET name = $1,
             slug = $2,
             icon = COALESCE($3, icon),
             description = COALESCE($4, description),
             sort_order = COALESCE($5, sort_order),
             updated_at = NOW()
         WHERE id::text = $6 OR slug = $6 OR name = $6
         RETURNING id::text AS id, name, slug, icon, description, sort_order`,
        [name, slug, icon ?? null, description ?? null, sort_order ?? null, id]
      );
      if (pgUpd?.rows?.length) {
        dbOk = true;
        if (oldName && oldName !== name) {
          await queryPostgres(
            `UPDATE public.products SET category = $1, updated_at = NOW() WHERE category = $2`,
            [name, oldName]
          ).catch(() => {});
        }
      }
    } catch (pgErr: any) {
      if (String(pgErr?.code || '') === '23505') {
        return NextResponse.json({ error: `Thư mục "${name}" đã tồn tại.` }, { status: 409 });
      }
    }

    try {
      const sb = getSupabaseAdmin();
      if (sb) {
        const patch: any = { name, slug, updated_at: new Date().toISOString() };
        if (icon !== undefined) patch.icon = icon;
        if (description !== undefined) patch.description = description;
        if (sort_order !== undefined) patch.sort_order = sort_order;
        const { error } = isUuid(id)
          ? await (sb as any).from('categories').update(patch).eq('id', id)
          : await (sb as any).from('categories').update(patch).eq('slug', id);
        if (!error) {
          dbOk = true;
          if (oldName && oldName !== name) {
            await sb.from('products').update({ category: name }).eq('category', oldName);
          }
        }
      }
    } catch {}

    let updatedLocal: any = null;
    try {
      updatedLocal = serverStore.updateCategory(id, { name, description });
    } catch {}

    if (isDatabaseConfigured() && !dbOk && !updatedLocal) {
      return NextResponse.json({ error: 'Không tìm thấy hoặc không thể cập nhật thư mục.' }, { status: 404 });
    }

    const categories = await fetchAllCategories();
    return NextResponse.json({
      success: true,
      category: updatedLocal || categories.find((c: any) => c.name === name),
      categories,
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
      return NextResponse.json({ error: 'Thiếu ID thư mục cần xóa.' }, { status: 400 });
    }

    await ensureDatabaseReady().catch(() => {});
    let dbOk = false;

    try {
      const pgDel = await queryPostgres(
        `DELETE FROM public.categories WHERE id::text = $1 OR slug = $1 OR name = $1`,
        [id]
      );
      if (pgDel !== null) dbOk = true;
    } catch {}

    try {
      const sb = getSupabaseAdmin();
      if (sb) {
        const { error } = isUuid(id)
          ? await (sb as any).from('categories').delete().eq('id', id)
          : await (sb as any).from('categories').delete().eq('slug', id);
        if (!error) dbOk = true;
      }
    } catch {}

    const deletedLocal = serverStore.deleteCategory(id);
    if (isDatabaseConfigured() && !dbOk && !deletedLocal) {
      return NextResponse.json({ error: 'Không tìm thấy thư mục cần xóa trong Database.' }, { status: 404 });
    }

    const categories = await fetchAllCategories();
    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
