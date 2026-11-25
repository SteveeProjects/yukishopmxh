import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session-auth';
import { serverStore } from '@/lib/server-store';
import { normalizeAccountHolderName } from '@/lib/constants/vietnam-banks';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 });
    }

    const accounts = serverStore.getUserPayoutAccounts(sessionUser.id);
    return NextResponse.json({ success: true, accounts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi tải sổ tài khoản.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const bankCode = String(body.bankCode || '').trim().toUpperCase();
    const bankName = String(body.bankName || '').trim();
    const accountNumber = String(body.accountNumber || '').trim();
    const rawHolder = String(body.accountHolder || '').trim();
    const accountHolder = normalizeAccountHolderName(rawHolder);
    const contact = String(body.contact || '').trim();
    const qrCodeUrl = String(body.qrCodeUrl || '').trim();
    const isDefault = Boolean(body.isDefault);
    const id = body.id ? String(body.id) : undefined;

    if (!bankCode || !bankName) {
      return NextResponse.json({ error: 'Vui lòng chọn ngân hàng hoặc ví điện tử.' }, { status: 400 });
    }
    if (!accountNumber) {
      return NextResponse.json({ error: 'Vui lòng nhập số tài khoản hoặc số điện thoại ví.' }, { status: 400 });
    }
    if (!accountHolder) {
      return NextResponse.json({ error: 'Vui lòng nhập họ và tên chủ tài khoản.' }, { status: 400 });
    }

    const saved = serverStore.saveUserPayoutAccount(sessionUser.id, {
      id,
      bankCode,
      bankName,
      accountNumber,
      accountHolder,
      contact,
      qrCodeUrl,
      isDefault,
    });

    const accounts = serverStore.getUserPayoutAccounts(sessionUser.id);
    return NextResponse.json({
      success: true,
      account: saved,
      accounts,
      message: 'Đã lưu tài khoản nhận tiền thành công!',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi lưu tài khoản.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('id');
    if (!accountId) {
      return NextResponse.json({ error: 'Thiếu mã tài khoản cần xóa.' }, { status: 400 });
    }

    const ok = serverStore.deleteUserPayoutAccount(sessionUser.id, accountId);
    if (!ok) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản để xóa.' }, { status: 404 });
    }

    const accounts = serverStore.getUserPayoutAccounts(sessionUser.id);
    return NextResponse.json({
      success: true,
      accounts,
      message: 'Đã xóa tài khoản nhận tiền thành công.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi xóa tài khoản.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const accountId = String(body.id || '').trim();
    if (!accountId) {
      return NextResponse.json({ error: 'Thiếu mã tài khoản.' }, { status: 400 });
    }

    const ok = serverStore.setDefaultPayoutAccount(sessionUser.id, accountId);
    if (!ok) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản.' }, { status: 404 });
    }

    const accounts = serverStore.getUserPayoutAccounts(sessionUser.id);
    return NextResponse.json({
      success: true,
      accounts,
      message: 'Đã đặt làm tài khoản mặc định.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi cập nhật mặc định.' }, { status: 500 });
  }
}
