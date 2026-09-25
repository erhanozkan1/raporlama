import { NextRequest, NextResponse } from 'next/server';
import { getReports, upsertReport, deleteReportById } from '@/lib/data';
import { requireRole } from '@/lib/auth';
import { DailyReport } from '@/lib/types';

export async function GET(req: NextRequest) {
  const session = await requireRole(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const reports = await getReports();
    return NextResponse.json({ success: true, reports });
  } catch (error) {
    console.error('API Error in GET /api/reports:', error);
    return NextResponse.json({ success: false, error: 'Veritabanı okunamadı' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireRole(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Silinecek rapor kimliği belirtilmedi' }, { status: 400 });
    }

    await deleteReportById(id);
    const reports = await getReports();
    return NextResponse.json({ success: true, reports });
  } catch (error: any) {
    console.error('API Error in DELETE /api/reports:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Rapor silinemedi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await requireRole(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const report: DailyReport = body.report;

    if (!report || !report.id || !report.date) {
      return NextResponse.json({ success: false, error: 'Eksik rapor bilgisi' }, { status: 400 });
    }

    await upsertReport(report);
    return NextResponse.json({ success: true, report: { ...report, synced: true } });
  } catch (error) {
    console.error('API Error in POST /api/reports:', error);
    return NextResponse.json({ success: false, error: 'Rapor kaydedilemedi' }, { status: 500 });
  }
}
