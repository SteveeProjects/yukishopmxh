import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { serverStore } from '@/lib/server-store';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { queryPostgres, autoEnsureTables, isDatabaseConfigured } from '@/lib/db';
import { getTelegramBotConfig, getSystemSetting } from '@/lib/system-settings';
import { adjustUserBalance } from '@/lib/wallet-service';
import { getSessionUser } from '@/lib/session-auth';
import { sanitizePlainText, sanitizeUrlInput } from '@/lib/security-sanitize';
import { calculateVipTier, isVipDiscountApplicable } from '@/lib/vip-tier';
import { getUnifiedCatalogData } from '@/lib/catalog/server-catalog';
import { normalizeDeliveryMode } from '@/lib/catalog/delivery-modes';
import { BUFF_SERVICES } from '@/lib/catalog/buff-data';
import { loadBuffOverrides } from '@/lib/buff-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const MEMBERSHIP_PRICES: Record<string, number> = {
  'VIP-30D': 20000,
  'VIP-LIFE': 100000,
  'SVIP-30D': 35000,
  'SVIP-LIFE': 150000,
};

async function resolveStrictServerProduct(params: {
  orderType: string;
  sku: string;
  quantity: number;
  serverIdInput?: unknown;
}): Promise<{
  ok: true;
  baseAmount: number;
  product?: any;
  isBuff: boolean;
} | { ok: false; status: number; error: string }> {
  const { orderType, sku, quantity, serverIdInput } = params;

  if (MEMBERSHIP_PRICES[sku]) {
    return {
      ok: true,
      baseAmount: MEMBERSHIP_PRICES[sku] * quantity,
      isBuff: false,
      product: {
        sku,
        warranty_days: 30,
        input_type: 'none',
        allow_voucher: true,
        supplier_name: 'YukiShopMXH Membership',
        cost_price: Math.round(MEMBERSHIP_PRICES[sku] * 0.1),
      },
    };
  }

  if (orderType === 'BUFF' || sku.startsWith('BUFF')) {
    const fileOv = loadBuffOverrides();
    const dbOv = await getSystemSetting<Record<string, any>>('buff_overrides', {}).catch(() => ({} as Record<string, any>));
    const sbAdmin = getSupabaseAdmin();
    let liveRateOverride: number | null = null;

    const explicitSid = String(serverIdInput || '').trim();
    const skuSidMatch = sku.match(/(\d{1,6})$/);
    const candidateSid = explicitSid || (skuSidMatch ? skuSidMatch[1] : '');

    if (candidateSid && sbAdmin) {
      try {
        const { data: dbBuff } = await sbAdmin
          .from('buff_services')
          .select('sell_price, status')
          .eq('server_id', candidateSid)
          .maybeSingle();
        if (dbBuff) {
          if (String(dbBuff.status).toUpperCase() === 'HIDDEN') {
            return { ok: false, status: 400, error: 'Máy chủ Buff này hiện đang tạm ẩn.' };
          }
          if (Number(dbBuff.sell_price) > 0) liveRateOverride = Number(dbBuff.sell_price);
        }
      } catch {}
    }

    for (const s of BUFF_SERVICES) {
      for (const srv of s.servers) {
        if (candidateSid && String(srv.id) === candidateSid) {
          const ov = { ...(fileOv[String(srv.id)] || {}), ...(dbOv[String(srv.id)] || {}) };
          if (ov.status === 'HIDDEN') {
            return { ok: false, status: 400, error: 'Máy chủ Buff này hiện đang tạm bảo trì.' };
          }
          const unitRate = Number(liveRateOverride ?? ov.retailPrice ?? srv.retailPrice ?? 0);
          if (unitRate <= 0) {
            return { ok: false, status: 400, error: 'Máy chủ Buff chưa có giá hợp lệ.' };
          }
          if (srv.minQty && quantity < srv.minQty) {
            return { ok: false, status: 400, error: `Số lượng tối thiểu cho server #${srv.id} là ${srv.minQty}.` };
          }
          if (srv.maxQty && quantity > srv.maxQty) {
            return { ok: false, status: 400, error: `Số lượng tối đa cho server #${srv.id} là ${srv.maxQty}.` };
          }
          return {
            ok: true,
            isBuff: true,
            baseAmount: Math.max(500, Math.round((unitRate * quantity) / 1000)),
          };
        }
      }
    }
    return { ok: false, status: 404, error: 'Không tìm thấy máy chủ Buff MXH hợp lệ.' };
  }

  const unified = await getUnifiedCatalogData({ includeInternal: true });
  const product = unified.products.find((p: any) => String(p.sku || '').toUpperCase() === sku);
  if (!product) {
    return { ok: false, status: 404, error: `Không tìm thấy sản phẩm với mã ${sku} trong hệ thống.` };
  }
  if (String(product.status || 'ACTIVE').toUpperCase() === 'HIDDEN') {
    return { ok: false, status: 400, error: 'Sản phẩm này hiện đang tạm ẩn hoặc ngừng bán.' };
  }
  const unitPrice = Number(product.sell_price ?? product.price ?? 0);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    return { ok: false, status: 400, error: 'Sản phẩm chưa được cấu hình giá bán hợp lệ.' };
  }

  return {
    ok: true,
    isBuff: false,
    baseAmount: Math.round(unitPrice * quantity),
    product,
  };
}

