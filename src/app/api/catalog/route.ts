import { NextResponse } from 'next/server';
import { getUnifiedCatalogData } from '@/lib/catalog/server-catalog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const data = await getUnifiedCatalogData({ includeInternal: false });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
