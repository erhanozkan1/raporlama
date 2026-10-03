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
  const { data: logs } = await supabase.from('audit_logs').select('*').order('ts', { ascending: false }).limit(20);
  console.log(`Toplam ${logs?.length || 0} son log:`);
  for (const l of logs || []) {
    console.log(`[${l.ts}] ${l.action} (${l.resource_name}): ${l.summary}`);
  }
}

main().catch(console.error);
