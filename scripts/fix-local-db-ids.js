const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const ID_MAP = {
  'furnace-1': 'furnace-1783334064928',
  'furnace-3': 'furnace-1783334088613',
};

const NAME_MAP = {
  'furnace-1783334064928': 'Mazotlu Ocak (Büyük)',
  'furnace-1783334088613': 'İndüksiyon Ocağı',
};

// Settings
db.settings.furnaces.forEach(f => {
  if (f.id === 'furnace-1') {
    f.id = 'furnace-1783334064928';
    f.name = 'Mazotlu Ocak (Büyük)';
    f.status = 'Çalışıyor';
  }
  if (f.id === 'furnace-2') {
    f.id = 'furnace-1783334075863';
    f.name = 'Mazotlu Ocak (Küçük)';
  }
  if (f.id === 'furnace-3') {
    f.id = 'furnace-1783334088613';
    f.name = 'İndüksiyon Ocağı';
    f.status = 'Çalışıyor';
  }
});

// Reports
let count = 0;
db.reports.forEach(r => {
  if (r.furnaceRecords) {
    r.furnaceRecords.forEach(fr => {
      if (ID_MAP[fr.furnaceId]) {
        fr.furnaceId = ID_MAP[fr.furnaceId];
        fr.name = NAME_MAP[fr.furnaceId];
        if (!fr.status) fr.status = 'Çalışıyor';
        count++;
      }
    });
  }
  if (r.downtimes) {
    r.downtimes.forEach(dt => {
      if (ID_MAP[dt.furnaceId]) {
        dt.furnaceId = ID_MAP[dt.furnaceId];
        dt.furnaceName = NAME_MAP[dt.furnaceId];
      }
    });
  }
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log(`db.json güncellendi. ${count} furnace kaydı düzeltildi.`);

// Doğrulama
const db2 = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
console.log('\nSettings:');
db2.settings.furnaces.forEach(f => console.log(`  ${f.id}: ${f.name} -> ${f.status}`));

const withFurnace = db2.reports.filter(r => r.furnaceRecords && r.furnaceRecords.length > 0);
console.log(`\nFurnace kaydi olan rapor: ${withFurnace.length}`);
if (withFurnace.length > 0) {
  console.log('Örnek:', withFurnace[0].date, JSON.stringify(withFurnace[0].furnaceRecords[0]));
}
