import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ensureDatabaseReady, queryPostgres } from '@/lib/autoMigrate';
import { serverStore } from '@/lib/server-store';
import { adjustUserBalance } from '@/lib/wallet-service';
import { distributeAffiliateCommission } from '@/lib/affiliate-service';
import { getTelegramBotConfig } from '@/lib/system-settings';
import { verifySecretHeader } from '@/lib/webhook-security';
import { appendMacroDroidLogDb, findDbUserByIdOrIdentifier } from '@/lib/db-persistence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseExplicitAmount(rawVal: unknown): number {
  if (typeof rawVal === 'number') {
    return Number.isFinite(rawVal) && rawVal > 0 ? Math.round(rawVal) : 0;
  }
  const s = String(rawVal ?? '').trim();
  if (!s) return 0;
  const normalized = s.replace(/[^\d]/g, '');
  if (!normalized) return 0;
  const num = parseInt(normalized, 10);
  return !Number.isNaN(num) && num > 0 ? num : 0;
}

function parseReceivedAmount(text: string): number {
  if (!text) return 0;

  const plusMatch = text.match(/\+\s*([\d.,]+)/i);
  if (plusMatch) {
    const num = parseInt(plusMatch[1].replace(/[.,]/g, ''), 10);
    if (!Number.isNaN(num) && num > 0) return num;
  }

  const kwMatch = text.match(
    /(?:nhận(?:\s+được|\s+tiền)?|cộng|chuyển\s+đến|chuyển\s+khoản|giao\s+dịch\s+thành\s+công|số\s+tiền:?)\s*(?:thành\s+công\s*)?\+?\s*([\d.,]+)/i
  );
  if (kwMatch) {
    const num = parseInt(kwMatch[1].replace(/[.,]/g, ''), 10);
    if (!Number.isNaN(num) && num > 0) return num;
  }

  const currMatch = text.match(/([\d.,]{4,})\s*(?:vnd|vnđ|đ|d)\b/i);
  if (currMatch) {
    const num = parseInt(currMatch[1].replace(/[.,]/g, ''), 10);
    if (!Number.isNaN(num) && num > 0) return num;
  }

  return 0;
}

function isIncomingMoney(fullMsg: string, explicitAmount = 0): boolean {
  const lower = fullMsg.toLowerCase();
  const isDebit =
    /(thanh toán|trừ tiền|chuyển đi|rút tiền|gửi tiền)/i.test(lower) &&
    !lower.includes('+');
  if (isDebit) return false;

  if (explicitAmount > 0) return true;

  return (
    /\+/.test(fullMsg) ||
    /(nhận tiền|nhận được|nhận \d|cộng|chuyển đến|chuyển khoản|bien dong|biến động)/i.test(lower)
  );
}

/**
 * Extracts deposit reference code & sequence order_number even if banks strip "_" into spaces or remove it
 * (e.g. "YUKISP_DH000012_U896", "YUKISP DH000012 U896", "YukiSp_000012", "DH000012", "DEP-...", "ORD-...").
 */
