import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Sunucu tarafı Supabase istemcisi (service_role anahtarı — asla client'a sızdırmayın).
// Env değişkenleri tanımlı değilse uygulama dosya tabanlı yerel DB'ye (lib/db.ts) düşer.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const hasSupabase: boolean = Boolean(url && key);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!url || !key) {
    throw new Error(
      'Supabase yapılandırılmamış: NEXT_PUBLIC_SUPABASE_URL ve Supabase anahtarını (.env.local) ayarlayın.'
    );
  }
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
