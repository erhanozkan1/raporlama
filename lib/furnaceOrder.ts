import { Furnace } from './types';

/**
 * Ocak sıralama ağırlığı belirleme fonksiyonu
 * Sıralama: 1. İndüksiyon, 2. Mazotlu Büyük, 3. Mazotlu Küçük
 */
export function getFurnaceRank(name: string): number {
  const n = (name || '').toLocaleLowerCase('tr-TR');
  if (n.includes('indüksiyon') || n.includes('induksiyon')) return 1;
  if (n.includes('mazot') && (n.includes('büyük') || n.includes('buyuk') || n.includes('500'))) return 2;
  if (n.includes('mazot') && (n.includes('küçük') || n.includes('kucuk') || n.includes('200'))) return 3;
  if (n.includes('mazot')) return 2.5;
  return 4;
}

/**
 * Ocak listesini standart sıraya göre (İndüksiyon, Mazotlu Büyük, Mazotlu Küçük) sıralar.
 */
export function sortFurnaces<T extends { name: string }>(furnaces: T[]): T[] {
  if (!Array.isArray(furnaces)) return [];
  return [...furnaces].sort((a, b) => getFurnaceRank(a.name) - getFurnaceRank(b.name));
}
