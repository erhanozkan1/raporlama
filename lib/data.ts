import bcrypt from 'bcryptjs';
import { DailyReport, AppSettings, User, SafeUser, UserRole, AuditLog } from './types';
import { hasSupabase, getSupabase } from './supabase';
import { sortFurnaces } from './furnaceOrder';
// ============================================================
// Veri Katmanı: SADECE SUPABASE (Yerel db.json kaydı devre dışı)
// ============================================================

// ---------- RAPORLAR (SADECE SUPABASE) ----------

export async function getReports(): Promise<DailyReport[]> {
  if (!hasSupabase) {
    throw new Error('Yerel kayıt devre dışı: Supabase bağlantısı zorunludur.');
  }
  const { data, error } = await getSupabase()
    .from('reports')
    .select('data')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => ({ ...(r.data as DailyReport), synced: true }));
}

export async function upsertReport(report: DailyReport): Promise<void> {
  if (!hasSupabase) {
    throw new Error('Yerel kayıt devre dışı: Supabase bağlantısı zorunludur.');
  }
  const stored: DailyReport = { ...report, synced: true };
  const { error } = await getSupabase().from('reports').upsert({
    id: stored.id,
    date: stored.date,
    data: stored,
    updated_at: stored.updatedAt || new Date().toISOString(),
  });
  if (error) throw error;
}

/**
 * Rapor senkronizasyonu: Doğrudan canlı Supabase üzerinde çalışır, yerel dosya tutulmaz.
 */
export async function mergeReports(clientReports: DailyReport[], deletedIds: string[] = []): Promise<DailyReport[]> {
  if (!hasSupabase) {
    throw new Error('Yerel kayıt devre dışı: Supabase bağlantısı zorunludur.');
  }
  const supabase = getSupabase();

  // 1. Silinen kayıtları Supabase'den kalıcı olarak sil
  if (deletedIds.length > 0) {
    for (const delId of deletedIds) {
      const isDate = /^\d{4}-\d{2}-\d{2}$/.test(delId);
      if (isDate) {
        await supabase.from('reports').delete().or(`id.eq.${delId},date.eq.${delId}`);
      } else {
        await supabase.from('reports').delete().eq('id', delId);
      }
    }
  }

  // 2. Silinmiş olanları istemci listesinden ayıkla
  const safeClientReports = clientReports.filter(
    (cr) => !deletedIds.includes(cr.id) && !deletedIds.includes(cr.date)
  );

  const { data, error } = await supabase.from('reports').select('id, updated_at');
  if (error) throw error;

  const serverTimes = new Map<string, number>(
    (data || []).map((r) => [r.id as string, new Date(r.updated_at as string).getTime()])
  );

  const toUpsert = safeClientReports.filter((cr) => {
    const serverTime = serverTimes.get(cr.id);
    if (serverTime === undefined) return true;
    return new Date(cr.updatedAt || 0).getTime() > serverTime;
  });

  if (toUpsert.length > 0) {
    const rows = toUpsert.map((r) => ({
      id: r.id,
      date: r.date,
      data: { ...r, synced: true },
      updated_at: r.updatedAt || new Date().toISOString(),
    }));
    const { error: upsertError } = await supabase.from('reports').upsert(rows);
    if (upsertError) throw upsertError;
  }

  return getReports();
}

export async function deleteReportById(id: string): Promise<void> {
  if (!hasSupabase) {
    throw new Error('Yerel kayıt devre dışı: Supabase bağlantısı zorunludur.');
  }
  const isDate = /^\d{4}-\d{2}-\d{2}$/.test(id);
  const supabase = getSupabase();
  if (isDate) {
    const { error } = await supabase.from('reports').delete().or(`id.eq.${id},date.eq.${id}`);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('reports').delete().eq('id', id);
    if (error) throw error;
  }
}

// ---------- AYARLAR ----------

export async function getSettingsData(): Promise<AppSettings> {
  if (!hasSupabase) {
    throw new Error('Yerel kayıt devre dışı: Supabase bağlantısı zorunludur.');
  }
  const { data, error } = await getSupabase()
    .from('app_settings')
    .select('data')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  if (data?.data) {
    const s = data.data as AppSettings;
    if (Array.isArray(s.furnaces)) {
      s.furnaces = sortFurnaces(s.furnaces);
    }
    return s;
  }
  return {
    tags: ['Arıza', 'Bakım', 'Elektrik Kesintisi', 'Mazot', 'Kalıp', 'Hurda', 'Sevkiyat', 'Kalite', 'Ziyaret'],
    shifts: ['1. Vardiya (08:00 - 16:00)', '2. Vardiya (16:00 - 24:00)', '3. Vardiya (24:00 - 08:00)', 'Tüm Gün'],
    furnaces: [],
    monthlyTargetKg: 100000,
  };
}

export async function saveSettingsData(settings: AppSettings): Promise<AppSettings> {
  if (!hasSupabase) {
    throw new Error('Yerel kayıt devre dışı: Supabase bağlantısı zorunludur.');
  }
  if (Array.isArray(settings.furnaces)) {
    settings.furnaces = sortFurnaces(settings.furnaces);
  }
  const { error } = await getSupabase()
    .from('app_settings')
    .upsert({ id: 1, data: settings });
  if (error) throw error;
  return settings;
}

