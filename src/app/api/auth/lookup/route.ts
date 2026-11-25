import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const { identifier } = await req.json();
    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json({ error: 'IDENTIFIER_REQUIRED', message: 'Vui lòng nhập Email, Số điện thoại hoặc ID Telegram.' }, { status: 400 });
    }

    const cleanId = identifier.trim();
    const cleanTele = cleanId.startsWith('@') ? cleanId.slice(1) : cleanId;

    // Fast-path resolution for Official Admin Credentials
    const lowerId = cleanId.toLowerCase();
    const lowerTele = cleanTele.toLowerCase();
    if (
      lowerTele === 'yukiisme2311' || 
      lowerId === '8960751162' || 
      lowerId === 'admin' || 
      lowerId === 'yukiisme2311@yukishopmxh.internal' ||
      lowerId === 'admin@yukishopmxh.com'
    ) {
      return NextResponse.json({
        found: true,
        email: 'yukiisme2311@yukishopmxh.internal',
        role: 'ADMIN',
      });
    }

    // Direct check if it already has @ and . (standard email format)
    const isDirectEmail = cleanId.includes('@') && cleanId.includes('.');

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      if (isDirectEmail) {
        return NextResponse.json({ found: true, email: cleanId });
      }
      return NextResponse.json({ error: 'DB_UNCONFIGURED', message: 'Hệ thống đang cấu hình.' }, { status: 500 });
    }

    // Query profiles for any match: email, phone, phone_number, telegram_id, telegram_username
    const { data, error } = await supabase
      .from('profiles')
      .select('email, phone, phone_number, telegram_id, telegram_username')
      .or(`email.ilike.${cleanId},phone.eq.${cleanId},phone_number.eq.${cleanId},telegram_id.ilike.${cleanTele},telegram_username.ilike.${cleanTele}`)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Identifier lookup error:', error);
    }

    if (data && data.email) {
      return NextResponse.json({ found: true, email: data.email });
    }

    // If identifier is an email format, allow trying with that email
    if (isDirectEmail) {
      return NextResponse.json({ found: true, email: cleanId });
    }

    return NextResponse.json({
      found: false,
      message: 'Không tìm thấy tài khoản tương ứng với Email, Số điện thoại hoặc ID Telegram này.',
    }, { status: 404 });
  } catch (err: any) {
    console.error('Lookup API exception:', err);
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message || 'Lỗi xử lý tra cứu.' }, { status: 500 });
  }
}
