import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs, addAuditLog } from '@/lib/data';
import { requireRole } from '@/lib/auth';
import { AuditLog } from '@/lib/types';

export async function GET(req: NextRequest) {
  // Denetim kayıtlarını yalnızca superadmin görüntüleyebilir
  const session = await requireRole(req, ['superadmin']);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
  }

  try {
    const logs = await getAuditLogs();
    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error('API Error in GET /api/audit:', error);
    return NextResponse.json({ success: false, error: 'Denetim kayıtları okunamadı' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Her oturum sahibi kullanıcı işlem kaydı yazabilir
  const session = await requireRole(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const log: AuditLog = body.log;

    if (!log || !log.action) {
      return NextResponse.json({ success: false, error: 'Eksik kayıt bilgisi' }, { status: 400 });
    }

    // Kimlik bilgilerini istemciden değil oturumdan al (sahte kayıt önlenir)
    const secured: AuditLog = {
      ...log,
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      timestamp: log.timestamp || new Date().toISOString(),
    };

    await addAuditLog(secured);
    return NextResponse.json({ success: true, log: secured });
  } catch (error) {
    console.error('API Error in POST /api/audit:', error);
    return NextResponse.json({ success: false, error: 'Denetim kaydı yazılamadı' }, { status: 500 });
  }
}