// ---------- KULLANICILAR ----------

interface SupabaseUserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  avatar: string | null;
  created_at: string;
}

function rowToSafeUser(row: SupabaseUserRow): SafeUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar: row.avatar || undefined,
    createdAt: row.created_at,
  };
}

function isBcryptHash(value: string): boolean {
  return value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$');
}

/**
 * Kimlik doğrulama. Dosya DB'deki eski düz metin şifreler ilk başarılı
 * girişte otomatik olarak bcrypt hash'ine yükseltilir.
 */
export async function verifyUserCredentials(
  email: string,
  password: string
): Promise<SafeUser | null> {
  const normalizedEmail = email.toLowerCase().trim();

  if (hasSupabase) {
    let { data, error } = await getSupabase()
      .from('users')
      .select('*')
      .ilike('email', normalizedEmail)
      .maybeSingle();
    if (error) throw error;

    if (!data) {
      // Supabase'deki kullanıcı tablosu boşsa varsayılan superadmin'i tohumla
      await getUsers();
      const refetched = await getSupabase()
        .from('users')
        .select('*')
        .ilike('email', normalizedEmail)
        .maybeSingle();
      data = refetched.data;
    }

    if (!data) return null;

    const row = data as SupabaseUserRow;
    const ok = isBcryptHash(row.password_hash)
      ? await bcrypt.compare(password, row.password_hash)
      : row.password_hash === password;

    if (!ok) return null;

    // Eski düz metin kayıt varsa hash'e yükselt
    if (!isBcryptHash(row.password_hash)) {
      await getSupabase()
        .from('users')
        .update({ password_hash: await bcrypt.hash(password, 10) })
        .eq('id', row.id);
    }
    return rowToSafeUser(row);
  }

  throw new Error('Yerel kimlik doğrulama devre dışı: Supabase bağlantısı zorunludur.');
}

export async function getUsers(): Promise<SafeUser[]> {
  if (!hasSupabase) {
    throw new Error('Yerel kullanıcı kaydı devre dışı: Supabase bağlantısı zorunludur.');
  }

  const { data, error } = await getSupabase()
    .from('users')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;

  return (data || []).map((r) => rowToSafeUser(r as SupabaseUserRow));
}

export async function addUser(input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<SafeUser> {
  if (!hasSupabase) {
    throw new Error('Yerel kullanıcı kaydı devre dışı: Supabase bağlantısı zorunludur.');
  }

  const id = `user-${Date.now()}`;
  const createdAt = new Date().toISOString();
  const passwordHash = await bcrypt.hash(input.password, 10);

  const { error } = await getSupabase().from('users').insert({
    id,
    name: input.name,
    email: input.email.toLowerCase().trim(),
    password_hash: passwordHash,
    role: input.role,
    created_at: createdAt,
  });
  if (error) throw error;
  return { id, name: input.name, email: input.email, role: input.role, createdAt };
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  if (!hasSupabase) {
    throw new Error('Yerel kullanıcı kaydı devre dışı: Supabase bağlantısı zorunludur.');
  }
  const { error } = await getSupabase().from('users').update({ role }).eq('id', userId);
  if (error) throw error;
}

export async function deleteUserById(userId: string): Promise<void> {
  if (!hasSupabase) {
    throw new Error('Yerel kullanıcı kaydı devre dışı: Supabase bağlantısı zorunludur.');
  }
  const { error } = await getSupabase().from('users').delete().eq('id', userId);
  if (error) throw error;
}

// ---------- DENETİM KAYITLARI (AUDIT LOG) ----------

interface SupabaseAuditRow {
  id: string;
  ts: string;
  user_id: string | null;
  user_name: string | null;
  user_role: string | null;
  action: string;
  resource_name: string | null;
  summary: string | null;
  before_data: unknown;
  after_data: unknown;
}

export async function getAuditLogs(limit = 300): Promise<AuditLog[]> {
  if (!hasSupabase) {
    throw new Error('Yerel denetim kaydı devre dışı: Supabase bağlantısı zorunludur.');
  }
  const { data, error } = await getSupabase()
    .from('audit_logs')
    .select('*')
    .order('ts', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((r) => {
    const row = r as SupabaseAuditRow;
    return {
      id: row.id,
      timestamp: row.ts,
      userId: row.user_id || 'system',
      userName: row.user_name || 'Sistem',
      userRole: (row.user_role as AuditLog['userRole']) || 'operator',
      action: row.action as AuditLog['action'],
      resourceName: row.resource_name || '',
      summary: row.summary || '',
      beforeData: row.before_data ?? undefined,
      afterData: row.after_data ?? undefined,
    };
  });
}

export async function addAuditLog(log: AuditLog): Promise<void> {
  if (!hasSupabase) {
    throw new Error('Yerel denetim kaydı devre dışı: Supabase bağlantısı zorunludur.');
  }
  const { error } = await getSupabase().from('audit_logs').insert({
    id: log.id,
    ts: log.timestamp,
    user_id: log.userId,
    user_name: log.userName,
    user_role: log.userRole,
    action: log.action,
    resource_name: log.resourceName,
    summary: log.summary,
    before_data: log.beforeData ?? null,
    after_data: log.afterData ?? null,
  });
  if (error) throw error;
}
