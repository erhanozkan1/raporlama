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

async function test() {
  const { data: settingsRow } = await supabase.from('app_settings').select('data').eq('id', 'default').single();
  const furnaces = settingsRow?.data?.furnaces || [];
  console.log('Settings furnaces:', furnaces.map(f => ({ id: f.id, name: f.name, status: f.status })));

  const { data: reportsRows, error } = await supabase.from('reports').select('data').order('date', { ascending: false });
  if (error) {
    console.error('Supabase error:', error);
    return;
  }
  const reports = reportsRows.map(r => r.data);
  console.log('Total reports in Supabase:', reports.length);

  // Furnace summary in reports
  const furnaceCounts = {};
  let totalReportCharges = 0;
  let totalReportMelted = 0;
  let totalReportProdTonnage = 0;

  reports.forEach(r => {
    (r.furnaceRecords || []).forEach(f => {
      furnaceCounts[f.furnaceId] = furnaceCounts[f.furnaceId] || { name: f.name, charges: 0, melted: 0, count: 0 };
      furnaceCounts[f.furnaceId].charges += (f.chargeCount || 0);
      furnaceCounts[f.furnaceId].melted += (f.meltedAmount || 0);
      furnaceCounts[f.furnaceId].count++;
      totalReportCharges += (f.chargeCount || 0);
      totalReportMelted += (f.meltedAmount || 0);
    });

    (r.productions || []).forEach(p => {
      totalReportProdTonnage += (p.tonnage || 0);
    });
  });

  console.log('Furnace breakdown in reports:', furnaceCounts);
  console.log('Total charges across all reports:', totalReportCharges);
  console.log('Total melted kg across all reports:', totalReportMelted);
  console.log('Total production tonnage across all reports:', totalReportProdTonnage);
}

test().catch(console.error);
