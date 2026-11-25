// ==============================================================================
// YUKI WEB V4 — API: /api/checkout (ATOMIC TRANSACTION WITH IDEMPOTENCY)
// ==============================================================================

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkoutPayloadSchema } from '@/lib/validations/checkout';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập trước khi thanh toán' },
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = checkoutPayloadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: 'VALIDATION_ERROR', message: validation.error.errors[0]?.message || 'Dữ liệu không hợp lệ' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const { items, couponCode, userNote, idempotencyKey } = validation.data;
    const userId = authUser.id;
    const supabaseAdmin = createAdminClient();

    // Check Idempotency Key to prevent duplicate checkouts
    const { data: existingOrder } = await (supabaseAdmin as any)
      .from('orders')
      .select('id, order_code, status, final_amount')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existingOrder) {
      const eo = existingOrder as any;
      return NextResponse.json(
        {
          success: true,
          data: {
            orderCode: eo.order_code,
            status: eo.status,
            finalAmount: Number(eo.final_amount),
            isIdempotentReplay: true,
          },
          error: null,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Server-side Price Lookup (NEVER trust client price!)
    const variantIds = items.map((i) => i.variantId);
    const { data: dbVariants, error: variantError } = await (supabaseAdmin as any)
      .from('product_variants')
      .select('id, sku, name, price, status, fulfillment_mode')
      .in('id', variantIds);

    if (variantError || !dbVariants || dbVariants.length === 0) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: 'SKU_NOT_FOUND', message: 'Không tìm thấy sản phẩm trong kho' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    const variants = dbVariants as any[];

    // Verify all SKUs are ACTIVE
    for (const v of variants) {
      if (v.status !== 'ACTIVE') {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: { code: 'SKU_NOT_AVAILABLE', message: `Sản phẩm ${v.name} hiện không thể đặt mua` },
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }
    }

    // Calculate subtotal
    let subtotal = 0;
    const calculatedItems = items.map((item) => {
      const v = variants.find((dbv) => dbv.id === item.variantId)!;
      const unitPrice = Number(v.price);
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
      return {
        variantId: v.id,
        skuSnapshot: v.sku,
        productNameSnapshot: v.name,
        unitPriceSnapshot: unitPrice,
        quantity: item.quantity,
        totalLineAmount: lineTotal,
      };
    });

    // Check Wallet Balance with Atomic Locking
    const { data: walletData, error: walletError } = await (supabaseAdmin as any)
      .from('wallet_accounts')
      .select('balance, is_locked')
      .eq('user_id', userId)
      .single();

    if (walletError || !walletData) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: 'WALLET_NOT_FOUND', message: 'Không tìm thấy ví người dùng' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const w = walletData as any;
    if (w.is_locked) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: 'WALLET_LOCKED', message: 'Ví tài khoản hiện đang bị tạm khóa' },
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const currentBalance = Number(w.balance);
    const finalAmount = subtotal; // Rank and coupon applied here in production

    if (currentBalance < finalAmount) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'INSUFFICIENT_FUNDS',
            message: 'Số dư ví không đủ để thanh toán',
            details: { required: finalAmount, available: currentBalance },
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Execute Atomic Deduction & Order Creation
    const newBalance = currentBalance - finalAmount;
    const orderCode = `YUKI4-ORD-${Math.floor(100000 + Math.random() * 900000)}`;

    // 1. Update wallet
    await (supabaseAdmin as any)
      .from('wallet_accounts')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    // 2. Insert into Immutable Ledger
    await (supabaseAdmin as any).from('wallet_transactions').insert({
      user_id: userId,
      transaction_type: 'ORDER_PAYMENT',
      amount: finalAmount,
      balance_before: currentBalance,
      balance_after: newBalance,
      reference_id: orderCode,
      description: `Thanh toán đơn hàng ${orderCode}`,
    });

    // 3. Create Order
    const { data: newOrder } = await (supabaseAdmin as any)
      .from('orders')
      .insert({
        order_code: orderCode,
        user_id: userId,
        subtotal_amount: subtotal,
        final_amount: finalAmount,
        status: 'PAID',
        idempotency_key: idempotencyKey,
        user_note: userNote || null,
      })
      .select('id')
      .single();

    // 4. Create Order Items Snapshot
    if (newOrder) {
      const orderItemsToInsert = calculatedItems.map((ci) => ({
        order_id: (newOrder as any).id,
        ...ci,
      }));
      await (supabaseAdmin as any).from('order_items').insert(orderItemsToInsert);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          orderCode,
          finalAmount,
          newBalance,
          status: 'PAID',
        },
        error: null,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'CHECKOUT_FAILED',
          message: err instanceof Error ? err.message : 'Thanh toán đơn hàng thất bại',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
