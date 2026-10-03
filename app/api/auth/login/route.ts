import { NextRequest, NextResponse } from 'next/server';
import { verifyUserCredentials, addAuditLog } from '@/lib/data';
import { signSession, SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                    req.headers.get('x-real-ip') || 
                    '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || 'Bilinmeyen Cihaz';

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'E-posta ve şifre gereklidir' },
        { status: 400 }
      );
    }

    const user = await verifyUserCredentials(email, password);

    if (!user) {
      // Güvenlik denetim izi: Başarısız oturum açma denemesi
      await addAuditLog({
        id: `log-auth-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        userId: 'anonymous',
        userName: email,
        userRole: 'operator',
        action: 'GİRİŞ_BAŞARISIZ',
        resourceName: 'Kullanıcı Girişi',
        summary: `'${email}' hesabı için hatalı şifre veya e-posta ile başarısız oturum açma denemesi.`,
        category: 'Oturum & Güvenlik',
        severity: 'warning',
        ipAddress,
        userAgent,
        afterData: { attemptedEmail: email },
      }).catch(() => {});

      return NextResponse.json(
        { success: false, error: 'Geçersiz e-posta veya şifre' },
        { status: 401 }
      );
    }

    const token = await signSession(user);

    // Güvenlik denetim izi: Başarılı oturum açma
    await addAuditLog({
      id: `log-auth-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'GİRİŞ_BAŞARILI',
      resourceName: 'Kullanıcı Girişi',
      summary: `${user.name} (${user.role.toUpperCase()}) sisteme başarıyla giriş yaptı.`,
      category: 'Oturum & Güvenlik',
      severity: 'success',
      ipAddress,
      userAgent,
      afterData: { email: user.email, role: user.role },
    }).catch(() => {});

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
      token,
    });

    // İmzalı JWT, httpOnly cookie olarak (client JS okuyamaz — XSS koruması)
    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Giriş işlemi başarısız' },
      { status: 500 }
    );
  }
}
