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

// Ocak sıralama ağırlığı belirleme fonksiyonu
function getFurnaceRank(name) {
  const n = (name || '').toLocaleLowerCase('tr-TR');
  if (n.includes('indüksiyon') || n.includes('induksiyon')) return 1;
  if (n.includes('mazot') && (n.includes('büyük') || n.includes('buyuk') || n.includes('500'))) return 2;
  if (n.includes('mazot') && (n.includes('küçük') || n.includes('kucuk') || n.includes('200'))) return 3;
  if (n.includes('mazot')) return 2.5;
  return 4;
}

async function main() {
  const { data: row, error } = await supabase.from('app_settings').select('*').eq('id', 1).single();
  if (error) throw error;

  const settings = row.data;
  const currentFurnaces = settings.furnaces || [];

  console.log('Mevcut Fırın Sıralaması:');
  currentFurnaces.forEach((f, i) => console.log(` ${i + 1}. ${f.name} (${f.id})`));

  // Sıralama uygula: 1. İndüksiyon, 2. Mazotlu Büyük, 3. Mazotlu Küçük
  const sortedFurnaces = [...currentFurnaces].sort((a, b) => getFurnaceRank(a.name) - getFurnaceRank(b.name));

  console.log('\nYeni Fırın Sıralaması:');
  sortedFurnaces.forEach((f, i) => console.log(` ${i + 1}. ${f.name} (${f.id})`));

  settings.furnaces = sortedFurnaces;

  const { error: updateErr } = await supabase.from('app_settings').upsert({ id: 1, data: settings });
  if (updateErr) throw updateErr;

  console.log('\n✅ Supabase app_settings fırın sıralaması başarıyla güncellendi!');
}

main().catch(console.error);
