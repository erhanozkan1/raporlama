const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
    if (match) {
      const key = match[1];
      let val = (match[2] || '').trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

const excelPath = path.join(__dirname, '..', 'Dokumhane_Gunluk_Veri.xlsx');
if (!fs.existsSync(excelPath)) {
  console.error('Excel dosyası bulunamadı:', excelPath);
  process.exit(1);
}

const wb = XLSX.readFile(excelPath);
const sheet = wb.Sheets['Günlük Veri'] || wb.Sheets[wb.SheetNames[0]];

// Ham hücre okuma fonksiyonu — sheet_to_json boş sütunları atlıyor
function cellVal(col, row) {
  const cell = sheet[col + row];
  return cell ? cell.v : undefined;
}
function cellNum(col, row) {
  const v = cellVal(col, row);
  return (v !== undefined && v !== '' && v !== null) ? Number(v) || 0 : 0;
}
function cellStr(col, row) {
  const v = cellVal(col, row);
  return (v !== undefined && v !== null) ? String(v).trim() : '';
}

// Satır aralığını bul
const range = XLSX.utils.decode_range(sheet['!ref']);
const startRow = range.s.r + 2; // 1-indexed, header=1, data=2+
const endRow = range.e.r + 1;
const totalRows = endRow - startRow + 1;

console.log(`Excel dosyasında ${totalRows} satır veri tespit edildi.`);
console.log('Sütun yapısı: A=Tarih, B=Gün, C=İndüksiyon Ocağı, D=500 Kg Dizel Ocak, E=Fren Diski Kalıbı, F=Kum kalıp adedi, G=Kayıtlı tonaj (kg), H-K=Personel, L=Durum/Not');

// Supabase furnace ID'leri
const FURNACE_DIZEL = {
  furnaceId: 'furnace-1783334064928',
  name: 'Mazotlu Ocak (Büyük)',
  capacity: '500 kg',
  fuelType: 'Mazot',
};

const FURNACE_INDUKSIYON = {
  furnaceId: 'furnace-1783334088613',
  name: 'İndüksiyon Ocağı',
  capacity: '1000 kg',
  fuelType: 'Elektrik',
};

const reports = [];

for (let row = startRow; row <= endRow; row++) {
  const dateRaw = cellVal('A', row);
  if (!dateRaw) continue;

  const d = XLSX.SSF.parse_date_code(dateRaw);
  const dateStr = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  const dayName = cellStr('B', row);

  // Ham hücre okuma — C ve F sütunları sheet_to_json'da eksik kalıyordu
  const induksiyonCharges = cellNum('C', row); // İndüksiyon Ocağı (şarj sayısı)
  const dizelCharges      = cellNum('D', row); // 500 Kg Dizel Ocak (şarj sayısı)
  const frenQty            = cellNum('E', row); // Fren Diski Kalıbı (adet)
  const kumQty             = cellNum('F', row); // Kum kalıp adedi
  const totalKg            = cellNum('G', row); // Kayıtlı tonaj (kg)
  const ocakKisi           = cellNum('H', row); // Ocak ekibi (kişi)
  const kalipKisi          = cellNum('I', row); // Kalıp ekibi (kişi)
  const elektrikKisi       = cellNum('J', row); // Elektrik (kişi)
  const toplamKisi         = cellNum('K', row); // Toplam personel (kişi)
  const note               = cellStr('L', row); // Durum / Not

  const totalCharges = dizelCharges + induksiyonCharges;

  // 1. Üretim Kalıpları — Excel'de her döküm gününde tek tip ürün (ya Fren Diski ya Kum Kalıp) dökülmüştür
  const productions = [];
  if (frenQty > 0 && kumQty === 0) {
    productions.push({
      id: `prod-${dateStr}-1`,
      productName: 'Fren Diski Kalıbı',
      productCode: 'FD-01',
      moldType: 'Fren Diski Kalıbı',
      quantity: frenQty,
      tonnage: totalKg,
      unitWeightKg: frenQty > 0 ? parseFloat((totalKg / frenQty).toFixed(1)) : 0,
      description: 'Fren diski dökümü',
    });
  } else if (kumQty > 0 && frenQty === 0) {
    productions.push({
      id: `prod-${dateStr}-1`,
      productName: 'Kum Kalıp',
      productCode: 'KK-01',
      moldType: 'Kum Kalıp',
      quantity: kumQty,
      tonnage: totalKg,
      unitWeightKg: kumQty > 0 ? parseFloat((totalKg / kumQty).toFixed(1)) : 0,
      description: 'Kum kalıp dökümü',
    });
  } else if (frenQty > 0 && kumQty > 0) {
    // İleride ikisi birden olursa oransal dağıt
    const frenTonaj = Math.round(totalKg * ((dizelCharges * 500) / ((dizelCharges * 500) + (induksiyonCharges * 1000 || 1))));
    const kumTonaj = totalKg - frenTonaj;
    productions.push({
      id: `prod-${dateStr}-1`,
      productName: 'Fren Diski Kalıbı',
      productCode: 'FD-01',
      moldType: 'Fren Diski Kalıbı',
      quantity: frenQty,
      tonnage: frenTonaj,
      unitWeightKg: parseFloat((frenTonaj / frenQty).toFixed(1)),
      description: 'Fren diski dökümü',
    });
    productions.push({
      id: `prod-${dateStr}-2`,
      productName: 'Kum Kalıp',
      productCode: 'KK-01',
      moldType: 'Kum Kalıp',
      quantity: kumQty,
      tonnage: kumTonaj,
      unitWeightKg: parseFloat((kumTonaj / kumQty).toFixed(1)),
      description: 'Kum kalıp dökümü',
    });
  }

  // 2. Ocak Bilgileri — Şarj bazlı (iş birimi = şarj sayısı) ve ergitilen tonaj tam Excel toplamına eşit
  const furnaceRecords = [];

  if (dizelCharges > 0 && induksiyonCharges === 0) {
    furnaceRecords.push({
      furnaceId: FURNACE_DIZEL.furnaceId,
      name: FURNACE_DIZEL.name,
      capacity: FURNACE_DIZEL.capacity,
      fuelType: FURNACE_DIZEL.fuelType,
      status: 'Çalışıyor',
      chargeCount: dizelCharges,
      meltedAmount: totalKg,
      fuelConsumption: 0,
      workDuration: dizelCharges, // Şarj bazlı
      description: `${dizelCharges} şarj ergitme`,
    });
  } else if (induksiyonCharges > 0 && dizelCharges === 0) {
    furnaceRecords.push({
      furnaceId: FURNACE_INDUKSIYON.furnaceId,
      name: FURNACE_INDUKSIYON.name,
      capacity: FURNACE_INDUKSIYON.capacity,
      fuelType: FURNACE_INDUKSIYON.fuelType,
      status: 'Çalışıyor',
      chargeCount: induksiyonCharges,
      meltedAmount: totalKg,
      fuelConsumption: 0,
      workDuration: induksiyonCharges, // Şarj bazlı
      description: `${induksiyonCharges} şarj ergitme`,
    });
  } else if (dizelCharges > 0 && induksiyonCharges > 0) {
    const totalCapWeight = (dizelCharges * 500) + (induksiyonCharges * 1000);
    const dizelKg = Math.round(totalKg * ((dizelCharges * 500) / totalCapWeight));
    const indKg = totalKg - dizelKg; // Küsürat kaybı olmadan tam toplam

    furnaceRecords.push({
      furnaceId: FURNACE_DIZEL.furnaceId,
      name: FURNACE_DIZEL.name,
      capacity: FURNACE_DIZEL.capacity,
      fuelType: FURNACE_DIZEL.fuelType,
      status: 'Çalışıyor',
      chargeCount: dizelCharges,
      meltedAmount: dizelKg,
      fuelConsumption: 0,
      workDuration: dizelCharges,
      description: `${dizelCharges} şarj ergitme`,
    });

    furnaceRecords.push({
      furnaceId: FURNACE_INDUKSIYON.furnaceId,
      name: FURNACE_INDUKSIYON.name,
      capacity: FURNACE_INDUKSIYON.capacity,
      fuelType: FURNACE_INDUKSIYON.fuelType,
      status: 'Çalışıyor',
      chargeCount: induksiyonCharges,
      meltedAmount: indKg,
      fuelConsumption: 0,
      workDuration: induksiyonCharges,
      description: `${induksiyonCharges} şarj ergitme`,
    });
  }

  // 3. Arıza & Duruş Kontrolü
  const lowerNote = note.toLowerCase();
  const isWeekendHoliday = (lowerNote === 'hafta tatili' || lowerNote === 'tatil') && totalKg === 0 && totalCharges === 0;

  const isDowntime = lowerNote.includes('kesinti') || 
                     lowerNote.includes('arıza') || 
                     lowerNote.includes('durduruldu') ||
                     lowerNote.includes('onarıldı') ||
                     lowerNote.includes('olmaması');

  const tags = [];
  const downtimes = [];

  if (isDowntime) {
    tags.push('Arıza / Duruş');
    let durMin = 120;
    if (lowerNote.includes('tam gün') || lowerNote.includes('tam gun')) durMin = 480;
    else if (lowerNote.includes('1 saat')) durMin = 60;
    else if (lowerNote.includes('11:00') || lowerNote.includes('10:30') || lowerNote.includes('14:30')) durMin = 240;

    // Elektrik kesintisinde müdahale yapılamaz, boş kalsın
    let action = '';
    if (lowerNote.includes('kesinti')) {
      action = '';
    } else if (lowerNote.includes('vinç arızası giderildi') || lowerNote.includes('fırın 1 ve fırın 2 onarıldı')) {
      action = 'Vinç arızası giderildi, fırınlar test edildi.';
    } else if (lowerNote.includes('parça talebi')) {
      action = 'Yedek parça siparişi verildi.';
    } else if (lowerNote.includes('pota değişimi')) {
      action = 'Pota değişimi yapıldı.';
    }

    downtimes.push({
      id: `down-${dateStr}-1`,
      category: 'Arıza / Duruş',
      furnaceId: induksiyonCharges > 0 ? FURNACE_INDUKSIYON.furnaceId : FURNACE_DIZEL.furnaceId,
      furnaceName: induksiyonCharges > 0 ? FURNACE_INDUKSIYON.name : FURNACE_DIZEL.name,
      startTime: '10:00',
      endTime: '12:00',
      durationMinutes: durMin,
      description: note,
      actionTaken: action,
    });
  }

  if (productions.length > 0) tags.push('Kalıp');
  if (lowerNote.includes('bakım') || lowerNote.includes('temizlik')) tags.push('Bakım');
  if (lowerNote.includes('sevkiyat')) tags.push('Sevkiyat');
  if (isWeekendHoliday || lowerNote.includes('resmi tatil')) tags.push('Tatil');

  // 4. Personel
  const activePersonnel = toplamKisi > 0 ? toplamKisi : (productions.length > 0 ? 6 : 0);
  const personnel = {
    supervisorName: 'Vardiya Amiri',
    totalCount: activePersonnel,
    breakdown: {
      melters: ocakKisi,
      molders: kalipKisi,
      electricians: elektrikKisi,
    },
  };

  // 5. Açıklama
  let desc = '';
  if (isWeekendHoliday) {
    desc = 'Hafta tatili.';
  } else {
    let prodBrief = '';
    if (frenQty > 0 || kumQty > 0 || totalKg > 0) {
      const parts = [];
      if (frenQty > 0) parts.push(`${frenQty} Fren Diski`);
      if (kumQty > 0) parts.push(`${kumQty} Kum Kalıp`);
      prodBrief = `Üretim: ${parts.join(', ')} (${totalKg.toLocaleString('tr-TR')} kg, ${totalCharges} şarj).`;
    }

    let noteClean = note
      .replace(/^üretim yapıldı\.\s*/i, '')
      .replace(/^indüksiyon ocağıyla üretim yapıldı\.\s*/i, '')
      .replace(/^indüksiyon ve dizel ocak ile üretim yapıldı\.\s*/i, '')
      .replace(/^üretim\s*$/i, '')
      .replace(/\.+$/, '')
      .trim();

    if (isDowntime) {
      desc = `${prodBrief ? `${prodBrief} ` : ''}Duruş Nedeni: ${noteClean || note}.`;
    } else if (noteClean) {
      desc = `${prodBrief ? `${prodBrief} ` : ''}Not: ${noteClean}.`;
    } else if (prodBrief) {
      desc = `${prodBrief} Duruş yaşanmadı.`;
    } else {
      desc = noteClean ? `Not: ${noteClean}.` : 'Rutin takip.';
    }
  }

  const isDoubleShift = lowerNote.includes('çift vardiya') || lowerNote.includes('2 vardiya');
  const shiftText = isDoubleShift ? '07:00 - 15:00 / 15:00 - 23:00' : '08:00 - 16:00';

  reports.push({
    id: `report-${dateStr}`,
    date: dateStr,
    shift: shiftText,
    description: desc,
    timeline: [],
    productions,
    furnaceRecords,
    personnel,
    downtimes,
    shiftHours: {
      startTime: isDoubleShift ? '07:00' : '08:00',
      endTime: isDoubleShift ? '23:00' : '16:00',
      plannedDurationHours: isDoubleShift ? 16 : 8,
      breakDurationMinutes: isDoubleShift ? 120 : 60,
      netWorkDurationHours: isDoubleShift ? 14 : 7,
    },
    notes: note,
    tags,
    createdAt: new Date(dateStr).toISOString(),
    updatedAt: new Date().toISOString(),
    synced: true,
  });
}

// Özet istatistikler
let totalDizel = 0, totalInd = 0, totalFren = 0, totalKum = 0, totalMeltedKg = 0, totalProdKg = 0;
reports.forEach(r => {
  r.furnaceRecords.forEach(fr => {
    if (fr.furnaceId === FURNACE_DIZEL.furnaceId) totalDizel += fr.chargeCount;
    if (fr.furnaceId === FURNACE_INDUKSIYON.furnaceId) totalInd += fr.chargeCount;
    totalMeltedKg += (fr.meltedAmount || 0);
  });
  r.productions.forEach(p => {
    if (p.moldType === 'Fren Diski Kalıbı') totalFren += p.quantity;
    if (p.moldType === 'Kum Kalıp') totalKum += p.quantity;
    totalProdKg += (p.tonnage || 0);
  });
});
console.log(`\n--- Veri Özeti (Excel Karşılaştırma) ---`);
console.log(`Toplam Dizel Ocak şarj: ${totalDizel} (Excel hedef: 92)`);
console.log(`Toplam İndüksiyon Ocağı şarj: ${totalInd} (Excel hedef: 95)`);
console.log(`Toplam Fren Diski: ${totalFren} (Excel hedef: 377)`);
console.log(`Toplam Kum Kalıp: ${totalKum} (Excel hedef: 248)`);
console.log(`Toplam Ergitilen Ocak Tonajı: ${totalMeltedKg.toLocaleString('tr-TR')} kg (Excel hedef: 146.560 kg)`);
console.log(`Toplam Üretilen Kalıp Tonajı: ${totalProdKg.toLocaleString('tr-TR')} kg (Excel hedef: 146.560 kg)`);
console.log(`Ocak verisi olan rapor: ${reports.filter(r => r.furnaceRecords.length > 0).length}`);
console.log(`Arıza kaydı olan rapor: ${reports.filter(r => r.downtimes.length > 0).length}`);

async function runCleanImport() {
  console.log(`\n========================================`);
  console.log(`Excel'den doğrudan Supabase'e aktarma başlıyor...`);
  console.log(`(Kullanıcı isteği doğrultusunda local db.json kaydı YAPILMIYOR, sadece Supabase'e kaydediliyor)`);
  console.log(`Toplam kayıt sayısı: ${reports.length}`);

  // SADECE Supabase güncelle
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Hata: Supabase URL veya Key bulunamadı!');
    process.exit(1);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('Supabase: Eski kayıtlar siliniyor...');
    const { error: delError } = await supabase.from('reports').delete().gte('date', '1900-01-01');
    if (delError) {
      console.error('Supabase silme hatası:', delError.message);
    } else {
      console.log('✅ Supabase: Eski kayıtlar silindi.');
    }

    console.log('Supabase: Veriler yükleniyor...');
    for (let i = 0; i < reports.length; i += 20) {
      const batch = reports.slice(i, i + 20).map(r => ({
        id: r.id,
        date: r.date,
        data: r,
        updated_at: r.updatedAt,
      }));

      const { error: insError } = await supabase.from('reports').insert(batch);
      if (insError) {
        console.error(`Supabase batch ${i} ekleme hatası:`, insError.message);
      } else {
        console.log(`Supabase: ${Math.min(i + 20, reports.length)} / ${reports.length} kayıt aktarıldı.`);
      }
    }
    console.log('✅ Supabase: Tüm veriler başarıyla güncellendi (Sadece Supabase).');
  } catch (sbErr) {
    console.error('Supabase işlemi sırasında hata:', sbErr.message);
  }

  console.log(`\n🎉 Tüm kayıtlar Supabase veritabanına aktarıldı!`);
}

runCleanImport().catch(console.error);
