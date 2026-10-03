const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const getEnv = (k) => {
  const m = envContent.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim().replace(/^"|"$/g, '') : '';
};

const supabase = createClient(
  getEnv('NEXT_PUBLIC_SUPABASE_URL'),
  getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
);

async function main() {
  const { data: settingsRow, error } = await supabase.from('app_settings').select('*').eq('id', 1).single();
  if (error) throw error;
  const settings = settingsRow.data;

  const { data: reportsRows } = await supabase.from('reports').select('*');
  const reports = reportsRows.map(r => r.data);

  // Fırınları düzelt
  const updatedFurnaces = settings.furnaces.map(f => {
    // 1. İndüksiyon Ocağı (Pota 1)
    if (f.id === 'furnace-1783334088613' || (f.name && f.name.includes('Pota 1'))) {
      const fixedHistory = (f.maintenanceHistory || []).map(m => {
        // "Pota 2 sinterlendi" kaydının türünü 'Bakım' veya 'Genel Revizyon' yap, Pota 1'in astar değişimi değil
        if (m.description && m.description.includes('Pota 2')) {
          return { ...m, type: 'Bakım' };
        }
        return m;
      });

      return {
        ...f,
        liningLastReplaced: '2026-07-06',
        liningChargeCount: 95,
        maintenanceHistory: fixedHistory
      };
    }

    // 2. İndüksiyon Ocağı (Pota 2)
    if (f.id === 'furnace-1790792705564' || (f.name && f.name.includes('Pota 2'))) {
      return {
        ...f,
        liningLastReplaced: '2026-09-29',
        liningChargeCount: 7,
        lastMaintenanceDate: '2026-09-29',
        maintenanceHistory: [
          {
            id: 'maint-pota2-sinter',
            date: '2026-09-29',
            type: 'Astar Değişimi',
            description: 'Pota 2 refrakter sinterleme ve devreye alma yapıldı.',
            technician: 'Bakım Ekibi',
            durationHours: 12
          }
        ]
      };
    }

    // 3. Mazotlu Ocak (Büyük)
    if (f.id === 'furnace-1783334064928' || (f.name && f.name.includes('Büyük'))) {
      return {
        ...f,
        liningLastReplaced: '2026-08-08',
        liningChargeCount: 25,
        lastMaintenanceDate: '2026-08-08'
      };
    }

    // 4. Mazotlu Ocak (Küçük)
    if (f.id === 'furnace-1783334075863' || (f.name && f.name.includes('Küçük'))) {
      return {
        ...f,
        liningLastReplaced: f.liningLastReplaced || '2026-06-01',
        liningChargeCount: f.liningChargeCount || 0,
        liningLifeMax: f.liningLifeMax || 60
      };
    }

    return f;
  });

  settings.furnaces = updatedFurnaces;

  const { error: saveErr } = await supabase.from('app_settings').upsert({ id: 1, data: settings });
  if (saveErr) throw saveErr;

  console.log('✅ Supabase fırın refrakter sayaçları ve geçmişleri düzeltildi:');
  for (const f of updatedFurnaces) {
    console.log(`- ${f.name}: Son Refrakter: ${f.liningLastReplaced}, Sayaç: ${f.liningChargeCount}/${f.liningLifeMax}, Durum: ${f.status}`);
  }
}

main().catch(console.error);
