import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';
import { UserRole, SafeUser } from './types';

// ============================================================
// İmzalı JWT oturum yönetimi (jose — Edge + Node uyumlu)
// AUTH_SECRET env değişkeni production'da ZORUNLUDUR.
// ============================================================

export const SESSION_COOKIE_NAME = 'dokum_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 gün

export interface SessionData {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET env değişkeni production ortamında zorunludur.');
    }
    // Yalnızca yerel geliştirme için sabit anahtar
    return new TextEncoder().encode('dokum-takip-dev-secret-key-change-me');
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(user: SafeUser): Promise<string> {
  return new SignJWT({
    name: user.name,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (!payload.sub || !payload.email || !payload.role) return null;
    return {
      userId: payload.sub,
      name: (payload.name as string) || '',
      email: payload.email as string,
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

/** API route'larında oturum okuma (cookie üzerinden). */
export async function getSessionFromRequest(req: NextRequest): Promise<SessionData | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/**
 * Rol koruması: oturum yoksa veya rol yetersizse null döner.
 * Kullanım: const session = await requireRole(req, ['superadmin']);
 */
export async function requireRole(
  req: NextRequest,
  roles?: UserRole[]
): Promise<SessionData | null> {
  const session = await getSessionFromRequest(req);
  if (!session) return null;
  if (roles && roles.length > 0 && !roles.includes(session.role)) return null;
  return session;
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE_SECONDS,
};
