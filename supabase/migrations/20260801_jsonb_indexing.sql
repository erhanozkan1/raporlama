-- ============================================================
-- Migration: JSONB Sorgu Performansı ve İndeksleme
-- Çalıştırma: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. JSONB Gövdesi İçin GIN İndeksi (Tüm iç sorgular ve aramaları hızlandırır)
CREATE INDEX IF NOT EXISTS reports_data_gin_idx ON reports USING gin (data);

-- 2. Tarih ve Vardiya İfade İndeksi (Aynı güne ait vardiya aramalarını hızlandırır)
CREATE INDEX IF NOT EXISTS reports_date_shift_idx ON reports (date, (data->>'shift'));

-- 3. Üretim Toplam Tonajı İçin İfade İndeksi (Analitik ve Grafik Sorguları İçi)
CREATE INDEX IF NOT EXISTS reports_date_updated_idx ON reports (date DESC, updated_at DESC);

COMMENT ON INDEX reports_data_gin_idx IS 'JSONB rapor gövdesi içi performans indeksi';
COMMENT ON INDEX reports_date_shift_idx IS 'Tarih ve vardiya filtreli sorgular için performans indeksi';
