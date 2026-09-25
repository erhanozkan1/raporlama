import fs from 'fs';
import path from 'path';
import { DailyReport, AppSettings, User, AuditLog } from './types';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

export interface DbSchema {
  reports: DailyReport[];
  settings: AppSettings;
  users: User[];
  auditLogs?: AuditLog[];
}

function getDefaultData(): DbSchema {
  return {
      reports: [],
      settings: {
        furnaces: [
          {
            id: 'furnace-1',
            name: 'Mazotlu Bakır Ocağı (Büyük)',
            capacity: '500 kg',
            status: 'Çalışıyor',
            fuelType: 'Mazot',
            description: 'Yüksek ısılı fırınlarda kullanılan verimli yakıt brülörüne sahip ana döküm ünitesi.',
            liningLifeMax: 200,
            liningChargeCount: 0,
            maintenanceHistory: [],
            createdAt: new Date().toISOString(),
          },
          {
            id: 'furnace-2',
            name: 'Mazotlu Bakır Ocağı (Küçük)',
            capacity: '200 kg',
            status: 'Çalışıyor',
            fuelType: 'Mazot',
            description: 'Hızlı ve küçük ölçekli butik üretimler için yedek döküm kazanı.',
            liningLifeMax: 150,
            liningChargeCount: 0,
            maintenanceHistory: [],
            createdAt: new Date().toISOString(),
          },
          {
            id: 'furnace-3',
            name: 'İndüksiyon Ocağı',
            capacity: '1000 kg',
            status: 'Arızalı',
            fuelType: 'Elektrik',
            description: 'Yüksek elektrik akımıyla hassas alaşımların eritildiği manyetik indüksiyon fırını.',
            liningLifeMax: 300,
            liningChargeCount: 0,
            maintenanceHistory: [],
            createdAt: new Date().toISOString(),
          },
        ],
        tags: [
          'Arıza',
          'Bakım',
          'Elektrik Kesintisi',
          'Mazot',
          'Kalıp',
          'Hurda',
          'Sevkiyat',
          'Kalite',
          'Ziyaret',
        ],
        shifts: [
          '1. Vardiya (08:00 - 16:00)',
          '2. Vardiya (16:00 - 24:00)',
          '3. Vardiya (24:00 - 08:00)',
          'Tüm Gün',
        ],
        monthlyTargetKg: 75000,
      },
      users: [
        {
          id: 'user-superadmin',
          name: 'Erhan Özkan',
          email: 'erhn.ozkan@gmail.com',
          password: 'admin123',
          role: 'superadmin',
          createdAt: new Date().toISOString(),
        },
      ],
  };
}

function ensureDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readDb(): DbSchema {
  ensureDir();

  // Recreate the DB file if it is missing, empty, or corrupted (invalid JSON).
  if (!fs.existsSync(DB_PATH)) {
    const seed = getDefaultData();
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }

  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  if (!raw.trim()) {
    const seed = getDefaultData();
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }

  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('db.json bozuk, varsayılan verilerle yeniden oluşturuluyor:', e);
    const seed = getDefaultData();
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
}

export function writeDb(data: DbSchema) {
  ensureDir();
  // Atomic write: write to a temp file first, then rename, so a crash mid-write
  // can never leave db.json empty/corrupted (the root cause of prior parse errors).
  const tmp = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, DB_PATH);
}
