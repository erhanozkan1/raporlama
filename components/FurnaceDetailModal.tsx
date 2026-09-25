'use client';

import React, { useState } from 'react';
import { Furnace, FurnaceStatus, MaintenanceRecord, MaintenanceType } from '@/lib/types';
import { 
  X, Flame, Wrench, CheckCircle, ShieldAlert, Calendar, Clock,
  Plus, Save, Trash2, AlertTriangle, Gauge, Activity, History,
  Fuel, Zap, Info, FileText, DollarSign, User
} from 'lucide-react';
import { motion } from 'motion/react';

interface FurnaceDetailModalProps {
  furnace: Furnace;
  onClose: () => void;
  onUpdateFurnace: (furnace: Furnace) => void;
}

type DetailTab = 'info' | 'maintenance' | 'lining' | 'history';

export default function FurnaceDetailModal({ furnace, onClose, onUpdateFurnace }: FurnaceDetailModalProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('info');
  
  // Maintenance form state
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);
  const [maintForm, setMaintForm] = useState<Partial<MaintenanceRecord>>({
    date: new Date().toISOString().split('T')[0],
    type: 'Bakım',
    description: '',
    technician: '',
    durationHours: 0,
    cost: 0,
  });

  const getLiningPercent = () => {
    if (!furnace.liningLifeMax || furnace.liningLifeMax === 0) return 0;
    return Math.min(100, Math.round(((furnace.liningChargeCount || 0) / furnace.liningLifeMax) * 100));
  };

  const getLiningColor = (percent: number) => {
    if (percent >= 80) return 'bg-red-500';
    if (percent >= 60) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getLiningTextColor = (percent: number) => {
    if (percent >= 80) return 'text-red-500';
    if (percent >= 60) return 'text-amber-500';
    return 'text-emerald-500';
  };

  const getStatusConfig = (status: FurnaceStatus) => {
    switch (status) {
      case 'Çalışıyor':
        return { icon: <CheckCircle className="w-4 h-4" />, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' };
      case 'Bakımda':
        return { icon: <Wrench className="w-4 h-4" />, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' };
      case 'Arızalı':
        return { icon: <ShieldAlert className="w-4 h-4" />, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' };
      case 'Kullanım Dışı':
        return { icon: <X className="w-4 h-4" />, color: 'text-gray-500', bg: 'bg-gray-100', border: 'border-gray-200' };
      default:
        return { icon: <Flame className="w-4 h-4" />, color: 'text-gray-500', bg: 'bg-gray-100', border: 'border-gray-200' };
    }
  };

  const getMaintenanceTypeColor = (type: MaintenanceType) => {
    switch (type) {
      case 'Bakım': return 'bg-blue-50 text-blue-600 border-blue-100 ';
      case 'Arıza Onarımı': return 'bg-red-50 text-red-600 border-red-100 ';
      case 'Astar Değişimi': return 'bg-amber-50 text-amber-600 border-amber-100 ';
      case 'Genel Revizyon': return 'bg-purple-50 text-purple-600 border-purple-100 ';
    }
  };

  const addMaintenanceRecord = () => {
    if (!maintForm.description?.trim()) return;

    const newRecord: MaintenanceRecord = {
      id: `maint-${Date.now()}`,
      date: maintForm.date || new Date().toISOString().split('T')[0],
      type: (maintForm.type as MaintenanceType) || 'Bakım',
      description: maintForm.description || '',
      technician: maintForm.technician || undefined,
      durationHours: maintForm.durationHours || undefined,
      cost: maintForm.cost || undefined,
    };

    const updatedHistory = [newRecord, ...(furnace.maintenanceHistory || [])];
    
    const updatedFurnace: Furnace = {
      ...furnace,
      maintenanceHistory: updatedHistory,
      lastMaintenanceDate: newRecord.date,
    };

    // If it's a lining replacement, reset the lining counter
    if (newRecord.type === 'Astar Değişimi') {
      updatedFurnace.liningChargeCount = 0;
      updatedFurnace.liningLastReplaced = newRecord.date;
    }

    onUpdateFurnace(updatedFurnace);
    setShowAddMaintenance(false);
    setMaintForm({
      date: new Date().toISOString().split('T')[0],
      type: 'Bakım',
      description: '',
      technician: '',
      durationHours: 0,
      cost: 0,
    });
  };

  const deleteMaintenanceRecord = (recordId: string) => {
    const updatedHistory = (furnace.maintenanceHistory || []).filter(m => m.id !== recordId);
    onUpdateFurnace({
      ...furnace,
      maintenanceHistory: updatedHistory,
    });
  };

  const statusConfig = getStatusConfig(furnace.status);
  const liningPercent = getLiningPercent();
  const maintenanceHistory = furnace.maintenanceHistory || [];
  const totalMaintenanceCost = maintenanceHistory.reduce((sum, m) => sum + (m.cost || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 pb-24 sm:pb-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-3xl max-h-[82vh] sm:max-h-[88vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${statusConfig.bg} ${statusConfig.color}`}>
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 font-display">{furnace.name}</h2>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                <span className="text-xs font-mono text-gray-400">{furnace.capacity}</span>
                {furnace.fuelType && (
                  <span className="text-xs px-2 py-0.5 bg-gray-50 rounded-lg text-gray-500 font-semibold flex items-center gap-1">
                    {furnace.fuelType === 'Elektrik' ? <Zap className="w-3 h-3" /> : <Fuel className="w-3 h-3" />}
                    {furnace.fuelType}
                  </span>
                )}
                <span className={`text-xs px-2.5 py-0.5 rounded-xl font-bold border flex items-center gap-1 ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                  {statusConfig.icon}
                  {furnace.status}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-4 sm:px-6 gap-1 shrink-0 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-3 sm:px-4 py-3 font-bold text-xs border-b-2 transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'info' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Info className="w-3.5 h-3.5 shrink-0" />
            Genel Bilgi
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`px-3 sm:px-4 py-3 font-bold text-xs border-b-2 transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'maintenance' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 shrink-0" />
            Bakım Geçmişi ({maintenanceHistory.length})
          </button>
          <button
            onClick={() => setActiveTab('lining')}
            className={`px-3 sm:px-4 py-3 font-bold text-xs border-b-2 transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'lining' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 shrink-0" />
            Astar Takibi
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 sm:px-4 py-3 font-bold text-xs border-b-2 transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'history' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <History className="w-3.5 h-3.5 shrink-0" />
            Durum Geçmişi ({(furnace.statusHistory || []).length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          
          {/* INFO TAB */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ocak Açıklaması</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {furnace.description || 'Açıklama eklenmemiş.'}
                </p>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Kapasite</span>
                  <span className="text-lg font-bold text-gray-900 font-mono mt-1 block">{furnace.capacity}</span>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Yakıt Tipi</span>
                  <span className="text-lg font-bold text-gray-900 mt-1 block">{furnace.fuelType || '—'}</span>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Astar Durumu</span>
                  <span className={`text-lg font-bold font-mono mt-1 block ${getLiningTextColor(liningPercent)}`}>{liningPercent}%</span>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Bakım Sayısı</span>
                  <span className="text-lg font-bold text-gray-900 font-mono mt-1 block">{maintenanceHistory.length}</span>
                </div>
              </div>

              {/* Dates Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {furnace.createdAt && (
                  <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Kayıt Tarihi</span>
                      <span className="text-xs font-bold text-gray-700 ">{new Date(furnace.createdAt).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                )}
                {furnace.lastMaintenanceDate && (
                  <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center gap-3">
                    <Wrench className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Son Bakım</span>
                      <span className="text-xs font-bold text-gray-700 ">{new Date(furnace.lastMaintenanceDate).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                )}
                {furnace.liningLastReplaced && (
                  <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center gap-3">
                    <Activity className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Son Astar Değişimi</span>
                      <span className="text-xs font-bold text-gray-700 ">{new Date(furnace.liningLastReplaced).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Maintenance Cost */}
              {totalMaintenanceCost > 0 && (
                <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-amber-500" />
                  <div>
                    <span className="text-[10px] font-bold text-amber-600 uppercase block">Toplam Bakım Maliyeti</span>
                    <span className="text-lg font-bold text-amber-700 font-mono">{totalMaintenanceCost.toLocaleString('tr-TR')} ₺</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STATUS HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Durum Değişiklik Geçmişi</h3>
                <p className="text-[11px] text-gray-400">Ocağın durum değişikliklerinin kronolojik kayıtları. Her kayıt, o tarihten bir sonraki değişikliğe kadar geçerlidir.</p>
              </div>
              {(furnace.statusHistory || []).length === 0 ? (
                <div className="text-center py-10 text-gray-300 text-sm">
                  Henüz durum değişikliği kaydı bulunmamaktadır.
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gray-100" />
                  <div className="space-y-3">
                    {[...(furnace.statusHistory || [])]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((entry, idx) => {
                        const cfg = (() => {
                          switch (entry.status) {
                            case 'Çalışıyor': return { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
                            case 'Bakımda': return { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-100' };
                            case 'Arızalı': return { dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 border-red-100' };
                            default: return { dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600 border-gray-200' };
                          }
                        })();
                        return (
                          <div key={idx} className="pl-9 relative">
                            <div className={`absolute left-2 top-2 w-3 h-3 rounded-full border-2 border-white ${cfg.dot} shadow`} />
                            <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-1">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${cfg.badge}`}>{entry.status}</span>
                                <span className="text-[10px] font-mono text-gray-400">{entry.date}</span>
                              </div>
                              {entry.note && <p className="text-[11px] text-gray-500 leading-relaxed">{entry.note}</p>}
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MAINTENANCE TAB */}
          {activeTab === 'maintenance' && (
            <div className="space-y-4">
              {/* Add Maintenance Button */}
              <button
                onClick={() => setShowAddMaintenance(!showAddMaintenance)}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-xs font-bold text-gray-500 hover:border-amber-400 hover:text-amber-600 transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Yeni Bakım Kaydı Ekle
              </button>

              {/* Add Maintenance Form */}
              {showAddMaintenance && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-5 bg-gray-50 border border-gray-100 rounded-2xl space-y-4"
                >
                  <h4 className="text-xs font-bold text-gray-700 ">Yeni Bakım Kaydı</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tarih</label>
                      <input
                        type="date"
                        value={maintForm.date || ''}
                        onChange={(e) => setMaintForm({ ...maintForm, date: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500/40 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tür</label>
                      <select
                        value={maintForm.type || 'Bakım'}
                        onChange={(e) => setMaintForm({ ...maintForm, type: e.target.value as MaintenanceType })}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500/40 text-gray-900"
                      >
                        <option value="Bakım">Bakım</option>
                        <option value="Arıza Onarımı">Arıza Onarımı</option>
                        <option value="Astar Değişimi">Astar Değişimi</option>
                        <option value="Genel Revizyon">Genel Revizyon</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Açıklama</label>
                    <textarea
                      value={maintForm.description || ''}
                      onChange={(e) => setMaintForm({ ...maintForm, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500/40 text-gray-900 resize-none"
                      placeholder="Yapılan işlemi detaylı açıklayın..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Teknisyen</label>
                      <input
                        type="text"
                        value={maintForm.technician || ''}
                        onChange={(e) => setMaintForm({ ...maintForm, technician: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500/40 text-gray-900"
                        placeholder="İsim"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Süre (Saat)</label>
                      <input
                        type="number"
                        value={maintForm.durationHours || ''}
                        onChange={(e) => setMaintForm({ ...maintForm, durationHours: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500/40 text-gray-900"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Maliyet (₺)</label>
                      <input
                        type="number"
                        value={maintForm.cost || ''}
                        onChange={(e) => setMaintForm({ ...maintForm, cost: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500/40 text-gray-900"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={addMaintenanceRecord}
                      className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Kaydı Ekle
                    </button>
                    <button
                      onClick={() => setShowAddMaintenance(false)}
                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition"
                    >
                      İptal
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Maintenance Timeline */}
              {maintenanceHistory.length === 0 ? (
                <div className="py-12 text-center">
                  <History className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 font-semibold">Henüz bakım kaydı bulunmuyor.</p>
                  <p className="text-xs text-gray-400 mt-1">İlk bakım kaydını yukarıdaki butonla ekleyebilirsiniz.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {maintenanceHistory.map((record, index) => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 bg-white border border-gray-100 rounded-2xl space-y-3 hover:shadow-sm transition-shadow group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border ${getMaintenanceTypeColor(record.type)}`}>
                            {record.type}
                          </span>
                          <span className="text-xs font-mono text-gray-400 ">
                            {new Date(record.date).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteMaintenanceRecord(record.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-xs text-gray-700 leading-relaxed">
                        {record.description}
                      </p>

                      <div className="flex flex-wrap gap-3 text-[10px] text-gray-400 ">
                        {record.technician && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {record.technician}
                          </span>
                        )}
                        {record.durationHours && record.durationHours > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {record.durationHours} saat
                          </span>
                        )}
                        {record.cost && record.cost > 0 && (
                          <span className="flex items-center gap-1 font-bold text-amber-600 ">
                            <DollarSign className="w-3 h-3" />
                            {record.cost.toLocaleString('tr-TR')} ₺
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LINING TAB */}
          {activeTab === 'lining' && (
            <div className="space-y-6">
              {/* Lining Visual Gauge */}
              <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl text-center space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Astar Aşınma Durumu</h3>
                
                {/* Circular gauge visual */}
                <div className="relative w-40 h-40 mx-auto">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" strokeWidth="10" className="stroke-gray-200" />
                    <circle 
                      cx="60" cy="60" r="50" fill="none" strokeWidth="10" strokeLinecap="round"
                      strokeDasharray={`${liningPercent * 3.14} ${314 - liningPercent * 3.14}`}
                      className={`${liningPercent >= 80 ? 'stroke-red-500' : liningPercent >= 60 ? 'stroke-amber-500' : 'stroke-emerald-500'} transition-all duration-1000`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-bold font-mono ${getLiningTextColor(liningPercent)}`}>{liningPercent}%</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Aşınma</span>
                  </div>
                </div>

                <div className="flex justify-center gap-6 text-xs">
                  <div>
                    <span className="text-gray-400 block">Mevcut Şarj</span>
                    <span className="font-bold font-mono text-gray-900 text-lg">{furnace.liningChargeCount || 0}</span>
                  </div>
                  <div className="w-px bg-gray-200" />
                  <div>
                    <span className="text-gray-400 block">Maksimum</span>
                    <span className="font-bold font-mono text-gray-900 text-lg">{furnace.liningLifeMax || 0}</span>
                  </div>
                  <div className="w-px bg-gray-200" />
                  <div>
                    <span className="text-gray-400 block">Kalan</span>
                    <span className="font-bold font-mono text-emerald-600 text-lg">{Math.max(0, (furnace.liningLifeMax || 0) - (furnace.liningChargeCount || 0))}</span>
                  </div>
                </div>
              </div>

              {/* Warnings */}
              {liningPercent >= 80 && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-red-700 ">Kritik Uyarı: Astar Değişimi Gerekli!</h4>
                    <p className="text-xs text-red-600 mt-1 leading-relaxed">
                      Astar ömrü %{liningPercent} seviyesine ulaşmıştır. Güvenli döküm operasyonu için en kısa sürede astar değişimi planlanmalıdır. 
                      Astar değişimi bakım kaydı eklendiğinde sayaç otomatik olarak sıfırlanır.
                    </p>
                  </div>
                </div>
              )}
              {liningPercent >= 60 && liningPercent < 80 && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-700 ">Dikkat: Astar Ömrü Azalıyor</h4>
                    <p className="text-xs text-amber-600 mt-1 leading-relaxed">
                      Astar ömrü %{liningPercent} seviyesinde. Yaklaşan dönemlerde astar değişimi planlaması yapılması önerilir.
                    </p>
                  </div>
                </div>
              )}

              {/* Lining History */}
              {furnace.liningLastReplaced && (
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Son Astar Değişim Tarihi</span>
                    <span className="text-sm font-bold text-gray-700 ">{new Date(furnace.liningLastReplaced).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Sticky Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-100 flex items-center justify-end bg-gray-50/90 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition active:scale-95 flex items-center justify-center shadow-sm"
          >
            Kapat
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
