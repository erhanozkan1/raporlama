import { StockItem, StockMovement } from './types';

/**
 * Stok öğesinin toplam adet, birim ağırlık ve toplam ağırlık değerlerini hesaplar.
 */
export function calculateStockItemTotals(item: {
  palletStandardQty: number;
  palletWeightKg: number;
  currentPallets: number;
  currentLooseQty: number;
  unitWeightKg?: number;
}): { totalUnits: number; totalWeightKg: number; unitWeightKg: number } {
  const stdQty = Math.max(1, item.palletStandardQty || 1);
  const palletWt = Math.max(0, item.palletWeightKg || 0);
  const unitWt = item.unitWeightKg && item.unitWeightKg > 0 
    ? item.unitWeightKg 
    : parseFloat((palletWt / stdQty).toFixed(2));

  const pallets = Math.max(0, item.currentPallets || 0);
  const loose = Math.max(0, item.currentLooseQty || 0);

  const totalUnits = (pallets * stdQty) + loose;
  const totalWeightKg = Math.round((pallets * palletWt) + (loose * unitWt));

  return {
    totalUnits,
    totalWeightKg,
    unitWeightKg: unitWt,
  };
}

/**
 * Sevkiyat (çıkış) veya stok girişi hareketini mevcut ürün listesine uygular.
 */
export function applyStockMovement(
  items: StockItem[],
  movement: Omit<StockMovement, 'id' | 'createdAt'>
): { updatedItems: StockItem[]; newMovement: StockMovement; error?: string } {
  const targetItem = items.find(i => i.id === movement.productId);
  if (!targetItem) {
    return { updatedItems: items, newMovement: {} as StockMovement, error: 'Ürün bulunamadı.' };
  }

  const stdQty = Math.max(1, targetItem.palletStandardQty || 1);
  const palletWt = Math.max(0, targetItem.palletWeightKg || 0);
  const unitWt = targetItem.unitWeightKg || (palletWt / stdQty);

  // Toplam adet ve kg hesabı
  let qty = movement.quantity;
  let pallets = movement.pallets;
  let weightKg = movement.weightKg;

  if (pallets > 0 && (!qty || qty === 0)) {
    qty = pallets * stdQty;
  } else if (qty > 0 && (!pallets || pallets === 0)) {
    pallets = Math.floor(qty / stdQty);
  }

  if (!weightKg || weightKg === 0) {
    weightKg = Math.round((pallets * palletWt) + ((qty - (pallets * stdQty)) * unitWt));
  }

  let newPallets = targetItem.currentPallets;
  let newLoose = targetItem.currentLooseQty;

  if (movement.type === 'out') {
    // Çıkış (Sevkiyat)
    const currentTotalUnits = (targetItem.currentPallets * stdQty) + targetItem.currentLooseQty;
    if (qty > currentTotalUnits) {
      return { 
        updatedItems: items, 
        newMovement: {} as StockMovement, 
        error: `Yetersiz stok! Mevcut toplam stok: ${currentTotalUnits} adet (${targetItem.currentPallets} palet), istenen çıkış: ${qty} adet.` 
      };
    }

    const remainingTotal = currentTotalUnits - qty;
    newPallets = Math.floor(remainingTotal / stdQty);
    newLoose = remainingTotal % stdQty;
  } else {
    // Giriş (Stok Ekleme / Üretim Kabul)
    const currentTotalUnits = (targetItem.currentPallets * stdQty) + targetItem.currentLooseQty;
    const newTotal = currentTotalUnits + qty;
    newPallets = Math.floor(newTotal / stdQty);
    newLoose = newTotal % stdQty;
  }

  const totals = calculateStockItemTotals({
    palletStandardQty: stdQty,
    palletWeightKg: palletWt,
    currentPallets: newPallets,
    currentLooseQty: newLoose,
    unitWeightKg: unitWt,
  });

  const now = new Date().toISOString();
  const updatedItem: StockItem = {
    ...targetItem,
    currentPallets: newPallets,
    currentLooseQty: newLoose,
    totalUnits: totals.totalUnits,
    totalWeightKg: totals.totalWeightKg,
    updatedAt: now,
  };

  const newMovement: StockMovement = {
    ...movement,
    id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    pallets,
    quantity: qty,
    weightKg,
    createdAt: now,
  };

  const updatedItems = items.map(i => i.id === updatedItem.id ? updatedItem : i);
  return { updatedItems, newMovement };
}

/**
 * İlk kez açıldığında boş kalmaması için varsayılan örnek ürünler
 */
export function getDefaultStockItems(): StockItem[] {
  const now = new Date().toISOString();
  const rawList = [
    {
      id: 'stock-prod-1',
      productName: 'Fren Diski (280mm Hava Kanallı)',
      productCode: 'FD-280-HK',
      palletStandardQty: 50,
      palletWeightKg: 850,
      currentPallets: 14,
      currentLooseQty: 22,
      minStockPallets: 5,
      location: 'Saha A - Palet Raf 01',
      description: 'GG25 Pik Döküm, İşlenmemiş Ham Parça',
    },
    {
      id: 'stock-prod-2',
      productName: 'Volan Dişlisi Kasnağı',
      productCode: 'VL-420-D',
      palletStandardQty: 30,
      palletWeightKg: 780,
      currentPallets: 8,
      currentLooseQty: 10,
      minStockPallets: 3,
      location: 'Saha A - Palet Raf 03',
      description: 'GGG50 Sfero Döküm',
    },
    {
      id: 'stock-prod-3',
      productName: 'Ağır Vasıta Kampana',
      productCode: 'KMP-500-AV',
      palletStandardQty: 16,
      palletWeightKg: 960,
      currentPallets: 6,
      currentLooseQty: 4,
      minStockPallets: 2,
      location: 'Saha B - Zemin Depolama',
      description: 'Özel Alaşımlı Pik Döküm',
    },
  ];

  return rawList.map(item => {
    const totals = calculateStockItemTotals(item);
    return {
      ...item,
      unitWeightKg: totals.unitWeightKg,
      totalUnits: totals.totalUnits,
      totalWeightKg: totals.totalWeightKg,
      createdAt: now,
      updatedAt: now,
    };
  });
}
