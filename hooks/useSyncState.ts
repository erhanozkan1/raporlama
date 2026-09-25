'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DailyReport, AppSettings } from '@/lib/types';

export function useSyncState() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastError, setLastError] = useState<string | null>(null);

  // Eski çakışma yaratan yerel veritabanı (localStorage) kalıntılarını temizle
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('dokum_takip_reports');
        localStorage.removeItem('dokum_takip_settings');
        localStorage.removeItem('dokum_takip_deleted_ids');
        localStorage.removeItem('dokum_active_form_draft');
      } catch (e) {
        // Ignore storage errors
      }
    }
  }, []);

  // Sunucudan taze raporları çek (asla istemci local verisini sunucuya basmaz, çakışma olmaz)
  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch('/api/reports', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.reports)) {
          setReports(data.reports);
          setIsOnline(true);
          setLastSyncTime(new Date().toLocaleTimeString('tr-TR'));
          return data.reports;
        } else {
          throw new Error(data.error || 'Rapor listesi alınamadı');
        }
      } else {
        throw new Error(`Sunucu hatası: ${res.status}`);
      }
    } catch (e: any) {
      console.warn('Raporları çekme hatası:', e);
      setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : false);
      return null;
    }
  }, []);

  // Sunucudan ayarları çek
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          setSettings(data.settings);
          return data.settings;
        }
      }
    } catch (e) {
      console.warn('Ayar çekme hatası:', e);
    }
    return null;
  }, []);

  // İlk yükleme
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchReports(), fetchSettings()]);
    setLoading(false);
  }, [fetchReports, fetchSettings]);

  // Rapor kaydet - DOĞRUDAN SUNUCUYA KAYDEDER
  // Başarısız olursa localde tutmaz, hata döner ve not/uyarı verilir.
  const saveReport = useCallback(async (report: DailyReport): Promise<{ success: boolean; error?: string }> => {
    setIsSyncing(true);
    setLastError(null);

    const now = new Date().toISOString();
    const reportPayload: DailyReport = {
      ...report,
      synced: true,
      updatedAt: now,
      createdAt: report.createdAt || now,
    };

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: reportPayload }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        const errMsg = data?.error || `Sunucu hatası (${res.status}): Kaydedilemedi`;
        setLastError(errMsg);
        setIsSyncing(false);
        return { success: false, error: errMsg };
      }

      // Başarılı: State'i sunucudan dönen rapor veya güncel liste ile yenile
      setReports(prev => {
        const savedItem = data.report || reportPayload;
        const exists = prev.some(r => r.id === savedItem.id);
        const next = exists
          ? prev.map(r => (r.id === savedItem.id ? savedItem : r))
          : [savedItem, ...prev];
        next.sort((a, b) => b.date.localeCompare(a.date));
        return next;
      });

      setLastSyncTime(new Date().toLocaleTimeString('tr-TR'));
      setIsOnline(true);
      setIsSyncing(false);
      return { success: true };
    } catch (e: any) {
      const errMsg = e?.message || 'İnternet bağlantısı veya sunucu hatası nedeniyle kaydedilemedi.';
      setLastError(errMsg);
      setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : false);
      setIsSyncing(false);
      return { success: false, error: errMsg };
    }
  }, []);

  // Rapor sil - DOĞRUDAN SUNUCUDAN SİLER
  const deleteReport = useCallback(async (reportId: string): Promise<{ success: boolean; error?: string }> => {
    setIsSyncing(true);
    setLastError(null);

    try {
      const res = await fetch(`/api/reports?id=${encodeURIComponent(reportId)}`, {
        method: 'DELETE',
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        const errMsg = data?.error || `Sunucu hatası (${res.status}): Rapor silinemedi`;
        setLastError(errMsg);
        setIsSyncing(false);
        return { success: false, error: errMsg };
      }

      // Başarılı: State'ten çıkar
      setReports(prev => prev.filter(r => r.id !== reportId && r.date !== reportId));
      setLastSyncTime(new Date().toLocaleTimeString('tr-TR'));
      setIsSyncing(false);
      return { success: true };
    } catch (e: any) {
      const errMsg = e?.message || 'İnternet bağlantısı veya sunucu hatası nedeniyle silinemedi.';
      setLastError(errMsg);
      setIsSyncing(false);
      return { success: false, error: errMsg };
    }
  }, []);

  // Ayarları kaydet - DOĞRUDAN SUNUCUYA KAYDEDER
  const saveSettings = useCallback(async (newSettings: AppSettings): Promise<{ success: boolean; error?: string }> => {
    setIsSyncing(true);
    setLastError(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newSettings }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        const errMsg = data?.error || `Sunucu hatası (${res.status}): Ayarlar kaydedilemedi`;
        setLastError(errMsg);
        setIsSyncing(false);
        return { success: false, error: errMsg };
      }

      setSettings(newSettings);
      setIsSyncing(false);
      return { success: true };
    } catch (e: any) {
      const errMsg = e?.message || 'Ayarlar sunucuya kaydedilemedi.';
      setLastError(errMsg);
      setIsSyncing(false);
      return { success: false, error: errMsg };
    }
  }, []);

  // syncWithServer: Artık istemciden sunucuya veri basmaz!
  // Sadece sunucudaki en güncel durumu sorgular (read-only refresh).
  const syncWithServer = useCallback(async () => {
    setIsSyncing(true);
    await Promise.all([fetchReports(), fetchSettings()]);
    setIsSyncing(false);
  }, [fetchReports, fetchSettings]);

  // Ağ durumu ve canlı periyodik yenileme (15 saniyede bir sunucudan oku)
  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    loadInitialData();

    const handleOnline = () => {
      setIsOnline(true);
      fetchReports();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleFocusOrVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchReports();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    const intervalTimer = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        fetchReports();
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      clearInterval(intervalTimer);
    };
  }, [loadInitialData, fetchReports]);

  return {
    reports,
    settings,
    isOnline,
    isSyncing,
    lastSyncTime,
    loading,
    pendingSyncCount: 0, // Yerel veritabanı olmadığı için bekleyen kuyruk yok
    lastError,
    clearLastError: () => setLastError(null),
    saveReport,
    deleteReport,
    saveSettings,
    syncWithServer,
  };
}
