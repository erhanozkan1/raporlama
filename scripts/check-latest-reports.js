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
  const { data: reps } = await supabase.from('reports').select('*').order('date', { ascending: false }).limit(6);
  for (const r of reps) {
    console.log(`\n================== RAPOR: ${r.date} (ID: ${r.id}) ==================`);
    console.log('Furnace Records:', JSON.stringify(r.data?.furnaceRecords, null, 2));
    console.log('Shifts count:', r.data?.shifts?.length);
    console.log('Logs/Audit count:', r.data?.logs?.length);
  }
}

main().catch(console.error);