function extractCandidateInfo(fullMsg: string): { codes: string[]; orderNumbers: number[] } {
  const candidates = new Set<string>();
  const orderNumbers = new Set<number>();

  // 1. New format: YUKISP_DH000012_TAG or YUKISP DH000012 TAG or YUKISPDH000012TAG
  const dhFull = fullMsg.match(/YUKISP[\s_-]*DH(\d{1,10})(?:[\s_-]*([A-Z0-9]{1,8}))?/i);
  if (dhFull) {
    const digits = dhFull[1];
    const seq = parseInt(digits, 10);
    if (Number.isFinite(seq) && seq > 0) orderNumbers.add(seq);
    const padded = digits.padStart(6, '0');
    const tag = dhFull[2] ? dhFull[2].toUpperCase() : '';
    if (tag) {
      candidates.add(`YUKISP_DH${padded}_${tag}`);
      candidates.add(`YUKISP_DH${digits}_${tag}`);
    }
    candidates.add(`YUKISP_DH${padded}`);
    candidates.add(`YUKISP_DH${digits}`);
    candidates.add(`YukiSp_${padded}`);
  }

  // 2. Classic format: YukiSp_000012 or YUKISP 000012
  const yukiNumMatch = fullMsg.match(/YukiSp[\s_-]*(\d{1,10})/i);
  if (yukiNumMatch) {
    const digits = yukiNumMatch[1];
    const seq = parseInt(digits, 10);
    if (Number.isFinite(seq) && seq > 0) orderNumbers.add(seq);
    candidates.add(`YukiSp_${digits.padStart(6, '0')}`);
    candidates.add(`YukiSp_${digits}`);
    candidates.add(`YUKISP_${digits.padStart(6, '0')}`);
  }

  // 3. Direct token matches (sanitized [A-Za-z0-9_-] only for PostgREST safety)
  const genMatch = fullMsg.match(/\b(YUKISP_DH[A-Za-z0-9_-]+|YukiSp_[A-Za-z0-9_-]+|DEP-[A-Za-z0-9_-]+|ORD-[A-Za-z0-9_-]+)\b/gi);
  if (genMatch) {
    for (const token of genMatch) {
      const clean = token.replace(/[^A-Za-z0-9_-]/g, '');
      if (clean) {
        candidates.add(clean);
        candidates.add(clean.toUpperCase());
      }
    }
  }

  return { codes: Array.from(candidates), orderNumbers: Array.from(orderNumbers) };
}

async function sendTelegramAlert(text: string) {
  const dynamicCfg = await getTelegramBotConfig().catch(() => null);
  const token = dynamicCfg?.bot_token || process.env.TELEGRAM_BOT_TOKEN || '';
  const chatId = dynamicCfg?.admin_id || process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '';
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch (err) {
    console.error('[MacroDroid Webhook] Failed to send Telegram alert:', err);
  }
}

async function notifyUserDepositSuccess(userId: string, orderCode: string, amount: number) {
  try {
    const dynamicCfg = await getTelegramBotConfig().catch(() => null);
    const token = dynamicCfg?.bot_token || process.env.TELEGRAM_BOT_TOKEN || '';
    if (!token) return;
    const user = await findDbUserByIdOrIdentifier(userId);
    const tgId = String(user?.telegramId || '').trim().replace(/^@/, '');
    if (!/^\d{5,15}$/.test(tgId)) return;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(6000),
      body: JSON.stringify({
        chat_id: tgId,
        parse_mode: 'HTML',
        text:
          `✅ <b>NẠP VÍ THÀNH CÔNG (+${new Intl.NumberFormat('vi-VN').format(amount)} VNĐ)</b>\n` +
          `🆔 <b>Mã đơn nạp:</b> <code>${escapeHtml(orderCode)}</code>\n` +
          `💰 Số dư ví của bạn đã được cập nhật tự động. Cảm ơn bạn đã sử dụng YukiShopMXH!`,
      }),
    }).catch(() => {});
  } catch {}
}

