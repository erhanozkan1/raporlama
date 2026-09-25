# Vercel + Supabase Deploy Rehberi

## 1. Supabase Projesi

1. [supabase.com](https://supabase.com) → **New Project** oluşturun.
2. **SQL Editor**'ü açın, bu repodaki [`supabase/schema.sql`](supabase/schema.sql) dosyasının içeriğini yapıştırıp **Run** deyin.
   - Tablolar (`reports`, `app_settings`, `users`, `audit_logs`), `photos` storage bucket'ı ve superadmin kullanıcısı otomatik oluşur.
3. **Project Settings → API** sayfasından şu iki değeri not alın:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `service_role` anahtarı → `SUPABASE_SERVICE_ROLE_KEY` *(gizli — asla client koduna koymayın)*

## 2. AUTH_SECRET Üretin

```bash
openssl rand -base64 32
```

(Windows PowerShell: `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))`)

## 3. Vercel

1. Repoyu GitHub'a push'layın, Vercel'de **Import Project** deyin (framework otomatik: Next.js).
2. **Environment Variables** bölümüne ekleyin:

   | Değişken | Değer |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase proje URL'i |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role anahtarı |
   | `AUTH_SECRET` | Ürettiğiniz rastgele anahtar |
   | `GEMINI_API_KEY` | Google AI Studio API anahtarı (AI analizi için) |

3. **Deploy** deyin.

## 4. İlk Giriş

- E-posta: `erhn.ozkan@gmail.com`
- Şifre: `admin123`

> ⚠️ İlk girişten sonra Kullanıcı Yönetimi'nden yeni bir superadmin oluşturup
> varsayılan şifreyi değiştirmeniz/hesabı yenilemeniz önerilir.

## Mimari Notlar

- **Veri katmanı** ([lib/data.ts](lib/data.ts)): Supabase env değişkenleri tanımlıysa Supabase,
  değilse yerel `data/db.json` dosyası kullanılır. Yerel geliştirme Supabase'siz de çalışır.
- **Kimlik doğrulama**: bcrypt ile hash'lenmiş şifreler + `jose` ile imzalı JWT (httpOnly cookie).
  Eski düz metin şifreler ilk başarılı girişte otomatik hash'e yükseltilir.
- **Fotoğraflar**: Production'da Supabase Storage (`photos` bucket, public);
  yerelde `public/uploads/`.
- **PWA**: `app/manifest.ts` + `public/sw.js`. Telefonda Safari/Chrome →
  **Paylaş → Ana Ekrana Ekle** ile uygulama gibi kurulur; service worker yalnızca
  production build'de kayıt olur.
- **Roller**: `superadmin` (tam yetki + kullanıcı yönetimi + denetim izi),
  `admin` (ayarlar + ocaklar), `operator` (rapor girişi). API tarafında da doğrulanır.
