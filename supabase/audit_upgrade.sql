-- ============================================================
-- DÖKÜM OPERASYON TAKİP SİSTEMİ
-- GELİŞMİŞ DENETİM İZİ (AUDIT LOG) VERİTABANI GÜNCELLEMESİ
-- ============================================================
-- Bu SQL kodunu Supabase Dashboard -> SQL Editor alanına
-- yapıştırıp "RUN" butonuna basarak çalıştırabilirsiniz.
-- ============================================================

-- 1. audit_logs tablosunu oluştur (eğer daha önce yoksa)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id TEXT,
    user_name TEXT,
    user_role TEXT,
    action TEXT NOT NULL,
    resource_name TEXT,
    summary TEXT,
    category TEXT,
    severity TEXT DEFAULT 'info',
    ip_address TEXT,
    user_agent TEXT,
    before_data JSONB,
    after_data JSONB
);

-- 2. Eğer tablo zaten varsa yeni detay sütunlarını güvenle ekle
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- 3. Hızlı sorgulama, zaman tüneli ve filtreleme için indeksler
CREATE INDEX IF NOT EXISTS idx_audit_logs_ts ON audit_logs (ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs (category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);

-- 4. RLS Güvenlik Politikası
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for audit_logs" ON audit_logs;
CREATE POLICY "Allow all for audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
