'use client';

import React, { useState } from 'react';
import { Furnace, FurnaceStatus, FurnaceFuelType, MaintenanceRecord, MaintenanceType } from '@/lib/types';
import { sortFurnaces } from '@/lib/furnaceOrder';
import { 
  Flame, Cpu, ShieldAlert, Settings, Wrench, CheckCircle, 
  Edit3, X, Save, Eye, Plus, Trash2, ChevronRight,
  Fuel, Zap, Calendar, Clock, AlertTriangle, Activity,
  Gauge, History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import FurnaceDetailModal from './FurnaceDetailModal';
import ModernSelect from './ui/ModernSelect';

interface FurnacesViewProps {
  furnaces: Furnace[];
  onUpdateStatus: (id: string, status: FurnaceStatus, note?: string) => void;
  onUpdateFurnace: (furnace: Furnace) => void;
  onNavigateToSettings: () => void;
}

function FurnacesView({ 
  furnaces, 
  onUpdateStatus,
  onUpdateFurnace,
  onNavigateToSettings 
}: FurnacesViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Furnace>>({});
  const [detailFurnace, setDetailFurnace] = useState<Furnace | null>(null);

  // Start inline edit
  const startEdit = (furnace: Furnace) => {
    setEditingId(furnace.id);
    setEditForm({
      name: furnace.name,
      capacity: furnace.capacity,
      fuelType: furnace.fuelType || 'Mazot',
      description: furnace.description || '',
      liningLifeMax: furnace.liningLifeMax || 200,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = (furnace: Furnace) => {
    const updated: Furnace = {
      ...furnace,
      name: editForm.name || furnace.name,
      capacity: editForm.capacity || furnace.capacity,
      fuelType: editForm.fuelType || furnace.fuelType,
      description: editForm.description || furnace.description,
      liningLifeMax: editForm.liningLifeMax || furnace.liningLifeMax,
    };
    onUpdateFurnace(updated);
    setEditingId(null);
    setEditForm({});
  };

  const getStatusBadge = (status: FurnaceStatus) => {
    switch (status) {
      case 'Çalışıyor':
        return (
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            Çalışıyor
          </span>
        );
      case 'Bakımda':
        return (
          <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold border border-amber-100 flex items-center gap-1">
            <Wrench className="w-3.5 h-3.5" />
            Bakımda
          </span>
        );
      case 'Arızalı':
        return (
          <span className="px-3 py-1 bg-red-50 text-red-700 rounded-xl text-xs font-bold border border-red-100 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            Arızalı
          </span>
        );
      case 'Kullanım Dışı':
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold border border-gray-200 flex items-center gap-1">
            <X className="w-3.5 h-3.5" />
            Kullanım Dışı
          </span>
        );
    }
  };

  const getFuelIcon = (fuelType?: FurnaceFuelType) => {
    switch (fuelType) {
      case 'Elektrik': return <Zap className="w-3.5 h-3.5" />;
      case 'Doğalgaz': return <Flame className="w-3.5 h-3.5" />;
      case 'LPG': return <Flame className="w-3.5 h-3.5" />;
      default: return <Fuel className="w-3.5 h-3.5" />;
    }
  };

  const getLiningPercent = (furnace: Furnace) => {
    if (!furnace.liningLifeMax || furnace.liningLifeMax === 0) return 0;
    return Math.min(100, Math.round(((furnace.liningChargeCount || 0) / furnace.liningLifeMax) * 100));
  };

  const getLiningColor = (percent: number) => {
    if (percent >= 80) return 'bg-red-500';
    if (percent >= 60) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <>
      <div className="space-y-6" id="furnaces-view">
        {/* Header Panel */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-display">
              Ergitme Ocakları Yönetimi
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Tesiste aktif durumdaki ocakların durum kontrolleri, bakım geçmişi ve astar ömrü takibi.
            </p>
          </div>
          <button
            onClick={onNavigateToSettings}
            className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl font-semibold text-xs transition flex items-center gap-1.5 active:scale-95"
          >
            <Settings className="w-3.5 h-3.5" />
            Ocak Tanımları
          </button>
        </div>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 bg-white border border-gray-100 rounded-2xl">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Toplam Ocak</span>
            <span className="text-2xl font-bold text-gray-900 font-mono mt-1 block">{furnaces.length}</span>
          </div>
          <div className="p-4 bg-white border border-gray-100 rounded-2xl">
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Çalışan</span>
            <span className="text-2xl font-bold text-emerald-600 font-mono mt-1 block">{furnaces.filter(f => f.status === 'Çalışıyor').length}</span>
          </div>
          <div className="p-4 bg-white border border-gray-100 rounded-2xl">
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Bakımda</span>
            <span className="text-2xl font-bold text-amber-600 font-mono mt-1 block">{furnaces.filter(f => f.status === 'Bakımda').length}</span>
          </div>
          <div className="p-4 bg-white border border-gray-100 rounded-2xl">
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block">Arızalı</span>
            <span className="text-2xl font-bold text-red-600 font-mono mt-1 block">{furnaces.filter(f => f.status === 'Arızalı').length}</span>
          </div>
        </div>

        {/* Furnaces list cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sortFurnaces(furnaces).map((furnace, index) => (
            <motion.div 
              key={furnace.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.3 }}
              className="rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow duration-300"
            >
              {/* Ambient flame overlay for active furnaces */}
              {furnace.status === 'Çalışıyor' && (
                <div className="absolute -right-16 -bottom-16 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none transition-all duration-300 group-hover:bg-amber-500/15" />
              )}
              {furnace.status === 'Arızalı' && (
                <div className="absolute -right-16 -bottom-16 w-36 h-36 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
              )}

              <div className="p-6 space-y-4">
                {/* Icon, Badge & Action Buttons */}
                <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-xl ${
                    furnace.status === 'Çalışıyor' ? 'bg-amber-50 text-amber-500' :
                    furnace.status === 'Bakımda' ? 'bg-blue-50 text-blue-500' :
                    'bg-red-50 text-red-500'
                  }`}>
                    <Flame className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2 w-[145px] shrink-0">
                    <ModernSelect
                      value={furnace.status}
                      onChange={(val) => {
                        const note = prompt(`${furnace.name} ocağı için durum değişikliği notu (isteğe bağlı):`);
                        onUpdateStatus(furnace.id, val as FurnaceStatus, note || undefined);
                      }}
                      options={[
                        { value: 'Çalışıyor', label: '🟢 Çalışıyor' },
                        { value: 'Bakımda', label: '🟠 Bakımda' },
                        { value: 'Arızalı', label: '🔴 Arızalı' },
                        { value: 'Kullanım Dışı', label: '⚪ Kullanım Dışı' },
                      ]}
                    />
                  </div>
                </div>

                {/* Editing Mode or Display Mode */}
                <AnimatePresence mode="wait">
                  {editingId === furnace.id ? (
                    <motion.div
                      key="edit"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500/40"
                        placeholder="Ocak adı"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editForm.capacity || ''}
                          onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:ring-2 focus:ring-amber-500/40"
                          placeholder="Kapasite"
                        />
                        <ModernSelect
                          value={editForm.fuelType || 'Mazot'}
                          onChange={(val) => setEditForm({ ...editForm, fuelType: val as FurnaceFuelType })}
                          options={[
                            { value: 'Mazot', label: 'Mazot' },
                            { value: 'Elektrik', label: 'Elektrik' },
                            { value: 'Doğalgaz', label: 'Doğalgaz' },
                            { value: 'LPG', label: 'LPG' },
                          ]}
                        />
                      </div>
                      <textarea
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
                        placeholder="Açıklama..."
                      />
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-gray-500 whitespace-nowrap">Astar Ömrü (Şarj):</label>
                        <input
                          type="number"
                          value={editForm.liningLifeMax || 0}
                          onChange={(e) => setEditForm({ ...editForm, liningLifeMax: parseInt(e.target.value) || 0 })}
                          className="w-20 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 outline-none focus:ring-2 focus:ring-amber-500/40"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(furnace)}
                          className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Kaydet
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition active:scale-95"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="display"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      {/* Title & Capacity */}
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-gray-900 font-display">
                          {furnace.name}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-gray-400 ">
                          <span className="font-mono">
                            Kapasite: <span className="text-gray-700 font-bold">{furnace.capacity}</span>
                          </span>
                          {furnace.fuelType && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-50 rounded-lg text-gray-600 font-semibold">
                              {getFuelIcon(furnace.fuelType)}
                              {furnace.fuelType}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {furnace.description && (
                        <p className="text-xs text-gray-500 leading-relaxed font-sans">
                          {furnace.description}
                        </p>
                      )}

                      {/* Lining Life Progress */}
                      {furnace.liningLifeMax && furnace.liningLifeMax > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                              <Gauge className="w-3 h-3" />
                              Astar Ömrü
                            </span>
                            <span className="text-[10px] font-mono font-bold text-gray-600 ">
                              {furnace.liningChargeCount || 0} / {furnace.liningLifeMax} şarj
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${getLiningPercent(furnace)}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              className={`h-full rounded-full ${getLiningColor(getLiningPercent(furnace))}`}
                            />
                          </div>
                          {getLiningPercent(furnace) >= 80 && (
                            <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Astar ömrü kritik seviyede! Değişim planlanmalı.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Last Maintenance Info */}
                      {furnace.lastMaintenanceDate && (
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 ">
                          <Calendar className="w-3 h-3" />
                          Son Bakım: <span className="font-bold text-gray-600 ">{new Date(furnace.lastMaintenanceDate).toLocaleDateString('tr-TR')}</span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => startEdit(furnace)}
                          className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition active:scale-95 border border-gray-100"
                        >
                          <Edit3 className="w-3 h-3" />
                          Düzenle
                        </button>
                        <button
                          onClick={() => setDetailFurnace(furnace)}
                          className="flex-1 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition active:scale-95"
                        >
                          <Eye className="w-3 h-3" />
                          Detay
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Status Quick Setter */}
              <div className="px-6 pb-6 pt-2 border-t border-gray-50 space-y-2 relative z-10">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Durumu Değiştir</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => onUpdateStatus(furnace.id, 'Çalışıyor')}
                    className={`py-2 text-[10px] font-bold rounded-xl transition-all duration-150 border active:scale-95 ${
                      furnace.status === 'Çalışıyor'
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                        : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Çalışıyor
                  </button>
                  <button
                    onClick={() => onUpdateStatus(furnace.id, 'Bakımda')}
                    className={`py-2 text-[10px] font-bold rounded-xl transition-all duration-150 border active:scale-95 ${
                      furnace.status === 'Bakımda'
                        ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                        : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Bakımda
                  </button>
                  <button
                    onClick={() => onUpdateStatus(furnace.id, 'Arızalı')}
                    className={`py-2 text-[10px] font-bold rounded-xl transition-all duration-150 border active:scale-95 ${
                      furnace.status === 'Arızalı'
                        ? 'bg-red-500 border-red-500 text-white shadow-sm'
                        : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Arızalı
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Safety & Performance alert summary card */}
        <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 shadow-inner flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-gray-950 text-xs sm:text-sm font-display">Önemli Güvenlik & Astar Ömrü Hatırlatması</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Fırın astar ömürleri şarj sayısına bağlı olarak düzenli incelenmelidir. Her döküm sonrasında astar aşınmasını kontrol edin ve şüpheli sızıntı durumlarında ocağı derhal &quot;Bakımda&quot; veya &quot;Arızalı&quot; konumuna alarak teknik amire bilgi verin.
            </p>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {detailFurnace && (
          <FurnaceDetailModal
            furnace={detailFurnace}
            onClose={() => setDetailFurnace(null)}
            onUpdateFurnace={(updated) => {
              onUpdateFurnace(updated);
              setDetailFurnace(updated);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default React.memo(FurnacesView);
