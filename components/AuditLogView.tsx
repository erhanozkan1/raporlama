'use client';

import React, { useState } from 'react';
import { AuditLog, AuditAction } from '@/lib/types';
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
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuditLogViewProps {
  logs: AuditLog[];
}

export default function AuditLogView({ logs }: AuditLogViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [activeLog, setActiveLog] = useState<AuditLog | null>(null);

  // Filter logic
  const filteredLogs = logs.filter((log) => {
    const cleanSearch = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !cleanSearch ||
      log.userName.toLowerCase().includes(cleanSearch) ||
      log.summary.toLowerCase().includes(cleanSearch) ||
      log.resourceName.toLowerCase().includes(cleanSearch) ||
      log.action.toLowerCase().includes(cleanSearch);

    const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;

    return matchesSearch && matchesAction;
  });

  // Action badge builder
  const getActionBadge = (action: AuditAction) => {
    switch (action) {
      case 'RAPOR_EKLE':
        return { label: 'Rapor Oluşturuldu', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'RAPOR_GÜNCELLE':
        return { label: 'Rapor Güncellendi', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'RAPOR_SİL':
        return { label: 'Rapor Silindi', color: 'bg-red-50 text-red-700 border-red-200' };
      case 'OCAK_DURUM_GÜNCELLE':
      case 'OCAK_DÜZENLE':
        return { label: 'Ocak Düzenlendi', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'KULLANICI_EKLE':
      case 'KULLANICI_GÜNCELLE':
      case 'KULLANICI_SİL':
        return { label: 'Kullanıcı İşlemi', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: action, color: 'bg-gray-50 text-gray-700 border-gray-200' };
    }
  };

  // Helper to format before vs after diff in Turkish
  const renderDataComparison = (before: any, after: any) => {
    if (!before && !after) {
      return <p className="text-xs text-gray-400 italic">Detaylı fark kaydı mevcut değil.</p>;
    }

    if (!before && after) {
      return (
        <div className="space-y-2 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Yeni Eklenen Veri Detayları</span>
          <pre className="text-xs font-mono text-emerald-900 bg-white/80 p-3 rounded-xl overflow-x-auto">
            {JSON.stringify(after, null, 2)}
          </pre>
        </div>
      );
    }

    if (before && !after) {
      return (
        <div className="space-y-2 p-4 bg-red-50/50 border border-red-100 rounded-2xl">
          <span className="text-xs font-bold text-red-800 uppercase tracking-wider block">Silinen Veri Detayları</span>
          <pre className="text-xs font-mono text-red-900 bg-white/80 p-3 rounded-xl overflow-x-auto">
            {JSON.stringify(before, null, 2)}
          </pre>
        </div>
      );
    }

    // Side by Side comparison
    const keys = Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]));

    return (
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Değişen Alanlar Karşılaştırması</h4>
        <div className="overflow-x-auto custom-scrollbar border border-gray-100 rounded-2xl bg-white">
          <div className="min-w-[550px] divide-y divide-gray-100">
            <div className="grid grid-cols-12 bg-gray-50 p-3 text-[11px] font-bold text-gray-500 uppercase">
              <div className="col-span-4">Alan Adı</div>
              <div className="col-span-4">Değişiklik Öncesi</div>
              <div className="col-span-4">Değişiklik Sonrası</div>
            </div>

            {keys.map((k) => {
              const valB = typeof before[k] === 'object' ? JSON.stringify(before[k]) : String(before[k] ?? 'Yok');
              const valA = typeof after[k] === 'object' ? JSON.stringify(after[k]) : String(after[k] ?? 'Yok');

              const isDifferent = valB !== valA;

              return (
                <div
                  key={k}
                  className={`grid grid-cols-12 p-3 text-xs ${
                    isDifferent ? 'bg-amber-50/40 font-semibold' : 'text-gray-600'
                  }`}
                >
                  <div className="col-span-4 font-mono font-bold text-gray-800 truncate pr-2">{k}</div>
                  <div className="col-span-4 font-mono text-red-600 truncate pr-2">{valB}</div>
                  <div className="col-span-4 font-mono text-emerald-600 truncate flex items-center gap-1">
                    {isDifferent && <ArrowRight className="w-3 h-3 text-amber-500 shrink-0" />}
                    <span className="truncate">{valA}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" id="audit-log-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-display flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-amber-500" />
            SuperAdmin Denetim İzi (Audit Log)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Kullanıcıların gerçekleştirdiği her türlü raporlama, ocak ve sistem işleminin detaylı güvenlik geçmişi.
          </p>
        </div>

        <div className="px-3.5 py-1.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-xl text-xs font-bold font-mono">
          Toplam Log: {logs.length} Kayıt
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Kullanıcı adı, detay veya kaynak ara..."
              className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-amber-500 text-gray-900 font-medium"
            />
          </div>

          {/* Action Filter */}
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-3.5 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-amber-500 text-gray-900"
          >
            <option value="ALL">Tüm İşlem Tipleri</option>
            <option value="RAPOR_EKLE">Rapor Ekleme</option>
            <option value="RAPOR_GÜNCELLE">Rapor Güncelleme</option>
            <option value="RAPOR_SİL">Rapor Silme</option>
            <option value="OCAK_DÜZENLE">Ocak Düzenleme</option>
            <option value="KULLANICI_EKLE">Kullanıcı İşlemleri</option>
          </select>
        </div>
      </div>

      {/* Logs Table / Card List */}
      <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm italic">
            Arama kriterlerine uygun denetim kaydı bulunamadı.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const badge = getActionBadge(log.action);
              const formattedDate = new Date(log.timestamp).toLocaleString('tr-TR');

              return (
                <div
                  key={log.id}
                  onClick={() => setActiveLog(log)}
                  className="p-4 bg-gray-50/60 hover:bg-amber-50/30 border border-gray-100 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer transition active:scale-[0.99] group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {log.userName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-bold text-xs text-gray-900 font-display">{log.userName}</span>
                        <span className="text-[10px] text-gray-400 font-mono">({log.userRole})</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border whitespace-nowrap ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 font-sans font-medium">{log.summary}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs shrink-0 self-end md:self-auto">
                    <span className="text-gray-400 font-mono text-[11px] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formattedDate}
                    </span>
                    <button className="px-3 py-1.5 bg-white border border-gray-200 group-hover:border-amber-400 text-gray-700 group-hover:text-amber-600 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-sm">
                      <Eye className="w-3.5 h-3.5" />
                      Farkı İncele
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BEFORE VS AFTER DIFFERENCE MODAL */}
      <AnimatePresence>
        {activeLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 pb-24 sm:pb-6 overflow-y-auto"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveLog(null)} />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-3xl max-h-[82vh] sm:max-h-[88vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10"
            >
              {/* Header */}
              <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/70">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white shadow-md">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 font-display">
                      İşlem Detayı ve Değişiklik Kıyaslaması
                    </h3>
                    <p className="text-xs text-gray-500">
                      {activeLog.userName} ({activeLog.userRole}) tarafından yapılan işlem.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveLog(null)}
                  className="p-2 hover:bg-gray-200 rounded-xl transition text-gray-400 min-w-[36px] min-h-[36px] flex items-center justify-center"
                  aria-label="Modalı Kapat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
                {/* Summary Box */}
                <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-amber-900">
                    <span>İşlem Özeti: {activeLog.summary}</span>
                    <span className="font-mono text-[10px] opacity-75">{new Date(activeLog.timestamp).toLocaleString('tr-TR')}</span>
                  </div>
                  <p className="text-xs text-amber-800/80">Kaynak Nesne: <strong>{activeLog.resourceName}</strong></p>
                </div>

                {/* Data Diff Renderer */}
                {renderDataComparison(activeLog.beforeData, activeLog.afterData)}
              </div>

              {/* Footer */}
              <div className="p-3 sm:p-4 border-t border-gray-100 bg-gray-50/90 flex justify-end shrink-0">
                <button
                  onClick={() => setActiveLog(null)}
                  className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-xs transition active:scale-95 flex items-center justify-center"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
