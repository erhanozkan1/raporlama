const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*"?(.*?)"?\s*$/);
    if (match) {
      const key = match[1];
      let val = (match[2] || '').trim();
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials bulunamadı!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSupabaseData() {
  console.log('=== SUPABASE OCAK VERİSİ DÜZELTMESİ ===\n');

  // 1. Settings'deki furnace-3 durumunu güncelle
  console.log('1. App settings güncelleniyor...');
  const { data: settingsRow, error: settingsErr } = await supabase
    .from('app_settings')
    .select('data')
    .eq('id', 1)
    .maybeSingle();

  if (settingsErr) {
    console.error('Settings okuma hatası:', settingsErr.message);
  } else if (settingsRow && settingsRow.data) {
    const settings = settingsRow.data;
    let changed = false;
    
    if (settings.furnaces) {
      settings.furnaces.forEach(f => {
        if (f.id === 'furnace-3' && f.status !== 'Çalışıyor') {
          console.log(`   ${f.name}: "${f.status}" -> "Çalışıyor"`);
          f.status = 'Çalışıyor';
          changed = true;
        }
      });
    }

    if (changed) {
      const { error: updateErr } = await supabase
        .from('app_settings')
        .update({ data: settings })
        .eq('id', 1);
      
      if (updateErr) {
        console.error('Settings güncelleme hatası:', updateErr.message);
      } else {
        console.log('   ✅ Settings güncellendi.');
      }
    } else {
      console.log('   ℹ️ furnace-3 zaten "Çalışıyor" durumunda.');
    }
  }

  // 2. Tüm raporlardaki furnaceRecords'a status alanı ekle
  console.log('\n2. Raporlardaki furnaceRecords güncelleniyor...');
  const { data: reports, error: reportsErr } = await supabase
    .from('reports')
    .select('id, data')
    .order('date', { ascending: false });

  if (reportsErr) {
    console.error('Rapor okuma hatası:', reportsErr.message);
    return;
  }

  let updatedCount = 0;
  let totalFurnaceRecords = 0;

  for (const row of reports) {
    if (!row.data || !row.data.furnaceRecords) continue;
    
    let needsUpdate = false;
    row.data.furnaceRecords.forEach(fr => {
      totalFurnaceRecords++;
      if (!fr.status) {
        fr.status = 'Çalışıyor';
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      const { error: updateErr } = await supabase
        .from('reports')
        .update({ data: row.data })
        .eq('id', row.id);

      if (updateErr) {
        console.error(`   Rapor ${row.id} güncelleme hatası:`, updateErr.message);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`   Toplam rapor: ${reports.length}`);
  console.log(`   Toplam furnace kaydı: ${totalFurnaceRecords}`);
  console.log(`   Güncellenen rapor: ${updatedCount}`);
  console.log(`   ✅ FurnaceRecords güncellendi.`);

  // 3. Doğrulama
  console.log('\n3. DOĞRULAMA...');
  const { data: verifySettings } = await supabase
    .from('app_settings')
    .select('data')
    .eq('id', 1)
    .maybeSingle();

  if (verifySettings && verifySettings.data && verifySettings.data.furnaces) {
    verifySettings.data.furnaces.forEach(f => {
      console.log(`   ${f.id}: ${f.name} -> ${f.status}`);
    });
  }

  // Örnek rapor kontrolü
  const { data: sampleReports } = await supabase
    .from('reports')
    .select('id, data')
    .not('data->furnaceRecords', 'eq', '[]')
    .order('date', { ascending: false })
    .limit(3);

  if (sampleReports) {
    console.log(`\n   Örnek raporlar (son 3):`);
    sampleReports.forEach(r => {
      if (r.data && r.data.furnaceRecords) {
        const fr = r.data.furnaceRecords[0];
        console.log(`   ${r.data.date}: ${fr.name} - status: ${fr.status}, charges: ${fr.chargeCount}, melted: ${fr.meltedAmount}kg`);
      }
    });
  }

  // Downtime doğrulama
  let totalDowntimes = 0;
  const { data: allReports } = await supabase
    .from('reports')
    .select('data');
  
  if (allReports) {
    allReports.forEach(r => {
      if (r.data && r.data.downtimes) {
        totalDowntimes += r.data.downtimes.length;
      }
    });
  }
  console.log(`\n   Toplam arıza/duruş kaydı: ${totalDowntimes}`);

  console.log('\n🎉 Supabase verileri başarıyla güncellendi!');
}

fixSupabaseData().catch(console.error);
