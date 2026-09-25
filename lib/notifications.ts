import { Furnace, DailyReport } from './types';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  createdAt: string;
  read: boolean;
  link?: string;
  targetTab?: string;
}

/**
 * Sistem durum bildirimleri — canlı veriden türetilir.
 *
 * ID'ler güne bağlıdır (`...-2026-07-06` gibi): kullanıcı bir bildirimi
 * kapattığında o gün boyunca tekrar görünmez; koşul ertesi gün hâlâ
 * geçerliyse yeni günün bildirimi olarak bir kez daha hatırlatılır.
 * Okundu/kapatıldı durumu page.tsx tarafında localStorage'da saklanır.
 */
export function generateSystemNotifications(
  furnaces: Furnace[],
  reports: DailyReport[],
  pendingSyncCount: number
): AppNotification[] {
  const notifications: AppNotification[] = [];
  const todayStr = new Date().toISOString().split('T')[0];
  const nowTime = new Date().getTime();

  // 1. Arızalı ve Bakımda olan ocaklar
  furnaces.forEach((f) => {
    if (f.status === 'Arızalı') {
      notifications.push({
        id: `notif-broken-${f.id}-${todayStr}`,
        title: '🔥 Ocak Arızası Uyarısı',
        message: `${f.name} durumu 'Arızalı' olarak işaretlendi. Acil onarım ve müdahale gereklidir.`,
        type: 'danger',
        createdAt: f.lastMaintenanceDate || new Date().toISOString(),
        read: false,
        targetTab: 'furnaces',
      });
    } else if (f.status === 'Bakımda') {
      notifications.push({
        id: `notif-maint-${f.id}-${todayStr}`,
        title: '🔧 Ocak Bakım Modunda',
        message: `${f.name} aktif olarak bakım modunda. Bakım tamamlandıktan sonra durumu güncelleyin.`,
        type: 'warning',
        createdAt: f.lastMaintenanceDate || new Date().toISOString(),
        read: false,
        targetTab: 'furnaces',
      });
    }
  });

  // 2. Kademeli Astar Ömrü Uyarıları (%80 Uyarı, %90+ & %100+ Kritik)
  furnaces.forEach((f) => {
    if (f.liningLifeMax && f.liningLifeMax > 0) {
      const percent = Math.round(((f.liningChargeCount || 0) / f.liningLifeMax) * 100);
      if (percent >= 100) {
        notifications.push({
          id: `notif-lining-100-${f.id}-${todayStr}`,
          title: '🚨 Astar Ömrü Doldu (%100+)',
          message: `${f.name} astar ömrünü tamamen tamamladı (${f.liningChargeCount}/${f.liningLifeMax} şarj). Yeni astar değişimi yapılması zorunludur!`,
          type: 'danger',
          createdAt: new Date().toISOString(),
          read: false,
          targetTab: 'furnaces',
        });
      } else if (percent >= 90) {
        notifications.push({
          id: `notif-lining-90-${f.id}-${todayStr}`,
          title: '⚠️ Astar Ömrü Kritik (%' + percent + ')',
          message: `${f.name} astar ömrü tükenmek üzere (${f.liningChargeCount}/${f.liningLifeMax} şarj). Astar yenileme operasyonu planlanmalıdır!`,
          type: 'danger',
          createdAt: new Date().toISOString(),
          read: false,
          targetTab: 'furnaces',
        });
      } else if (percent >= 80) {
        notifications.push({
          id: `notif-lining-80-${f.id}-${todayStr}`,
          title: '🟡 Astar Ömrü Yaklaşıyor (%' + percent + ')',
          message: `${f.name} astar seviyesi %${percent} düzeyine ulaştı (${f.liningChargeCount}/${f.liningLifeMax} şarj). Yakından takip edin.`,
          type: 'warning',
          createdAt: new Date().toISOString(),
          read: false,
          targetTab: 'furnaces',
        });
      }
    }
  });

  // 3. Periyodik Bakım Zamanı Geçmiş Ocaklar (30 günden eski bakımlar)
  furnaces.forEach((f) => {
    if (f.lastMaintenanceDate) {
      const lastMaintTime = new Date(f.lastMaintenanceDate).getTime();
      const diffDays = Math.floor((nowTime - lastMaintTime) / (1000 * 60 * 60 * 24));
      if (diffDays >= 30 && f.status === 'Çalışıyor') {
        notifications.push({
          id: `notif-overdue-maint-${f.id}-${todayStr}`,
          title: '🛠️ Periyodik Bakım Zamanı Geldi',
          message: `${f.name} için son bakımdan bu yana ${diffDays} gün geçti. Periyodik kontrolleri gerçekleştirin.`,
          type: 'info',
          createdAt: new Date().toISOString(),
          read: false,
          targetTab: 'furnaces',
        });
      }
    }
  });

  // 4. Senkronizasyon bekleyen kayıtlar
  if (pendingSyncCount > 0) {
    notifications.push({
      id: `notif-sync-pending-${todayStr}`,
      title: 'Çevrimdışı Kayıtlar Bekliyor',
      message: `${pendingSyncCount} adet rapor sunucuya senkronize edilmeyi bekliyor.`,
      type: 'info',
      createdAt: new Date().toISOString(),
      read: false,
      targetTab: 'history',
    });
  }

  // 5. Bugünün raporu henüz girilmemiş
  const hasTodayReport = reports.some((r) => r.date === todayStr);
  if (!hasTodayReport) {
    notifications.push({
      id: `notif-missing-${todayStr}`,
      title: 'Bugünkü Rapor Henüz Girilmedi',
      message: `${todayStr} tarihli vardiya döküm raporu henüz oluşturulmadı.`,
      type: 'info',
      createdAt: new Date().toISOString(),
      read: false,
      targetTab: 'new-report',
    });
  }

  return notifications;
}
