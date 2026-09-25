'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useSyncState } from '@/hooks/useSyncState';
import { AppSettings, DailyReport, Furnace, FurnaceStatus, User, SafeUser, UserRole, AuditLog, AuditAction } from '@/lib/types';
import DashboardView from '@/components/DashboardView';
import ReportFormView from '@/components/ReportFormView';
import FurnacesView from '@/components/FurnacesView';
import SettingsView from '@/components/SettingsView';
import NotificationPanel from '@/components/NotificationPanel';
import ToastContainer, { ToastMessage } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { DashboardSkeleton, PageSkeleton } from '@/components/ui/Skeleton';
import { generateSystemNotifications, AppNotification } from '@/lib/notifications';
import {
  Flame,
  LayoutDashboard,
  CalendarPlus,
  History,
  Cpu,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Bell,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  BarChart4
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Lazy-loaded heavy components (performance optimization)
const HistoryView = dynamic(() => import('@/components/HistoryView'), {
  loading: () => <PageSkeleton title="Geçmiş Raporlar" />,
});
const UserManagementView = dynamic(() => import('@/components/UserManagementView'), {
  loading: () => <PageSkeleton title="Kullanıcı Yönetimi" />,
});
const AuditLogView = dynamic(() => import('@/components/AuditLogView'), {
  loading: () => <PageSkeleton title="Denetim İzi" />,
});
const AnalyticsView = dynamic(() => import('@/components/AnalyticsView'), {
  loading: () => <PageSkeleton title="Gelişmiş Analitik" />,
});

type NavTab = 'dashboard' | 'new-report' | 'history' | 'furnaces' | 'settings' | 'users' | 'audit-logs' | 'analytics';

const VALID_TABS: NavTab[] = ['dashboard', 'new-report', 'history', 'furnaces', 'settings', 'users', 'audit-logs', 'analytics'];

export default function FoundryApp() {
  const {
    reports,
    settings,
    isOnline,
    isSyncing,
    lastSyncTime,
    loading,
    pendingSyncCount,
    saveReport,
    deleteReport,
    saveSettings,
    syncWithServer,
  } = useSyncState();

  // Active view tab state
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  
  // Date parameter when editing an existing report from history
  const [editingReportDate, setEditingReportDate] = useState<string | null>(null);

  // Desktop Sidebar Collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Mobile menu open
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Mobile "Daha Fazla" alt çekmece durumu
  const [mobileMoreOpen, setMobileMoreOpen] = useState<boolean>(false);

  // Track mounting to prevent hydration mismatches
  const [mounted, setMounted] = useState<boolean>(false);

  // History & URL Hash senkronize tab geçiş fonksiyonu
  const navigateToTab = (tab: NavTab, editDate: string | null = null, replace: boolean = false) => {
    setEditingReportDate(editDate);
    setActiveTab(tab);
    setMobileMenuOpen(false);
    setMobileMoreOpen(false);
    if (typeof window !== 'undefined') {
      const targetHash = `#${tab}`;
      if (window.location.hash !== targetHash) {
        if (replace) {
          window.history.replaceState({ tab, editDate }, '', targetHash);
        } else {
          window.history.pushState({ tab, editDate }, '', targetHash);
        }
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  };

  // Sekme her değiştiğinde sayfanın en üstten açılmasını garanti et
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [activeTab, editingReportDate]);

  // User session state
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role: UserRole; avatar?: string } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // Notification Panel state
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Refs for dismissing header dropdowns on outside click / Escape
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notifOpen && !profileOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (notifOpen && notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
      if (profileOpen && profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNotifOpen(false);
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [notifOpen, profileOpen]);

  // Tarayıcı Geri/İleri (Popstate) ve URL Hash Senkronizasyonu
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const initialHash = window.location.hash.replace('#', '') as NavTab;
      if (initialHash && VALID_TABS.includes(initialHash)) {
        setActiveTab(initialHash);
      } else {
        window.history.replaceState({ tab: 'dashboard' }, '', '#dashboard');
      }

      const handlePopState = (e: PopStateEvent) => {
        const hash = window.location.hash.replace('#', '') as NavTab;
        if (hash && VALID_TABS.includes(hash)) {
          setActiveTab(hash);
          if (e.state?.editDate) {
            setEditingReportDate(e.state.editDate);
          } else {
            setEditingReportDate(null);
          }
        } else if (e.state?.tab && VALID_TABS.includes(e.state.tab)) {
          setActiveTab(e.state.tab);
        } else {
          setActiveTab('dashboard');
          setEditingReportDate(null);
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  // Toast System State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => {
    const newToast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
    };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Audit Logs State (sunucudan yüklenir, kalıcıdır)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const logAuditAction = (
    action: AuditAction,
    resourceName: string,
    summary: string,
    beforeData?: any,
    afterData?: any
  ) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser?.id || 'system',
      userName: currentUser?.name || 'Erhan Özkan',
      userRole: currentUser?.role || 'superadmin',
      action,
      resourceName,
      summary,
      beforeData,
      afterData,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    // Sunucuya kalıcı olarak yaz (arka planda, hata durumunda sessiz)
    fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log: newLog }),
    }).catch(() => {});
  };

  // Users management state (sunucudan yüklenir, kalıcıdır)
  const [usersList, setUsersList] = useState<SafeUser[]>([]);

  // Kullanıcıları ve denetim kayıtlarını sunucudan yükle (superadmin görünümleri)
  useEffect(() => {
    if (currentUser && currentUser.role !== 'superadmin') return;

    fetch('/api/users')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.users)) setUsersList(d.users);
      })
      .catch(() => {});

    fetch('/api/audit')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.logs)) setAuditLogs(d.logs);
      })
      .catch(() => {});
  }, [currentUser]);

  // Generate system notifications on data change
  useEffect(() => {
    const generated = generateSystemNotifications(
      settings?.furnaces || [],
      reports,
      pendingSyncCount
    );

    // Kalıcı okundu/kapatıldı durumunu uygula:
    // kapatılanlar tekrar gösterilmez, okunanlar okundu olarak gelir.
    let dismissedIds: string[] = [];
    let readIds: string[] = [];
    try {
      dismissedIds = JSON.parse(localStorage.getItem('dokum_notif_dismissed') || '[]');
      readIds = JSON.parse(localStorage.getItem('dokum_notif_read') || '[]');
    } catch {}

    const visible = generated
      .filter((n) => !dismissedIds.includes(n.id))
      .map((n) => (readIds.includes(n.id) ? { ...n, read: true } : n));

    setNotifications(visible);
  }, [settings?.furnaces, reports, pendingSyncCount]);

  const handleMarkAllNotifsRead = () => {
    setNotifications((prev) => {
      // Okundu durumunu kalıcılaştır (son 100 kayıtla sınırlı tut)
      try {
        const stored: string[] = JSON.parse(localStorage.getItem('dokum_notif_read') || '[]');
        const merged = Array.from(new Set([...stored, ...prev.map((n) => n.id)])).slice(-100);
        localStorage.setItem('dokum_notif_read', JSON.stringify(merged));
      } catch {}
      return prev.map((n) => ({ ...n, read: true }));
    });
  };

  const handleClearNotif = (id: string) => {
    // Kapatılan bildirimi kalıcılaştır — aynı gün tekrar görünmez
    try {
      const stored: string[] = JSON.parse(localStorage.getItem('dokum_notif_dismissed') || '[]');
      const merged = Array.from(new Set([...stored, id])).slice(-100);
      localStorage.setItem('dokum_notif_dismissed', JSON.stringify(merged));
    } catch {}
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleAddUser = async (newUser: Omit<User, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (!data.success) {
        addToast('error', 'Kullanıcı Eklenemedi', data.error || 'Bilinmeyen hata.');
        return;
      }
      const created: SafeUser = data.user;
      setUsersList((prev) => [...prev, created]);
      addToast('success', 'Kullanıcı Oluşturuldu', `${created.name} sisteme başarıyla eklendi.`);
      logAuditAction('KULLANICI_EKLE', created.name, `${created.name} adlı yeni kullanıcı (${created.role}) tanımlandı.`, null, created);
    } catch {
      addToast('error', 'Bağlantı Hatası', 'Kullanıcı sunucuya kaydedilemedi.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const targetUser = usersList.find((u) => u.id === userId);
    try {
      const res = await fetch(`/api/users?id=${encodeURIComponent(userId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        addToast('error', 'Kullanıcı Silinemedi', data.error || 'Bilinmeyen hata.');
        return;
      }
      setUsersList((prev) => prev.filter((u) => u.id !== userId));
      addToast('error', 'Kullanıcı Silindi', `${targetUser?.name || 'Kullanıcı'} sistemden kaldırıldı.`);
      logAuditAction('KULLANICI_SİL', targetUser?.name || userId, `${targetUser?.name || userId} adlı kullanıcı sistemden silindi.`, targetUser, null);
    } catch {
      addToast('error', 'Bağlantı Hatası', 'Kullanıcı silinemedi.');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    const targetUser = usersList.find((u) => u.id === userId);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (!data.success) {
        addToast('error', 'Rol Güncellenemedi', data.error || 'Bilinmeyen hata.');
        return;
      }
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      addToast('info', 'Rol Güncellendi', `${targetUser?.name} kullanıcısının rolü '${newRole}' yapıldı.`);
      logAuditAction(
        'KULLANICI_GÜNCELLE',
        targetUser?.name || userId,
        `${targetUser?.name} kullanıcısının yeni rolü: ${newRole}`,
        { role: targetUser?.role },
        { role: newRole }
      );
    } catch {
      addToast('error', 'Bağlantı Hatası', 'Rol güncellenemedi.');
    }
  };

  // Load user session and UI preferences
  useEffect(() => {
    setMounted(true);

    const isCollapsed = localStorage.getItem('dokum_sidebar_collapsed') === 'true';
    const timer = setTimeout(() => {
      setSidebarCollapsed(isCollapsed);
    }, 0);

    // User session
    try {
      const storedUser = localStorage.getItem('dokum_user');
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
    } catch {}
    return () => clearTimeout(timer);
  }, []);

  const toggleSidebarCollapse = () => {
    const nextState = !sidebarCollapsed;
    setSidebarCollapsed(nextState);
    localStorage.setItem('dokum_sidebar_collapsed', String(nextState));
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem('dokum_user');
    localStorage.removeItem('dokum_token');
    window.location.href = '/login';
  };

  const getInitials = (name: string) => {
    return name.split('').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'superadmin': return { label: 'Super Admin', color: 'bg-purple-100 text-purple-700 border-purple-200' };
      case 'admin': return { label: 'Admin', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'operator': return { label: 'Operatör', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    }
  };

  const getTabLabel = (tab: NavTab) => {
    switch (tab) {
      case 'dashboard': return 'Kontrol Paneli';
      case 'new-report': return 'Yeni Rapor';
      case 'history': return 'Geçmiş Raporlar';
      case 'furnaces': return 'Ocaklar & Fırınlar';
      case 'analytics': return 'Gelişmiş Analitik';
      case 'settings': return 'Sistem Ayarları';
      case 'users': return 'Kullanıcı Yönetimi';
      case 'audit-logs': return 'Denetim İzi (Audit Log)';
    }
  };

  // Switch to edit mode for a report
  const handleEditReport = (dateStr: string) => {
    navigateToTab('new-report', dateStr);
  };

  // Switch to new empty report template
  const handleNewReport = () => {
    navigateToTab('new-report', null);
  };

  // Handle saving report from Form component (Doğrudan sunucuya kaydeder, hata durumunda uyarır)
  const handleSaveReport = async (report: DailyReport) => {
    const isUpdate = reports.some((r) => r.id === report.id);
    const existing = reports.find((r) => r.id === report.id);

    const result = await saveReport(report);

    if (!result.success) {
      const errMsg = result.error || 'Rapor sunucuya kaydedilemedi.';
      addToast('error', 'Kayıt Başarısız!', errMsg);
      // Kullanıcı formda kalır, veriler asla kaybolmaz ve localde çakışma yaratılmaz
      return result;
    }

    // Astar ömrü otomasyonu: girilen şarj sayısı farkını ocak astar sayaçlarına yansıt.
    // Rapor güncelleniyorsa yalnızca fark eklenir (çift sayım olmaz).
    if (settings) {
      let liningChanged = false;
      const updatedFurnaces = settings.furnaces.map((f) => {
        const newRec = report.furnaceRecords.find((fr) => fr.furnaceId === f.id);
        if (!newRec) return f;
        const oldCount = existing?.furnaceRecords.find((fr) => fr.furnaceId === f.id)?.chargeCount || 0;
        const delta = (newRec.chargeCount || 0) - oldCount;
        if (delta === 0) return f;
        liningChanged = true;
        return { ...f, liningChargeCount: Math.max(0, (f.liningChargeCount || 0) + delta) };
      });
      if (liningChanged) {
        await saveSettings({ ...settings, furnaces: updatedFurnaces });
      }
    }

    navigateToTab('history');

    if (isUpdate) {
      addToast('success', 'Rapor Güncellendi', `${report.date} tarihli operasyon raporu başarıyla kaydedildi.`);
      logAuditAction(
        'RAPOR_GÜNCELLE',
        report.date,
        `${report.date} tarihli günlük rapor güncellendi.`,
        existing,
        report
      );
    } else {
      addToast('success', 'Rapor Oluşturuldu', `${report.date} tarihli yeni günlük rapor kaydedildi.`);
      logAuditAction(
        'RAPOR_EKLE',
        report.date,
        `${report.date} tarihli yeni günlük rapor oluşturuldu.`,
        null,
        report
      );
    }

    return { success: true };
  };

  // Handle deleting report from HistoryView (Doğrudan sunucudan siler)
  const handleDeleteReport = async (reportId: string) => {
    const targetReport = reports.find((r) => r.id === reportId || r.date === reportId);
    const idToDelete = targetReport ? targetReport.id : reportId;
    const dateLabel = targetReport ? targetReport.date : reportId;

    const result = await deleteReport(idToDelete);

    if (!result.success) {
      addToast('error', 'Silme Hatası!', result.error || 'Rapor sunucudan silinemedi.');
      return;
    }

    addToast('success', 'Rapor Silindi', `${dateLabel} tarihli rapor sistemden kalıcı olarak silindi.`);
    logAuditAction(
      'RAPOR_SİL',
      dateLabel,
      `${dateLabel} tarihli rapor silindi.`,
      targetReport || null,
      null
    );
  };

  // Update quick furnace status from Fırınlar tab
  const handleUpdateFurnaceStatus = async (id: string, status: FurnaceStatus, note?: string) => {
    if (!settings) return;
    
    const targetFurnace = settings.furnaces.find((f) => f.id === id);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const updatedFurnaces = settings.furnaces.map(f => {
      if (f.id === id) {
        const prevHistory = f.statusHistory || [];
        const newHistoryEntry = { status, date: today, ...(note ? { note } : {}) };
        return { 
          ...f, 
          status,
          statusHistory: [...prevHistory, newHistoryEntry],
        };
      }
      return f;
    });

    const updatedSettings: AppSettings = {
      ...settings,
      furnaces: updatedFurnaces,
    };

    const res = await saveSettings(updatedSettings);
    if (!res.success) {
      addToast('error', 'Güncelleme Hatası', res.error || 'Ocak durumu sunucuya kaydedilemedi.');
      return;
    }

    addToast('info', 'Ocak Durumu Değişti', `${targetFurnace?.name} yeni durumu: ${status}`);
    logAuditAction(
      'OCAK_DURUM_GÜNCELLE',
      targetFurnace?.name || id,
      `${targetFurnace?.name} ocağının durumu '${status}' olarak değiştirildi.`,
      { status: targetFurnace?.status },
      { status }
    );
  };

  // Full furnace update (name, capacity, description, maintenance, etc.)
  const handleUpdateFurnace = async (updatedFurnace: Furnace) => {
    if (!settings) return;

    const existingFurnace = settings.furnaces.find((f) => f.id === updatedFurnace.id);
    const updatedFurnaces = settings.furnaces.map(f => 
      f.id === updatedFurnace.id ? updatedFurnace : f
    );

    const updatedSettings: AppSettings = {
      ...settings,
      furnaces: updatedFurnaces,
    };

    const res = await saveSettings(updatedSettings);
    if (!res.success) {
      addToast('error', 'Güncelleme Hatası', res.error || 'Ocak verileri sunucuya kaydedilemedi.');
      return;
    }

    addToast('success', 'Ocak Güncellendi', `${updatedFurnace.name} verileri kaydedildi.`);
    logAuditAction(
      'OCAK_DÜZENLE',
      updatedFurnace.name,
      `${updatedFurnace.name} ocağı güncellendi.`,
      existingFurnace,
      updatedFurnace
    );
  };

  const handleSaveAllSettings = async (newSettings: AppSettings) => {
    const res = await saveSettings(newSettings);
    if (!res.success) {
      addToast('error', 'Ayarlar Kaydedilemedi', res.error || 'Sunucu hatası nedeniyle ayarlar kaydedilemedi.');
      return;
    }
    addToast('success', 'Ayarlar Kaydedildi', 'Sistem parametreleri güncellendi.');
    logAuditAction(
      'AYARLAR_GÜNCELLE',
      'Sistem Ayarları',
      'Sistem çalışma parametreleri ve ocak şablonları güncellendi.',
      settings,
      newSettings
    );
  };

  // Render correct View component
  const renderActiveView = () => {
    if (loading) {
      return <DashboardSkeleton />;
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            reports={reports}
            furnaces={settings?.furnaces || []}
            monthlyTargetKg={settings?.monthlyTargetKg ?? (settings?.monthlyTargetTons ? settings.monthlyTargetTons * 1000 : undefined)}
            onNavigateToReport={handleEditReport}
            onNewReport={handleNewReport}
            onNavigateToTab={(tab) => navigateToTab(tab as NavTab)}
          />
        );
      case 'new-report':
        return (
          <ReportFormView 
            initialDate={editingReportDate}
            reports={reports}
            settings={settings}
            onSave={handleSaveReport}
            onCancel={() => {
              navigateToTab('dashboard');
            }}
          />
        );
      case 'history':
        return (
          <HistoryView 
            reports={reports}
            settings={settings}
            onEditReport={handleEditReport}
            onDeleteReport={handleDeleteReport}
          />
        );
      case 'analytics':
        return (
          <AnalyticsView
            reports={reports}
            settings={settings}
          />
        );
      case 'furnaces':
        return (
          <FurnacesView 
            furnaces={settings?.furnaces || []}
            onUpdateStatus={handleUpdateFurnaceStatus}
            onUpdateFurnace={handleUpdateFurnace}
            onNavigateToSettings={() => navigateToTab('settings')}
          />
        );
      case 'settings':
        return (
          <SettingsView 
            settings={settings}
            onSaveSettings={handleSaveAllSettings}
            reportsCount={reports.length}
            userRole={currentUser?.role}
          />
        );
      case 'users':
        return (
          <UserManagementView 
            users={usersList}
            onAddUser={handleAddUser}
            onDeleteUser={handleDeleteUser}
            onUpdateRole={handleUpdateRole}
          />
        );
      case 'audit-logs':
        return (
          <AuditLogView 
            logs={auditLogs}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex transition-colors duration-200">
      
      {/* 1. DESKTOP SIDEBAR (STICKY & COLLAPSIBLE) */}
      <aside
        className={`hidden lg:flex flex-col h-screen sticky top-0 bg-white border-r border-slate-200 shrink-0 transition-all duration-300 z-30 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
        role="navigation"
        aria-label="Ana navigasyon"
      >
        
        {/* App Logo/Header & Collapse Toggle */}
        <div className={`p-4 border-b border-slate-100 flex items-center ${
          sidebarCollapsed ? 'flex-col gap-3 justify-center text-center px-2' : 'justify-between gap-2'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white shadow-lg shadow-amber-500/20 shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <h2 className="font-extrabold text-sm text-slate-900 font-display tracking-wide uppercase truncate">
                  Döküm Takip
                </h2>
                <p className="text-[10px] text-slate-400 font-sans tracking-wide truncate">
                  OPERASYON SİSTEMİ v2.0
                </p>
              </div>
            )}
          </div>

          <button
            onClick={toggleSidebarCollapse}
            title={sidebarCollapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'}
            className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition shrink-0"
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>
 
        {/* Navigation Links - Grouped */}
        <nav className="flex-1 p-3 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Ana Menü Group */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 block mb-2">
                Ana Menü
              </span>
            )}

            <button
              onClick={() => navigateToTab('dashboard')}
              id="nav-btn-dashboard"
              title={sidebarCollapsed ? 'Kontrol Paneli' : undefined}
              className={`w-full p-3 rounded-xl text-xs font-bold flex items-center gap-3 transition-all duration-150 relative ${
                sidebarCollapsed ? 'justify-center' : ''
              } ${
                activeTab === 'dashboard'
                  ? 'bg-amber-50 text-amber-700 nav-active-indicator'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Kontrol Paneli</span>}
            </button>

            <button
              onClick={handleNewReport}
              id="nav-btn-new-report"
              title={sidebarCollapsed ? 'Yeni Günlük Rapor' : undefined}
              className={`w-full p-3 rounded-xl text-xs font-bold flex items-center gap-3 transition-all duration-150 relative ${
                sidebarCollapsed ? 'justify-center' : ''
              } ${
                activeTab === 'new-report'
                  ? 'bg-amber-50 text-amber-700 nav-active-indicator'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CalendarPlus className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Yeni Günlük Rapor</span>}
            </button>

            <button
              onClick={() => navigateToTab('history')}
              id="nav-btn-history"
              title={sidebarCollapsed ? 'Geçmiş Raporlar' : undefined}
              className={`w-full p-3 rounded-xl text-xs font-bold flex items-center gap-3 transition-all duration-150 relative ${
                sidebarCollapsed ? 'justify-center' : ''
              } ${
                activeTab === 'history'
                  ? 'bg-amber-50 text-amber-700 nav-active-indicator'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <History className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Geçmiş Raporlar</span>}
            </button>

            <button
              onClick={() => navigateToTab('analytics')}
              id="nav-btn-analytics"
              title={sidebarCollapsed ? 'Gelişmiş Analitik' : undefined}
              className={`w-full p-3 rounded-xl text-xs font-bold flex items-center gap-3 transition-all duration-150 relative ${
                sidebarCollapsed ? 'justify-center' : ''
              } ${
                activeTab === 'analytics'
                  ? 'bg-amber-50 text-amber-700 nav-active-indicator'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <BarChart4 className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Gelişmiş Analitik</span>}
            </button>
          </div>

          {/* Yönetim Group */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 block mb-2">
                Yönetim
              </span>
            )}

            <button
              onClick={() => navigateToTab('furnaces')}
              id="nav-btn-furnaces"
              title={sidebarCollapsed ? 'Ocaklar & Fırınlar' : undefined}
              className={`w-full p-3 rounded-xl text-xs font-bold flex items-center gap-3 transition-all duration-150 relative ${
                sidebarCollapsed ? 'justify-center' : ''
              } ${
                activeTab === 'furnaces'
                  ? 'bg-amber-50 text-amber-700 nav-active-indicator'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Cpu className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Ocaklar & Fırınlar</span>}
            </button>

            <button
              onClick={() => navigateToTab('settings')}
              id="nav-btn-settings"
              title={sidebarCollapsed ? 'Sistem Ayarları' : undefined}
              className={`w-full p-3 rounded-xl text-xs font-bold flex items-center gap-3 transition-all duration-150 relative ${
                sidebarCollapsed ? 'justify-center' : ''
              } ${
                activeTab === 'settings'
                  ? 'bg-amber-50 text-amber-700 nav-active-indicator'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Sistem Ayarları</span>}
            </button>

            {(!currentUser || currentUser.role === 'superadmin') && (
              <>
                <button
                  onClick={() => navigateToTab('users')}
                  id="nav-btn-users"
                  title={sidebarCollapsed ? 'Kullanıcı Yönetimi' : undefined}
                  className={`w-full p-3 rounded-xl text-xs font-bold flex items-center gap-3 transition-all duration-150 relative ${
                    sidebarCollapsed ? 'justify-center' : ''
                  } ${
                    activeTab === 'users'
                      ? 'bg-amber-50 text-amber-700 nav-active-indicator'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Kullanıcı Yönetimi</span>}
                </button>

                <button
                  onClick={() => navigateToTab('audit-logs')}
                  id="nav-btn-audit-logs"
                  title={sidebarCollapsed ? 'Denetim İzi (Audit Log)' : undefined}
                  className={`w-full p-3 rounded-xl text-xs font-bold flex items-center gap-3 transition-all duration-150 relative ${
                    sidebarCollapsed ? 'justify-center' : ''
                  } ${
                    activeTab === 'audit-logs'
                      ? 'bg-amber-50 text-amber-700 nav-active-indicator'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Denetim İzi (Audit Log)</span>}
                </button>
              </>
            )}
          </div>
        </nav>
 
        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-100 ">
          <div className={`flex items-center gap-3 p-2.5 bg-slate-50 rounded-2xl ${
            sidebarCollapsed ? 'justify-center' : ''
          }`}>
            {/* Avatar */}
            <div 
              title={sidebarCollapsed ? (currentUser?.name || 'Erhan Özkan') : undefined}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-xs shrink-0 avatar-ring"
            >
              {currentUser ? getInitials(currentUser.name) : 'SA'}
            </div>

            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {currentUser?.name || 'Erhan Özkan'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {currentUser ? (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold border ${getRoleBadge(currentUser.role).color}`}>
                      {getRoleBadge(currentUser.role).label}
                    </span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-md font-bold border border-purple-200 ">
                      Super Admin
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 2. MAIN APP CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0 overflow-x-clip">
        
        {/* TOP STATUS BAR */}
        <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-gray-100 min-h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] flex items-center justify-between px-4 sm:px-6">
          
          {/* Left side: Hamburger on mobile / Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-50 rounded-xl"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="text-gray-400 font-semibold">Döküm Takip</span>
              <span className="text-gray-300">/</span>
              <span className="text-gray-700 font-bold">{getTabLabel(activeTab)}</span>
            </div>
          </div>

          {/* Right side: Active Status, Notifications, Profile */}
          <div className="flex items-center gap-3">
            
            {/* Canlı Sunucu / Bağlantı Durumu Rozeti */}
            {isOnline ? (
              <div 
                title={lastSyncTime ? `Son sunucu sorgusu: ${lastSyncTime}` : 'Canlı sunucu bağlantısı aktif'}
                className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-xl border border-emerald-200 text-[11px] font-extrabold cursor-default"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="hidden xs:inline">Canlı Sunucu</span>
                {lastSyncTime && <span className="text-[10px] font-mono text-emerald-600/80 font-normal">({lastSyncTime})</span>}
              </div>
            ) : (
              <div 
                title="Sunucuya erişilemiyor. Lütfen internet bağlantınızı kontrol ediniz."
                className="flex items-center gap-1.5 bg-rose-50 text-rose-700 px-2.5 py-1.5 rounded-xl border border-rose-200 text-[11px] font-extrabold"
              >
                <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                <span>Sunucu Bağlantısı Yok</span>
              </div>
            )}

            {/* Notification Bell Button */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2.5 hover:bg-gray-50 border border-gray-100 rounded-xl transition text-gray-600 relative active:scale-95"
                id="btn-toggle-notifications"
              >
                <Bell className="w-4 h-4" />
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-amber-500 text-white rounded-full text-[9px] leading-none font-bold font-mono flex items-center justify-center animate-pulse ring-2 ring-white ">
                    {(() => {
                      const c = notifications.filter((n) => !n.read).length;
                      return c > 99 ? '99+' : c;
                    })()}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <NotificationPanel
                    notifications={notifications}
                    onMarkAllAsRead={handleMarkAllNotifsRead}
                    onClearNotification={handleClearNotif}
                    onNavigateToTab={(tab) => setActiveTab(tab as NavTab)}
                    onClose={() => setNotifOpen(false)}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Profile Dropdown */}
            <div className="relative hidden lg:block" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded-xl transition"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-[10px]">
                  {currentUser ? getInitials(currentUser.name) : 'SA'}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-60 bg-white/95 backdrop-blur-md border border-gray-100 rounded-2xl shadow-2xl p-2 z-50"
                  >
                    <div className="px-3.5 py-3 border-b border-gray-100 mb-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-900 ">{currentUser?.name || 'Erhan Özkan'}</p>
                        {currentUser && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${getRoleBadge(currentUser.role).color}`}>
                            {getRoleBadge(currentUser.role).label}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 font-mono truncate">{currentUser?.email || 'erhn.ozkan@gmail.com'}</p>
                    </div>

                    <button
                      onClick={() => {
                        setActiveTab('settings');
                        setProfileOpen(false);
                      }}
                      className="w-full px-3.5 py-2.5 text-xs font-semibold text-gray-700 hover:bg-amber-50 hover:text-amber-600 rounded-xl flex items-center gap-2.5 transition"
                    >
                      <Settings className="w-4 h-4 text-gray-400" />
                      Sistem Ayarları
                    </button>

                    {(!currentUser || currentUser.role === 'superadmin') && (
                      <button
                        onClick={() => {
                          setActiveTab('users');
                          setProfileOpen(false);
                        }}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold text-gray-700 hover:bg-amber-50 hover:text-amber-600 rounded-xl flex items-center gap-2.5 transition"
                      >
                        <Users className="w-4 h-4 text-gray-400" />
                        Kullanıcı Yönetimi
                      </button>
                    )}

                    <div className="my-1 border-t border-gray-100" />

                    <button
                      onClick={handleLogout}
                      className="w-full px-3.5 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2.5 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      Oturumu Kapat
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* CENTRAL VIEW STAGE */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 pb-28 lg:pb-8" role="main" aria-label={getTabLabel(activeTab)}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (editingReportDate || '')}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* 3. MOBİL PROFESYONEL MİNİMAL ALT NAVİGASYON (FLOATING DOCK) */}
      <nav className="lg:hidden fixed bottom-3 left-4 right-4 z-40">
        <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-slate-950/40 rounded-2xl h-14 flex items-center justify-around px-2 text-white">
          {/* 1. Panel */}
          <button
            onClick={() => navigateToTab('dashboard')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 tap-bounce transition ${
              activeTab === 'dashboard' ? 'text-amber-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-[10px] font-medium mt-0.5">Panel</span>
          </button>

          {/* 2. Geçmiş */}
          <button
            onClick={() => navigateToTab('history')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 tap-bounce transition ${
              activeTab === 'history' ? 'text-amber-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span className="text-[10px] font-medium mt-0.5">Geçmiş</span>
          </button>

          {/* 3. Ortada Vurgulu YENİ RAPOR (Floating Minimal Accent) */}
          <button
            onClick={handleNewReport}
            className={`w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/40 tap-bounce transition shrink-0 mx-1 active:scale-90 ${
              activeTab === 'new-report' ? 'ring-2 ring-white/50 scale-105' : ''
            }`}
            title="Yeni Rapor"
          >
            <CalendarPlus className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* 4. Ocaklar */}
          <button
            onClick={() => navigateToTab('furnaces')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 tap-bounce transition ${
              activeTab === 'furnaces' ? 'text-amber-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span className="text-[10px] font-medium mt-0.5">Ocaklar</span>
          </button>

          {/* 5. Menü */}
          <button
            onClick={() => setMobileMoreOpen(!mobileMoreOpen)}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 tap-bounce transition ${
              ['analytics', 'settings', 'users', 'audit-logs'].includes(activeTab) || mobileMoreOpen
                ? 'text-amber-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Menu className="w-4 h-4" />
            <span className="text-[10px] font-medium mt-0.5">Menü</span>
          </button>
        </div>
      </nav>

      {/* 4. MOBİL DAHA FAZLA ALT ÇEKMECESİ (BOTTOM SHEET) */}
      <AnimatePresence>
        {mobileMoreOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileMoreOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-5 pb-safe space-y-4 shadow-2xl border-t border-slate-200"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-2" />
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900 font-display">Tüm Menü & Modüller</h3>
                <button onClick={() => setMobileMoreOpen(false)} className="p-1 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => navigateToTab('analytics')}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col gap-2 transition ${
                    activeTab === 'analytics' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-100 text-slate-700'
                  }`}
                >
                  <BarChart4 className="w-5 h-5 text-amber-600" />
                  <span className="text-xs font-bold">Gelişmiş Analitik</span>
                </button>

                <button
                  onClick={() => navigateToTab('settings')}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col gap-2 transition ${
                    activeTab === 'settings' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-100 text-slate-700'
                  }`}
                >
                  <Settings className="w-5 h-5 text-slate-600" />
                  <span className="text-xs font-bold">Sistem Ayarları</span>
                </button>

                {(!currentUser || currentUser.role === 'superadmin') && (
                  <>
                    <button
                      onClick={() => navigateToTab('users')}
                      className={`p-3.5 rounded-2xl border text-left flex flex-col gap-2 transition ${
                        activeTab === 'users' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-100 text-slate-700'
                      }`}
                    >
                      <Users className="w-5 h-5 text-blue-600" />
                      <span className="text-xs font-bold">Kullanıcı Yönetimi</span>
                    </button>

                    <button
                      onClick={() => navigateToTab('audit-logs')}
                      className={`p-3.5 rounded-2xl border text-left flex flex-col gap-2 transition ${
                        activeTab === 'audit-logs' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-100 text-slate-700'
                      }`}
                    >
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <span className="text-xs font-bold">Denetim İzi</span>
                    </button>
                  </>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full py-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Oturumu Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. MOBILE HAMBURGER SLIDE DRAWER MENU */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 bottom-0 left-0 w-72 bg-white flex flex-col justify-between border-r border-slate-200 overflow-y-auto"
            >
              <div className="space-y-6 px-6 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 ">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg text-white">
                      <Flame className="w-4 h-4" />
                    </div>
                    <span className="font-extrabold text-xs text-slate-900 tracking-wider">DÖKÜM TAKİP</span>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)}>
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <nav className="space-y-1">
                  <button
                    onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
                    className={`w-full px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 transition relative ${
                      activeTab === 'dashboard' ? 'bg-amber-50 text-amber-700 nav-active-indicator' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Kontrol Paneli
                  </button>

                  <button
                    onClick={() => { handleNewReport(); setMobileMenuOpen(false); }}
                    className={`w-full px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 transition relative ${
                      activeTab === 'new-report' ? 'bg-amber-50 text-amber-700 nav-active-indicator' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CalendarPlus className="w-4 h-4" />
                    Yeni Günlük Rapor
                  </button>

                  <button
                    onClick={() => { setActiveTab('history'); setMobileMenuOpen(false); }}
                    className={`w-full px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 transition relative ${
                      activeTab === 'history' ? 'bg-amber-50 text-amber-700 nav-active-indicator' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    Geçmiş Raporlar
                  </button>

                  <button
                    onClick={() => { setActiveTab('analytics'); setMobileMenuOpen(false); }}
                    className={`w-full px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 transition relative ${
                      activeTab === 'analytics' ? 'bg-amber-50 text-amber-700 nav-active-indicator' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <BarChart4 className="w-4 h-4" />
                    Gelişmiş Analitik
                  </button>

                  <button
                    onClick={() => { setActiveTab('furnaces'); setMobileMenuOpen(false); }}
                    className={`w-full px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 transition relative ${
                      activeTab === 'furnaces' ? 'bg-amber-50 text-amber-700 nav-active-indicator' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Cpu className="w-4 h-4" />
                    Ocaklar & Fırınlar
                  </button>

                  <button
                    onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
                    className={`w-full px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 transition relative ${
                      activeTab === 'settings' ? 'bg-amber-50 text-amber-700 nav-active-indicator' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    Sistem Ayarları
                  </button>

                  {(!currentUser || currentUser.role === 'superadmin') && (
                    <>
                      <button
                        onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }}
                        className={`w-full px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 transition relative ${
                          activeTab === 'users' ? 'bg-amber-50 text-amber-700 nav-active-indicator' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Users className="w-4 h-4" />
                        Kullanıcı Yönetimi
                      </button>

                      <button
                        onClick={() => { setActiveTab('audit-logs'); setMobileMenuOpen(false); }}
                        className={`w-full px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 transition relative ${
                          activeTab === 'audit-logs' ? 'bg-amber-50 text-amber-700 nav-active-indicator' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Denetim İzi (Audit Log)
                      </button>
                    </>
                  )}
                </nav>
              </div>

              {/* Mobile drawer user section */}
              <div className="px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-gray-100 ">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {currentUser ? getInitials(currentUser.name) : 'SA'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{currentUser?.name || 'Erhan Özkan'}</p>
                    <p className="text-[10px] text-gray-400 truncate">{currentUser?.email || 'erhn.ozkan@gmail.com'}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full mt-2 px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 rounded-xl flex items-center justify-center gap-2 transition font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Çıkış Yap
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST NOTIFICATION SYSTEM */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
