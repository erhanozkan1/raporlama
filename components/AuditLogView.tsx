'use client';

import React, { useState, useMemo } from 'react';
import { AuditLog, AuditAction, AuditCategory, AuditSeverity, UserRole } from '@/lib/types';
import { 
  ShieldCheck, 
  Search, 
  Calendar, 
  User, 
  Eye, 
  ArrowRight, 
  X, 
  FileText, 
  Cpu, 
  Users, 
  Settings, 
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  LogIn,
  LogOut,
  Boxes,
  Truck,
  Download,
  Filter,
  Globe,
  Monitor,
  Flame,
  FileSpreadsheet,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuditLogViewProps {
  logs: AuditLog[];
}

export default function AuditLogView({ logs }: AuditLogViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedUser, setSelectedUser] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [activeLog, setActiveLog] = useState<AuditLog | null>(null);
  const [showJsonRaw, setShowJsonRaw] = useState(false);

  // Benzersiz Kullanıcı İsimleri
  const uniqueUsers = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => {
      if (l.userName) set.add(l.userName);
    });
    return Array.from(set).sort();
  }, [logs]);

  // Üst KPI İstatistikleri
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const todayLogs = logs.filter(l => l.timestamp.startsWith(todayStr));
    const securityLogs = logs.filter(l => 
      l.action === 'GİRİŞ_BAŞARILI' || 
      l.action === 'GİRİŞ_BAŞARISIZ' || 
      l.action === 'ÇIKIŞ_YAPILDI' ||
      l.action === 'KULLANICI_EKLE' ||
      l.action === 'KULLANICI_GÜNCELLE' ||
      l.action === 'KULLANICI_SİL'
    );
    const activeUsersToday = new Set(todayLogs.map(l => l.userName)).size;

    return {
      totalLogs: logs.length,
      todayCount: todayLogs.length,
      securityEvents: securityLogs.length,
      activeUsersToday,
    };
  }, [logs]);

  // Filtrelenmiş Loglar
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    return logs.filter((log) => {
      // 1. Arama Terimi
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesUser = (log.userName || '').toLowerCase().includes(q);
        const matchesSummary = (log.summary || '').toLowerCase().includes(q);
        const matchesResource = (log.resourceName || '').toLowerCase().includes(q);
        const matchesAction = (log.action || '').toLowerCase().includes(q);
        const matchesIp = (log.ipAddress || '').toLowerCase().includes(q);
        if (!matchesUser && !matchesSummary && !matchesResource && !matchesAction && !matchesIp) {
          return false;
        }
      }

      // 2. Kategori Filtresi
      if (selectedCategory !== 'ALL' && log.category !== selectedCategory) {
        return false;
      }

      // 3. İşlem Tipi Filtresi
      if (selectedAction !== 'ALL' && log.action !== selectedAction) {
        return false;
      }

      // 4. Kullanıcı Filtresi
      if (selectedUser !== 'ALL' && log.userName !== selectedUser) {
        return false;
      }

      // 5. Tarih Filtresi
      if (dateFilter === 'TODAY' && !log.timestamp.startsWith(todayStr)) {
        return false;
      }
      if (dateFilter === 'WEEK' && log.timestamp < sevenDaysAgo) {
        return false;
      }
      if (dateFilter === 'MONTH' && log.timestamp < thirtyDaysAgo) {
        return false;
      }

      return true;
    });
  }, [logs, searchTerm, selectedCategory, selectedAction, selectedUser, dateFilter]);

  // Aksiyon Rozeti ve İkonu
  const getActionMeta = (action: AuditAction) => {
    switch (action) {
      case 'GİRİŞ_BAŞARILI':
        return { 
          label: 'Giriş Yapıldı', 
          color: 'bg-emerald-50 text-emerald-800 border-emerald-200', 
          icon: <LogIn className="w-3.5 h-3.5 text-emerald-600" /> 
        };
      case 'GİRİŞ_BAŞARISIZ':
        return { 
          label: 'Hatalı Giriş Denemesi', 
          color: 'bg-red-50 text-red-800 border-red-200', 
          icon: <AlertOctagon className="w-3.5 h-3.5 text-red-600" /> 
        };
      case 'ÇIKIŞ_YAPILDI':
        return { 
          label: 'Çıkış Yapıldı', 
          color: 'bg-slate-100 text-slate-700 border-slate-200', 
          icon: <LogOut className="w-3.5 h-3.5 text-slate-500" /> 
        };
      case 'RAPOR_EKLE':
        return { 
          label: 'Rapor Oluşturuldu', 
          color: 'bg-blue-50 text-blue-800 border-blue-200', 
          icon: <FileText className="w-3.5 h-3.5 text-blue-600" /> 
        };
      case 'RAPOR_GÜNCELLE':
        return { 
          label: 'Rapor Güncellendi', 
          color: 'bg-indigo-50 text-indigo-800 border-indigo-200', 
          icon: <FileText className="w-3.5 h-3.5 text-indigo-600" /> 
        };
      case 'RAPOR_SİL':
        return { 
          label: 'Rapor Silindi', 
          color: 'bg-rose-50 text-rose-800 border-rose-200', 
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" /> 
        };
      case 'PALET_EKLE':
        return { 
          label: 'Palet Tartımı / Giriş', 
          color: 'bg-amber-50 text-amber-900 border-amber-200', 
          icon: <Boxes className="w-3.5 h-3.5 text-amber-600" /> 
        };
      case 'PALET_GÜNCELLE':
        return { 
          label: 'Palet Güncellendi', 
          color: 'bg-amber-50 text-amber-800 border-amber-200', 
          icon: <Boxes className="w-3.5 h-3.5 text-amber-600" /> 
        };
      case 'PALET_SİL':
        return { 
          label: 'Palet Silindi', 
          color: 'bg-rose-50 text-rose-800 border-rose-200', 
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" /> 
        };
      case 'PALET_SEVKİYAT':
        return { 
          label: 'Sevkiyat Yapıldı', 
          color: 'bg-teal-50 text-teal-800 border-teal-200', 
          icon: <Truck className="w-3.5 h-3.5 text-teal-600" /> 
        };
      case 'SEVKİYAT_SİL':
        return { 
          label: 'Sevkiyat Kaydı Silindi', 
          color: 'bg-red-50 text-red-800 border-red-200', 
          icon: <Trash2 className="w-3.5 h-3.5 text-red-600" /> 
        };
      case 'OCAK_DURUM_GÜNCELLE':
      case 'OCAK_DÜZENLE':
      case 'ASTAR_YENİLEME':
        return { 
          label: 'Ocak İşlemi', 
          color: 'bg-orange-50 text-orange-800 border-orange-200', 
          icon: <Flame className="w-3.5 h-3.5 text-orange-600" /> 
        };
      case 'KULLANICI_EKLE':
      case 'KULLANICI_GÜNCELLE':
      case 'KULLANICI_SİL':
        return { 
          label: 'Kullanıcı Yönetimi', 
          color: 'bg-purple-50 text-purple-800 border-purple-200', 
          icon: <Users className="w-3.5 h-3.5 text-purple-600" /> 
        };
      default:
        return { 
          label: action, 
          color: 'bg-slate-50 text-slate-800 border-slate-200', 
          icon: <Info className="w-3.5 h-3.5 text-slate-500" /> 
        };
    }
  };

  // Zaman Formatı & Göreli Zaman (örn: "5 dk önce")
  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    let relative = '';
    if (diffSec < 60) relative = 'az önce';
    else if (diffSec < 3600) relative = `${Math.floor(diffSec / 60)} dk önce`;
    else if (diffSec < 86400) relative = `${Math.floor(diffSec / 3600)} sa önce`;
    else relative = `${Math.floor(diffSec / 86400)} gün önce`;

    return {
      formatted: d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      relative,
    };
  };

  // CSV Olarak İndir
  const handleExportCsv = () => {
    const headers = ['Zaman', 'Kullanıcı', 'Rol', 'İşlem', 'Kategori', 'Kaynak', 'Özet', 'IP Adresi'];
    const rows = filteredLogs.map(l => [
      l.timestamp,
      `"${l.userName || ''}"`,
      `"${l.userRole || ''}"`,
      `"${l.action || ''}"`,
      `"${l.category || ''}"`,
      `"${l.resourceName || ''}"`,
      `"${(l.summary || '').replace(/"/g, '""')}"`,
      `"${l.ipAddress || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dokum_denetim_izleri_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Veri Kıyaslama (Öncesi vs Sonrası)
  const renderDataComparison = (before: any, after: any) => {
    if (!before && !after) {
      return (
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-500 italic">
          Bu işlem için detaylı veri farkı bulunmuyor (Salt bildirim veya genel durum işlemi).
        </div>
      );
    }

    if (!before && after) {
      return (
        <div className="space-y-2 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Eklenen / Oluşturulan Veri
          </span>
          <pre className="text-xs font-mono text-emerald-950 bg-white/90 p-3.5 rounded-xl overflow-x-auto max-h-72 custom-scrollbar">
            {JSON.stringify(after, null, 2)}
          </pre>
        </div>
      );
    }

    if (before && !after) {
      return (
        <div className="space-y-2 p-4 bg-rose-50/50 border border-rose-100 rounded-2xl">
          <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            Silinen / Kaldırılan Veri
          </span>
          <pre className="text-xs font-mono text-rose-950 bg-white/90 p-3.5 rounded-xl overflow-x-auto max-h-72 custom-scrollbar">
            {JSON.stringify(before, null, 2)}
          </pre>
        </div>
      );
    }

    // İki Nesne Arasındaki Fark Karşılaştırması
    const keys = Array.from(new Set([
      ...Object.keys(before || {}), 
      ...Object.keys(after || {})
    ])).filter(k => k !== '_meta');

    return (
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Değişen Alanlar Karşılaştırması</h4>
        <div className="overflow-x-auto custom-scrollbar border border-slate-200 rounded-2xl bg-white">
          <table className="w-full text-left text-xs min-w-[500px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3.5 w-1/3">Alan Adı</th>
                <th className="py-2.5 px-3.5 w-1/3 text-rose-700">Değişiklik Öncesi</th>
                <th className="py-2.5 px-3.5 w-1/3 text-emerald-700">Değişiklik Sonrası</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {keys.map((k) => {
                const valB = typeof before[k] === 'object' ? JSON.stringify(before[k]) : String(before[k] ?? 'Yok');
                const valA = typeof after[k] === 'object' ? JSON.stringify(after[k]) : String(after[k] ?? 'Yok');
                const isDifferent = valB !== valA;

                return (
                  <tr key={k} className={isDifferent ? 'bg-amber-50/50 font-bold' : 'text-slate-600'}>
                    <td className="py-2 px-3.5 text-slate-800 font-sans font-bold">{k}</td>
                    <td className="py-2 px-3.5 text-rose-600 truncate max-w-xs">{valB}</td>
                    <td className="py-2 px-3.5 text-emerald-600 truncate max-w-xs flex items-center gap-1">
                      {isDifferent && <ArrowRight className="w-3 h-3 text-amber-500 shrink-0" />}
                      <span>{valA}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" id="audit-log-view">
      
      {/* ─── BAŞLIK VE DIŞA AKTARMA ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
            Sistem Denetim İzi (Audit Log)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kullanıcıların oturum açmasından çıkışına, rapor, ocak ve stok paletlerindeki tüm hareketlerin izlenebilir güvenlik günlüğü.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="min-h-[44px] px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-200 active:scale-95 shadow-2xs"
          title="Filtrelenmiş Denetim Kayıtlarını CSV / Excel Olarak İndir"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          Excel / CSV İndir
        </button>
      </div>

      {/* ─── ÜST KPI KARTLARI ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Toplam Denetim Kaydı</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">{stats.totalLogs}</span>
            <span className="text-xs font-bold text-slate-500">İşlem</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">Sistem geneli tüm kayıtlar</span>
        </div>

        <div className="p-4 sm:p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">Bugünkü Hareketler</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 font-mono">{stats.todayCount}</span>
            <span className="text-xs font-bold text-blue-700">İşlem</span>
          </div>
          <span className="text-[11px] text-blue-600 font-mono mt-1 block font-bold">Bugün gerçekleştirildi</span>
        </div>

        <div className="p-4 sm:p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider block">Oturum & Güvenlik</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-purple-700 font-mono">{stats.securityEvents}</span>
            <span className="text-xs font-bold text-purple-700">Olay</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Giriş, çıkış ve yetki</span>
        </div>

        <div className="p-4 sm:p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Bugün Aktif Kullanıcı</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono">{stats.activeUsersToday}</span>
            <span className="text-xs font-bold text-emerald-700">Kişi</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Sistemde işlem yaptı</span>
        </div>
      </div>

      {/* ─── GELİŞMİŞ FİLTRELEME ÇUBUĞU ─── */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        {/* Arama Kutusu ve Hızlı Tarih Seçici */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8 relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Kullanıcı adı, işlem özeti, kaynak, IP adresi ara..."
              className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-500 text-slate-900 font-medium"
            />
          </div>

          <div className="md:col-span-4 flex bg-slate-100 p-1 rounded-xl">
            {(['ALL', 'TODAY', 'WEEK', 'MONTH'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setDateFilter(period)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  dateFilter === period ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {period === 'ALL' && 'Tümü'}
                {period === 'TODAY' && 'Bugün'}
                {period === 'WEEK' && 'Son 7 Gün'}
                {period === 'MONTH' && 'Son 30 Gün'}
              </button>
            ))}
          </div>
        </div>

        {/* Çoklu Kategori ve Kullanıcı Filtreleri */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Modül / Kategori
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">Tüm Kategoriler</option>
              <option value="Oturum & Güvenlik">Oturum & Güvenlik (Giriş/Çıkış)</option>
              <option value="Üretim Raporu">Üretim Raporları</option>
              <option value="Stok & Sevkiyat">Stok & Palet Sevkiyatı</option>
              <option value="Ocaklar & Fırınlar">Ocaklar & Fırınlar</option>
              <option value="Kullanıcı Yönetimi">Kullanıcı Yönetimi</option>
              <option value="Sistem Ayarları">Sistem Ayarları</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              İşlem Tipi
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">Tüm İşlemler</option>
              <option value="GİRİŞ_BAŞARILI">Giriş Yapıldı (Başarılı)</option>
              <option value="GİRİŞ_BAŞARISIZ">Hatalı Giriş Denemesi</option>
              <option value="ÇIKIŞ_YAPILDI">Çıkış Yapıldı</option>
              <option value="RAPOR_EKLE">Rapor Ekleme</option>
              <option value="RAPOR_GÜNCELLE">Rapor Güncelleme</option>
              <option value="RAPOR_SİL">Rapor Silme</option>
              <option value="PALET_EKLE">Palet Tartımı (Giriş)</option>
              <option value="PALET_GÜNCELLE">Palet Güncelleme</option>
              <option value="PALET_SEVKİYAT">Palet Sevkiyatı</option>
              <option value="PALET_SİL">Palet Silme</option>
              <option value="OCAK_DURUM_GÜNCELLE">Ocak Durum Değişikliği</option>
              <option value="OCAK_DÜZENLE">Ocak Bilgi Düzenleme</option>
              <option value="KULLANICI_EKLE">Yeni Kullanıcı Ekleme</option>
              <option value="KULLANICI_GÜNCELLE">Yetki / Rol Güncelleme</option>
              <option value="KULLANICI_SİL">Kullanıcı Silme</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Kullanıcı
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">Tüm Kullanıcılar ({uniqueUsers.length})</option>
              {uniqueUsers.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── DENETİM KAYITLARI LİSTESİ ─── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Kayıt Akışı ({filteredLogs.length} İşlem Listelendi)
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm space-y-2">
            <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-600">Filtre kriterlerine uygun denetim kaydı bulunamadı.</p>
            <p className="text-xs text-slate-400">Filtreleri temizleyerek veya arama kelimesini değiştirerek tekrar deneyiniz.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredLogs.map((log) => {
              const meta = getActionMeta(log.action);
              const time = formatTimestamp(log.timestamp);

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setActiveLog(log)}
                  className="p-3.5 sm:p-4 bg-slate-50/70 hover:bg-purple-50/40 border border-slate-200/80 hover:border-purple-300/80 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 cursor-pointer transition active:scale-[0.99] group"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    {/* Avatar */}
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs font-mono">
                      {log.userName.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 font-display">
                          {log.userName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({log.userRole})
                        </span>
                        
                        {/* İşlem Rozeti */}
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border inline-flex items-center gap-1 whitespace-nowrap ${meta.color}`}>
                          {meta.icon}
                          {meta.label}
                        </span>

                        {/* Kategori Rozeti */}
                        {log.category && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            {log.category}
                          </span>
                        )}
                      </div>

                      {/* İşlem Özeti */}
                      <p className="text-xs text-slate-700 font-sans font-medium line-clamp-2">
                        {log.summary}
                      </p>

                      {/* IP ve Cihaz Bilgisi */}
                      {(log.ipAddress || log.userAgent) && (
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono pt-0.5">
                          {log.ipAddress && (
                            <span className="inline-flex items-center gap-1">
                              <Globe className="w-3 h-3 text-slate-400" />
                              IP: {log.ipAddress}
                            </span>
                          )}
                          {log.userAgent && (
                            <span className="inline-flex items-center gap-1 truncate max-w-xs hidden sm:inline-flex">
                              <Monitor className="w-3 h-3 text-slate-400" />
                              {log.userAgent.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Zaman ve Aksiyon Butonu */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 text-xs shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                    <div className="text-right">
                      <span className="text-slate-700 font-mono text-xs font-bold block">
                        {time.formatted}
                      </span>
                      <span className="text-[10px] text-purple-600 font-bold block">
                        {time.relative}
                      </span>
                    </div>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveLog(log);
                      }}
                      className="min-h-[34px] px-3 py-1.5 bg-white border border-slate-200 group-hover:border-purple-400 text-slate-700 group-hover:text-purple-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-2xs whitespace-nowrap"
                    >
                      <Eye className="w-3.5 h-3.5 text-purple-600" />
                      İncele
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── DETAY VE DEĞİŞİKLİK KIYASLAMA MODALI ─── */}
      <AnimatePresence>
        {activeLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setActiveLog(null)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10"
            >
              {/* Header */}
              <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-600 rounded-2xl text-white shadow-sm">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-display">
                      Denetim İzi Detay Raporu
                    </h3>
                    <p className="text-xs text-slate-500">
                      {activeLog.userName} ({activeLog.userRole.toUpperCase()}) tarafından yapılan işlem dökümü.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveLog(null)}
                  className="p-2 hover:bg-slate-200 rounded-xl transition text-slate-400"
                  aria-label="Modalı Kapat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
                
                {/* Özet ve Meta Kutusu */}
                <div className="p-4 bg-purple-50/60 border border-purple-100 rounded-2xl space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black text-purple-950 font-display">
                      {activeLog.summary}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-purple-700 bg-white/80 px-2 py-0.5 rounded-md border border-purple-200">
                      {new Date(activeLog.timestamp).toLocaleString('tr-TR')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-purple-100/80 text-xs">
                    <div>
                      <span className="text-[10px] text-purple-600 font-bold block">Kaynak Öğe:</span>
                      <strong className="text-purple-950">{activeLog.resourceName || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-purple-600 font-bold block">İşlem Türü:</span>
                      <strong className="text-purple-950">{activeLog.action}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-purple-600 font-bold block">Kategori:</span>
                      <strong className="text-purple-950">{activeLog.category || 'Genel'}</strong>
                    </div>
                  </div>
                </div>

                {/* Kullanıcı Ortam Bilgisi (IP / Tarayıcı) */}
                {(activeLog.ipAddress || activeLog.userAgent) && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
                    <div className="flex items-center gap-2 font-bold text-slate-700">
                      <Globe className="w-3.5 h-3.5 text-slate-500" />
                      Ağ ve Cihaz Güvenlik Bilgisi
                    </div>
                    <div className="font-mono text-[11px] text-slate-600 space-y-0.5">
                      {activeLog.ipAddress && <div>İstemci IP Adresi: <strong>{activeLog.ipAddress}</strong></div>}
                      {activeLog.userAgent && <div className="break-all">Cihaz / Tarayıcı: {activeLog.userAgent}</div>}
                    </div>
                  </div>
                )}

                {/* Görünüm Seçimi (Fark Karşılaştırması vs Ham JSON) */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-slate-700">İşlem Verisi İncelemesi</span>
                  <button
                    onClick={() => setShowJsonRaw(!showJsonRaw)}
                    className="text-[11px] font-bold text-purple-600 hover:text-purple-800 transition"
                  >
                    {showJsonRaw ? 'Tablo Görünümüne Dön' : 'Ham JSON Verisini Gör'}
                  </button>
                </div>

                {showJsonRaw ? (
                  <div className="p-3.5 bg-slate-900 rounded-2xl overflow-x-auto text-emerald-400 font-mono text-xs max-h-72 custom-scrollbar">
                    <pre>{JSON.stringify({ before: activeLog.beforeData, after: activeLog.afterData }, null, 2)}</pre>
                  </div>
                ) : (
                  renderDataComparison(activeLog.beforeData, activeLog.afterData)
                )}
              </div>

              {/* Footer */}
              <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/90 flex justify-end shrink-0">
                <button
                  onClick={() => setActiveLog(null)}
                  className="min-h-[44px] px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition active:scale-95 flex items-center justify-center"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
