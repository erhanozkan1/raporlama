import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { hasSupabase, getSupabase } from '@/lib/supabase';
import { requireRole } from '@/lib/auth';

const PHOTOS_BUCKET = 'photos';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  const session = await requireRole(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Dosya yüklenmedi' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'Dosya boyutu 10 MB sınırını aşıyor' }, { status: 413 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'Yalnızca görsel dosyaları yüklenebilir' }, { status: 415 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileExt = path.extname(file.name) || '.png';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${fileExt}`;

    // Production (Vercel): Supabase Storage — kalıcı depolama
    if (hasSupabase) {
      const supabase = getSupabase();
      const { error } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .upload(uniqueName, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        console.error('Supabase Storage upload error:', error);
        return NextResponse.json({ success: false, error: 'Bulut depolama hatası' }, { status: 500 });
      }

      const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(uniqueName);
      return NextResponse.json({ success: true, url: data.publicUrl });
    }

    // Yerel geliştirme: public/uploads klasörü
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    fs.writeFileSync(path.join(uploadsDir, uniqueName), buffer);
    return NextResponse.json({ success: true, url: `/uploads/${uniqueName}` });
  } catch (error) {
    console.error('API Error in /api/upload:', error);
    return NextResponse.json({ success: false, error: 'Dosya yükleme hatası' }, { status: 500 });
  }
}
