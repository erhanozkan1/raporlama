export type FurnaceStatus = 'Çalışıyor' | 'Bakımda' | 'Arızalı' | 'Kullanım Dışı';

export type FurnaceFuelType = 'Mazot' | 'Elektrik' | 'Doğalgaz' | 'LPG';

export type MaintenanceType = 'Bakım' | 'Arıza Onarımı' | 'Astar Değişimi' | 'Genel Revizyon';

export type EventType = 'production' | 'failure' | 'maintenance' | 'shipping' | 'visit' | 'raw_material' | 'other';

export type UserRole = 'superadmin' | 'admin' | 'operator';

export type AuditAction = 
  | 'RAPOR_EKLE' 
  | 'RAPOR_GÜNCELLE' 
  | 'RAPOR_SİL' 
  | 'OCAK_DURUM_GÜNCELLE' 
  | 'OCAK_DÜZENLE' 
  | 'KULLANICI_EKLE' 
  | 'KULLANICI_GÜNCELLE' 
  | 'KULLANICI_SİL' 
  | 'AYARLAR_GÜNCELLE';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: AuditAction;
  resourceName: string;
  summary: string;
  beforeData?: any;
  afterData?: any;
}

export interface MaintenanceRecord {
  id: string;
  date: string;
  type: MaintenanceType;
  description: string;
  technician?: string;
  durationHours?: number;
  cost?: number;
}

export interface Furnace {
  id: string;
  name: string;
  capacity: string; // e.g., "500 kg"
  status: FurnaceStatus;
  fuelType?: FurnaceFuelType;
  description?: string;
  liningLifeMax?: number;        // Maksimum astar ömrü (şarj sayısı)
  liningChargeCount?: number;    // Mevcut astar şarj sayacı
  liningLastReplaced?: string;   // Son astar değişim tarihi (ISO)
  lastMaintenanceDate?: string;  // Son bakım tarihi
  maintenanceHistory?: MaintenanceRecord[];
  statusHistory?: { status: FurnaceStatus; date: string; note?: string }[]; // Durum değişiklik geçmişi
  createdAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
}

// API yanıtlarında kullanılan, şifre içermeyen kullanıcı tipi
export type SafeUser = Omit<User, 'password'>;

export interface DailyFurnaceRecord {
  furnaceId: string;
  name: string;
  capacity: string;
  status: FurnaceStatus;
  chargeCount: number;
  meltedAmount: number; // in kg
  fuelConsumption: number; // in liters/units
  workDuration: number; // in hours
  description: string;
}

export interface TimelineEvent {
  id: string;
  time: string; // e.g., "08:15"
  description: string;
  type?: EventType; // event category for color coding
}

export type MoldType = 'Fren Diski Kalıbı' | 'Kum Kalıp' | 'Döküm Kalıp';

export interface ProductionItem {
  id: string;
  productName: string;
  productCode?: string;
  moldType?: MoldType | string; // Fren Diski Kalıbı, Kum Kalıp, Döküm Kalıp
  quantity: number;
  tonnage: number; // tonnage calculated or input
  description?: string;
}

export type DowntimeCategory = 
  | 'Mekanik Arıza'
  | 'Elektrik / Otomasyon'
  | 'Refrakter / Astar'
  | 'Kalıp / Maça'
  | 'Enerji / Yakıt Kesintisi'
  | 'Hammadde / Metal Bekleme'
  | 'İSG / Operasyonel Duruş'
  | 'Planlı Bakım'
  | 'Diğer';

export interface DowntimeRecord {
  id: string;
  furnaceId?: string; // İlgili ocak veya genel tesis
  furnaceName?: string;
  category: DowntimeCategory;
  startTime: string; // "10:15"
  endTime: string;   // "11:00"
  durationMinutes: number; // 45 dk
  description: string;
  actionTaken?: string; // Yapılan müdahale
  technician?: string; // Müdahale eden ekip/kişi
}

export interface PersonnelBreakdown {
  melters?: number;        // Ocakçılar
  molders?: number;        // Kalıpçılar / Maçacılar
  craneOperators?: number; // Vinç / Taşıma operatörleri
  casters?: number;        // Dökümcüler
  maintenance?: number;    // Bakım / Teknik ekip
  generalWorkers?: number; // Temizlik / Genel saha işçileri
}

export interface ShiftPersonnel {
  supervisorName?: string; // Vardiya Amiri / Sorumlusu
  totalCount: number;      // Toplam Fiili Çalışan Personel Sayısı
  absentCount?: number;    // İzinli / Raporlu / Gelmeyen Personel Sayısı
  breakdown?: PersonnelBreakdown;
  notes?: string;          // Personel özel notları
}

export interface ShiftHours {
  startTime: string;          // Vardiya başlama saati örn: "08:00"
  endTime: string;            // Vardiya bitiş saati örn: "16:00"
  plannedDurationHours: number; // Planlanan vardiya süresi (saat, örn: 8)
  breakDurationMinutes: number; // Yemek + Çay molası (dk, örn: 60)
  totalDowntimeMinutes?: number; // Otomatik toplanan arıza süresi (dk)
  netWorkDurationHours?: number; // Fiili net üretim çalışma süresi (saat)
}

export interface ShiftHandover {
  liquidMetalStatus?: string;      // Pota ve ocaklardaki erimiş metal / şarj durumu
  waitingMolds?: string;           // Döküm bekleyen / hazırlanan kalıplar
  criticalSafetyNotes?: string;    // İSG ve kritik güvenlik uyarıları
  instructionsForNextShift?: string; // Sonraki vardiyaya özel talimatlar
  handedOverBy?: string;           // Teslim Eden
  receivedBy?: string;             // Teslim Alan
}

export interface DailyReport {
  id: string; // e.g., "2026-07-03" or YYYY-MM-DD
  date: string; // YYYY-MM-DD
  shift?: string; // e.g., "A", "B", "C" or "Gündüz", "Gece"
  description?: string; // Genel Açıklama
  timeline: TimelineEvent[];
  productions: ProductionItem[];
  furnaceRecords: DailyFurnaceRecord[];
  personnel?: ShiftPersonnel;       // Vardiya Ekibi & Personel Bilgileri
  downtimes?: DowntimeRecord[];     // Arıza & Duruş Kayıtları
  shiftHours?: ShiftHours;          // Vardiya Çalışma ve Mola Saatleri
  handoverDetails?: ShiftHandover;  // Yapılandırılmış Vardiya Devir Teslimi
  notes?: string;
  tags: string[];
  photos: string[]; // List of stored photo URLs or base64
  handoverJobs?: string; // Bir Sonraki Güne Devreden İşler (Geriye dönük uyumlu)
  managerEvaluation?: string; // Yönetici Değerlendirmesi
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
}

export interface AppSettings {
  furnaces: Furnace[];
  tags: string[];
  shifts: string[];
  allowEditing?: boolean; // SuperAdmin edit locking toggle
  monthlyTargetKg?: number; // Aylık üretim hedefi (kg) — Kontrol Paneli ilerleme çubuğu
  /** @deprecated monthlyTargetTons kaldırıldı, monthlyTargetKg kullanın */
  monthlyTargetTons?: number;
}
