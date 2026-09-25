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

async function checkSettings() {
  const { data, error } = await supabase.from('app_settings').select('*');
  console.log('App settings rows in Supabase:');
  console.log(JSON.stringify(data, null, 2));
}

checkSettings().catch(console.error);
