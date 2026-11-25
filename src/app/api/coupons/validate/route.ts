import { NextRequest, NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ensureDatabaseReady, queryPostgres } from '@/lib/autoMigrate';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawCode = String(body.code || '').trim().toUpperCase();
    const orderAmount = Number(body.orderAmount ?? body.amount ?? 0);
    const applicableTo = body.applicableTo === 'BUFF' ? 'BUFF' : 'PRODUCT';
    const rawServiceType = String(body.service_type || body.serviceType || '').toUpperCase();
    const sku = String(body.sku || '').toUpperCase();
    const itemName = String(body.itemName || body.item_name || '');

    const overrides = serverStore.loadCatalogOverrides();
    const liveOverride = overrides.updatedItems?.[sku] || overrides.customItems?.find((c: any) => c.sku === sku);

    const isApiToolSms =
      sku.includes('API-TOOL-SMS') ||
      sku === 'API-TOOL-SMS-120K' ||
      sku === 'API-TOOL-SMS-150K' ||
      /API Tool SMS/i.test(itemName) ||
      liveOverride?.allow_voucher === false ||
      body.allow_voucher === false ||
      body.allowVoucher === false;

    if (isApiToolSms) {
      return NextResponse.json(
        { error: 'Sản phẩm API không áp dụng mã giảm giá.' },
        { status: 400 }
      );
    }

    if (applicableTo === 'BUFF' || rawServiceType.includes('BUFF')) {
      return NextResponse.json(
        { error: 'Giá dịch vụ Buff MXH đã được tối ưu sát giá gốc — không áp dụng mã giảm giá/Voucher.' },
        { status: 400 }
      );
    }

    if (!rawCode) {
      return NextResponse.json({ error: 'Vui lòng nhập mã giảm giá.' }, { status: 400 });
    }

    // 1. First check local store
    let coupon = serverStore.findCouponByCode(rawCode);

    // 2. Fallback to PostgreSQL public.coupons
    if (!coupon) {
      await ensureDatabaseReady().catch(() => {});
      try {
        const pgRes = await queryPostgres(
          'SELECT * FROM public.coupons WHERE UPPER(code) = $1 LIMIT 1',
          [rawCode]
        );
        if (pgRes?.rows?.[0]) {
          const dbC = pgRes.rows[0];
          coupon = {
            id: dbC.id,
            code: dbC.code.toUpperCase(),
            discount_type: dbC.discount_type,
            discount_value: Number(dbC.discount_value),
            max_discount: dbC.max_discount ? Number(dbC.max_discount) : null,
            min_order_amount: Number(dbC.min_order_amount || 0),
            usage_limit: dbC.usage_limit ? Number(dbC.usage_limit) : null,
            used_count: Number(dbC.used_count || 0),
            applicable_to: dbC.applicable_to || 'ALL',
            is_active: !!dbC.is_active,
            expires_at: dbC.expires_at || null,
            created_at: dbC.created_at,
          };
        }
      } catch (pgErr) {
        console.warn('[coupons/validate] Postgres lookup notice:', pgErr);
      }
    }

    // 3. Fallback to Supabase if not found locally
    if (!coupon) {
      try {
        const isPlaceholder = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('placeholder');
        if (!isPlaceholder && supabaseAdmin) {
          const { data: dbCoupon } = await supabaseAdmin
            .from('coupons')
            .select('*')
            .ilike('code', rawCode)
            .single();

          if (dbCoupon) {
            coupon = {
              id: dbCoupon.id,
              code: dbCoupon.code.toUpperCase(),
              discount_type: dbCoupon.discount_type,
              discount_value: Number(dbCoupon.discount_value),
              max_discount: dbCoupon.max_discount ? Number(dbCoupon.max_discount) : null,
              min_order_amount: Number(dbCoupon.min_order_amount || 0),
              usage_limit: dbCoupon.usage_limit ? Number(dbCoupon.usage_limit) : null,
              used_count: Number(dbCoupon.used_count || 0),
              applicable_to: dbCoupon.applicable_to || 'ALL',
              is_active: !!dbCoupon.is_active,
              expires_at: dbCoupon.expires_at || null,
              created_at: dbCoupon.created_at,
            };
          }
        }
      } catch (e) {
        console.warn('[coupons/validate] Supabase lookup notice:', e);
      }
    }

    if (!coupon) {
      const partner = serverStore.findPartnerCode(rawCode);
      if (partner) {
        if (!partner.isActive) {
          return NextResponse.json(
            { error: `Mã CTV "${rawCode}" hiện đang tạm khóa.` },
            { status: 400 }
          );
        }
        if (partner.maxUses && partner.usedCount >= partner.maxUses) {
          return NextResponse.json(
            { error: `Mã CTV "${rawCode}" đã hết lượt sử dụng.` },
            { status: 400 }
          );
        }
        const pct = Math.max(0, Math.min(50, Number(partner.discountPercent || 0)));
        const discount = Math.round((orderAmount * pct) / 100);
        const finalAmount = Math.max(0, orderAmount - discount);
        return NextResponse.json({
          success: true,
          isPartnerCode: true,
          coupon: {
            code: partner.code,
            discount_type: 'PERCENT',
            discount_value: pct,
            max_discount: null,
            discount_amount: discount,
            final_amount: finalAmount,
            description: `Mã CTV Partner (${partner.ownerUsername || partner.code}): Giảm ${pct}% (Không kèm hoàn điểm 2%)`,
            isPartnerCode: true,
          },
        });
      }

      return NextResponse.json(
        { error: `Mã giảm giá "${rawCode}" không tồn tại trên hệ thống.` },
        { status: 404 }
      );
    }

    // Check active
    if (!coupon.is_active) {
      return NextResponse.json(
        { error: `Mã giảm giá "${rawCode}" hiện đang tạm khóa hoặc đã ngừng hoạt động.` },
        { status: 400 }
      );
    }

    // Check expiration
    if (coupon.expires_at) {
      const expTime = new Date(coupon.expires_at).getTime();
      if (!Number.isNaN(expTime) && expTime < Date.now()) {
        return NextResponse.json(
          { error: `Mã giảm giá "${rawCode}" đã hết hạn sử dụng vào ngày ${new Date(coupon.expires_at).toLocaleDateString('vi-VN')}.` },
          { status: 400 }
        );
      }
    }

    // Check usage limit
    if (coupon.usage_limit !== null && coupon.usage_limit !== undefined && coupon.usage_limit > 0) {
      if ((coupon.used_count || 0) >= coupon.usage_limit) {
        return NextResponse.json(
          { error: `Mã giảm giá "${rawCode}" đã đạt giới hạn tối đa lượt sử dụng (${coupon.usage_limit} lượt).` },
          { status: 400 }
        );
      }
    }

    // Check applicable_to (Buff MXH is completely excluded from coupons)
    if (coupon.applicable_to === 'BUFF') {
      return NextResponse.json(
        { error: 'Giá dịch vụ Buff MXH đã được tối ưu sát giá gốc — không áp dụng mã giảm giá/Voucher.' },
        { status: 400 }
      );
    }

    // Check min_order_amount
    if (orderAmount < (coupon.min_order_amount || 0)) {
      const formatVND = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + 'đ';
      return NextResponse.json(
        {
          error: `Đơn hàng của bạn (${formatVND(orderAmount)}) chưa đạt mức tối thiểu ${formatVND(coupon.min_order_amount)} để sử dụng mã này.`,
        },
        { status: 400 }
      );
    }

    // Calculate discount
    let discount = 0;
    let desc = '';
    if (coupon.discount_type === 'PERCENT') {
      const rawPctDiscount = Math.round((orderAmount * coupon.discount_value) / 100);
      if (coupon.max_discount && coupon.max_discount > 0) {
        discount = Math.min(rawPctDiscount, coupon.max_discount);
        desc = `Giảm ${coupon.discount_value}% (Tối đa ${new Intl.NumberFormat('vi-VN').format(coupon.max_discount)}đ)`;
      } else {
        discount = rawPctDiscount;
        desc = `Giảm ${coupon.discount_value}% toàn bộ đơn`;
      }
    } else {
      discount = Math.min(coupon.discount_value, orderAmount);
      desc = `Giảm trực tiếp ${new Intl.NumberFormat('vi-VN').format(coupon.discount_value)}đ`;
    }

    const finalAmount = Math.max(0, orderAmount - discount);

    return NextResponse.json({
      success: true,
      coupon: {
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        max_discount: coupon.max_discount,
        discount_amount: discount,
        final_amount: finalAmount,
        description: desc,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi kiểm tra mã giảm giá.' }, { status: 500 });
  }
}
