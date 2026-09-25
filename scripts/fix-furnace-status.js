const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// 1. Settings'deki furnace-3 (İndüksiyon Ocağı) statusunu "Çalışıyor" yap
let settingsChanged = false;
db.settings.furnaces.forEach(f => {
  if (f.id === 'furnace-3') {
    console.log(`Settings: ${f.name} durumu "${f.status}" -> "Çalışıyor"`);
    f.status = 'Çalışıyor';
    settingsChanged = true;
  }
});

if (!settingsChanged) {
  console.log('Settings: furnace-3 bulunamadı!');
}

// 2. Tüm raporlardaki furnaceRecords'a status alanı ekle
let updatedCount = 0;
db.reports.forEach(r => {
  if (r.furnaceRecords && r.furnaceRecords.length > 0) {
    r.furnaceRecords.forEach(fr => {
      if (!fr.status) {
        fr.status = 'Çalışıyor';
        updatedCount++;
      }
    });
  }
});

console.log(`Rapordaki furnace kayıtlarına status eklendi: ${updatedCount}`);

// 3. Kaydet
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log('db.json başarıyla güncellendi.');

// 4. Doğrula
const db2 = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
console.log('\n--- DOĞRULAMA ---');
db2.settings.furnaces.forEach(f => {
  console.log(`${f.id}: ${f.name} -> ${f.status}`);
});

const withStatus = db2.reports.filter(r => 
  r.furnaceRecords && r.furnaceRecords.some(fr => fr.status)
);
console.log(`\nFurnaceRecords'ta status alanı olan rapor sayısı: ${withStatus.length}`);
if (withStatus.length > 0) {
  console.log('Örnek:', withStatus[0].date, JSON.stringify(withStatus[0].furnaceRecords[0], null, 2));
}
