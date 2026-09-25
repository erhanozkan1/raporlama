import { NextRequest, NextResponse } from 'next/server';
import { getUsers, addUser, updateUserRole, deleteUserById } from '@/lib/data';
import { requireRole } from '@/lib/auth';
import { UserRole } from '@/lib/types';

// Kullanıcı yönetimi yalnızca superadmin yetkisindedir.

export async function GET(req: NextRequest) {
  const session = await requireRole(req, ['superadmin']);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
  }

  try {
    const users = await getUsers();
    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('API Error in GET /api/users:', error);
    return NextResponse.json({ success: false, error: 'Kullanıcılar okunamadı' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await requireRole(req, ['superadmin']);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, email, password, role } = body as {
      name?: string;
      email?: string;
      password?: string;
      role?: UserRole;
    };

    if (!name?.trim() || !email?.trim() || !password?.trim() || !role) {
      return NextResponse.json({ success: false, error: 'Tüm alanlar zorunludur' }, { status: 400 });
    }

    const existing = await getUsers();
    if (existing.some((u) => u.email.toLowerCase() === email.toLowerCase().trim())) {
      return NextResponse.json(
        { success: false, error: 'Bu e-posta adresiyle kayıtlı bir kullanıcı zaten var' },
        { status: 409 }
      );
    }

    const user = await addUser({ name: name.trim(), email: email.trim(), password, role });
    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('API Error in POST /api/users:', error);
    return NextResponse.json({ success: false, error: 'Kullanıcı oluşturulamadı' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await requireRole(req, ['superadmin']);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { userId, role } = body as { userId?: string; role?: UserRole };

    if (!userId || !role) {
      return NextResponse.json({ success: false, error: 'Eksik parametre' }, { status: 400 });
    }

    await updateUserRole(userId, role);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error in PATCH /api/users:', error);
    return NextResponse.json({ success: false, error: 'Rol güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireRole(req, ['superadmin']);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
  }

  try {
    const userId = req.nextUrl.searchParams.get('id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Kullanıcı kimliği belirtilmedi' }, { status: 400 });
    }

    // Superadmin kendini silemesin
    if (userId === session.userId) {
      return NextResponse.json({ success: false, error: 'Kendi hesabınızı silemezsiniz' }, { status: 400 });
    }

    await deleteUserById(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error in DELETE /api/users:', error);
    return NextResponse.json({ success: false, error: 'Kullanıcı silinemedi' }, { status: 500 });
  }
}
