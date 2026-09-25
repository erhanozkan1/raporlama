const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*"?(.*?)"?\s*$/);
    if (match) {
      const key = match[1];
      let val = (match[2] || '').trim();
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeIdMismatch() {
  console.log('=== ID UYUMSUZLUK ANALİZİ ===\n');

  // 1. Settings'deki furnace tanımları
  const { data: settingsRow } = await supabase
    .from('app_settings')
    .select('data')
    .eq('id', 1)
    .maybeSingle();

  const furnaces = settingsRow?.data?.furnaces || [];
  console.log('Settings furnace tanımları:');
  furnaces.forEach(f => {
    console.log(`  ID: ${f.id}, İsim: ${f.name}, Durum: ${f.status}, Kapasite: ${f.capacity}`);
  });

  // 2. Raporlardaki benzersiz furnaceId'ler
  const { data: reports } = await supabase
    .from('reports')
    .select('data');

  const reportFurnaceIds = new Set();
  const furnaceIdNameMap = {};

  (reports || []).forEach(r => {
    if (r.data && r.data.furnaceRecords) {
      r.data.furnaceRecords.forEach(fr => {
        reportFurnaceIds.add(fr.furnaceId);
        if (!furnaceIdNameMap[fr.furnaceId]) {
          furnaceIdNameMap[fr.furnaceId] = fr.name;
        }
      });
    }
  });

  console.log('\nRaporlardaki furnace ID\'ler:');
  reportFurnaceIds.forEach(id => {
    console.log(`  ID: ${id}, İsim: ${furnaceIdNameMap[id]}`);
    const inSettings = furnaces.some(f => f.id === id);
    console.log(`  → Settings'te ${inSettings ? '✅ MEVCUT' : '❌ EŞLEŞMİYOR'}`);
  });

  // 3. Eşleşme analizi
  console.log('\n--- Eşleştirme Tablosu ---');
  const settingsIds = furnaces.map(f => f.id);
  const reportIds = [...reportFurnaceIds];
  
  console.log('Settings IDs:', settingsIds);
  console.log('Report  IDs:', reportIds);
  
  // İsim bazlı eşleştirme önerisi
  console.log('\n--- İsim Bazlı Eşleştirme ---');
  reportIds.forEach(reportId => {
    const reportName = furnaceIdNameMap[reportId];
    const matchingFurnace = furnaces.find(f => 
      f.name.includes(reportName) || reportName.includes(f.name) ||
      f.name.toLowerCase().includes(reportName.toLowerCase()) ||
      reportName.toLowerCase().includes(f.name.toLowerCase())
    );
    if (matchingFurnace) {
      console.log(`  Rapor "${reportId}" (${reportName}) → Settings "${matchingFurnace.id}" (${matchingFurnace.name})`);
    } else {
      // Daha gevşek eşleştirme
      const fuzzyMatch = furnaces.find(f => {
        const n1 = f.name.toLowerCase().replace(/[()]/g, '');
        const n2 = reportName.toLowerCase().replace(/[()]/g, '');
        return n1.includes('indüksiyon') && n2.includes('indüksiyon') ||
               n1.includes('mazotlu') && n2.includes('mazotlu') && n1.includes('büyük') && n2.includes('büyük') ||
               n1.includes('mazotlu') && n2.includes('mazotlu') && n1.includes('küçük') && n2.includes('küçük');
      });
      if (fuzzyMatch) {
        console.log(`  Rapor "${reportId}" (${reportName}) → Settings "${fuzzyMatch.id}" (${fuzzyMatch.name}) [FUZZY]`);
      } else {
        console.log(`  Rapor "${reportId}" (${reportName}) → ❌ Eşleşme bulunamadı`);
      }
    }
  });
}

analyzeIdMismatch().catch(console.error);
