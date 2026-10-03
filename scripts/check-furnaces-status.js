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
  const { data: row, error } = await supabase.from('app_settings').select('*').eq('id', 1).single();
  if (error) throw error;
  const furnaces = row.data.furnaces;
  for (const f of furnaces) {
    console.log(`- ${f.name} (${f.id}):`);
    console.log(`  Durum: ${f.status}`);
    console.log(`  Astar Şarj Sayacı: ${f.liningChargeCount} / ${f.liningLifeMax}`);
    console.log(`  Son Astar Tarihi: ${f.liningLastReplaced}`);
    console.log(`  Son Bakım Tarihi: ${f.lastMaintenanceDate}`);
    console.log(`  Bakım Kayıtları:`, f.maintenanceHistory?.map(m => `${m.date} [${m.type}] ${m.description}`));
    console.log(`  Durum Geçmişi:`, f.statusHistory);
  }

  console.log('\n=== SON RAPORLAR VE FIRIN KAYITLARI ===');
  const { data: repRows } = await supabase.from('reports').select('*').order('date', { ascending: false }).limit(10);
  (repRows || []).forEach(r => {
    console.log(`Tarih: ${r.date}`);
    (r.data?.furnaceRecords || []).forEach(fr => {
      console.log(`  ${fr.name} (${fr.furnaceId}): Durum=${fr.status}, Şarj=${fr.chargeCount}, Kg=${fr.meltedAmount}`);
    });
  });
}

main().catch(console.error);
