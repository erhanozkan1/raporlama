'use client';

import React, { useState, useMemo } from 'react';
import { StockPallet, StockItem, StockMovement, AppSettings, UserRole, PalletStatus, AuditAction } from '@/lib/types';
import { generateNextPalletNumber } from '@/lib/stockService';
import { 
  Package, 
  Truck, 
  Plus, 
  ArrowDownLeft, 
  Search, 
  Calendar, 
  Scale, 
  Layers, 
  Boxes, 
  Building2, 
  FileText, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Save, 
  ArrowRight,
  Maximize2,
  MapPin,
  Clock,
  RotateCcw,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmDialog from './ui/ConfirmDialog';

interface StockViewProps {
  settings: AppSettings | null;
  onUpdateSettings: (newSettings: AppSettings) => void;
  userRole?: UserRole;
  onLogAction?: (action: AuditAction, resourceName: string, summary: string, beforeData?: any, afterData?: any) => void;
}

export default function StockView({ settings, onUpdateSettings, onLogAction }: StockViewProps) {
  // Aktif Sekme: 'pallets' (Tekil Palet Envanteri) | 'summary' (Ürün Bazlı Özet) | 'movements' (Sevkiyat Geçmişi)
  const [activeTab, setActiveTab] = useState<'pallets' | 'summary' | 'movements'>('pallets');
  
  // Arama ve Filtreleme
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'dispatched'>('in_stock');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('all');
  const [movementFilterType, setMovementFilterType] = useState<'all' | 'out' | 'in'>('all');

  // Modallar
  const [showAddPalletModal, setShowAddPalletModal] = useState(false);
  const [editingPallet, setEditingPallet] = useState<StockPallet | null>(null);
  const [deletingPallet, setDeletingPallet] = useState<StockPallet | null>(null);
  const [dispatchingPallet, setDispatchingPallet] = useState<StockPallet | null>(null);
  const [deletingMovement, setDeletingMovement] = useState<StockMovement | null>(null);

  // Palet Formu (Yeni Ekleme)
  const [palletForm, setPalletForm] = useState({
    palletNumber: '',
    productName: '',
    productCode: '',
    netWeightKg: '' as unknown as number,
    quantity: '' as unknown as number,
    dimensions: '80x120 cm (Euro)',
    location: 'Saha A',
    entryDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Palet Düzenleme Formu
  const [editForm, setEditForm] = useState<Partial<StockPallet>>({});

  // Sevkiyat Formu
  const [dispatchForm, setDispatchForm] = useState({
    destination: '',
    documentNo: '',
    dispatchDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Veriler (Silindiğinde asla geri gelmez)
  const stockPallets: StockPallet[] = useMemo(() => {
    if (Array.isArray(settings?.stockPallets)) {
      return settings.stockPallets;
    }
    return [];
  }, [settings?.stockPallets]);

  const stockMovements: StockMovement[] = useMemo(() => {
    if (Array.isArray(settings?.stockMovements)) {
      return settings.stockMovements;
    }
    return [];
  }, [settings?.stockMovements]);

  // Mevcut benzersiz ürün adları listesi (autocomplete / filtre için)
  const existingProductNames = useMemo(() => {
    const set = new Set<string>();
    stockPallets.forEach(p => {
      if (p.productName) set.add(p.productName);
    });
    return Array.from(set).sort();
  }, [stockPallets]);

  // Özet KPI İstatistikleri (Tekil paletlerin tartılan gerçek kilolarından hesaplanır)
  const summaryStats = useMemo(() => {
    const inStockPallets = stockPallets.filter(p => p.status === 'in_stock');
    const totalPalletsInStock = inStockPallets.length;
    const totalWeightInStockKg = inStockPallets.reduce((s, p) => s + (Number(p.netWeightKg) || 0), 0);
    const totalUnitsInStock = inStockPallets.reduce((s, p) => s + (Number(p.quantity) || 0), 0);

    // Bu ayki çıkışlar (sevkiyatlar)
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dispatchedPalletsThisMonth = stockPallets.filter(
      p => p.status === 'dispatched' && (p.dispatchDate || '').startsWith(currentMonthStr)
    );
    const dispatchedPalletsCount = dispatchedPalletsThisMonth.length;
    const dispatchedWeightMonthKg = dispatchedPalletsThisMonth.reduce((s, p) => s + (Number(p.netWeightKg) || 0), 0);

    return {
      totalPalletsInStock,
      totalWeightInStockTons: (totalWeightInStockKg / 1000).toFixed(2),
      totalWeightInStockKg: Math.round(totalWeightInStockKg),
      totalUnitsInStock,
      productCount: existingProductNames.length,
      dispatchedPalletsCount,
      dispatchedTonsMonth: (dispatchedWeightMonthKg / 1000).toFixed(2),
    };
  }, [stockPallets, existingProductNames]);

  // Filtrelenmiş Tekil Paletler
  const filteredPallets = useMemo(() => {
    return stockPallets.filter(pallet => {
      // Durum Filtresi
      if (statusFilter !== 'all' && pallet.status !== statusFilter) {
        return false;
      }
      // Ürün Filtresi
      if (selectedProductFilter !== 'all' && pallet.productName !== selectedProductFilter) {
        return false;
      }
      // Arama Sorgusu
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNo = (pallet.palletNumber || '').toLowerCase().includes(q);
        const matchesProd = (pallet.productName || '').toLowerCase().includes(q);
        const matchesCode = (pallet.productCode || '').toLowerCase().includes(q);
        const matchesDim = (pallet.dimensions || '').toLowerCase().includes(q);
        const matchesLoc = (pallet.location || '').toLowerCase().includes(q);
        const matchesDest = (pallet.destination || '').toLowerCase().includes(q);
        const matchesDoc = (pallet.documentNo || '').toLowerCase().includes(q);
        if (!matchesNo && !matchesProd && !matchesCode && !matchesDim && !matchesLoc && !matchesDest && !matchesDoc) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      // Depodakiler önce, sonra en yeni giriş tarihine göre
      if (a.status === 'in_stock' && b.status !== 'in_stock') return -1;
      if (a.status !== 'in_stock' && b.status === 'in_stock') return 1;
      return (b.entryDate || '').localeCompare(a.entryDate || '');
    });
  }, [stockPallets, statusFilter, selectedProductFilter, searchQuery]);

  // Ürün Bazlı Gruplanmış Özet
  const groupedProducts = useMemo(() => {
    const map = new Map<string, {
      productName: string;
      productCode?: string;
      inStockPallets: StockPallet[];
      dispatchedPallets: StockPallet[];
      totalInStockKg: number;
      totalInStockUnits: number;
      averagePalletWeight: number;
    }>();

    stockPallets.forEach(p => {
      const key = p.productName || 'Belirtilmemiş Ürün';
      if (!map.has(key)) {
        map.set(key, {
          productName: key,
          productCode: p.productCode,
          inStockPallets: [],
          dispatchedPallets: [],
          totalInStockKg: 0,
          totalInStockUnits: 0,
          averagePalletWeight: 0,
        });
      }
      const entry = map.get(key)!;
      if (p.productCode && !entry.productCode) entry.productCode = p.productCode;
      
      if (p.status === 'in_stock') {
        entry.inStockPallets.push(p);
        entry.totalInStockKg += Number(p.netWeightKg) || 0;
        entry.totalInStockUnits += Number(p.quantity) || 0;
      } else {
        entry.dispatchedPallets.push(p);
      }
    });

    const list = Array.from(map.values()).map(g => ({
      ...g,
      averagePalletWeight: g.inStockPallets.length > 0
        ? Math.round(g.totalInStockKg / g.inStockPallets.length)
        : 0,
    }));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return list.filter(g => 
        g.productName.toLowerCase().includes(q) || 
        (g.productCode && g.productCode.toLowerCase().includes(q))
      );
    }
    return list;
  }, [stockPallets, searchQuery]);

  // Filtrelenmiş Sevkiyat Hareketleri
  const filteredMovements = useMemo(() => {
    let list = stockMovements;
    if (movementFilterType !== 'all') {
      list = list.filter(m => m.type === movementFilterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m => 
        m.productName.toLowerCase().includes(q) ||
        (m.destination && m.destination.toLowerCase().includes(q)) ||
        (m.documentNo && m.documentNo.toLowerCase().includes(q)) ||
        (m.date && m.date.includes(q))
      );
    }
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [stockMovements, movementFilterType, searchQuery]);

  // Yeni Palet Modalını Açarken Otomatik Sıradaki Palet No Ver
  const handleOpenAddPallet = (prefillProductName?: string) => {
    const nextNumber = generateNextPalletNumber(stockPallets);
    setPalletForm({
      palletNumber: nextNumber,
      productName: prefillProductName || (existingProductNames[0] || ''),
      productCode: '',
      netWeightKg: '' as unknown as number,
      quantity: '' as unknown as number,
      dimensions: '80x120 cm (Euro)',
      location: 'Saha A',
      entryDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowAddPalletModal(true);
  };

  // Yeni Palet Kaydet (İsteğe bağlı seri giriş)
  const handleSaveNewPallet = (andKeepOpen = false) => {
    if (!palletForm.productName.trim()) {
      alert('Lütfen ürün adını giriniz.');
      return;
    }
    const weight = Number(palletForm.netWeightKg);
    if (!weight || weight <= 0) {
      alert('Lütfen geçerli bir tartılan net ağırlık (kg) giriniz.');
      return;
    }
    const qty = Number(palletForm.quantity) || 0;

    const now = new Date().toISOString();
    const newPallet: StockPallet = {
      id: `plt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      palletNumber: (palletForm.palletNumber || generateNextPalletNumber(stockPallets)).trim(),
      productName: palletForm.productName.trim(),
      productCode: palletForm.productCode.trim() || undefined,
      netWeightKg: weight,
      quantity: qty,
      dimensions: palletForm.dimensions.trim() || '80x120 cm',
      location: palletForm.location.trim() || undefined,
      status: 'in_stock',
      entryDate: palletForm.entryDate || now.split('T')[0],
      notes: palletForm.notes.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    const updatedPallets = [newPallet, ...stockPallets];
    onUpdateSettings({
      ...(settings || { furnaces: [], tags: [], shifts: [] }),
      stockPallets: updatedPallets,
    });

    onLogAction?.(
      'PALET_EKLE',
      newPallet.palletNumber,
      `${newPallet.palletNumber} numaralı yeni palet (${newPallet.productName}, ${newPallet.netWeightKg} kg, ${newPallet.quantity} adet) tartılarak depoya eklendi.`,
      null,
      newPallet
    );

    if (andKeepOpen) {
      // Seri tartım: sonraki palet no oluşturup aynı ürünle beklet
      const nextNumber = generateNextPalletNumber(updatedPallets);
      setPalletForm(prev => ({
        ...prev,
        palletNumber: nextNumber,
        netWeightKg: '' as unknown as number,
        quantity: '' as unknown as number,
        notes: '',
      }));
    } else {
      setShowAddPalletModal(false);
    }
  };

  // Palet Düzenleme Modalı Aç
  const handleOpenEditPallet = (pallet: StockPallet) => {
    setEditingPallet(pallet);
    setEditForm({ ...pallet });
  };

  // Palet Düzenlemeyi Kaydet ("Müdahale Edebilsem")
  const handleSaveEditPallet = () => {
    if (!editingPallet) return;
    const weight = Number(editForm.netWeightKg) || editingPallet.netWeightKg;
    const qty = Number(editForm.quantity) ?? editingPallet.quantity;

    const updatedPallet: StockPallet = {
      ...editingPallet,
      ...editForm,
      palletNumber: (editForm.palletNumber || editingPallet.palletNumber).trim(),
      productName: (editForm.productName || editingPallet.productName).trim(),
      netWeightKg: weight,
      quantity: qty,
      updatedAt: new Date().toISOString(),
    };

    const updatedList = stockPallets.map(p => p.id === updatedPallet.id ? updatedPallet : p);
    onUpdateSettings({
      ...(settings || { furnaces: [], tags: [], shifts: [] }),
      stockPallets: updatedList,
    });

    onLogAction?.(
      'PALET_GÜNCELLE',
      updatedPallet.palletNumber,
      `${updatedPallet.palletNumber} numaralı paletin verileri güncellendi (Kilo: ${updatedPallet.netWeightKg} kg, Adet: ${updatedPallet.quantity}, Ölçü: ${updatedPallet.dimensions}).`,
      editingPallet,
      updatedPallet
    );

    setEditingPallet(null);
  };

  // Tekil Palet Sil
  const handleConfirmDeletePallet = () => {
    if (!deletingPallet) return;
    const updated = stockPallets.filter(p => p.id !== deletingPallet.id);
    onUpdateSettings({
      ...(settings || { furnaces: [], tags: [], shifts: [] }),
      stockPallets: updated,
    });

    onLogAction?.(
      'PALET_SİL',
      deletingPallet.palletNumber,
      `${deletingPallet.palletNumber} numaralı (${deletingPallet.productName}, ${deletingPallet.netWeightKg} kg) palet stoktan silindi.`,
      deletingPallet,
      null
    );

    setDeletingPallet(null);
  };

  // Tekil Palet Sevkiyat Modalı Aç
  const handleOpenDispatchPallet = (pallet: StockPallet) => {
    setDispatchingPallet(pallet);
    setDispatchForm({
      destination: '',
      documentNo: '',
      dispatchDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  // Tekil Paleti Sevk Et
  const handleExecutePalletDispatch = () => {
    if (!dispatchingPallet) return;

    const now = new Date().toISOString();
    const updatedPallet: StockPallet = {
      ...dispatchingPallet,
      status: 'dispatched',
      dispatchDate: dispatchForm.dispatchDate || now.split('T')[0],
      destination: dispatchForm.destination.trim() || undefined,
      documentNo: dispatchForm.documentNo.trim() || undefined,
      notes: dispatchForm.notes.trim() ? `${dispatchingPallet.notes ? dispatchingPallet.notes + ' | ' : ''}${dispatchForm.notes.trim()}` : dispatchingPallet.notes,
      updatedAt: now,
    };

    const updatedPallets = stockPallets.map(p => p.id === updatedPallet.id ? updatedPallet : p);

    // Sevkiyat geçmişine hareket kaydı ekle
    const newMovement: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: updatedPallet.productId || updatedPallet.id,
      productName: `${updatedPallet.productName} (${updatedPallet.palletNumber})`,
      type: 'out',
      date: dispatchForm.dispatchDate || now.split('T')[0],
      pallets: 1,
      quantity: updatedPallet.quantity,
      weightKg: updatedPallet.netWeightKg,
      destination: dispatchForm.destination.trim() || undefined,
      documentNo: dispatchForm.documentNo.trim() || undefined,
      note: dispatchForm.notes.trim() || `Palet No: ${updatedPallet.palletNumber}`,
      createdAt: now,
    };

    onUpdateSettings({
      ...(settings || { furnaces: [], tags: [], shifts: [] }),
      stockPallets: updatedPallets,
      stockMovements: [newMovement, ...stockMovements],
    });

    onLogAction?.(
      'PALET_SEVKİYAT',
      updatedPallet.palletNumber,
      `${updatedPallet.palletNumber} nolu palet (${updatedPallet.productName}, ${updatedPallet.netWeightKg} kg) ${dispatchForm.destination} firmasına sevk edildi (İrsaliye: ${dispatchForm.documentNo || '-'}).`,
      dispatchingPallet,
      newMovement
    );

    setDispatchingPallet(null);
  };

  // Tekil Sevkiyat Hareketini Sil
  const handleConfirmDeleteMovement = () => {
    if (!deletingMovement) return;
    const updated = stockMovements.filter(m => m.id !== deletingMovement.id);
    onUpdateSettings({
      ...(settings || { furnaces: [], tags: [], shifts: [] }),
      stockMovements: updated,
    });

    onLogAction?.(
      'SEVKİYAT_SİL',
      deletingMovement.productName,
      `${deletingMovement.productName} sevkiyat kaydı (${deletingMovement.pallets} palet, ${deletingMovement.weightKg} kg) silindi.`,
      deletingMovement,
      null
    );

    setDeletingMovement(null);
  };

  return (
    <div className="w-full max-w-screen-2xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
      
      {/* ─── BAŞLIK VE AKSİYON BUTONLARI ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-amber-500" />
            Ürün Stok ve Palet Takibi
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Her biri bağımsız tartılmış, numaralandırılmış paletler, ağırlık ve ölçü takibi ile sevkiyat kayıtları.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <button
            onClick={() => handleOpenAddPallet()}
            className="flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4 text-amber-400 stroke-[3]" />
            Yeni Palet Ekle (Tartım)
          </button>
        </div>
      </div>

      {/* ─── ÖZET KPI KARTLARI (TARTIMLARDAN HESAPLANAN GERÇEK VERİLER) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Depodaki Palet</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">{summaryStats.totalPalletsInStock}</span>
            <span className="text-xs font-bold text-slate-500">Palet</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">
            ({summaryStats.totalUnitsInStock.toLocaleString('tr-TR')} adet parça)
          </span>
        </div>

        <div className="p-4 sm:p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Depodaki Net Ağırlık</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-mono">{summaryStats.totalWeightInStockTons}</span>
            <span className="text-xs font-bold text-amber-700">Ton</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">
            ({summaryStats.totalWeightInStockKg.toLocaleString('tr-TR')} kg tartılan net)
          </span>
        </div>

        <div className="p-4 sm:p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">Farklı Ürün Çeşidi</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 font-mono">{summaryStats.productCount}</span>
            <span className="text-xs font-bold text-blue-700">Model</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Depoda aktif ürünler</span>
        </div>

        <div className="p-4 sm:p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Bu Ayki Sevkiyat</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono">{summaryStats.dispatchedPalletsCount}</span>
            <span className="text-xs font-bold text-emerald-700">Palet</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-mono mt-1 block font-bold">
            Toplam {summaryStats.dispatchedTonsMonth} Ton sevk edildi
          </span>
        </div>
      </div>

      {/* ─── SEKMELER VE FİLTRELEME ÇUBUĞU ─── */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        {/* Sekme Butonları */}
        <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('pallets')}
            className={`min-h-[40px] px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'pallets' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-500" />
            Palet Envanteri ({stockPallets.filter(p => p.status === 'in_stock').length} Palet)
          </button>
          
          <button
            onClick={() => setActiveTab('summary')}
            className={`min-h-[40px] px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'summary' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4 text-blue-500" />
            Ürün Bazlı Özet ({groupedProducts.length})
          </button>

          <button
            onClick={() => setActiveTab('movements')}
            className={`min-h-[40px] px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'movements' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck className="w-4 h-4 text-emerald-600" />
            Sevkiyat Geçmişi ({stockMovements.length})
          </button>
        </div>

        {/* Arama Kutusu */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={
              activeTab === 'pallets' ? 'Palet No, ürün, ölçü, konum ara...' :
              activeTab === 'summary' ? 'Model veya ürün kodu ara...' :
              'Müşteri, irsaliye, ürün ara...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-amber-500 shadow-2xs font-medium"
          />
        </div>
      </div>

      {/* ─── SEKME 1: TEKİL PALET ENVANTERİ (ASIL LİSTE) ─── */}
      {activeTab === 'pallets' && (
        <div className="space-y-4">
          
          {/* Palet Durum & Ürün Filtreleri */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setStatusFilter('in_stock')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === 'in_stock' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Depodakiler ({stockPallets.filter(p => p.status === 'in_stock').length})
              </button>
              <button
                onClick={() => setStatusFilter('dispatched')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === 'dispatched' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Sevk Edilenler ({stockPallets.filter(p => p.status === 'dispatched').length})
              </button>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tümü ({stockPallets.length})
              </button>
            </div>

            {/* Ürün Filtresi Açılır Menü */}
            {existingProductNames.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-bold hidden sm:inline">Ürün:</span>
                <select
                  value={selectedProductFilter}
                  onChange={(e) => setSelectedProductFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none"
                >
                  <option value="all">Tüm Ürünler ({existingProductNames.length})</option>
                  {existingProductNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {filteredPallets.length === 0 ? (
            <div className="p-12 text-center bg-white border border-dashed border-slate-200 rounded-2xl space-y-3">
              <Layers className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Kayıtlı palet bulunamadı</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Üretilen her paleti numaralandırarak tartılan net kilosunu, adedini ve ölçüsünü sisteme işleyin.
              </p>
              <button
                onClick={() => handleOpenAddPallet()}
                className="mt-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 active:scale-95 transition"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                İlk Paleti Ekle
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Palet / Kasa No</th>
                      <th className="py-3.5 px-4">Ürün Adı</th>
                      <th className="py-3.5 px-4 text-right">Net Ağırlık</th>
                      <th className="py-3.5 px-4 text-right">Adet</th>
                      <th className="py-3.5 px-4">Ölçü / Ebat</th>
                      <th className="py-3.5 px-4">Konum</th>
                      <th className="py-3.5 px-4">Tarih</th>
                      <th className="py-3.5 px-4 text-center">Durum</th>
                      <th className="py-3.5 px-4 text-right">İşlemler (Müdahale)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {filteredPallets.map((pallet) => {
                      const isInStock = pallet.status === 'in_stock';
                      return (
                        <tr key={pallet.id} className="hover:bg-slate-50/80 transition-colors group">
                          {/* Palet No */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-lg text-xs font-mono font-black tracking-wider">
                              #{pallet.palletNumber}
                            </span>
                          </td>

                          {/* Ürün Adı & Kod */}
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <div>{pallet.productName}</div>
                            {pallet.productCode && (
                              <span className="text-[10px] text-slate-400 font-mono font-normal">
                                {pallet.productCode}
                              </span>
                            )}
                          </td>

                          {/* Net Ağırlık (Büyük ve Belirgin) */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <span className="text-sm font-black font-mono text-slate-900">
                              {Number(pallet.netWeightKg).toLocaleString('tr-TR')}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold ml-1">kg</span>
                            <div className="text-[9px] text-slate-400 font-mono">
                              ({(Number(pallet.netWeightKg) / 1000).toFixed(3)} Ton)
                            </div>
                          </td>

                          {/* Adet */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                            {pallet.quantity > 0 ? `${pallet.quantity} adet` : '-'}
                          </td>

                          {/* Ölçü / Ebat */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[11px] font-mono">
                              {pallet.dimensions || '80x120 cm'}
                            </span>
                          </td>

                          {/* Konum */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                            {pallet.location ? (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {pallet.location}
                              </span>
                            ) : '-'}
                          </td>

                          {/* Tarih */}
                          <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                            {pallet.entryDate}
                          </td>

                          {/* Durum Rozeti */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {isInStock ? (
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Depoda
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1">
                                Sevk Edildi
                              </span>
                            )}
                          </td>

                          {/* İşlemler (Müdahale) */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {isInStock && (
                                <button
                                  onClick={() => handleOpenDispatchPallet(pallet)}
                                  className="min-h-[34px] px-2.5 py-1 bg-amber-50 hover:bg-amber-500 text-amber-700 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1 border border-amber-200 active:scale-95"
                                  title="Bu Paleti Sevk Et"
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Sevk</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenEditPallet(pallet)}
                                className="min-h-[34px] p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold transition border border-slate-200 active:scale-95"
                                title="Palet Bilgilerini Düzenle / Ağırlığı Değiştir"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setDeletingPallet(pallet)}
                                className="min-h-[34px] p-1.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg text-xs font-bold transition border border-slate-200 active:scale-95"
                                title="Paleti Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── SEKME 2: ÜRÜN BAZLI ÖZET ─── */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          {groupedProducts.length === 0 ? (
            <div className="p-12 text-center bg-white border border-dashed border-slate-200 rounded-2xl space-y-2">
              <Boxes className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Ürün kaydı bulunamadı</p>
              <p className="text-xs text-slate-400">Palet girişi yapıldıkça ürün bazlı özetler burada otomatik listelenecektir.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedProducts.map((group) => (
                <div 
                  key={group.productName}
                  className="bg-white border border-slate-200/90 hover:border-amber-400/80 rounded-2xl p-5 shadow-xs transition-all space-y-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div>
                        <h3 className="font-bold text-base text-slate-900">{group.productName}</h3>
                        {group.productCode && (
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-bold mt-1 inline-block">
                            {group.productCode}
                          </span>
                        )}
                      </div>
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold font-mono">
                        {group.inStockPallets.length} Palet
                      </span>
                    </div>

                    <div className="my-3 p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-500 font-medium">Toplam Net Ağırlık:</span>
                        <span className="text-sm font-black font-mono text-slate-900">
                          {(group.totalInStockKg / 1000).toFixed(2)} Ton <span className="text-[10px] text-slate-400 font-normal">({group.totalInStockKg.toLocaleString('tr-TR')} kg)</span>
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-500 font-medium">Toplam Parça Adedi:</span>
                        <span className="text-xs font-bold font-mono text-slate-800">
                          {group.totalInStockUnits.toLocaleString('tr-TR')} adet
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-500 font-medium">Ortalama Palet Kilosu:</span>
                        <span className="text-xs font-bold font-mono text-amber-700">
                          ~{group.averagePalletWeight.toLocaleString('tr-TR')} kg / palet
                        </span>
                      </div>
                    </div>

                    {/* Palet Numaraları Önizleme */}
                    {group.inStockPallets.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Depodaki Palet Numaraları
                        </span>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                          {group.inStockPallets.map(p => (
                            <span 
                              key={p.id}
                              className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono font-bold text-slate-700"
                              title={`${p.palletNumber}: ${p.netWeightKg} kg, ${p.quantity} adet, ${p.dimensions}`}
                            >
                              #{p.palletNumber} ({p.netWeightKg} kg)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex gap-2">
                    <button
                      onClick={() => handleOpenAddPallet(group.productName)}
                      className="flex-1 min-h-[38px] py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400" />
                      Yeni Palet Ekle
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProductFilter(group.productName);
                        setActiveTab('pallets');
                      }}
                      className="min-h-[38px] px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                      Paletleri Gör
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── SEKME 3: SEVKİYAT VE ÇIKIŞ GEÇMİŞİ ─── */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setMovementFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                movementFilterType === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tüm Hareketler
            </button>
            <button
              onClick={() => setMovementFilterType('out')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                movementFilterType === 'out' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Sadece Sevkiyatlar (Çıkış)
            </button>
            <button
              onClick={() => setMovementFilterType('in')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                movementFilterType === 'in' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              Sadece Girişler
            </button>
          </div>

          {filteredMovements.length === 0 ? (
            <div className="p-12 text-center bg-white border border-dashed border-slate-200 rounded-2xl space-y-2">
              <Truck className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Henüz kayıtlı bir sevkiyat veya ürün çıkışı yok</p>
              <p className="text-xs text-slate-400">Paletleri sevk ettiğinizde tarih, müşteri ve irsaliye detaylarıyla birlikte burada arşivlenecektir.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Tarih</th>
                      <th className="py-3.5 px-4">İşlem</th>
                      <th className="py-3.5 px-4">Ürün & Palet</th>
                      <th className="py-3.5 px-4 text-right">Sevk Paleti</th>
                      <th className="py-3.5 px-4 text-right">Toplam Adet</th>
                      <th className="py-3.5 px-4 text-right">Ağırlık (kg / Ton)</th>
                      <th className="py-3.5 px-4">Müşteri / Alıcı</th>
                      <th className="py-3.5 px-4">İrsaliye / Belge</th>
                      <th className="py-3.5 px-4">Açıklama</th>
                      <th className="py-3.5 px-4 text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {filteredMovements.map((mov) => {
                      const isOut = mov.type === 'out';
                      return (
                        <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {new Date(mov.date).toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold inline-flex items-center gap-1 ${
                              isOut 
                                ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}>
                              {isOut ? <Truck className="w-3 h-3 text-amber-600" /> : <ArrowDownLeft className="w-3 h-3 text-emerald-600" />}
                              {isOut ? 'Sevkiyat (Çıkış)' : 'Stok Girişi'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {mov.productName}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-extrabold text-sm text-slate-900">
                            {mov.pallets} Palet
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                            {mov.quantity > 0 ? `${mov.quantity.toLocaleString('tr-TR')} adet` : '-'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {(mov.weightKg / 1000).toFixed(2)} Ton <span className="text-[10px] text-slate-400">({mov.weightKg.toLocaleString('tr-TR')} kg)</span>
                          </td>
                          <td className="py-3.5 px-4">
                            {mov.destination ? (
                              <span className="font-bold text-slate-800">{mov.destination}</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            {mov.documentNo || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                            {mov.note || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => setDeletingMovement(mov)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Kaydı Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: YENİ PALET GİRİŞİ (TARTIM KAYDI) ─── */}
      <AnimatePresence>
        {showAddPalletModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAddPalletModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative bg-white rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 font-display">Yeni Palet Girişi / Tartım</h2>
                    <p className="text-[11px] text-slate-400">Her palet bağımsız tartılarak numarası ve ölçüsüyle kaydedilir.</p>
                  </div>
                </div>
                <button onClick={() => setShowAddPalletModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3.5">
                {/* Palet Numarası */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Palet / Kasa Numarası *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="örn: PLT-001 veya KASA-14"
                      value={palletForm.palletNumber}
                      onChange={(e) => setPalletForm({ ...palletForm, palletNumber: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-amber-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setPalletForm({ ...palletForm, palletNumber: generateNextPalletNumber(stockPallets) })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Sıradaki No
                    </button>
                  </div>
                </div>

                {/* Ürün Adı */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Ürün / Parça Adı *
                  </label>
                  <input
                    type="text"
                    list="product-suggestions"
                    placeholder="örn: Fren Diski (280mm), Volan Kasnağı..."
                    value={palletForm.productName}
                    onChange={(e) => setPalletForm({ ...palletForm, productName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-amber-500 focus:bg-white"
                  />
                  <datalist id="product-suggestions">
                    {existingProductNames.map(name => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>

                {/* Tartılan Net Ağırlık ve Adet */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-amber-700 block mb-1">
                      Tartılan Net Ağırlık (kg) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        placeholder="örn: 825"
                        value={palletForm.netWeightKg || ''}
                        onChange={(e) => setPalletForm({ ...palletForm, netWeightKg: parseFloat(e.target.value) })}
                        className="w-full pl-3 pr-8 py-2.5 bg-amber-50/50 border border-amber-200 rounded-xl text-sm font-mono font-black text-slate-900 outline-none focus:border-amber-500 focus:bg-white"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">kg</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Paletteki Adet
                    </label>
                    <input
                      type="number"
                      placeholder="örn: 50"
                      value={palletForm.quantity || ''}
                      onChange={(e) => setPalletForm({ ...palletForm, quantity: parseInt(e.target.value, 10) })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Ölçü / Ebat */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Ölçü / Palet Türü
                  </label>
                  <input
                    type="text"
                    placeholder="örn: 80x120 cm, 100x120 cm, Metal Kasa..."
                    value={palletForm.dimensions}
                    onChange={(e) => setPalletForm({ ...palletForm, dimensions: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-amber-500 focus:bg-white"
                  />
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {['80x120 cm (Euro)', '100x120 cm', 'Metal Sandık', 'Özel Kasa'].map(dim => (
                      <button
                        key={dim}
                        type="button"
                        onClick={() => setPalletForm({ ...palletForm, dimensions: dim })}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-medium text-slate-600"
                      >
                        {dim}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Depo Konumu ve Tarih */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Depo Konumu
                    </label>
                    <input
                      type="text"
                      placeholder="örn: Saha A, Raf 02"
                      value={palletForm.location}
                      onChange={(e) => setPalletForm({ ...palletForm, location: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Giriş Tarihi
                    </label>
                    <input
                      type="date"
                      value={palletForm.entryDate}
                      onChange={(e) => setPalletForm({ ...palletForm, entryDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Notlar */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Açıklama / Notlar (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    placeholder="örn: Çapakları temizlendi, 2. vardiya üretimi..."
                    value={palletForm.notes}
                    onChange={(e) => setPalletForm({ ...palletForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Aksiyon Butonları */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveNewPallet(false)}
                  className="flex-1 min-h-[44px] py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                  Paleti Kaydet
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveNewPallet(true)}
                  className="min-h-[44px] py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1"
                  title="Kaydedip hemen sıradaki paletin tartımını yapın"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Kaydet ve Sıradakini Ekle
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: PALET DÜZENLEME (MÜDAHALE EDEBİLME) ─── */}
      <AnimatePresence>
        {editingPallet && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setEditingPallet(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative bg-white rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 font-display">Palet Bilgilerini Düzenle</h2>
                    <p className="text-[11px] text-slate-400">Palet numarası, tartılan net kilo, adet veya ölçüleri güncelleyin.</p>
                  </div>
                </div>
                <button onClick={() => setEditingPallet(null)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Palet Numarası *
                    </label>
                    <input
                      type="text"
                      value={editForm.palletNumber || ''}
                      onChange={(e) => setEditForm({ ...editForm, palletNumber: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Durumu
                    </label>
                    <select
                      value={editForm.status || 'in_stock'}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as PalletStatus })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                    >
                      <option value="in_stock">Depoda (Aktif Stok)</option>
                      <option value="dispatched">Sevk Edildi</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Ürün / Parça Adı *
                  </label>
                  <input
                    type="text"
                    value={editForm.productName || ''}
                    onChange={(e) => setEditForm({ ...editForm, productName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-amber-700 block mb-1">
                      Tartılan Net Ağırlık (kg) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        value={editForm.netWeightKg ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, netWeightKg: parseFloat(e.target.value) })}
                        className="w-full pl-3 pr-8 py-2.5 bg-amber-50/50 border border-amber-200 rounded-xl text-sm font-mono font-black text-slate-900 outline-none focus:border-amber-500 focus:bg-white"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">kg</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Adet
                    </label>
                    <input
                      type="number"
                      value={editForm.quantity ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value, 10) })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Ölçü / Ebat
                    </label>
                    <input
                      type="text"
                      value={editForm.dimensions || ''}
                      onChange={(e) => setEditForm({ ...editForm, dimensions: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Depo Konumu
                    </label>
                    <input
                      type="text"
                      value={editForm.location || ''}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Özel Notlar
                  </label>
                  <input
                    type="text"
                    value={editForm.notes || ''}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveEditPallet}
                  className="flex-1 min-h-[44px] py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  Değişiklikleri Kaydet
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPallet(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  İptal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: PALET SEVKİYATI (TEKİL SEVK ET) ─── */}
      <AnimatePresence>
        {dispatchingPallet && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setDispatchingPallet(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative bg-white rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 font-display">Palet Sevkiyatı / Çıkış</h2>
                    <p className="text-[11px] text-slate-400">Bu paleti stoktan düşürerek müşteri sevkiyatına kaydedin.</p>
                  </div>
                </div>
                <button onClick={() => setDispatchingPallet(null)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sevk Edilen Palet Özeti */}
              <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Sevk Edilen Palet</span>
                  <div className="font-mono font-black text-slate-900 text-base mt-0.5">
                    #{dispatchingPallet.palletNumber}
                  </div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">
                    {dispatchingPallet.productName}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Net Ağırlık / Adet</span>
                  <div className="font-mono font-black text-amber-900 text-lg">
                    {dispatchingPallet.netWeightKg} kg
                  </div>
                  <div className="text-xs font-bold font-mono text-slate-600">
                    {dispatchingPallet.quantity} adet
                  </div>
                </div>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Müşteri / Alıcı Firma Adı *
                  </label>
                  <input
                    type="text"
                    placeholder="örn: ABC Otomotiv A.Ş., XYZ Makina..."
                    value={dispatchForm.destination}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, destination: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      İrsaliye / Belge No
                    </label>
                    <input
                      type="text"
                      placeholder="örn: IRS-2026-0042"
                      value={dispatchForm.documentNo}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, documentNo: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Sevkiyat Tarihi
                    </label>
                    <input
                      type="date"
                      value={dispatchForm.dispatchDate}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, dispatchDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Sevkiyat Notu / Araç Plakası
                  </label>
                  <input
                    type="text"
                    placeholder="örn: 34 ABC 123 plakalı kamyon ile sevk edildi"
                    value={dispatchForm.notes}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={handleExecutePalletDispatch}
                  className="flex-1 min-h-[44px] py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Truck className="w-4 h-4" />
                  Sevkiyatı Onayla ve Sevk Et
                </button>
                <button
                  type="button"
                  onClick={() => setDispatchingPallet(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Vazgeç
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── CONFIRM DIALOG: TEKİL PALET SİLME ─── */}
      <ConfirmDialog
        isOpen={!!deletingPallet}
        title="Paleti Sil"
        message={`"${deletingPallet?.palletNumber}" numaralı (${deletingPallet?.productName}, ${deletingPallet?.netWeightKg} kg) palet kaydını listeden silmek istediğinize emin misiniz?`}
        confirmLabel="Evet, Sil"
        cancelLabel="Vazgeç"
        isDanger={true}
        onConfirm={handleConfirmDeletePallet}
        onCancel={() => setDeletingPallet(null)}
      />

      {/* ─── CONFIRM DIALOG: SEVKİYAT HAREKETİ SİLME ─── */}
      <ConfirmDialog
        isOpen={!!deletingMovement}
        title="Sevkiyat Kaydını Sil"
        message={`"${deletingMovement?.productName}" ürününe ait ${deletingMovement?.pallets} paletlik (${deletingMovement?.weightKg} kg) sevkiyat hareket kaydını silmek istediğinize emin misiniz?`}
        confirmLabel="Evet, Sil"
        cancelLabel="Vazgeç"
        isDanger={true}
        onConfirm={handleConfirmDeleteMovement}
        onCancel={() => setDeletingMovement(null)}
      />

    </div>
  );
}
