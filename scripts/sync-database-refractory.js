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

// lib/refractoryService.ts mantığının aynısı (rep.date >= lastDate)
function calculateLiningCharges(furnace, reports) {
  const history = furnace.maintenanceHistory || [];
  const liningRecords = history
    .filter(m => m.type === 'Astar Değişimi' && m.date)
    .sort((a, b) => b.date.localeCompare(a.date));

  const lastDate = liningRecords.length > 0 ? liningRecords[0].date : (furnace.liningLastReplaced || undefined);
  if (!lastDate) return furnace.liningChargeCount || 0;

  let totalCharges = 0;
  for (const rep of reports) {
    if (rep.date >= lastDate) {
      const rec = (rep.furnaceRecords || []).find(r => r.furnaceId === furnace.id || r.name === furnace.name);
      if (rec && typeof rec.chargeCount === 'number' && rec.chargeCount > 0) {
        totalCharges += rec.chargeCount;
      }
    }
  }
  return totalCharges;
}

async function main() {
  const { data: settingRow, error: sErr } = await supabase.from('app_settings').select('*').eq('id', 1).single();
  if (sErr) throw sErr;

  const { data: reportRows, error: rErr } = await supabase.from('reports').select('*').order('date', { ascending: false });
  if (rErr) throw rErr;

  const reports = reportRows.map(r => ({ id: r.id, date: r.date, ...(r.data || {}) }));
  const furnaces = settingRow.data.furnaces;

  const updatedFurnaces = furnaces.map(f => {
    const newCount = calculateLiningCharges(f, reports);
    console.log(`- ${f.name} (${f.id}): Eski Sayaç=${f.liningChargeCount}, Yeni Sayaç=${newCount}`);
    return {
      ...f,
      liningChargeCount: newCount,
    };
  });

  const updatedData = {
    ...settingRow.data,
    furnaces: updatedFurnaces,
  };

  const { error: upErr } = await supabase.from('app_settings').update({ data: updatedData }).eq('id', 1);
  if (upErr) throw upErr;

  console.log('✅ Supabase veritabanındaki fırın refrakter sayaçları başarıyla güncellendi!');
}

main().catch(console.error);
