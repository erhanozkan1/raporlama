import { NextRequest, NextResponse } from 'next/server';
import { getSettingsData, saveSettingsData } from '@/lib/data';
import { requireRole } from '@/lib/auth';
import { AppSettings } from '@/lib/types';

export async function GET(req: NextRequest) {
  const session = await requireRole(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const settings = await getSettingsData();
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('API Error in GET /api/settings:', error);
    return NextResponse.json({ success: false, error: 'Ayarlar okunamadı' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await requireRole(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const settings: AppSettings = body.settings;

    if (!settings) {
      return NextResponse.json({ success: false, error: 'Eksik ayar bilgisi' }, { status: 400 });
    }

    const saved = await saveSettingsData(settings);
    return NextResponse.json({ success: true, settings: saved });
  } catch (error) {
    console.error('API Error in POST /api/settings:', error);
    return NextResponse.json({ success: false, error: 'Ayarlar kaydedilemedi' }, { status: 500 });
  }
}
