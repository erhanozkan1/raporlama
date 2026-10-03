import { Furnace, DailyReport, MaintenanceRecord } from './types';

/**
 * Bir ocağın en son yapılan refrakter (astar / pota) değişim tarihini bulur.
 * Bakım geçmişindeki son 'Astar Değişimi' kaydını veya liningLastReplaced değerini döndürür.
 */
export function getFurnaceLastRefractoryDate(furnace: Furnace): string | undefined {
  const history = furnace.maintenanceHistory || [];
  const liningRecords = history
    .filter(m => m.type === 'Astar Değişimi' && m.date)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (liningRecords.length > 0) {
    return liningRecords[0].date;
  }

  return furnace.liningLastReplaced || undefined;
}

/**
 * Bir ocağın refrakter (astar / pota) şarj sayacını hesaplar.
 * Mantık: Son refrakter yenileme tarihinden (liningLastReplaced) sonraki
 * raporlarda o ocakta yapılan fiili şarjların (chargeCount) toplamıdır.
 * 
 * Ocak bakıma girse, kullanım dışı kalsa veya tekrar aktifleştirilse bile
 * yeni bir refrakter yapılana kadar sayaç ASLA sıfırlanmaz!
 */
export function calculateFurnaceLiningCharges(furnace: Furnace, reports: DailyReport[]): number {
  if (!reports || reports.length === 0) {
    return furnace.liningChargeCount || 0;
  }

  const lastDate = getFurnaceLastRefractoryDate(furnace);
  if (!lastDate) {
    return furnace.liningChargeCount || 0;
  }

  let totalCharges = 0;
  for (const rep of reports) {
    // Sadece son refrakter tarihinden SONRAKİ dökümleri say
    if (rep.date > lastDate) {
      const rec = (rep.furnaceRecords || []).find(r => r.furnaceId === furnace.id);
      if (rec && typeof rec.chargeCount === 'number' && rec.chargeCount > 0) {
        totalCharges += rec.chargeCount;
      }
    }
  }

  return totalCharges;
}

/**
 * Tüm ocakların refrakter sayaçlarını rapor verileriyle senkronize eder.
 * Yeni bir refrakter yapılmadığı sürece sayaçlar asla sıfırlanmaz.
 */
export function syncAllFurnaceLiningCharges(furnaces: Furnace[], reports: DailyReport[]): Furnace[] {
  if (!furnaces || !Array.isArray(furnaces)) return [];

  return furnaces.map(f => {
    const accurateCount = calculateFurnaceLiningCharges(f, reports);
    const lastDate = getFurnaceLastRefractoryDate(f);
    return {
      ...f,
      liningLastReplaced: lastDate || f.liningLastReplaced,
      liningChargeCount: accurateCount,
    };
  });
}

