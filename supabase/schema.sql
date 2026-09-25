-- ============================================================
-- Döküm Takip Sistemi — Supabase Şeması
-- Supabase Dashboard > SQL Editor'de bu dosyayı çalıştırın.
-- ============================================================

-- 1. Günlük raporlar (rapor gövdesi jsonb olarak saklanır)
create table if not exists reports (
  id text primary key,
  date date not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists reports_date_idx on reports (date desc);
create index if not exists reports_data_gin_idx on reports using gin (data);
create index if not exists reports_date_shift_idx on reports (date, (data->>'shift'));

-- 2. Uygulama ayarları (tek satır: id = 1)
create table if not exists app_settings (
  id int primary key,
  data jsonb not null
);

-- 3. Kullanıcılar (şifreler bcrypt hash olarak saklanır)
create table if not exists users (
  id text primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('superadmin', 'admin', 'operator')),
  avatar text,
  created_at timestamptz not null default now()
);

-- 4. Denetim kayıtları (audit log)
create table if not exists audit_logs (
  id text primary key,
  ts timestamptz not null default now(),
  user_id text,
  user_name text,
  user_role text,
  action text not null,
  resource_name text,
  summary text,
  before_data jsonb,
  after_data jsonb
);
create index if not exists audit_logs_ts_idx on audit_logs (ts desc);

-- RLS Etkinleştirme
alter table reports enable row level security;
alter table app_settings enable row level security;
alter table users enable row level security;
alter table audit_logs enable row level security;

-- 5. RLS Politikaları (Anon ve Authenticated rollere tam erişim izni)
drop policy if exists "Allow all for reports" on reports;
create policy "Allow all for reports" on reports for all using (true) with check (true);

drop policy if exists "Allow all for app_settings" on app_settings;
create policy "Allow all for app_settings" on app_settings for all using (true) with check (true);

drop policy if exists "Allow all for users" on users;
create policy "Allow all for users" on users for all using (true) with check (true);

drop policy if exists "Allow all for audit_logs" on audit_logs;
create policy "Allow all for audit_logs" on audit_logs for all using (true) with check (true);

-- 6. Fotoğraflar için public storage bucket ve politikaları
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "Public Access to Photos" on storage.objects;
create policy "Public Access to Photos" on storage.objects for select using (bucket_id = 'photos');

drop policy if exists "Public Upload to Photos" on storage.objects;
create policy "Public Upload to Photos" on storage.objects for insert with check (bucket_id = 'photos');

drop policy if exists "Public Update to Photos" on storage.objects;
create policy "Public Update to Photos" on storage.objects for update using (bucket_id = 'photos');

drop policy if exists "Public Delete to Photos" on storage.objects;
create policy "Public Delete to Photos" on storage.objects for delete using (bucket_id = 'photos');

-- ============================================================
-- SEED VERİLERİ
-- ============================================================

-- Superadmin kullanıcı (e-posta: erhn.ozkan@gmail.com / şifre: admin123)
insert into users (id, name, email, password_hash, role)
values (
  'user-superadmin',
  'Erhan Özkan',
  'erhn.ozkan@gmail.com',
  '$2b$10$rIItq66CuMQhRPJxqiley.ePvcQRMAzKG7JAF.2Mx85G8LN6mAF6a',
  'superadmin'
)
on conflict (email) do nothing;

-- Varsayılan sistem ayarları (ocaklar, etiketler, vardiyalar, aylık hedef)
insert into app_settings (id, data)
values (1, '{
  "furnaces": [
    {
      "id": "furnace-1",
      "name": "Mazotlu Bakır Ocağı (Büyük)",
      "capacity": "500 kg",
      "status": "Çalışıyor",
      "fuelType": "Mazot",
      "description": "Yüksek ısılı fırınlarda kullanılan verimli yakıt brülörüne sahip ana döküm ünitesi.",
      "liningLifeMax": 200,
      "liningChargeCount": 0,
      "maintenanceHistory": []
    },
    {
      "id": "furnace-2",
      "name": "Mazotlu Bakır Ocağı (Küçük)",
      "capacity": "200 kg",
      "status": "Çalışıyor",
      "fuelType": "Mazot",
      "description": "Hızlı ve küçük ölçekli butik üretimler için yedek döküm kazanı.",
      "liningLifeMax": 150,
      "liningChargeCount": 0,
      "maintenanceHistory": []
    },
    {
      "id": "furnace-3",
      "name": "İndüksiyon Ocağı",
      "capacity": "1000 kg",
      "status": "Arızalı",
      "fuelType": "Elektrik",
      "description": "Yüksek elektrik akımıyla hassas alaşımların eritildiği manyetik indüksiyon fırını.",
      "liningLifeMax": 300,
      "liningChargeCount": 0,
      "maintenanceHistory": []
    }
  ],
  "tags": ["Arıza", "Bakım", "Elektrik Kesintisi", "Mazot", "Kalıp", "Hurda", "Sevkiyat", "Kalite", "Ziyaret"],
  "shifts": ["1. Vardiya (08:00 - 16:00)", "2. Vardiya (16:00 - 24:00)", "3. Vardiya (24:00 - 08:00)", "Tüm Gün"],
  "monthlyTargetTons": 50
}'::jsonb)
on conflict (id) do nothing;
