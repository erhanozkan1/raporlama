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

async function calculateAndUpdate() {
  const { data: settingsRow } = await supabase.from('app_settings').select('*').eq('id', 1).single();
  const settings = settingsRow.data;

  const { data: reportsRows } = await supabase.from('reports').select('*');
  const reports = reportsRows.map(r => r.data).sort((a, b) => a.date.localeCompare(b.date));

  // 1. İndüksiyon Ocağı Hesabı (06.07.2026 astar değişimi)
  const inductionDate = '2026-07-06';
  let inductionCharges = 0;
  let inductionTonnage = 0;
  const inductionDays = [];

  // 2. Mazotlu Ocak (Büyük) Hesabı (08.08.2026 pota / astar değişimi)
  const dieselDate = '2026-08-08';
  let dieselCharges = 0;
  let dieselTonnage = 0;
  const dieselDays = [];

  for (const rep of reports) {
    const fRecs = rep.furnaceRecords || [];
    for (const fr of fRecs) {
      const isInduction = (fr.name && fr.name.toLowerCase().includes('indüksiyon')) || fr.furnaceId === 'furnace-1783334088613';
      const isDiesel = (fr.name && fr.name.toLowerCase().includes('mazot')) || fr.furnaceId === 'furnace-1783334064928';

      if (isInduction && rep.date > inductionDate) {
        if ((fr.chargeCount || 0) > 0) {
          inductionCharges += Number(fr.chargeCount);
          inductionTonnage += Number(fr.meltedAmount || 0);
          inductionDays.push({ date: rep.date, count: fr.chargeCount, kg: fr.meltedAmount });
        }
      }

      if (isDiesel && rep.date > dieselDate) {
        if ((fr.chargeCount || 0) > 0) {
          dieselCharges += Number(fr.chargeCount);
          dieselTonnage += Number(fr.meltedAmount || 0);
          dieselDays.push({ date: rep.date, count: fr.chargeCount, kg: fr.meltedAmount });
        }
      }
    }
  }

  console.log(`\n=== İNDÜKSİYON OCAĞI (Astar Tarihi: ${inductionDate}) ===`);
  console.log(`Toplam Çalışan Gün Sayısı: ${inductionDays.length}`);
  console.log(`06.07.2026 Sonrası Toplam Şarj Sayısı: ${inductionCharges}`);
  console.log(`06.07.2026 Sonrası Toplam Tonaj: ${(inductionTonnage / 1000).toFixed(2)} ton (${inductionTonnage} kg)`);

  console.log(`\n=== MAZOTLU OCAK BÜYÜK (Pota/Astar Tarihi: ${dieselDate}) ===`);
  console.log(`Toplam Çalışan Gün Sayısı: ${dieselDays.length}`);
  console.log(`08.08.2026 Sonrası Toplam Şarj Sayısı: ${dieselCharges}`);
  console.log(`08.08.2026 Sonrası Toplam Tonaj: ${(dieselTonnage / 1000).toFixed(2)} ton (${dieselTonnage} kg)`);

  // Ayarları güncelle
  const updatedFurnaces = settings.furnaces.map(f => {
    if (f.id === 'furnace-1783334088613' || (f.name && f.name.toLowerCase().includes('indüksiyon'))) {
      // İndüksiyon Ocağı
      const existingMaint = f.maintenanceHistory || [];
      const hasLiningMaint = existingMaint.some(m => m.date === inductionDate && m.type === 'Astar Değişimi');
      const newMaint = hasLiningMaint ? existingMaint : [
        {
          id: `maint-${Date.now()}-ind-astar`,
          date: inductionDate,
          type: 'Astar Değişimi',
          technician: 'Bakım Ekibi',
          description: 'İndüksiyon ocağı refrakter astarı yenilendi.',
          durationHours: 12
        },
        ...existingMaint.filter(m => !(m.date === inductionDate && m.type === 'Bakım'))
      ];

      return {
        ...f,
        liningLastReplaced: inductionDate,
        lastMaintenanceDate: inductionDate,
        liningChargeCount: inductionCharges,
        maintenanceHistory: newMaint
      };
    }

    if (f.id === 'furnace-1783334064928' || (f.name && f.name.toLowerCase().includes('mazotlu ocak (büyük)'))) {
      // Mazotlu Ocak Büyük
      const existingMaint = (f.maintenanceHistory || []).filter(m => m.date !== '2026-07-26');
      const newMaint = [
        {
          id: `maint-${Date.now()}-diesel-pota`,
          date: dieselDate,
          type: 'Astar Değişimi',
          technician: 'Bakım Ekibi',
          description: 'Mazotlu ocağın potası değiştirildi.',
          durationHours: 8
        },
        ...existingMaint
      ];

      return {
        ...f,
        liningLastReplaced: dieselDate,
        lastMaintenanceDate: dieselDate,
        liningChargeCount: dieselCharges,
        maintenanceHistory: newMaint
      };
    }

    return f;
  });

  const updatedSettings = {
    ...settings,
    furnaces: updatedFurnaces
  };

  const { error: saveErr } = await supabase.from('app_settings').upsert({ id: 1, data: updatedSettings });
  if (saveErr) throw saveErr;

  console.log('\n✅ Supabase app_settings başarıyla güncellendi!');
  for (const f of updatedFurnaces) {
    console.log(`- ${f.name}: Son Astar: ${f.liningLastReplaced}, Şarj Sayacı: ${f.liningChargeCount} / ${f.liningLifeMax}`);
  }
}

calculateAndUpdate().catch(console.error);
