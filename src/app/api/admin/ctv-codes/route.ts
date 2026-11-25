import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { serverStore } from '@/lib/server-store';
import { queryPostgres } from '@/lib/autoMigrate';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { findDbUserByIdOrIdentifier } from '@/lib/db-persistence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const isAdmin = await verifyAdminRequest();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let withdrawals = serverStore.loadAffiliateWithdrawals();
  try {
    const pgW = await queryPostgres(
      `SELECT * FROM public.affiliate_withdrawals ORDER BY created_at DESC LIMIT 100`
    );
    if (pgW?.rows?.length) {
      withdrawals = pgW.rows.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        username: r.username || r.user_id,
        amount: Number(r.amount || 0),
        fee: Number(r.fee || 0),
        netAmount: Number(r.net_amount ?? r.amount ?? 0),
        bankName: r.bank_name,
        bankAccount: r.bank_account,
        accountHolder: r.account_holder,
        contact: r.contact || '',
        qrCodeUrl: r.qr_code_url || '',
        status: r.status || 'pending',
        adminNote: r.admin_note,
        createdAt: r.created_at,
        processedAt: r.processed_at,
      }));
    }
  } catch {}

  const users = serverStore.loadUsers().map((u) => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    email: u.email,
    affiliateBalance: Number(u.affiliateBalance || 0),
    cashbackPoints: Number(u.cashbackPoints || 0),
  }));

  return NextResponse.json({
    success: true,
    codes: serverStore.loadPartnerCodes(),
    withdrawals,
    users,
  });
}

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdminRequest();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const code = String(body.code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  const ownerIdentifier = String(body.ownerIdentifier || body.ownerUserId || '').trim();
  const discountPercent = Number(body.discountPercent ?? 3);
  const commissionPercent = Number(body.commissionPercent ?? 5);
  const maxUses = body.maxUses ? Number(body.maxUses) : undefined;
  const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;

  if (!code || code.length < 3) {
    return NextResponse.json({ error: 'Mã CTV phải có ít nhất 3 ký tự (chữ/số).' }, { status: 400 });
  }

  const owner = await findDbUserByIdOrIdentifier(ownerIdentifier);
  if (!owner) {
    return NextResponse.json(
      { error: `Không tìm thấy tài khoản CTV "${ownerIdentifier}". Nhập đúng username, email hoặc ID.` },
      { status: 404 }
    );
  }

  const saved = serverStore.upsertPartnerCode({
    code,
    ownerUserId: owner.id,
    ownerUsername: owner.username || owner.fullName,
    discountPercent,
    commissionPercent,
    maxUses,
    isActive,
  });

  return NextResponse.json({ success: true, code: saved });
}

export async function PATCH(req: NextRequest) {
  const isAdmin = await verifyAdminRequest();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const withdrawalId = String(body.withdrawalId || body.id || '').trim();
  const action = String(body.action || '').toLowerCase(); // 'approve' | 'reject'

  if (!withdrawalId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Thiếu ID hoặc hành động xử lý rút tiền.' }, { status: 400 });
  }

  const sbAdmin = getSupabaseAdmin();
  let wd: any = serverStore.findAffiliateWithdrawalById(withdrawalId);
  if (!wd) {
    const pgW = await queryPostgres(`SELECT * FROM public.affiliate_withdrawals WHERE id::text = $1 LIMIT 1`, [withdrawalId]).catch(() => null);
    if (pgW?.rows?.[0]) {
      const r = pgW.rows[0];
      wd = { id: r.id, userId: r.user_id, amount: Number(r.amount || 0), status: r.status };
    } else if (sbAdmin && /^[0-9a-f-]{36}$/i.test(withdrawalId)) {
      const { data } = await sbAdmin.from('affiliate_withdrawals').select('*').eq('id', withdrawalId).maybeSingle();
      if (data) wd = { id: data.id, userId: data.user_id, amount: Number(data.amount || 0), status: data.status };
    }
  }

  if (!wd) {
    return NextResponse.json({ error: 'Không tìm thấy yêu cầu rút tiền.' }, { status: 404 });
  }
  if (wd.status !== 'pending') {
    return NextResponse.json({ error: 'Yêu cầu rút tiền đã được xử lý trước đó.' }, { status: 409 });
  }

  const nextStatus = action === 'approve' ? 'approved' : 'rejected';
  let transitionedInDb = false;

  const pgTransition = await queryPostgres(
    `UPDATE public.affiliate_withdrawals
     SET status = $1, processed_at = NOW(), updated_at = NOW()
     WHERE id::text = $2 AND status = 'pending'
     RETURNING id`,
    [nextStatus, withdrawalId]
  ).catch(() => null);
  if (pgTransition?.rows && pgTransition.rows.length > 0) {
    transitionedInDb = true;
  } else if (pgTransition !== null) {
    return NextResponse.json({ error: 'Yêu cầu rút tiền đã được xử lý trước đó.' }, { status: 409 });
  }

  if (!transitionedInDb && sbAdmin && /^[0-9a-f-]{36}$/i.test(withdrawalId)) {
    try {
      const { data: sbClaim } = await sbAdmin
        .from('affiliate_withdrawals')
        .update({ status: nextStatus, processed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', withdrawalId)
        .eq('status', 'pending')
        .select('id');
      if (sbClaim && sbClaim.length > 0) {
        transitionedInDb = true;
      } else if (Array.isArray(sbClaim)) {
        return NextResponse.json({ error: 'Yêu cầu rút tiền đã được xử lý trước đó.' }, { status: 409 });
      }
    } catch {}
  }

  serverStore.updateAffiliateWithdrawalStatus(
    withdrawalId,
    nextStatus,
    action === 'reject' ? 'Admin từ chối trên Web' : 'Admin đã duyệt chuyển khoản'
  );

  if (action === 'reject') {
    const refundAmt = Math.max(0, Number(wd.amount || wd.netAmount || 0));
    serverStore.adjustAffiliateBalance(wd.userId, refundAmt, 0);
    await queryPostgres(
      `UPDATE public.profiles SET affiliate_balance = COALESCE(affiliate_balance, 0) + $1, updated_at = NOW() WHERE id::text = $2`,
      [refundAmt, wd.userId]
    ).catch(() => {});
  }

  return NextResponse.json({
    success: true,
    status: nextStatus,
    message:
      action === 'approve'
        ? 'Đã đánh dấu duyệt & chuyển tiền thành công!'
        : 'Đã từ chối yêu cầu & hoàn lại số dư hoa hồng về tài khoản khách.',
  });
}

export async function DELETE(req: NextRequest) {
  const isAdmin = await verifyAdminRequest();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const body = await req.json().catch(() => ({}));
  const code = String(searchParams.get('code') || body.code || '').trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ error: 'Thiếu mã CTV cần xóa.' }, { status: 400 });
  }

  const deleted = serverStore.deletePartnerCode(code);
  return NextResponse.json({ success: deleted });
}
