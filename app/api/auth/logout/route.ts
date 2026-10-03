import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, sessionCookieOptions, getSessionFromRequest } from '@/lib/auth';
import { addAuditLog } from '@/lib/data';

export async function POST(req: NextRequest) {
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                    req.headers.get('x-real-ip') || 
                    '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || 'Bilinmeyen Cihaz';

  try {
    const session = await getSessionFromRequest(req);
    if (session) {
      await addAuditLog({
        id: `log-logout-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        userId: session.userId,
        userName: session.name,
        userRole: session.role,
        action: 'ÇIKIŞ_YAPILDI',
        resourceName: 'Oturum Kapatma',
        summary: `${session.name} (${session.role.toUpperCase()}) oturumunu sonlandırdı.`,
        category: 'Oturum & Güvenlik',
        severity: 'info',
        ipAddress,
        userAgent,
        afterData: { email: session.email },
      }).catch(() => {});
    }
  } catch {}

  const response = NextResponse.json({ success: true });

  response.cookies.set(SESSION_COOKIE_NAME, '', {
    ...sessionCookieOptions,
    maxAge: 0,
  });

  return response;
}