async function handleMacroDroidWebhook(req: Request, method: 'GET' | 'POST') {
  const url = new URL(req.url);
  const dynamicCfg = await getTelegramBotConfig().catch(() => null);
  const configuredSecret =
    dynamicCfg?.macrodroid_secret ||
    dynamicCfg?.webhook_secret ||
    process.env.MACRODROID_SECRET ||
    process.env.TELEGRAM_WEBHOOK_SECRET ||
    '';

  const headerSecret =
    req.headers.get('x-webhook-secret') ||
    req.headers.get('x-macrodroid-secret') ||
    req.headers.get('x-telegram-bot-api-secret-token') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const querySecret = url.searchParams.get('secret') || url.searchParams.get('token') || url.searchParams.get('key');

  if (method === 'GET') {
    const hasQueryContent = Boolean(
      url.searchParams.get('title') ||
      url.searchParams.get('text') ||
      url.searchParams.get('notification') ||
      url.searchParams.get('message') ||
      url.searchParams.get('content') ||
      url.searchParams.get('body') ||
      url.searchParams.get('note') ||
      url.searchParams.get('amount') ||
      url.searchParams.get('money')
    );
    if (!hasQueryContent) {
      return NextResponse.json(
        {
          status: 'ok',
          service: 'macrodroid-webhook',
          message: 'Yuki Shop Webhook sẵn sàng tiếp nhận biến động số dư.',
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }
  }

  let title = '';
  let text = '';
  let explicitAmount = 0;
  let bodySecret = '';
  let rawText = '';

  if (method === 'POST') {
    rawText = await req.text().catch(() => '');
    const contentType = req.headers.get('content-type') || '';
    let body: any = {};

    if (contentType.includes('application/x-www-form-urlencoded')) {
      try {
        const params = new URLSearchParams(rawText);
        title = params.get('title') || params.get('not_title') || '';
        text =
          params.get('text') ||
          params.get('notification') ||
          params.get('content') ||
          params.get('message') ||
          params.get('body') ||
          params.get('note') ||
          '';
        explicitAmount = parseExplicitAmount(
          params.get('amount') || params.get('money') || params.get('so_tien') || params.get('value')
        );
        bodySecret = params.get('secret') || params.get('secret_token') || params.get('key') || params.get('token') || '';
      } catch {}
    } else if (rawText) {
      try {
        body = JSON.parse(rawText);
      } catch {
        try {
          body = JSON.parse(rawText.replace(/[\r\n\t]+/g, ' '));
        } catch {
          const titleMatch = rawText.match(/"(?:title|not_title)"\s*:\s*"([^"]*)"/i);
          const textMatch = rawText.match(/"(?:text|notification|message|content|body|note)"\s*:\s*"([\s\S]*?)"\s*(?:}|\n|$)/i);
          body = {
            title: titleMatch ? titleMatch[1] : '',
            text: textMatch ? textMatch[1] : rawText,
          };
        }
      }
    }
    bodySecret = bodySecret || body?.secret || body?.secret_token || body?.key || body?.token || '';
    title =
      title ||
      String(body.title || body.not_title || url.searchParams.get('title') || url.searchParams.get('not_title') || '').trim();
    text =
      text ||
      String(
        body.text ||
          body.notification ||
          body.message ||
          body.content ||
          body.body ||
          body.note ||
          url.searchParams.get('text') ||
          url.searchParams.get('notification') ||
          url.searchParams.get('content') ||
          url.searchParams.get('message') ||
          url.searchParams.get('body') ||
          url.searchParams.get('note') ||
          (body && typeof body === 'object' && !body.text && !body.content && !body.message && !body.body && !body.note ? '' : rawText)
      ).trim();
    if (explicitAmount <= 0) {
      explicitAmount = parseExplicitAmount(
        body?.amount ?? body?.money ?? body?.so_tien ?? body?.value ??
        url.searchParams.get('amount') ?? url.searchParams.get('money')
      );
    }
  } else {
    title = String(url.searchParams.get('title') || url.searchParams.get('not_title') || '').trim();
    text = String(
      url.searchParams.get('text') ||
        url.searchParams.get('notification') ||
        url.searchParams.get('message') ||
        url.searchParams.get('content') ||
        url.searchParams.get('body') ||
        url.searchParams.get('note') ||
        ''
    ).trim();
    explicitAmount = parseExplicitAmount(url.searchParams.get('amount') || url.searchParams.get('money'));
    rawText = url.search;
  }

  const secret = headerSecret || querySecret || bodySecret;

  if (!verifySecretHeader(secret, configuredSecret)) {
    await appendMacroDroidLogDb({
      method,
      title,
      text,
      rawSnippet: rawText,
      status: 'ERROR',
      message: 'Unauthorized. Secret key không hợp lệ hoặc bị thiếu.',
    });
    return NextResponse.json(
      { error: 'Unauthorized. Secret key không hợp lệ hoặc bị thiếu.' },
      { status: 401 }
    );
  }

  const fullMsg = `${title} ${text}`.trim();
  if (!fullMsg && explicitAmount <= 0) {
    await appendMacroDroidLogDb({
      method,
      title,
      text,
      rawSnippet: rawText,
      status: 'WARNING',
      message: 'Thiếu nội dung thông báo (content/message/text/body/note).',
    });
    return NextResponse.json({ error: 'Thiếu nội dung thông báo (content/message/text/body/note).' }, { status: 400 });
  }

  if (!isIncomingMoney(fullMsg, explicitAmount)) {
    await appendMacroDroidLogDb({
      method,
      title,
      text,
      rawSnippet: fullMsg,
      status: 'IGNORED',
      message: 'Bỏ qua: Không phải thông báo biến động số dư tiền vào.',
    });
    return NextResponse.json({
      success: false,
      message: 'Bỏ qua: Không phải thông báo biến động số dư tiền vào.',
    });
  }

  const receivedAmount = explicitAmount > 0 ? explicitAmount : parseReceivedAmount(fullMsg);
  if (receivedAmount <= 0) {
    await appendMacroDroidLogDb({
      method,
      title,
      text,
      rawSnippet: fullMsg,
      status: 'WARNING',
      message: 'Không bóc tách được số tiền thực nhận hợp lệ từ thông báo.',
    });
    return NextResponse.json({
      success: false,
      message: 'Không bóc tách được số tiền thực nhận hợp lệ từ thông báo.',
    });
  }

  if (receivedAmount > 2000000) {
    const alertMsg = [
      `⚠️ <b>Giao dịch vượt mức auto duyệt 2M (+${new Intl.NumberFormat('vi-VN').format(receivedAmount)} VNĐ) - Cần Admin kiểm tra!</b>`,
      `📱 Nội dung: <code>${escapeHtml(fullMsg)}</code>`,
      `⏰ Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`,
    ].join('\n');
    await sendTelegramAlert(alertMsg);

    await appendMacroDroidLogDb({
      method,
      title,
      text,
      rawSnippet: fullMsg,
      receivedAmount,
      status: 'WARNING',
      message: `Giao dịch vượt mức auto duyệt 2M (+${new Intl.NumberFormat('vi-VN').format(receivedAmount)} VNĐ).`,
    });

    return NextResponse.json({
      success: false,
      warning: 'EXCEEDED_MAX_LIMIT',
      message: `Giao dịch vượt mức auto duyệt 2M (+${receivedAmount} VNĐ). Cần Admin kiểm tra thủ công.`,
      receivedAmount,
    });
  }

  await ensureDatabaseReady().catch(() => {});
  const sbAdmin = getSupabaseAdmin();

  let matchedRecord: any = null;
  let matchTier = 0;

  // --- TIER 1: Code & order_number matching across deposit_requests, orders (PG + Supabase), and serverStore ---
  const { codes: candidateCodes, orderNumbers } = extractCandidateInfo(fullMsg);
  if (candidateCodes.length > 0 || orderNumbers.length > 0) {
    const lowerSet = new Set(candidateCodes.map((c) => c.toLowerCase()));

    // 1A. PostgreSQL lookup
    try {
      const lowerArr = Array.from(lowerSet);
      if (lowerArr.length > 0) {
        const pgDep = await queryPostgres(
          `SELECT id, request_code AS order_code, user_id, amount, status, created_at
           FROM public.deposit_requests
           WHERE LOWER(request_code) = ANY($1::text[])
              OR LOWER(COALESCE(transfer_code, '')) = ANY($1::text[])
              OR LOWER(COALESCE(transfer_content, '')) = ANY($1::text[])
           ORDER BY created_at DESC LIMIT 1`,
          [lowerArr]
        );
        if (pgDep?.rows?.[0]) {
          matchedRecord = pgDep.rows[0];
          matchTier = 1;
        }
      }

      if (!matchedRecord && orderNumbers.length > 0) {
        const pgByNum = await queryPostgres(
          `SELECT id, request_code AS order_code, user_id, amount, status, created_at
           FROM public.deposit_requests
           WHERE order_number = ANY($1::bigint[])
           ORDER BY created_at DESC LIMIT 1`,
          [orderNumbers]
        );
        if (pgByNum?.rows?.[0]) {
          matchedRecord = pgByNum.rows[0];
          matchTier = 1;
        }
      }

      if (!matchedRecord && lowerArr.length > 0) {
        const pgOrd = await queryPostgres(
          `SELECT id, order_code, user_id, total_amount, amount, status, paid, created_at
           FROM public.orders
           WHERE LOWER(order_code) = ANY($1::text[]) OR LOWER(id) = ANY($1::text[])
           ORDER BY created_at DESC LIMIT 1`,
          [lowerArr]
        );
        if (pgOrd?.rows?.[0]) {
          matchedRecord = pgOrd.rows[0];
          matchTier = 1;
        }
      }
    } catch {}

    // 1B. Supabase REST lookup (safe column equality — no raw string .or interpolation)
    if (!matchedRecord && sbAdmin) {
      for (const rawCode of candidateCodes) {
        const code = rawCode.replace(/[^A-Za-z0-9_-]/g, '');
        if (!code) continue;
        const { data: sbDep } = await sbAdmin
          .from('deposit_requests')
          .select('*')
          .eq('request_code', code)
          .limit(1);
        if (sbDep?.[0]) {
          matchedRecord = { ...sbDep[0], order_code: sbDep[0].request_code || sbDep[0].transfer_code };
          matchTier = 1;
          break;
        }

        const { data: sbOrd } = await sbAdmin
          .from('orders')
          .select('*')
          .eq('order_code', code)
          .limit(1);
        if (sbOrd?.[0]) {
          matchedRecord = sbOrd[0];
          matchTier = 1;
          break;
        }
      }
      if (!matchedRecord && orderNumbers.length > 0) {
        const { data: sbDepByNum } = await sbAdmin
          .from('deposit_requests')
          .select('*')
          .eq('order_number', orderNumbers[0])
          .limit(1);
        if (sbDepByNum?.[0]) {
          matchedRecord = { ...sbDepByNum[0], order_code: sbDepByNum[0].request_code || sbDepByNum[0].transfer_code };
          matchTier = 1;
        }
      }
    }

    // 1C. serverStore fallback
    if (!matchedRecord) {
      const localOrders = serverStore.loadOrders();
      const localTopups = serverStore.loadTopups();
      const foundOrder = localOrders.find(
        (o) =>
          (o.order_code && lowerSet.has(o.order_code.toLowerCase())) ||
          (o.id && lowerSet.has(o.id.toLowerCase()))
      );
      const foundTopup = localTopups.find(
        (t) =>
          (t.code && lowerSet.has(t.code.toLowerCase())) ||
          (t.id && lowerSet.has(t.id.toLowerCase()))
      );
      if (foundOrder || foundTopup) {
        matchedRecord = foundOrder || {
          id: foundTopup!.id,
          order_code: foundTopup!.code,
          user_id: foundTopup!.user_id,
          amount: foundTopup!.amount,
          total_amount: foundTopup!.amount,
          status: foundTopup!.status,
          created_at: foundTopup!.created_at,
        };
        matchTier = 1;
      }
    }
  }

  // --- TIER 2: Unique pending deposit match by amount within last 20 minutes ---
  if (!matchedRecord && receivedAmount > 0) {
    const windowIso = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const candidatesMap = new Map<string, any>();

    try {
      const pgDep = await queryPostgres(
        `SELECT id, request_code AS order_code, user_id, amount, status, created_at
         FROM public.deposit_requests
         WHERE status IN ('pending', 'waiting_confirm') AND amount = $1 AND created_at >= $2
         ORDER BY created_at DESC LIMIT 5`,
        [receivedAmount, windowIso]
      );
      for (const r of pgDep?.rows || []) {
        candidatesMap.set(String(r.order_code || r.id), r);
      }

      const pgOrd = await queryPostgres(
        `SELECT id, order_code, user_id, total_amount, amount, status, service_type, created_at
         FROM public.orders
         WHERE status IN ('pending', 'waiting_confirm')
           AND service_type IN ('NAP_VI', 'DEPOSIT')
           AND COALESCE(total_amount, amount) = $1
           AND created_at >= $2
         ORDER BY created_at DESC LIMIT 5`,
        [receivedAmount, windowIso]
      );
      for (const r of pgOrd?.rows || []) {
        candidatesMap.set(String(r.order_code || r.id), r);
      }
    } catch {}

    if (candidatesMap.size === 0 && sbAdmin) {
      const [{ data: sbDeps }, { data: sbOrds }] = await Promise.all([
        sbAdmin
          .from('deposit_requests')
          .select('*')
          .in('status', ['pending', 'waiting_confirm'])
          .eq('amount', receivedAmount)
          .gte('created_at', windowIso)
          .order('created_at', { ascending: false })
          .limit(5),
        sbAdmin
          .from('orders')
          .select('*')
          .in('status', ['pending', 'waiting_confirm'])
          .in('service_type', ['NAP_VI', 'DEPOSIT'])
          .gte('created_at', windowIso)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);
      for (const d of sbDeps || []) {
        const code = d.request_code || d.transfer_code || d.id;
        candidatesMap.set(code, { ...d, order_code: code });
      }
      for (const o of sbOrds || []) {
        if (Number(o.total_amount || o.amount || 0) === receivedAmount) {
          candidatesMap.set(o.order_code || o.id, o);
        }
      }
    }

    if (candidatesMap.size === 0) {
      const windowMs = Date.now() - 20 * 60 * 1000;
      for (const o of serverStore.loadOrders()) {
        const isDep = o.service_type === 'NAP_VI' || o.service_type === 'DEPOSIT' || String(o.order_code || '').startsWith('YukiSp_');
        if (
          isDep &&
          ['pending', 'waiting_confirm'].includes(String(o.status || '').toLowerCase()) &&
          Number(o.total_amount || 0) === receivedAmount &&
          new Date(o.created_at).getTime() >= windowMs
        ) {
          candidatesMap.set(o.order_code, o);
        }
      }
    }

    if (candidatesMap.size === 1) {
      matchedRecord = Array.from(candidatesMap.values())[0];
      matchTier = 2;
    } else if (candidatesMap.size > 1) {
      const codesList = Array.from(candidatesMap.keys()).join(', ');
      await sendTelegramAlert(
        `⚠️ <b>[MACRODROID] CÓ ${candidatesMap.size} ĐƠN CÙNG SỐ TIỀN ${new Intl.NumberFormat('vi-VN').format(receivedAmount)}đ TRONG 20 PHÚT</b>\nMã: <code>${escapeHtml(codesList)}</code>\nNội dung bank: <code>${escapeHtml(fullMsg)}</code>\nVui lòng kiểm tra duyệt tay để tránh cộng nhầm người.`
      );
      await appendMacroDroidLogDb({
        method,
        title,
        text,
        rawSnippet: fullMsg,
        receivedAmount,
        status: 'WARNING',
        message: `Phát hiện ${candidatesMap.size} đơn pending cùng số tiền (${codesList}), cần Admin xác nhận.`,
      });
      return NextResponse.json({
        success: false,
        warning: 'AMBIGUOUS_AMOUNT_MATCH',
        message: `Có ${candidatesMap.size} đơn đang chờ cùng số tiền. Đã báo Admin kiểm tra.`,
      });
    }
  }

  if (!matchedRecord) {
    await sendTelegramAlert(
      [
        `⚠️ <b>[YUKISHOPMXH — BIẾN ĐỘNG CHƯA KHỚP ĐƠN PENDING]</b>`,
        `💰 Số tiền nhận: <b>+${new Intl.NumberFormat('vi-VN').format(receivedAmount)} VNĐ</b>`,
        `📱 Nội dung: <code>${escapeHtml(fullMsg)}</code>`,
        `⏰ Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`,
      ].join('\n')
    );

    await appendMacroDroidLogDb({
      method,
      title,
      text,
      rawSnippet: fullMsg,
      receivedAmount,
      status: 'WARNING',
      message: 'Không tìm thấy đơn nạp pending khớp mã đơn hoặc số tiền trong 20 phút gần nhất.',
    });

    return NextResponse.json({
      success: false,
      message: 'Không tìm thấy đơn nạp pending khớp mã đơn hoặc số tiền trong 20 phút gần nhất.',
      receivedAmount,
    });
  }

  const finalOrderCode = matchedRecord.order_code || matchedRecord.request_code || matchedRecord.id;
  const currentStatus = String(matchedRecord.status || 'pending').toLowerCase();

  if (['completed', 'approved'].includes(currentStatus) || matchedRecord.paid === true) {
    await appendMacroDroidLogDb({
      method,
      title,
      text,
      rawSnippet: fullMsg,
      receivedAmount,
      orderCode: finalOrderCode,
      status: 'SUCCESS',
      message: `Đơn ${finalOrderCode} đã được duyệt trước đó. Không xử lý lại.`,
    });
    return NextResponse.json({
      success: true,
      alreadyProcessed: true,
      message: `Đơn ${finalOrderCode} đã được duyệt trước đó. Không xử lý lại.`,
      orderId: matchedRecord.id,
      orderCode: finalOrderCode,
    });
  }

  const expectedAmount = Number(matchedRecord.total_amount ?? matchedRecord.amount ?? 0);
  if (receivedAmount < expectedAmount) {
    const diff = expectedAmount - receivedAmount;
    await sendTelegramAlert(
      [
        '⚠️ <b>CẢNH BÁO NẠP THIẾU TIỀN — MACRODROID</b>',
        `Mã đơn: <code>${escapeHtml(finalOrderCode)}</code>`,
        `Khách hàng: <code>${escapeHtml(matchedRecord.user_id)}</code>`,
        `Cần nạp: <b>${new Intl.NumberFormat('vi-VN').format(expectedAmount)} VNĐ</b>`,
        `Thực nhận: <b>${new Intl.NumberFormat('vi-VN').format(receivedAmount)} VNĐ</b>`,
        `Thiếu: <b>-${new Intl.NumberFormat('vi-VN').format(diff)} VNĐ</b>`,
      ].join('\n')
    );

    await appendMacroDroidLogDb({
      method,
      title,
      text,
      rawSnippet: fullMsg,
      receivedAmount,
      orderCode: finalOrderCode,
      status: 'WARNING',
      message: `Số tiền thực nhận (${receivedAmount}) nhỏ hơn đơn hàng (${expectedAmount}).`,
    });

    return NextResponse.json({
      success: false,
      warning: 'UNDERPAID',
      message: `Số tiền thực nhận (${receivedAmount}) nhỏ hơn số tiền đơn hàng (${expectedAmount}).`,
      orderCode: finalOrderCode,
      expectedAmount,
      receivedAmount,
    });
  }

  // --- ATOMIC IDEMPOTENT CLAIM BEFORE CREDITING BALANCE ---
  const nowISO = new Date().toISOString();
  let claimedInDb = false;

  try {
    const pgClaimDep = await queryPostgres(
      `UPDATE public.deposit_requests
       SET status = 'approved', approved_by = 'AUTO_MACRODROID', approved_at = NOW(), updated_at = NOW()
       WHERE (request_code = $1 OR transfer_code = $1 OR id = $1)
         AND status IN ('pending', 'waiting_confirm')
       RETURNING id`,
      [finalOrderCode]
    );
    const pgClaimOrd = await queryPostgres(
      `UPDATE public.orders
       SET status = 'completed', paid = true, approved_by = 'AUTO_MACRODROID', updated_at = NOW()
       WHERE (order_code = $1 OR id = $1)
         AND status IN ('pending', 'waiting_confirm')
       RETURNING id`,
      [finalOrderCode]
    );
    if ((pgClaimDep?.rows?.length || 0) > 0 || (pgClaimOrd?.rows?.length || 0) > 0) {
      claimedInDb = true;
    } else if (pgClaimDep !== null || pgClaimOrd !== null) {
      // Postgres is connected and 0 rows were in pending status -> already claimed concurrently!
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        message: `Đơn ${finalOrderCode} đã được xử lý trước đó.`,
        orderCode: finalOrderCode,
      });
    }
  } catch {}

  const safeClaimCode = String(finalOrderCode || '').replace(/[^A-Za-z0-9_-]/g, '');
  if (!claimedInDb && sbAdmin && safeClaimCode) {
    const { data: sbOrdClaimed } = await sbAdmin
      .from('orders')
      .update({
        status: 'completed',
        paid: true,
        approved_by: 'AUTO_MACRODROID',
        updated_at: nowISO,
      })
      .eq('order_code', safeClaimCode)
      .in('status', ['pending', 'waiting_confirm'])
      .select('id');

    const { data: sbDepClaimed } = await sbAdmin
      .from('deposit_requests')
      .update({
        status: 'approved',
        approved_by: 'AUTO_MACRODROID',
        approved_at: nowISO,
        updated_at: nowISO,
      })
      .eq('request_code', safeClaimCode)
      .in('status', ['pending', 'waiting_confirm'])
      .select('id');

    if ((sbOrdClaimed?.length || 0) > 0 || (sbDepClaimed?.length || 0) > 0) {
      claimedInDb = true;
    } else {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        message: `Đơn ${finalOrderCode} đã được xử lý trước đó.`,
        orderCode: finalOrderCode,
      });
    }
  }

  // Always update local cache atomically too
  const localOrd = serverStore.findOrderByCode(finalOrderCode);
  const localTop = serverStore.loadTopups().find((t) => t.code === finalOrderCode || t.id === finalOrderCode);
  if (!claimedInDb && ((localOrd && localOrd.status === 'completed') || (localTop && localTop.status === 'approved'))) {
    return NextResponse.json({
      success: true,
      alreadyProcessed: true,
      message: `Đơn ${finalOrderCode} đã được xử lý trước đó.`,
      orderCode: finalOrderCode,
    });
  }

  serverStore.updateOrderStatus(finalOrderCode, 'completed', { paid: true });
  serverStore.updateTopupStatus(finalOrderCode, 'approved');

  const effectiveCredit = receivedAmount;
  const targetUserId = String(matchedRecord.user_id || '');

  if (targetUserId && targetUserId !== 'anonymous') {
    await adjustUserBalance({
      userId: targetUserId,
      delta: effectiveCredit,
      type: 'DEPOSIT',
      referenceId: finalOrderCode,
      description: `Auto nạp tiền ZaloPay qua MacroDroid (${finalOrderCode})`,
    });

    try {
      await distributeAffiliateCommission({
        refereeId: targetUserId,
        depositAmount: effectiveCredit,
        referenceCode: finalOrderCode,
      });
    } catch (affErr) {
      console.warn('[MacroDroid Webhook] Affiliate commission notice:', affErr);
    }

    await notifyUserDepositSuccess(targetUserId, finalOrderCode, effectiveCredit);
  }

  await sendTelegramAlert(
    [
      `🤖 <b>AUTO DUYỆT NẠP THÀNH CÔNG #${escapeHtml(finalOrderCode)} (+${effectiveCredit.toLocaleString('vi-VN')} VNĐ)</b>`,
      `👤 Khách hàng: <code>${escapeHtml(targetUserId)}</code>`,
      `💰 Số tiền nạp: <b>+${new Intl.NumberFormat('vi-VN').format(effectiveCredit)} VNĐ</b>`,
      `📱 Cơ chế khớp: <b>${matchTier === 1 ? 'Tầng 1 (Khớp mã đơn hàng)' : 'Tầng 2 (Khớp số tiền 20 phút)'}</b>`,
      `⚡ Trạng thái: <b>Đã cộng tiền ví thành công</b>`,
    ].join('\n')
  );

  await appendMacroDroidLogDb({
    method,
    title,
    text,
    rawSnippet: fullMsg,
    receivedAmount: effectiveCredit,
    orderCode: finalOrderCode,
    status: 'SUCCESS',
    message: `Tự động duyệt và cộng ví thành công cho đơn ${finalOrderCode}! (Tầng ${matchTier})`,
  });

  return NextResponse.json({
    success: true,
    message: `Tự động duyệt và cộng ví thành công cho đơn ${finalOrderCode}!`,
    orderCode: finalOrderCode,
    orderId: matchedRecord.id,
    amount: effectiveCredit,
    matchTier,
  });
}

export async function POST(req: Request) {
  try {
    return await handleMacroDroidWebhook(req, 'POST');
  } catch (err: any) {
    console.error('[MacroDroid Webhook POST Exception]:', err);
    await appendMacroDroidLogDb({
      method: 'POST',
      status: 'ERROR',
      message: 'Lỗi xử lý webhook MacroDroid: ' + err.message,
    });
    return NextResponse.json({ error: 'Lỗi xử lý webhook MacroDroid: ' + err.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    return await handleMacroDroidWebhook(req, 'GET');
  } catch (err: any) {
    console.error('[MacroDroid Webhook GET Exception]:', err);
    await appendMacroDroidLogDb({
      method: 'GET',
      status: 'ERROR',
      message: 'Lỗi xử lý webhook MacroDroid: ' + err.message,
    });
    return NextResponse.json({ error: 'Lỗi xử lý webhook MacroDroid: ' + err.message }, { status: 500 });
  }
}
