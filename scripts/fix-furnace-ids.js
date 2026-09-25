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
const supabase = createClient(supabaseUrl, supabaseKey);

// ID eşleştirme haritası (import script eski ID → Supabase settings yeni ID)
const ID_MAP = {
  'furnace-1': 'furnace-1783334064928', // Mazotlu Bakır Ocağı (Büyük)
  'furnace-3': 'furnace-1783334088613', // İndüksiyon Ocağı
};

// İsim güncelleme haritası (Supabase'deki isimleri kullan)
const NAME_MAP = {
  'furnace-1783334064928': 'Mazotlu Ocak (Büyük)',
  'furnace-1783334088613': 'İndüksiyon Ocağı',
};

async function fixFurnaceIds() {
  console.log('=== FURNACE ID DÜZELTMESİ ===\n');

  // 1. Tüm raporları çek
  const { data: reports, error } = await supabase
    .from('reports')
    .select('id, data')
    .order('date', { ascending: false });

  if (error) {
    console.error('Rapor okuma hatası:', error.message);
    return;
  }

  console.log(`Toplam rapor: ${reports.length}`);

  let updatedReportCount = 0;
  let updatedFurnaceRecordCount = 0;
  let updatedDowntimeCount = 0;

  for (const row of reports) {
    if (!row.data) continue;
    let needsUpdate = false;

    // furnaceRecords ID düzeltmesi
    if (row.data.furnaceRecords && row.data.furnaceRecords.length > 0) {
      row.data.furnaceRecords.forEach(fr => {
        if (ID_MAP[fr.furnaceId]) {
          const newId = ID_MAP[fr.furnaceId];
          fr.furnaceId = newId;
          if (NAME_MAP[newId]) {
            fr.name = NAME_MAP[newId];
          }
          if (!fr.status) {
            fr.status = 'Çalışıyor';
          }
          needsUpdate = true;
          updatedFurnaceRecordCount++;
        }
      });
    }

    // downtimes furnaceId düzeltmesi
    if (row.data.downtimes && row.data.downtimes.length > 0) {
      row.data.downtimes.forEach(dt => {
        if (ID_MAP[dt.furnaceId]) {
          const newId = ID_MAP[dt.furnaceId];
          dt.furnaceId = newId;
          if (NAME_MAP[newId]) {
            dt.furnaceName = NAME_MAP[newId];
          }
          needsUpdate = true;
          updatedDowntimeCount++;
        }
      });
    }

    if (needsUpdate) {
      const { error: updateErr } = await supabase
        .from('reports')
        .update({ data: row.data })
        .eq('id', row.id);

      if (updateErr) {
        console.error(`Rapor ${row.id} güncelleme hatası:`, updateErr.message);
      } else {
        updatedReportCount++;
      }
    }
  }

  console.log(`\nGüncellenen rapor sayısı: ${updatedReportCount}`);
  console.log(`Güncellenen furnaceRecord sayısı: ${updatedFurnaceRecordCount}`);
  console.log(`Güncellenen downtime sayısı: ${updatedDowntimeCount}`);

  // 2. Settings'deki Mazotlu Ocak (Büyük) durumunu da Çalışıyor yap
  console.log('\n--- Settings Güncelleme ---');
  const { data: settingsRow } = await supabase
    .from('app_settings')
    .select('data')
    .eq('id', 1)
    .maybeSingle();

  if (settingsRow && settingsRow.data && settingsRow.data.furnaces) {
    let settingsChanged = false;
    settingsRow.data.furnaces.forEach(f => {
      // Mazotlu Ocak (Büyük) raporlarda kullanılıyor → Çalışıyor olmalı
      if (f.id === 'furnace-1783334064928' && f.status !== 'Çalışıyor') {
        console.log(`   ${f.name}: "${f.status}" -> "Çalışıyor"`);
        f.status = 'Çalışıyor';
        settingsChanged = true;
      }
    });

    if (settingsChanged) {
      const { error: updateErr } = await supabase
        .from('app_settings')
        .update({ data: settingsRow.data })
        .eq('id', 1);
      
      if (updateErr) {
        console.error('Settings güncelleme hatası:', updateErr.message);
      } else {
        console.log('   ✅ Settings güncellendi.');
      }
    } else {
      console.log('   Değişiklik gerekmedi.');
    }
  }

  // 3. Doğrulama
  console.log('\n--- DOĞRULAMA ---');
  const { data: verifyReports } = await supabase
    .from('reports')
    .select('data')
    .order('date', { ascending: false })
    .limit(5);

  let verifyOk = true;
  (verifyReports || []).forEach(r => {
    if (r.data && r.data.furnaceRecords && r.data.furnaceRecords.length > 0) {
      r.data.furnaceRecords.forEach(fr => {
        const inOldFormat = Object.keys(ID_MAP).includes(fr.furnaceId);
        if (inOldFormat) {
          console.log(`   ❌ ${r.data.date}: Hala eski ID "${fr.furnaceId}" kullanıyor!`);
          verifyOk = false;
        } else {
          console.log(`   ✅ ${r.data.date}: ${fr.name} (${fr.furnaceId}) - ${fr.chargeCount} şarj, ${fr.meltedAmount}kg, status: ${fr.status}`);
        }
      });
    }
  });

  const { data: verifySettings } = await supabase
    .from('app_settings')
    .select('data')
    .eq('id', 1)
    .maybeSingle();

  console.log('\nSettings durumu:');
  if (verifySettings?.data?.furnaces) {
    verifySettings.data.furnaces.forEach(f => {
      console.log(`   ${f.id}: ${f.name} -> ${f.status}`);
    });
  }

  if (verifyOk) {
    console.log('\n🎉 Tüm furnace ID\'leri başarıyla düzeltildi!');
  } else {
    console.log('\n⚠️ Bazı kayıtlarda hala sorun var!');
  }
}

fixFurnaceIds().catch(console.error);
