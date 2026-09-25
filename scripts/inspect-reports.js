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
  const { data, error } = await supabase.from('reports').select('data').limit(5);
  if (error) throw error;
  console.log('Sample report count:', data.length);
  const sample = data[0].data;
  console.log('Sample report date:', sample.date);
  console.log('Furnace records:', sample.furnaceRecords);
  console.log('Downtimes:', sample.downtimes);
  console.log('Productions count:', sample.productions?.length);
  console.log('Timeline count:', sample.timeline?.length);
  console.log('Personnel:', sample.personnel);
}

main().catch(console.error);
