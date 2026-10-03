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
  const { data: settingsRow } = await supabase.from('app_settings').select('*').eq('id', 1).single();
  const settings = settingsRow.data;
  const { data: reportsRows } = await supabase.from('reports').select('*');
  const reports = reportsRows.map(r => r.data).sort((a, b) => a.date.localeCompare(b.date));

  console.log(`Toplam Rapor Sayısı: ${reports.length}`);

  // Her fırın için raporlardaki şarj dağılımı
  const furnaceStats = {};
  for (const f of settings.furnaces) {
    furnaceStats[f.id] = {
      name: f.name,
      status: f.status,
      liningLastReplaced: f.liningLastReplaced,
      currentLiningChargeCount: f.liningChargeCount,
      liningLifeMax: f.liningLifeMax,
      totalChargesAllTime: 0,
      totalChargesSinceLining: 0,
      dates: []
    };
  }

  for (const rep of reports) {
    for (const fr of rep.furnaceRecords || []) {
      const stat = furnaceStats[fr.furnaceId];
      if (stat) {
        stat.totalChargesAllTime += (fr.chargeCount || 0);
        if (!stat.liningLastReplaced || rep.date > stat.liningLastReplaced) {
          stat.totalChargesSinceLining += (fr.chargeCount || 0);
        }
        if ((fr.chargeCount || 0) > 0) {
          stat.dates.push(`${rep.date} (${fr.chargeCount} şarj)`);
        }
      }
    }
  }

  console.log('\nFırın Refrakter & Şarj İstatistikleri:');
  for (const [id, s] of Object.entries(furnaceStats)) {
    console.log(`\n- ${s.name} (${id})`);
    console.log(`  Durum: ${s.status}`);
    console.log(`  Ayar Kayıtlı Şarj: ${s.currentLiningChargeCount} / ${s.liningLifeMax}`);
    console.log(`  Son Refrakter Tarihi: ${s.liningLastReplaced}`);
    console.log(`  Son Refrakterden Sonraki Gerçek Şarj Toplamı: ${s.totalChargesSinceLining}`);
    console.log(`  Tüm Zamanlar Şarj Toplamı: ${s.totalChargesAllTime}`);
    console.log(`  Son 5 Çalışma Günü:`, s.dates.slice(-5));
  }
}

main().catch(console.error);
