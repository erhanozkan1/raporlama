'use client';

import React, { useState } from 'react';
import { AppSettings, Furnace, UserRole } from '@/lib/types';
import {
  Cpu,
  Tag,
  Clock,
  Plus,
  Trash2,
  Save,
  Database,
  ShieldCheck,
  FileText,
  Printer
} from 'lucide-react';
import ConfirmDialog from './ui/ConfirmDialog';
import PaperFormModal from './PaperFormModal';

interface SettingsViewProps {
  settings: AppSettings | null;
  onSaveSettings: (settings: AppSettings) => void;
  reportsCount: number;
  userRole?: UserRole;
}

function SettingsView({ 
  settings, 
  onSaveSettings, 
  reportsCount,
  userRole
}: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<'furnaces' | 'tags' | 'shifts' | 'system'>('furnaces');
  const [showPaperFormModal, setShowPaperFormModal] = useState(false);

  // Sadece admin ve superadmin matbu form alanlarını görebilir ve yönetebilir
  const isAdmin = !userRole || userRole === 'admin' || userRole === 'superadmin';

  // Edit states
  const [editedFurnaces, setEditedFurnaces] = useState<Furnace[]>(settings?.furnaces || []);
  const [editedTags, setEditedTags] = useState<string[]>(settings?.tags || []);
  const [editedShifts, setEditedShifts] = useState<string[]>(settings?.shifts || []);
  const [editedTarget, setEditedTarget] = useState<number>(settings?.monthlyTargetKg ?? (settings?.monthlyTargetTons ? settings.monthlyTargetTons * 1000 : 75000));

  // Furnace deletion confirmation state
  const [deletingFurnace, setDeletingFurnace] = useState<Furnace | null>(null);

  // Form input field temporary states
  const [newFurnaceName, setNewFurnaceName] = useState('');
  const [newFurnaceCapacity, setNewFurnaceCapacity] = useState('');
  
  const [newTag, setNewTag] = useState('');
  const [newShift, setNewShift] = useState('');

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state update whenever props change
  React.useEffect(() => {
    if (settings) {
      const timer = setTimeout(() => {
        setEditedFurnaces(settings.furnaces);
        setEditedTags(settings.tags);
        setEditedShifts(settings.shifts);
        setEditedTarget(settings.monthlyTargetKg ?? (settings.monthlyTargetTons ? settings.monthlyTargetTons * 1000 : 75000));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [settings]);

  // Handlers
  const handleSaveAll = () => {
    if (!settings) return;

    const updatedSettings: AppSettings = {
      ...settings,
      furnaces: editedFurnaces,
      tags: editedTags,
      shifts: editedShifts,
      monthlyTargetKg: editedTarget > 0 ? editedTarget : 75000,
    };

    onSaveSettings(updatedSettings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Furnace operations
  const addFurnace = () => {
    if (newFurnaceName.trim() && newFurnaceCapacity.trim()) {
      const newF: Furnace = {
        id: `furnace-${Date.now()}`,
        name: newFurnaceName.trim(),
        capacity: newFurnaceCapacity.trim(),
        status: 'Çalışıyor',
      };
      setEditedFurnaces([...editedFurnaces, newF]);
      setNewFurnaceName('');
      setNewFurnaceCapacity('');
    }
  };

  const confirmDeleteFurnace = () => {
    if (deletingFurnace) {
      setEditedFurnaces(editedFurnaces.filter(f => f.id !== deletingFurnace.id));
      setDeletingFurnace(null);
    }
  };

  // Tag operations
  const addTag = () => {
    if (newTag.trim() && !editedTags.includes(newTag.trim())) {
      setEditedTags([...editedTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const deleteTag = (tag: string) => {
    setEditedTags(editedTags.filter(t => t !== tag));
  };

  // Shift operations
  const addShift = () => {
    if (newShift.trim() && !editedShifts.includes(newShift.trim())) {
      setEditedShifts([...editedShifts, newShift.trim()]);
      setNewShift('');
    }
  };

  const deleteShift = (shiftName: string) => {
    setEditedShifts(editedShifts.filter(s => s !== shiftName));
  };

  return (
    <div className="space-y-6" id="settings-view">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-display">
            Sistem Ayarları
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Döküm tesisi operasyon parametrelerini, ocak tanımlarını ve etiket şablonlarını yönetin.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {isAdmin && (
            <button
              onClick={() => setShowPaperFormModal(true)}
              id="btn-open-paper-form-modal"
              className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 shadow-sm flex items-center gap-2 active:scale-95"
              title="Personelin sahada kalemle veri doldurabileceği A4 matbu formu düzenleyin ve yazdırın"
            >
              <FileText className="w-4 h-4 text-amber-600" />
              <span>Matbu Kağıt Formu (PDF)</span>
            </button>
          )}
          <button
            onClick={handleSaveAll}
            id="btn-save-all-settings"
            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-sm transition-all duration-200 shadow-sm flex items-center gap-2 active:scale-95"
          >
            <Save className="w-4 h-4" />
            Tüm Ayarları Kaydet
          </button>
        </div>
      </div>

      {/* Save Success Alert banner */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          Sistem ayarları başarıyla yerel ve bulut sunucularına kaydedildi.
        </div>
      )}

      {/* Tabs Menu inside settings view */}
      <div className="flex border-b border-gray-100 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('furnaces')}
          className={`px-4 py-2.5 font-bold text-xs border-b-2 transition duration-150 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'furnaces' 
              ? 'border-amber-500 text-amber-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          Fırın Tanımları ({editedFurnaces.length})
        </button>
        <button
          onClick={() => setActiveTab('tags')}
          className={`px-4 py-2.5 font-bold text-xs border-b-2 transition duration-150 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'tags' 
              ? 'border-amber-500 text-amber-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          Etiket Şablonları ({editedTags.length})
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2.5 font-bold text-xs border-b-2 transition duration-150 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'system' 
              ? 'border-amber-500 text-amber-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          Veritabanı Durumu
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
        
        {/* TAB 1: FURNACES */}
        {activeTab === 'furnaces' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-md font-bold text-gray-900 font-display">Kayıtlı Ergitme Ocakları</h2>
              <p className="text-xs text-gray-500 ">Günlük raporda listelenecek ocak şablonlarını ekleyip çıkarabilirsiniz.</p>
            </div>

            {/* Existing furnaces list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {editedFurnaces.map((f) => (
                <div key={f.id} className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-900 text-xs sm:text-sm font-display">{f.name}</h3>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">Kapasite: {f.capacity}</p>
                  </div>
                  <button
                    onClick={() => setDeletingFurnace(f)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="Ocağı Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new Furnace Inline Panel */}
            <div className="p-4 border border-dashed border-gray-200 rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-gray-700 ">Yeni Ocak Tanımı Ekle</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Ocak Adı (Örn: Kok Ocağı)"
                  value={newFurnaceName}
                  onChange={(e) => setNewFurnaceName(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none text-gray-900 focus:ring-1 focus:ring-amber-500"
                />
                <input
                  type="text"
                  placeholder="Kapasite (Örn: 300 kg)"
                  value={newFurnaceCapacity}
                  onChange={(e) => setNewFurnaceCapacity(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none text-gray-900 focus:ring-1 focus:ring-amber-500"
                />
                <button
                  onClick={addFurnace}
                  id="btn-add-furnace-settings"
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Listeye Ekle
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TAGS */}
        {activeTab === 'tags' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-md font-bold text-gray-900 font-display">Kayıtlı Etiket Şablonları</h2>
              <p className="text-xs text-gray-500 ">Raporlara hızlıca etiket eklemek için kullanılan şablonlar.</p>
            </div>

            {/* Tags badge lists */}
            <div className="flex flex-wrap gap-2.5">
              {editedTags.map((t) => (
                <div 
                  key={t} 
                  className="pl-3 pr-1 py-1.5 bg-amber-50/60 text-amber-600 border border-amber-100/40 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <span>{t}</span>
                  <button
                    onClick={() => deleteTag(t)}
                    className="p-1 text-amber-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add inline tag */}
            <div className="flex items-center gap-2 pt-4 border-t border-gray-50 ">
              <input
                type="text"
                placeholder="Örn: Emniyet Duruşu, Kalıp Değişimi"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="max-w-xs px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none text-gray-900 focus:ring-1 focus:ring-amber-500"
              />
              <button
                onClick={addTag}
                id="btn-add-tag-settings"
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                Etiket Ekle
              </button>
            </div>
          </div>
        )}



        {/* TAB 4: SYSTEM */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-md font-bold text-gray-900 font-display">Veritabanı Sağlığı & Sunucu Senkronizasyonu</h2>
              <p className="text-xs text-gray-500 ">Tesisinizin tüm operasyonel verileri yerel tarayıcı önbelleğinde ve eşzamanlı olarak bulut sunucularında güvence altındadır.</p>
            </div>

            {/* Aylık Üretim Hedefi */}
            <div className="p-4 border border-amber-100 bg-amber-50/30 rounded-2xl space-y-2 max-w-md">
              <label className="text-xs font-bold text-gray-700 block">
                Aylık Üretim Hedefi (kg)
              </label>
              <p className="text-[11px] text-gray-500">
                Kontrol Paneli&apos;ndeki &quot;Bu Ay Toplam Üretim&quot; ilerleme çubuğu bu hedefe göre hesaplanır.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  step="1000"
                  value={editedTarget}
                  onChange={(e) => setEditedTarget(parseFloat(e.target.value) || 0)}
                  className="w-36 px-3 py-2 bg-white border border-amber-200 rounded-xl text-sm font-mono font-bold text-gray-900 outline-none focus:ring-2 focus:ring-amber-500/40"
                />
                <span className="text-sm font-bold text-gray-500">kg</span>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Toplam Kayıtlı Rapor</span>
                <span className="text-2xl font-bold text-gray-900 font-mono mt-1 block">{reportsCount}</span>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Veritabanı Türü</span>
                <span className="text-sm font-bold text-amber-600 mt-2 block">Durable SQLite / JSON DB</span>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Bağlantı Modu</span>
                <span className="text-sm font-bold text-emerald-500 mt-2 block">Çevrimdışı (Offline-First) Destekli</span>
              </div>
            </div>

            <div className="p-4 border border-emerald-100 bg-emerald-50/20 rounded-2xl flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="text-xs text-gray-600 leading-relaxed">
                <strong>Veri Koruma Politikası:</strong> İnternet bağlantınız koptuğunda dahi &quot;Döküm Takip Sistemi&quot; kesintisiz olarak çalışmaya devam eder. Girdiğiniz veriler anında tarayıcınızın güvenli lokal deposuna yazılır. İnternet bağlantısı sağlandığında sistem arkada çalışarak tüm verileri otomatik olarak merkezi veritabanına aktarır. Veri kaybı riski sıfırdır.
              </div>
            </div>

            {/* Matbu Kağıt Formu Kartı (Sadece Admin) */}
            {isAdmin && (
              <div className="p-5 border border-amber-200/70 bg-gradient-to-br from-amber-50/60 to-orange-50/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-3 bg-amber-500 text-white rounded-xl shadow-sm shrink-0">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 font-display">
                      Saha Kağıt Üretim Takip Formu (Matbu Şablon)
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                      Saha döküm personelinin vardiya esnasında tablet/bilgisayar yerine elle kalemle doldurabileceği standart A4 dikey matbu takip formu. Başlıkları, ocak listesini ve satır adetlerini özelleştirerek PDF olarak indirebilir veya yazdırabilirsiniz.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPaperFormModal(true)}
                  className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 shadow-sm active:scale-95"
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  Formu Düzenle & Yazdır
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Confirm Furnace Deletion Modal */}
      <ConfirmDialog
        isOpen={Boolean(deletingFurnace)}
        title={`${deletingFurnace?.name || 'Ergitme Ocağını'} Silmek İstediğinize Emin Misiniz?`}
        message="Ergitme ocakları dökümhanenin bel kemiği olan makinelerdir. Bu ocağı silmek sistem şablonlarından kaldıracaktır."
        confirmLabel="Evet, Ocağı Sil"
        cancelLabel="Vazgeç"
        isDanger={true}
        onConfirm={confirmDeleteFurnace}
        onCancel={() => setDeletingFurnace(null)}
      />

      {/* Matbu Kağıt Takip Formu Modalı (Sadece Admin) */}
      {isAdmin && (
        <PaperFormModal
          isOpen={showPaperFormModal}
          onClose={() => setShowPaperFormModal(false)}
          settings={settings}
        />
      )}
    </div>
  );
}

export default React.memo(SettingsView);
