import { NextRequest, NextResponse } from 'next/server';
import { getReports } from '@/lib/data';
import { requireRole } from '@/lib/auth';
import { DailyReport } from '@/lib/types';

export async function POST(req: NextRequest) {
  const session = await requireRole(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    // Çakışmaları önlemek için istemci verileri sunucudaki verileri ezmez;
    // doğrudan sunucunun en güncel rapor listesi döndürülür.
    const reports = await getReports();

    return NextResponse.json({ success: true, reports });
  } catch (error) {
    console.error('API Error in /api/sync:', error);
    return NextResponse.json({ success: false, error: 'Senkronizasyon başarısız oldu' }, { status: 500 });
  }
}
