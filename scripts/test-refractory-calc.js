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
  const { data: settingRow } = await supabase.from('app_settings').select('*').eq('id', 1).single();
  const { data: reportRows } = await supabase.from('reports').select('*').order('date', { ascending: false });
  
  const furnaces = settingRow.data.furnaces;
  const reports = reportRows.map(r => ({ id: r.id, date: r.date, ...(r.data || {}) }));

  console.log(`Toplam ${reports.length} rapor var.`);

  for (const f of furnaces) {
    console.log(`\n=================== ${f.name} (${f.id}) ===================`);
    console.log(`Mevcut Kayıtlı Sayaç: ${f.liningChargeCount} / ${f.liningLifeMax}`);
    console.log(`Son Astar Tarihi (liningLastReplaced): ${f.liningLastReplaced}`);
    
    // Test: rep.date > lastDate (MEVCUT KOD)
    let countStrict = 0;
    let matchingRepsStrict = [];
    for (const r of reports) {
      if (r.date > f.liningLastReplaced) {
        const fr = (r.furnaceRecords || []).find(x => x.furnaceId === f.id);
        if (fr && fr.chargeCount > 0) {
          countStrict += fr.chargeCount;
          matchingRepsStrict.push(`${r.date}: ${fr.chargeCount} şarj`);
        }
      }
    }
    console.log(`Strict (>): ${countStrict} şarj ->`, matchingRepsStrict);

    // Test: rep.date >= lastDate (DEĞİŞİM GÜNÜ DAHİL)
    let countInclusive = 0;
    let matchingRepsInclusive = [];
    for (const r of reports) {
      if (r.date >= f.liningLastReplaced) {
        const fr = (r.furnaceRecords || []).find(x => x.furnaceId === f.id);
        if (fr && fr.chargeCount > 0) {
          countInclusive += fr.chargeCount;
          matchingRepsInclusive.push(`${r.date}: ${fr.chargeCount} şarj`);
        }
      }
    }
    console.log(`Inclusive (>=): ${countInclusive} şarj ->`, matchingRepsInclusive);
  }
}

main().catch(console.error);