async function findCouponUnified(code: string) {
  const clean = code.trim().toUpperCase();
  const local = serverStore.findCouponByCode(clean);
  if (local) return local;

  try {
    const pg = await queryPostgres(`SELECT * FROM public.coupons WHERE UPPER(code) = $1 LIMIT 1`, [clean]);
    const c = pg?.rows?.[0];
    if (c) {
      return {
        id: c.id,
        code: String(c.code).toUpperCase(),
        discount_type: c.discount_type,
        discount_value: Number(c.discount_value),
        max_discount: c.max_discount ? Number(c.max_discount) : null,
        min_order_amount: Number(c.min_order_amount || 0),
        usage_limit: c.usage_limit ? Number(c.usage_limit) : null,
        used_count: Number(c.used_count || 0),
        applicable_to: c.applicable_to || 'ALL',
        is_active: !!c.is_active,
        expires_at: c.expires_at || null,
        created_at: c.created_at,
      };
    }
  } catch {}

  const sb = getSupabaseAdmin();
  if (sb) {
    try {
      const { data: c } = await sb.from('coupons').select('*').ilike('code', clean).maybeSingle();
      if (c) {
        return {
          id: c.id,
          code: String(c.code).toUpperCase(),
          discount_type: c.discount_type,
          discount_value: Number(c.discount_value),
          max_discount: c.max_discount ? Number(c.max_discount) : null,
          min_order_amount: Number(c.min_order_amount || 0),
          usage_limit: c.usage_limit ? Number(c.usage_limit) : null,
          used_count: Number(c.used_count || 0),
          applicable_to: c.applicable_to || 'ALL',
          is_active: !!c.is_active,
          expires_at: c.expires_at || null,
          created_at: c.created_at,
        };
      }
    } catch {}
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const localUser = await getSessionUser();
    if (!localUser?.id) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập trước khi thực hiện đặt hàng.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawContact =
      body.delivery_contact !== undefined
        ? body.delivery_contact
        : body.deliveryContact !== undefined
        ? body.deliveryContact
        : body.customerContact !== undefined
        ? body.customerContact
        : localUser.telegramId || localUser.phone || localUser.email || '';

    const deliveryContact = sanitizePlainText(rawContact, 200);
    if (!deliveryContact) {
      return NextResponse.json(
        { error: 'Vui lòng nhập thông tin liên hệ giao hàng (Telegram / Zalo / Gmail).' },
        { status: 400 }
      );
    }

    const rawServiceType = sanitizePlainText(body.service_type || body.serviceType || '', 32).toUpperCase();
    const orderType = sanitizePlainText(
      body.order_type || body.orderType || (body.sku?.startsWith('BUFF') || rawServiceType.includes('BUFF') ? 'BUFF' : 'PRODUCT'),
      32
    ).toUpperCase();

    const itemName = sanitizePlainText(body.item_name || body.name || 'Gói dịch vụ YUKISHOPMXH', 240);
    const sku = sanitizePlainText(body.sku || '', 100).toUpperCase();

    if (
      orderType === 'DEPOSIT' ||
      orderType === 'NAP_VI' ||
      rawServiceType === 'DEPOSIT' ||
      rawServiceType === 'NAP_VI' ||
      sku === 'DEPOSIT' ||
      sku === 'NAP_VI'
    ) {
      return NextResponse.json(
        { error: 'Vui lòng tạo đơn nạp tiền qua cổng /api/wallet/topup/request.' },
        { status: 400 }
      );
    }

    if (!sku) {
      return NextResponse.json({ error: 'Thiếu mã sản phẩm (SKU).' }, { status: 400 });
    }

    const rawQty = Number(body.quantity !== undefined ? body.quantity : 1);
    if (!Number.isInteger(rawQty) || rawQty < 1 || rawQty > 1000000 || !Number.isFinite(rawQty)) {
      return NextResponse.json(
        { error: 'Số lượng mua phải là số nguyên dương hợp lệ.' },
        { status: 400 }
      );
    }
    const quantity = rawQty;

    await autoEnsureTables().catch(() => {});

    // Server-side authoritative pricing lookup
    const resolvedPrice = await resolveStrictServerProduct({
      orderType,
      sku,
      quantity,
      serverIdInput: body.serverId || body.server_id,
    });

    if (!resolvedPrice.ok) {
      return NextResponse.json({ error: resolvedPrice.error }, { status: resolvedPrice.status });
    }

    const rawTotalAmount = resolvedPrice.baseAmount;
    const serverProduct = resolvedPrice.product;

    const targetLink = sanitizeUrlInput(body.target_link || body.targetLink || 'Website', 600);
    const rawNotes = sanitizePlainText(body.notes || body.user_notes || '', 500);
    const rawCredentials = sanitizePlainText(
      body.account_credentials || body.accountCredentials || body.credentials || '',
      300
    );

    const overrides = serverStore.loadCatalogOverrides();
    const liveOverride = overrides.updatedItems?.[sku] || overrides.customItems?.find((c: any) => c.sku === sku);

    const deliveryMode = normalizeDeliveryMode(
      serverProduct?.delivery_mode ||
        serverProduct?.input_type ||
        liveOverride?.delivery_mode ||
        liveOverride?.input_type,
      sku
    );

    if (deliveryMode === 'credentials' || deliveryMode === 'credentials_2fa') {
      if (!rawCredentials || !rawCredentials.includes('|')) {
        return NextResponse.json(
          {
            error:
              deliveryMode === 'credentials_2fa'
                ? 'Gói này yêu cầu nhập đầy đủ: Tài khoản | Mật khẩu | Mã 2FA / Backup Code.'
                : 'Gói này yêu cầu nhập đầy đủ: Tài khoản | Mật khẩu.',
          },
          { status: 400 }
        );
      }
    }

    if (deliveryMode === 'email_only' && (!deliveryContact.includes('@') || !deliveryContact.includes('.'))) {
      return NextResponse.json(
        { error: 'Gói Slot Family yêu cầu nhập chính xác Email Google nhận lời mời.' },
        { status: 400 }
      );
    }

    const isBuffOrder = resolvedPrice.isBuff || orderType === 'BUFF';
    const isApiToolSms =
      serverProduct?.allow_voucher === false ||
      liveOverride?.allow_voucher === false ||
      sku.includes('API-TOOL-SMS') ||
      /API Tool SMS/i.test(serverProduct?.name || itemName);

    const isVoucherBlocked = isBuffOrder || isApiToolSms;
    const rawCouponCode = sanitizePlainText(body.coupon_code || body.couponCode || '', 40).toUpperCase();
    const couponCode = isVoucherBlocked ? '' : rawCouponCode;
    let discountAmount = 0;
    let appliedCoupon: any = null;
    let appliedPartnerCode: string | undefined;

    if (couponCode) {
      const coupon = await findCouponUnified(couponCode);
      if (coupon && coupon.is_active && coupon.applicable_to !== 'BUFF') {
        const expTime = coupon.expires_at ? new Date(coupon.expires_at).getTime() : NaN;
        const isExpired = !Number.isNaN(expTime) && expTime < Date.now();
        const isLimitReached = Boolean(coupon.usage_limit && (coupon.used_count || 0) >= coupon.usage_limit);
        const isMinValid = rawTotalAmount >= (coupon.min_order_amount || 0);

        if (!isExpired && !isLimitReached && isMinValid) {
          if (coupon.discount_type === 'PERCENT') {
            const rawDiscount = Math.round((rawTotalAmount * coupon.discount_value) / 100);
            discountAmount = coupon.max_discount ? Math.min(rawDiscount, coupon.max_discount) : rawDiscount;
          } else {
            discountAmount = Math.min(coupon.discount_value, rawTotalAmount);
          }
          appliedCoupon = coupon;
        }
      } else {
        const partner = serverStore.findPartnerCode(couponCode);
        const withinLimit = !partner?.maxUses || (partner.usedCount || 0) < partner.maxUses;
        const notSelfUse = partner?.ownerUserId !== localUser.id;
        if (partner && partner.isActive && withinLimit && notSelfUse) {
          const pct = Math.max(0, Math.min(50, Number(partner.discountPercent || 0)));
          discountAmount = Math.round((rawTotalAmount * pct) / 100);
          appliedPartnerCode = partner.code;
        }
      }
    }

    // Server-side VIP Tier Discount calculation
    let vipDiscount = 0;
    let vipTierInfo: any = null;
    let userTotalDeposit = serverStore.getUserLifetimeDeposit(localUser.id);
    try {
      const pgDep = await queryPostgres(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM public.deposit_requests WHERE user_id::text = $1 AND status IN ('approved', 'completed')`,
        [localUser.id]
      );
      userTotalDeposit = Math.max(userTotalDeposit, Number(pgDep?.rows?.[0]?.total || 0));
    } catch {}
    vipTierInfo = calculateVipTier(userTotalDeposit);

    if (vipTierInfo.discountPercent > 0 && isVipDiscountApplicable(orderType, sku, serverProduct?.name || itemName)) {
      const remainingAfterCoupon = Math.max(0, rawTotalAmount - discountAmount);
      vipDiscount = Math.round((remainingAfterCoupon * vipTierInfo.discountPercent) / 100);
    }

    const totalAmount = Math.max(0, rawTotalAmount - discountAmount - vipDiscount);
    const notes = [
      rawNotes,
      appliedCoupon ? `[Mã giảm giá: ${appliedCoupon.code} - Giảm: ${new Intl.NumberFormat('vi-VN').format(discountAmount)}đ]` : '',
      appliedPartnerCode ? `[Mã CTV: ${appliedPartnerCode} - Giảm: ${new Intl.NumberFormat('vi-VN').format(discountAmount)}đ]` : '',
      vipDiscount > 0 ? `[Hạng ${vipTierInfo?.name}: Giảm thêm ${vipTierInfo?.discountPercent}% (${new Intl.NumberFormat('vi-VN').format(vipDiscount)}đ)]` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    const orderCode =
      (isBuffOrder ? 'BUFF-' : 'YUKI-') +
      Math.floor(100000 + Math.random() * 900000);
    const nowISO = new Date().toISOString();
    let balanceBefore = 0;
    let balanceAfter = 0;

    // 1. ATOMIC WALLET BALANCE DEDUCTION
    try {
      const balRes = await adjustUserBalance({
        userId: localUser.id,
        delta: -totalAmount,
        type: 'PURCHASE',
        referenceId: orderCode,
        description: `Thanh toán đơn #${orderCode}: ${serverProduct?.name || itemName}${appliedCoupon ? ` (Mã: ${appliedCoupon.code})` : ''}`,
      });
      balanceBefore = balRes?.previousBalance ?? 0;
      balanceAfter = balRes?.newBalance ?? 0;
    } catch (balErr: any) {
      return NextResponse.json(
        { error: balErr.message || 'Số dư ví không đủ. Vui lòng nạp thêm tiền!' },
        { status: 400 }
      );
    }

    // Only increment coupon / partner code usage AFTER payment succeeded
    if (appliedCoupon) {
      serverStore.incrementCouponUsage(appliedCoupon.code);
      try {
        await queryPostgres(
          `UPDATE public.coupons
           SET used_count = COALESCE(used_count, 0) + 1
           WHERE UPPER(code) = UPPER($1)
             AND (usage_limit IS NULL OR COALESCE(used_count, 0) < usage_limit)`,
          [appliedCoupon.code]
        );
      } catch {}
    } else if (appliedPartnerCode) {
      serverStore.incrementPartnerCodeUsage(appliedPartnerCode);
    }

    // 2. Delivery Contacts & Product Supplier Info
    const telegramId = String(body.telegram_id || body.telegramId || localUser.telegramId || '').trim().replace(/^@/, '');
    const zaloPhone = String(body.zalo_phone || body.zaloPhone || localUser.phone || '').trim();

    let supplierName = 'Kho Bản Quyền Yuki';
    let costPrice = Math.round(totalAmount * 0.7);
    let warrantyDays = 30;

    if (isBuffOrder) {
      supplierName = 'SMM Main Server';
      costPrice = Math.round(totalAmount * 0.65);
      warrantyDays = 0;
    } else if (serverProduct) {
      supplierName = serverProduct.supplier_name || supplierName;
      if (serverProduct.cost_price) costPrice = Number(serverProduct.cost_price) * quantity;
      if (serverProduct.warranty_days !== undefined) warrantyDays = Number(serverProduct.warranty_days);
    }

    const effectiveName = serverProduct?.name || itemName;

    // 3. Save order to local persistent store
    const createdOrder = serverStore.createOrder({
      order_code: orderCode,
      user_id: localUser.id,
      user_name: localUser.fullName || localUser.username || 'Khách Hàng',
      user_contact: deliveryContact,
      delivery_contact: deliveryContact,
      telegram_id: telegramId || undefined,
      zalo_phone: zaloPhone || undefined,
      supplier_name: supplierName,
      cost_price: costPrice,
      warranty_days: warrantyDays,
      service_type: orderType,
      item_name: effectiveName,
      sku,
      quantity,
      target_link: targetLink,
      total_amount: totalAmount,
      paid: true,
      deducted_balance: totalAmount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      coupon_code: appliedCoupon?.code,
      partner_code: appliedPartnerCode,
      discount_amount: discountAmount,
      account_credentials: rawCredentials || undefined,
      status: 'pending',
      notes,
      created_at: nowISO,
    });

    // 4. Direct Database Persistence (PostgreSQL & Supabase) with real UUID & error check
    let dbOrderSaved = false;
    try {
      const pgRes = await queryPostgres(
        `INSERT INTO public.orders (
          id, order_code, user_id, user_email, user_name, user_contact, delivery_contact,
          telegram_id, order_type, service_type, item_name, product_sku, sku,
          amount, total_amount, discount_amount, cost_price, supplier_name, coupon_code,
          partner_code, warranty_days, quantity, target_link, account_credentials,
          status, paid, deducted_balance, notes, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $6,
          $7, $8, $8, $9, $10, $10,
          $11, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20,
          'pending', true, true, $21, NOW(), NOW()
        )
        ON CONFLICT (order_code) DO NOTHING`,
        [
          crypto.randomUUID(),
          orderCode,
          localUser.id,
          localUser.email || '',
          localUser.fullName || localUser.username || 'Khách Hàng',
          deliveryContact,
          telegramId || null,
          orderType,
          effectiveName,
          sku,
          totalAmount,
          discountAmount,
          costPrice,
          supplierName,
          appliedCoupon?.code || null,
          appliedPartnerCode || null,
          warrantyDays,
          quantity,
          targetLink || '',
          rawCredentials || '',
          notes || '',
        ]
      );
      if (pgRes !== null) dbOrderSaved = true;
    } catch (pgErr) {
      console.warn('[orders/create] Postgres persistence notice:', pgErr);
    }

    try {
      const sbAdmin = getSupabaseAdmin();
      if (sbAdmin) {
        const { error: sbErr } = await sbAdmin.from('orders').upsert(
          {
            order_code: orderCode,
            user_id: localUser.id,
            user_email: localUser.email || '',
            user_name: localUser.fullName || localUser.username || 'Khách Hàng',
            user_contact: deliveryContact,
            delivery_contact: deliveryContact,
            telegram_id: telegramId || null,
            order_type: orderType,
            service_type: orderType,
            item_name: effectiveName,
            product_sku: sku,
            sku,
            quantity,
            total_amount: totalAmount,
            amount: totalAmount,
            discount_amount: discountAmount,
            cost_price: costPrice,
            supplier_name: supplierName,
            coupon_code: appliedCoupon?.code || null,
            partner_code: appliedPartnerCode || null,
            warranty_days: warrantyDays,
            target_link: targetLink,
            account_credentials: rawCredentials || null,
            paid: true,
            deducted_balance: true,
            notes: notes || '',
            status: 'pending',
            created_at: nowISO,
            updated_at: nowISO,
          },
          { onConflict: 'order_code' }
        );
        if (!sbErr) dbOrderSaved = true;
      }
    } catch (sbErr) {
      console.warn('[orders/create] Supabase persistence notice:', sbErr);
    }

    if (isDatabaseConfigured() && !dbOrderSaved) {
      // Rollback wallet balance atomically if DB failed to record order
      if (totalAmount > 0) {
        await adjustUserBalance({
          userId: localUser.id,
          delta: totalAmount,
          type: 'REFUND',
          referenceId: `${orderCode}-ROLLBACK`,
          description: `Hoàn tiền tự động do lỗi ghi đơn #${orderCode} vào Database`,
        }).catch(() => {});
      }
      return NextResponse.json(
        { error: 'Không thể lưu đơn hàng vào Database. Số dư ví đã được bảo toàn, vui lòng thử lại!' },
        { status: 500 }
      );
    }

    // 5. Send Telegram Notification to Admin with 2-step Approval Buttons
    const botCfg = await getTelegramBotConfig();
    const botToken = botCfg.bot_token || process.env.TELEGRAM_BOT_TOKEN || process.env.SHOP_BOT_TOKEN || '';
    const chatId = botCfg.admin_id || process.env.TELEGRAM_ADMIN_ID || process.env.TELEGRAM_ADMIN_CHAT_ID || '8960751162';

    if (botToken && chatId) {
      const formatVND = (n: number) =>
        new Intl.NumberFormat('vi-VN').format(n) + ' VNĐ';

      let teleUsername: string | null = null;
      let teleChatUrl = telegramId ? `tg://user?id=${telegramId}` : '';
      if (telegramId && /^\d{5,15}$/.test(telegramId)) {
        try {
          const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${telegramId}`, {
            signal: AbortSignal.timeout(5000),
          });
          const tgData = await tgRes.json();
          if (tgData && tgData.ok && tgData.result) {
            teleUsername = tgData.result.username || null;
            if (teleUsername) teleChatUrl = `https://t.me/${teleUsername}`;
          }
        } catch {}
      }

      const isEmailOnly = deliveryMode === 'email_only';
      const text =
`🔔 <b>[YUKISHOPMXH - ĐƠN HÀNG MỚI CẦN DUYỆT TAY]</b>
🆔 <b>Mã đơn:</b> <code>${escapeHtml(orderCode)}</code>
📦 <b>Gói x Số lượng:</b> <code>${escapeHtml(effectiveName)} x ${quantity}</code>
📋 <b>Chế độ nhận hàng:</b> <code>${escapeHtml(deliveryMode)}</code>
💰 <b>Thu khách:</b> <code>${formatVND(totalAmount)}</code>
${rawCredentials ? `🔑 <b>Tài khoản (TK|MK|2FA):</b> <code>${escapeHtml(rawCredentials)}</code>\n` : ''}${isEmailOnly ? `📧 <b>Email Google Family:</b> <code>${escapeHtml(deliveryContact)}</code>\n` : ''}🏭 <b>Nguồn & Giá vốn:</b> Nguồn <code>${escapeHtml(supplierName)}</code> | Vốn: <code>${formatVND(costPrice)}</code>
👤 <b>Khách hàng:</b> ${escapeHtml(localUser.fullName || localUser.username || 'Thành viên')}
✈️ <b>Telegram:</b> <code>${escapeHtml(telegramId || 'Không có')}</code> ${teleUsername ? `@${escapeHtml(teleUsername)}` : ''} ${teleChatUrl ? `(<a href="${teleChatUrl}">Mở Chat</a>)` : ''}
📞 <b>SĐT Zalo:</b> <code>${escapeHtml(zaloPhone || 'Không có')}</code>
📝 <b>Nội dung khách gửi:</b> <code>${escapeHtml(rawNotes || targetLink || 'Không có')}</code>
🛡️ <b>Bảo hành:</b> <code>${warrantyDays === 0 ? 'Không hỗ trợ (KBH)' : `${warrantyDays} Ngày`}</code>
⏰ <b>Thời gian:</b> ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;

      const inlineKeyboard = {
        inline_keyboard: [
          [
            { text: '🔑 Duyệt & Gửi TK/Key', callback_data: `ord_ok:${orderCode}` },
            { text: '✨ Đã Nâng / Add Family', callback_data: `ord_upg:${orderCode}` },
          ],
          [
            { text: '⏳ Xin Thêm 2FA', callback_data: `ord_2fa:${orderCode}` },
            { text: '❌ Hủy & Hoàn Ví', callback_data: `ord_no:${orderCode}` },
          ],
        ],
      };

      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            reply_markup: inlineKeyboard,
          }),
        });
      } catch (tgErr) {
        console.error('[orders/create] Failed to send Telegram message:', tgErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Đặt hàng thành công! Đơn hàng đang được chờ Admin duyệt.',
      order: createdOrder,
    });
  } catch (err: any) {
    console.error('[orders/create] Exception:', err);
    return NextResponse.json(
      { error: err.message || 'Lỗi xử lý tạo đơn hàng.' },
      { status: 500 }
    );
  }
}
