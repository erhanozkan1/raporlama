-- ============================================================
-- DÖKÜM TAKİP SİSTEMİ — VARDİYA KAYIT SİSTEMİ GÜNCELLEMESİ
-- Bu migrasyon betiği MEVCUT VERİLERİ KORUR (Sıfır Veri Kaybı).
-- Supabase Dashboard > SQL Editor sekmesinde güvenle çalıştırabilirsiniz.
-- ============================================================

-- 1. ŞİFRE SIFIRLAMA (Giriş Yapamama Durumu İçin)
-- Kullanıcı e-postası için şifreyi geçici olarak 'admin123' yapar.
-- Dilerseniz aşağıdaki şifreyi değiştirebilirsiniz.
UPDATE users 
SET password_hash = '$2b$10$rIItq66CuMQhRPJxqiley.ePvcQRMAzKG7JAF.2Mx85G8LN6mAF6a'
WHERE email = 'erhn.ozkan@gmail.com';


-- 2. VARDİYA VE PERFORMANS İNDEKSLERİ (JSONB Sorgu Optimizasyonu)
-- Vardiya adı, amiri ve toplam duruş süresi için hızlı filtreleme indeksleri
CREATE INDEX IF NOT EXISTS idx_reports_shift_name 
ON reports ((data->>'shift'));

CREATE INDEX IF NOT EXISTS idx_reports_supervisor 
ON reports ((data->'personnel'->>'supervisorName'));

CREATE INDEX IF NOT EXISTS idx_reports_has_downtimes 
ON reports USING gin ((data->'downtimes'));


-- 3. İLİŞKİSEL GÖRÜNÜM (VIEW): VARDİYA ÖZET TABLOSU
-- (Not: View'lar fiziksel veri tutmaz, DROP VIEW tablodaki verileri ASLA etkilemez)
DROP VIEW IF EXISTS v_shift_summary CASCADE;
CREATE VIEW v_shift_summary AS
SELECT 
  id AS report_id,
  date AS report_date,
  data->>'shift' AS shift_name,
  data->'personnel'->>'supervisorName' AS supervisor,
  COALESCE((data->'personnel'->>'totalCount')::int, 0) AS total_personnel,
  COALESCE((data->'personnel'->>'absentCount')::int, 0) AS absent_personnel,
  COALESCE((data->'shiftHours'->>'plannedDurationHours')::numeric, 8) AS planned_hours,
  COALESCE((data->'shiftHours'->>'breakDurationMinutes')::numeric, 60) AS break_minutes,
  COALESCE((data->'shiftHours'->>'totalDowntimeMinutes')::numeric, 0) AS total_downtime_minutes,
  COALESCE((data->'shiftHours'->>'netWorkDurationHours')::numeric, 0) AS net_work_hours,
  updated_at
FROM reports;


-- 4. İLİŞKİSEL GÖRÜNÜM (VIEW): TÜM ARIZA VE DURUŞLAR LİSTESİ
DROP VIEW IF EXISTS v_shift_downtimes CASCADE;
CREATE VIEW v_shift_downtimes AS
SELECT 
  r.id AS report_id,
  r.date AS report_date,
  r.data->>'shift' AS shift_name,
  d->>'id' AS downtime_id,
  d->>'category' AS category,
  d->>'furnaceName' AS furnace_name,
  d->>'startTime' AS start_time,
  d->>'endTime' AS end_time,
  COALESCE((d->>'durationMinutes')::numeric, 0) AS duration_minutes,
  d->>'description' AS description,
  d->>'actionTaken' AS action_taken,
  d->>'technician' AS technician
FROM reports r,
LATERAL jsonb_array_elements(
  CASE 
    WHEN jsonb_typeof(r.data->'downtimes') = 'array' THEN r.data->'downtimes' 
    ELSE '[]'::jsonb 
  END
) AS d;


-- 5. YENİ GÖRÜNÜMLER (VIEW) İÇİN GÜVENLİK İZİNLERİ
GRANT SELECT ON v_shift_summary TO anon, authenticated;
GRANT SELECT ON v_shift_downtimes TO anon, authenticated;

-- ============================================================
-- TAMAMLANDI: Mevcut hiçbir rapor silinmedi veya değiştirilmedi.
-- ============================================================
