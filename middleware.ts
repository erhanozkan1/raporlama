import { NextRequest, NextResponse } from 'next/server';
import { verifySession, SESSION_COOKIE_NAME } from './lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Login sayfası, auth/ai API'leri ve statik dosyalar için oturum kontrolü yapma
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/ai') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js' ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    // API istekleri için 401 JSON; sayfa istekleri için login'e yönlendir
    if (pathname.startsWith('/api')) {
      return NextResponse.json(
        { success: false, error: 'Oturum geçersiz veya süresi dolmuş' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads).*)'],
};
