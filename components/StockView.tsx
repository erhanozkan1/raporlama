'use client';

import React, { useState, useMemo } from 'react';
import { StockItem, StockMovement, AppSettings, UserRole } from '@/lib/types';
import { 
  applyStockMovement, 
  calculateStockItemTotals,
  getDefaultStockItems 
} from '@/lib/stockService';
import { 
  Package, 
  Truck, 
  Plus, 
  ArrowDownLeft, 
  ArrowUpRight, 
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
  Info,
  X,
  Save,
  Filter,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmDialog from './ui/ConfirmDialog';

interface StockViewProps {
  settings: AppSettings | null;
  onUpdateSettings: (newSettings: AppSettings) => void;
  userRole?: UserRole;
}

export default function StockView({ settings, onUpdateSettings, userRole }: StockViewProps) {
  const [activeTab, setActiveTab] = useState<'inventory' | 'movements'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [movementFilterType, setMovementFilterType] = useState<'all' | 'out' | 'in'>('all');

  // Modal states
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StockItem | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<StockItem | null>(null);
  const [deletingMovement, setDeletingMovement] = useState<StockMovement | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [quickDispatchProduct, setQuickDispatchProduct] = useState<StockItem | null>(null);

  // Form states - New Product
  const [newProductForm, setNewProductForm] = useState({
    productName: '',
    productCode: '',
    palletStandardQty: 50,
    palletWeightKg: 800,
    currentPallets: 0,
    currentLooseQty: 0,
    minStockPallets: 3,
    location: '',
    description: '',
  });

  // Form states - Dispatch (Sevkiyat / Çıkış)
  const [dispatchForm, setDispatchForm] = useState({
    productId: '',
    pallets: 1,
    quantity: 0,
    weightKg: 0,
    date: new Date().toISOString().split('T')[0],
    destination: '',
    documentNo: '',
    note: '',
    inputMode: 'pallets' as 'pallets' | 'units',
  });

  // Form states - Stock In (Giriş)
  const [stockInForm, setStockInForm] = useState({
    productId: '',
    pallets: 1,
    quantity: 0,
    weightKg: 0,
    date: new Date().toISOString().split('T')[0],
    documentNo: '',
    note: '',
    inputMode: 'pallets' as 'pallets' | 'units',
  });

  // Form states - Edit Product
  const [editProductForm, setEditProductForm] = useState<Partial<StockItem>>({});

  // Mevcut ürünler ve hareketler (silindiğinde asla geri gelmez)
  const stockItems: StockItem[] = useMemo(() => {
    if (Array.isArray(settings?.stockItems)) {
      return settings.stockItems;
    }
    return [];
  }, [settings?.stockItems]);

  const stockMovements: StockMovement[] = useMemo(() => {
    if (Array.isArray(settings?.stockMovements)) {
      return settings.stockMovements;
    }
    return [];
  }, [settings?.stockMovements]);

  // Özet İstatistikler
  const summaryStats = useMemo(() => {
    const totalPallets = stockItems.reduce((s, i) => s + (i.currentPallets || 0), 0);
    const totalWeightKg = stockItems.reduce((s, i) => s + (i.totalWeightKg || 0), 0);
    const totalUnits = stockItems.reduce((s, i) => s + (i.totalUnits || 0), 0);
    
    // Bu ayki çıkışlar (sevkiyatlar)
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthDispatches = stockMovements.filter(m => m.type === 'out' && m.date.startsWith(currentMonthStr));
    const dispatchedPalletsMonth = thisMonthDispatches.reduce((s, m) => s + (m.pallets || 0), 0);
    const dispatchedWeightMonth = thisMonthDispatches.reduce((s, m) => s + (m.weightKg || 0), 0);

    return {
      totalPallets,
      totalWeightTons: (totalWeightKg / 1000).toFixed(1),
      totalWeightKg,
      totalUnits,
      productCount: stockItems.length,
      dispatchedPalletsMonth,
      dispatchedTonsMonth: (dispatchedWeightMonth / 1000).toFixed(1),
    };
  }, [stockItems, stockMovements]);

  // Filtrelenmiş Ürünler
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return stockItems;
    const q = searchQuery.toLowerCase();
    return stockItems.filter(i => 
      i.productName.toLowerCase().includes(q) || 
      (i.productCode && i.productCode.toLowerCase().includes(q)) ||
      (i.location && i.location.toLowerCase().includes(q))
    );
  }, [stockItems, searchQuery]);

  // Filtrelenmiş Hareketler
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

  // Yeni Ürün Kaydet
  const handleCreateProduct = () => {
    if (!newProductForm.productName.trim()) {
      alert('Lütfen ürün adını giriniz.');
      return;
    }

    const stdQty = Math.max(1, Number(newProductForm.palletStandardQty) || 1);
    const palletWt = Math.max(0, Number(newProductForm.palletWeightKg) || 0);
    const unitWt = parseFloat((palletWt / stdQty).toFixed(2));
    const pallets = Math.max(0, Number(newProductForm.currentPallets) || 0);
    const loose = Math.max(0, Number(newProductForm.currentLooseQty) || 0);

    const totals = calculateStockItemTotals({
      palletStandardQty: stdQty,
      palletWeightKg: palletWt,
      currentPallets: pallets,
      currentLooseQty: loose,
      unitWeightKg: unitWt,
    });

    const now = new Date().toISOString();
    const newProduct: StockItem = {
      id: `stock-prod-${Date.now()}`,
      productName: newProductForm.productName.trim(),
      productCode: newProductForm.productCode.trim() || undefined,
      palletStandardQty: stdQty,
      palletWeightKg: palletWt,
      unitWeightKg: totals.unitWeightKg,
      currentPallets: pallets,
      currentLooseQty: loose,
      totalUnits: totals.totalUnits,
      totalWeightKg: totals.totalWeightKg,
      minStockPallets: Number(newProductForm.minStockPallets) || 2,
      location: newProductForm.location.trim() || undefined,
      description: newProductForm.description.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    const updated = [newProduct, ...stockItems];
    onUpdateSettings({
      ...(settings || { furnaces: [], tags: [], shifts: [] }),
      stockItems: updated,
    });

    setShowAddProductModal(false);
    setNewProductForm({
      productName: '',
      productCode: '',
      palletStandardQty: 50,
      palletWeightKg: 800,
      currentPallets: 0,
      currentLooseQty: 0,
      minStockPallets: 3,
      location: '',
      description: '',
    });
  };

  // Ürün Düzenleme Kaydet
  const handleSaveEditProduct = () => {
    if (!editingProduct) return;

    const stdQty = Math.max(1, Number(editProductForm.palletStandardQty) || editingProduct.palletStandardQty);
    const palletWt = Math.max(0, Number(editProductForm.palletWeightKg) || editingProduct.palletWeightKg);
    const unitWt = editProductForm.unitWeightKg || parseFloat((palletWt / stdQty).toFixed(2));
    const pallets = Math.max(0, Number(editProductForm.currentPallets) ?? editingProduct.currentPallets);
    const loose = Math.max(0, Number(editProductForm.currentLooseQty) ?? editingProduct.currentLooseQty);

    const totals = calculateStockItemTotals({
      palletStandardQty: stdQty,
      palletWeightKg: palletWt,
      currentPallets: pallets,
      currentLooseQty: loose,
      unitWeightKg: unitWt,
    });

    const updatedItem: StockItem = {
      ...editingProduct,
      ...editProductForm,
      palletStandardQty: stdQty,
      palletWeightKg: palletWt,
      unitWeightKg: totals.unitWeightKg,
      currentPallets: pallets,
      currentLooseQty: loose,
      totalUnits: totals.totalUnits,
      totalWeightKg: totals.totalWeightKg,
      updatedAt: new Date().toISOString(),
    };

    const updated = stockItems.map(i => i.id === updatedItem.id ? updatedItem : i);
    onUpdateSettings({
      ...(settings || { furnaces: [], tags: [], shifts: [] }),
      stockItems: updated,
    });

    setEditingProduct(null);
  };

  // Ürün Sil (Tekil)
  const handleConfirmDeleteProduct = () => {
    if (!deletingProduct) return;
    const updated = stockItems.filter(i => i.id !== deletingProduct.id);
    onUpdateSettings({
      ...(settings || { furnaces: [], tags: [], shifts: [] }),
      stockItems: updated,
    });
    setDeletingProduct(null);
  };

  // Tüm Ürünleri Temizle
  const handleConfirmClearAllProducts = () => {
    onUpdateSettings({
      ...(settings || { furnaces: [], tags: [], shifts: [] }),
      stockItems: [],
    });
    setShowClearAllModal(false);
  };

  // Sevkiyat / Hareket Sil
  const handleConfirmDeleteMovement = () => {
    if (!deletingMovement) return;
    const updated = stockMovements.filter(m => m.id !== deletingMovement.id);
    onUpdateSettings({
      ...(settings || { furnaces: [], tags: [], shifts: [] }),
      stockMovements: updated,
    });
    setDeletingMovement(null);
  };

  // İsteğe bağlı demo/örnek ürünleri yükle
  const handleLoadSampleProducts = () => {
    const samples = getDefaultStockItems();
    onUpdateSettings({
      ...(settings || { furnaces: [], tags: [], shifts: [] }),
      stockItems: samples,
    });
  };

  // Sevkiyat / Çıkış Gerçekleştir
  const handleExecuteDispatch = () => {
    const pId = quickDispatchProduct ? quickDispatchProduct.id : dispatchForm.productId;
    if (!pId) {
      alert('Lütfen sevk edilecek ürünü seçiniz.');
      return;
    }

    const prod = stockItems.find(i => i.id === pId);
    if (!prod) return;

    let pallets = Number(dispatchForm.pallets) || 0;
    let qty = Number(dispatchForm.quantity) || 0;

    if (dispatchForm.inputMode === 'pallets') {
      if (pallets <= 0) {
        alert('Lütfen sevk edilecek palet sayısını giriniz.');
        return;
      }
      qty = pallets * prod.palletStandardQty;
    } else {
      if (qty <= 0) {
        alert('Lütfen sevk edilecek adet miktarını giriniz.');
        return;
      }
      pallets = Math.floor(qty / prod.palletStandardQty);
    }

    const weightKg = Number(dispatchForm.weightKg) || Math.round(
      (pallets * prod.palletWeightKg) + ((qty - (pallets * prod.palletStandardQty)) * prod.unitWeightKg)
    );

    const { updatedItems, newMovement, error } = applyStockMovement(stockItems, {
      productId: prod.id,
      productName: prod.productName,
      type: 'out',
      date: dispatchForm.date || new Date().toISOString().split('T')[0],
      pallets,
      quantity: qty,
      weightKg,
      destination: dispatchForm.destination.trim() || undefined,
      documentNo: dispatchForm.documentNo.trim() || undefined,
      note: dispatchForm.note.trim() || undefined,
      operator: userRole || 'Saha Sorumlusu',
    });

    if (error) {
      alert(`⚠️ ${error}`);
      return;
    }

    onUpdateSettings({
      ...(settings || { furnaces: [], tags: [], shifts: [] }),
      stockItems: updatedItems,
      stockMovements: [newMovement, ...stockMovements],
    });

    setShowDispatchModal(false);
    setQuickDispatchProduct(null);
    setDispatchForm({
      productId: '',
      pallets: 1,
      quantity: 0,
      weightKg: 0,
      date: new Date().toISOString().split('T')[0],
      destination: '',
      documentNo: '',
      note: '',
      inputMode: 'pallets',
    });
  };

  // Stok Girişi Gerçekleştir
  const handleExecuteStockIn = () => {
    if (!stockInForm.productId) {
      alert('Lütfen stok girişi yapılacak ürünü seçiniz.');
      return;
    }

    const prod = stockItems.find(i => i.id === stockInForm.productId);
    if (!prod) return;

    let pallets = Number(stockInForm.pallets) || 0;
    let qty = Number(stockInForm.quantity) || 0;

    if (stockInForm.inputMode === 'pallets') {
      if (pallets <= 0) {
        alert('Lütfen giriş yapılan palet sayısını giriniz.');
        return;
      }
      qty = pallets * prod.palletStandardQty;
    } else {
      if (qty <= 0) {
        alert('Lütfen giriş yapılan adet miktarını giriniz.');
        return;
      }
      pallets = Math.floor(qty / prod.palletStandardQty);
    }

    const weightKg = Number(stockInForm.weightKg) || Math.round(
      (pallets * prod.palletWeightKg) + ((qty - (pallets * prod.palletStandardQty)) * prod.unitWeightKg)
    );

    const { updatedItems, newMovement, error } = applyStockMovement(stockItems, {
      productId: prod.id,
      productName: prod.productName,
      type: 'in',
      date: stockInForm.date || new Date().toISOString().split('T')[0],
      pallets,
      quantity: qty,
      weightKg,
      documentNo: stockInForm.documentNo.trim() || undefined,
      note: stockInForm.note.trim() || undefined,
      operator: userRole || 'Saha Sorumlusu',
    });

    if (error) {
      alert(`⚠️ ${error}`);
      return;
    }

    onUpdateSettings({
      ...(settings || { furnaces: [], tags: [], shifts: [] }),
      stockItems: updatedItems,
      stockMovements: [newMovement, ...stockMovements],
    });

    setShowStockInModal(false);
    setStockInForm({
      productId: '',
      pallets: 1,
      quantity: 0,
      weightKg: 0,
      date: new Date().toISOString().split('T')[0],
      documentNo: '',
      note: '',
      inputMode: 'pallets',
    });
  };

  return (
    <div className="w-full max-w-screen-2xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
      
      {/* ─── HEADER & ACTIONS ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-amber-500" />
            Ürün Stok ve Sevkiyat Takibi
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Üretilen ürünlerin palet ve adet bazlı depo stoğu, palet ağırlıkları ve tarihsel sevkiyat çıkışları.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <button
            onClick={() => setShowDispatchModal(true)}
            className="flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm active:scale-95"
          >
            <Truck className="w-4 h-4" />
            Sevkiyat / Çıkış Yap
          </button>
          <button
            onClick={() => setShowStockInModal(true)}
            className="flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm active:scale-95"
          >
            <ArrowDownLeft className="w-4 h-4" />
            Stok Girişi Ekle
          </button>
          <button
            onClick={() => setShowAddProductModal(true)}
            className="flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Yeni Ürün Tanımla
          </button>
          {stockItems.length > 0 && (
            <button
              onClick={() => setShowClearAllModal(true)}
              className="min-h-[44px] px-3 py-2.5 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 border border-slate-200"
              title="Tüm Stok Listesini Temizle"
            >
              <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-600" />
              <span className="hidden xl:inline">Tümünü Temizle</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── SUMMARY KPI STATS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Toplam Stok Paleti</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">{summaryStats.totalPallets}</span>
            <span className="text-xs font-bold text-slate-500">Palet</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">({summaryStats.totalUnits.toLocaleString('tr-TR')} adet parça)</span>
        </div>

        <div className="p-4 sm:p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Toplam Stok Tonajı</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-mono">{summaryStats.totalWeightTons}</span>
            <span className="text-xs font-bold text-amber-700">Ton</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">({summaryStats.totalWeightKg.toLocaleString('tr-TR')} kg)</span>
        </div>

        <div className="p-4 sm:p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">Kayıtlı Ürün Çeşidi</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 font-mono">{summaryStats.productCount}</span>
            <span className="text-xs font-bold text-blue-700">Model</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Aktif stok takibinde</span>
        </div>

        <div className="p-4 sm:p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Bu Ayki Sevkiyat</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono">{summaryStats.dispatchedPalletsMonth}</span>
            <span className="text-xs font-bold text-emerald-700">Palet</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-mono mt-1 block font-bold">Toplam {summaryStats.dispatchedTonsMonth} Ton sevk edildi</span>
        </div>
      </div>

      {/* ─── TABS & SEARCH BAR ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`min-h-[40px] px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'inventory' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4 text-amber-500" />
            Mevcut Stok (Palet Odaklı)
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`min-h-[40px] px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'movements' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck className="w-4 h-4 text-blue-500" />
            Sevkiyat ve Çıkış Geçmişi ({stockMovements.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={activeTab === 'inventory' ? 'Ürün adı, kod veya konum ara...' : 'Müşteri, irsaliye, ürün ara...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-amber-500 shadow-2xs font-medium"
          />
        </div>
      </div>

      {/* ─── TAB 1: MEVCUT STOK (PALET ODAKLI) ─── */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center bg-white border border-dashed border-slate-200 rounded-2xl space-y-3">
              <Boxes className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Kayıtlı ürün bulunamadı</p>
              <p className="text-xs text-slate-400">Üretimini yaptığınız döküm parçalarını palet ve adet bazında takip etmek için ürün tanımlayın.</p>
              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                <button
                  onClick={() => setShowAddProductModal(true)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 active:scale-95 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  İlk Ürünü Ekle
                </button>
                <button
                  onClick={handleLoadSampleProducts}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 active:scale-95 transition"
                >
                  Örnek Ürünleri Yükle
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredItems.map((item) => {
                const isCritical = (item.currentPallets || 0) <= (item.minStockPallets || 2);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-slate-200/90 hover:border-amber-400/80 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between space-y-4 relative overflow-hidden group"
                  >
                    <div>
                      {/* Üst Başlık & Kod */}
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 group-hover:text-amber-600 transition-colors">
                            {item.productName}
                          </h3>
                          {item.productCode && (
                            <span className="inline-block mt-0.5 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-mono font-bold">
                              {item.productCode}
                            </span>
                          )}
                        </div>
                        {isCritical && (
                          <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-md text-[10px] font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Kritik Stok
                          </span>
                        )}
                      </div>

                      {/* Palet Sayısı (Ön Planda ve Büyük) */}
                      <div className="my-3 p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mevcut Palet</span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-3xl font-black text-slate-900 font-mono">
                              {item.currentPallets}
                            </span>
                            <span className="text-sm font-bold text-slate-500">Palet</span>
                          </div>
                          {item.currentLooseQty > 0 && (
                            <span className="text-[11px] font-bold text-amber-600 mt-0.5 block">
                              + {item.currentLooseQty} adet (açıkta)
                            </span>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Toplam Ağırlık</span>
                          <span className="text-lg font-bold font-mono text-slate-800 mt-0.5 block">
                            {(item.totalWeightKg / 1000).toFixed(2)} Ton
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono block">
                            {item.totalWeightKg.toLocaleString('tr-TR')} kg
                          </span>
                        </div>
                      </div>

                      {/* Palet ve Adet Standartları Bilgi Izgarası */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-slate-100 pt-3">
                        <div className="p-2 bg-slate-50/60 rounded-lg">
                          <span className="text-slate-400 block text-[10px]">1 Palet Ağırlığı:</span>
                          <span className="font-bold text-slate-800 font-mono">{item.palletWeightKg} kg</span>
                        </div>
                        <div className="p-2 bg-slate-50/60 rounded-lg">
                          <span className="text-slate-400 block text-[10px]">1 Paletteki Adet:</span>
                          <span className="font-bold text-slate-800 font-mono">{item.palletStandardQty} adet</span>
                        </div>
                        <div className="p-2 bg-slate-50/60 rounded-lg">
                          <span className="text-slate-400 block text-[10px]">Birim Parça Ağırlığı:</span>
                          <span className="font-bold text-slate-800 font-mono">{item.unitWeightKg} kg</span>
                        </div>
                        <div className="p-2 bg-slate-50/60 rounded-lg">
                          <span className="text-slate-400 block text-[10px]">Toplam Parça Sayısı:</span>
                          <span className="font-bold text-slate-900 font-mono">{item.totalUnits} adet</span>
                        </div>
                      </div>

                      {item.location && (
                        <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1.5 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          Konum: <span className="text-slate-700 font-bold">{item.location}</span>
                        </p>
                      )}
                    </div>

                    {/* Aksiyon Butonları */}
                    <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => {
                          setQuickDispatchProduct(item);
                          setDispatchForm(prev => ({
                            ...prev,
                            productId: item.id,
                            pallets: 1,
                            quantity: item.palletStandardQty,
                            weightKg: item.palletWeightKg,
                          }));
                          setShowDispatchModal(true);
                        }}
                        className="flex-1 min-h-[38px] py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 shadow-2xs"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Sevk Et
                      </button>

                      <button
                        onClick={() => {
                          setStockInForm(prev => ({
                            ...prev,
                            productId: item.id,
                            pallets: 1,
                            quantity: item.palletStandardQty,
                            weightKg: item.palletWeightKg,
                          }));
                          setShowStockInModal(true);
                        }}
                        className="min-h-[38px] py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 active:scale-95"
                        title="Stok Ekle"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Giriş
                      </button>

                      <button
                        onClick={() => {
                          setEditingProduct(item);
                          setEditProductForm({ ...item });
                        }}
                        className="min-h-[38px] p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition border border-slate-200/80 active:scale-95"
                        title="Ürünü Düzenle"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setDeletingProduct(item)}
                        className="min-h-[38px] p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl text-xs font-bold transition border border-slate-200/80 active:scale-95"
                        title="Ürünü Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: SEVKİYAT VE ÇIKIŞ GEÇMİŞİ ─── */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          {/* Hareket Türü Filtresi */}
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
              <p className="text-xs text-slate-400">Ürün çıkışı yaptığınızda tarih, palet ve tonaj bilgileri burada kronolojik olarak arşivlenecektir.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Tarih</th>
                      <th className="py-3.5 px-4">İşlem</th>
                      <th className="py-3.5 px-4">Ürün Adı</th>
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
                            {mov.quantity.toLocaleString('tr-TR')} adet
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

      {/* ─── MODAL: SEVKİYAT / ÇIKIŞ YAP ─── */}
      <AnimatePresence>
        {showDispatchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => { setShowDispatchModal(false); setQuickDispatchProduct(null); }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden z-10 p-5 sm:p-6 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-amber-500" />
                  Ürün Sevkiyatı / Çıkışı
                </h3>
                <button 
                  onClick={() => { setShowDispatchModal(false); setQuickDispatchProduct(null); }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Ürün Seçimi */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Sevk Edilecek Ürün</label>
                  <select
                    value={quickDispatchProduct ? quickDispatchProduct.id : dispatchForm.productId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const selected = stockItems.find(i => i.id === id);
                      setDispatchForm(prev => ({
                        ...prev,
                        productId: id,
                        pallets: 1,
                        quantity: selected ? selected.palletStandardQty : 0,
                        weightKg: selected ? selected.palletWeightKg : 0,
                      }));
                    }}
                    disabled={!!quickDispatchProduct}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-amber-500"
                  >
                    <option value="">Ürün Seçiniz...</option>
                    {stockItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.productName} (Mevcut: {item.currentPallets} Palet, {item.totalUnits} adet)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Giriş Modu: Palet mi Adet mi */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Sevk Edilen Palet Sayısı</label>
                    <input
                      type="number"
                      min="0"
                      value={dispatchForm.pallets || ''}
                      onChange={(e) => {
                        const pal = parseInt(e.target.value) || 0;
                        const sel = stockItems.find(i => i.id === (quickDispatchProduct?.id || dispatchForm.productId));
                        const qty = sel ? pal * sel.palletStandardQty : 0;
                        const wt = sel ? pal * sel.palletWeightKg : 0;
                        setDispatchForm(prev => ({ ...prev, pallets: pal, quantity: qty, weightKg: wt, inputMode: 'pallets' }));
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-sm text-slate-900 outline-none focus:border-amber-500"
                      placeholder="Örn: 2"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Toplam Adet Karşılığı</label>
                    <input
                      type="number"
                      min="0"
                      value={dispatchForm.quantity || ''}
                      onChange={(e) => {
                        const q = parseInt(e.target.value) || 0;
                        const sel = stockItems.find(i => i.id === (quickDispatchProduct?.id || dispatchForm.productId));
                        const pal = sel ? Math.floor(q / sel.palletStandardQty) : 0;
                        const wt = sel ? Math.round(q * sel.unitWeightKg) : 0;
                        setDispatchForm(prev => ({ ...prev, quantity: q, pallets: pal, weightKg: wt, inputMode: 'units' }));
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-sm text-slate-700 outline-none focus:border-amber-500"
                      placeholder="Adet"
                    />
                  </div>
                </div>

                {/* Ağırlık ve Tarih */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Toplam Ağırlık (kg)</label>
                    <input
                      type="number"
                      value={dispatchForm.weightKg || ''}
                      onChange={(e) => setDispatchForm(prev => ({ ...prev, weightKg: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Sevkiyat Tarihi</label>
                    <input
                      type="date"
                      value={dispatchForm.date}
                      onChange={(e) => setDispatchForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Müşteri ve İrsaliye */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Alıcı / Müşteri Firma</label>
                    <input
                      type="text"
                      placeholder="Örn: Brembo Otomotiv"
                      value={dispatchForm.destination}
                      onChange={(e) => setDispatchForm(prev => ({ ...prev, destination: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">İrsaliye / Fatura No</label>
                    <input
                      type="text"
                      placeholder="Örn: IRS-2026-089"
                      value={dispatchForm.documentNo}
                      onChange={(e) => setDispatchForm(prev => ({ ...prev, documentNo: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Sevkiyat Notu / Açıklama</label>
                  <textarea
                    rows={2}
                    placeholder="Tır plaka no, koli/paketleme özel notları..."
                    value={dispatchForm.note}
                    onChange={(e) => setDispatchForm(prev => ({ ...prev, note: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-amber-500 resize-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  onClick={handleExecuteDispatch}
                  className="flex-1 min-h-[44px] py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <CheckCircle className="w-4 h-4" />
                  Sevkiyatı Onayla ve Stoktan Düş
                </button>
                <button
                  onClick={() => { setShowDispatchModal(false); setQuickDispatchProduct(null); }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  İptal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: STOK GİRİŞİ EKLE ─── */}
      <AnimatePresence>
        {showStockInModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowStockInModal(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden z-10 p-5 sm:p-6 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                  Stok Girişi Ekle (Depoya Kabul)
                </h3>
                <button 
                  onClick={() => setShowStockInModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Giriş Yapılacak Ürün</label>
                  <select
                    value={stockInForm.productId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const selected = stockItems.find(i => i.id === id);
                      setStockInForm(prev => ({
                        ...prev,
                        productId: id,
                        pallets: 1,
                        quantity: selected ? selected.palletStandardQty : 0,
                        weightKg: selected ? selected.palletWeightKg : 0,
                      }));
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-emerald-500"
                  >
                    <option value="">Ürün Seçiniz...</option>
                    {stockItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.productName} (Mevcut: {item.currentPallets} Palet)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50/50 border border-emerald-200/60 rounded-xl">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Giriş Yapılan Palet</label>
                    <input
                      type="number"
                      min="0"
                      value={stockInForm.pallets || ''}
                      onChange={(e) => {
                        const pal = parseInt(e.target.value) || 0;
                        const sel = stockItems.find(i => i.id === stockInForm.productId);
                        const qty = sel ? pal * sel.palletStandardQty : 0;
                        const wt = sel ? pal * sel.palletWeightKg : 0;
                        setStockInForm(prev => ({ ...prev, pallets: pal, quantity: qty, weightKg: wt, inputMode: 'pallets' }));
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-sm text-slate-900 outline-none focus:border-emerald-500"
                      placeholder="Örn: 5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Adet Karşılığı</label>
                    <input
                      type="number"
                      min="0"
                      value={stockInForm.quantity || ''}
                      onChange={(e) => {
                        const q = parseInt(e.target.value) || 0;
                        const sel = stockItems.find(i => i.id === stockInForm.productId);
                        const pal = sel ? Math.floor(q / sel.palletStandardQty) : 0;
                        const wt = sel ? Math.round(q * sel.unitWeightKg) : 0;
                        setStockInForm(prev => ({ ...prev, quantity: q, pallets: pal, weightKg: wt, inputMode: 'units' }));
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-sm text-slate-700 outline-none focus:border-emerald-500"
                      placeholder="Adet"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Giriş Tarihi</label>
                    <input
                      type="date"
                      value={stockInForm.date}
                      onChange={(e) => setStockInForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Parti / Üretim No</label>
                    <input
                      type="text"
                      placeholder="Örn: PRT-26-10"
                      value={stockInForm.documentNo}
                      onChange={(e) => setStockInForm(prev => ({ ...prev, documentNo: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Açıklama / Not</label>
                  <textarea
                    rows={2}
                    placeholder="Kalite kontrol onayı, dökümhane paletleme notu..."
                    value={stockInForm.note}
                    onChange={(e) => setStockInForm(prev => ({ ...prev, note: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  onClick={handleExecuteStockIn}
                  className="flex-1 min-h-[44px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  Stok Girişini Kaydet
                </button>
                <button
                  onClick={() => setShowStockInModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  İptal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: YENİ ÜRÜN TANIMLA ─── */}
      <AnimatePresence>
        {showAddProductModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowAddProductModal(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden z-10 p-5 sm:p-6 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-500" />
                  Yeni Ürün Tanımla
                </h3>
                <button 
                  onClick={() => setShowAddProductModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Ürün Adı *</label>
                  <input
                    type="text"
                    placeholder="Örn: Fren Diski (280mm Hava Kanallı)"
                    value={newProductForm.productName}
                    onChange={(e) => setNewProductForm({ ...newProductForm, productName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Ürün / Kalıp Kodu</label>
                    <input
                      type="text"
                      placeholder="Örn: FD-280"
                      value={newProductForm.productCode}
                      onChange={(e) => setNewProductForm({ ...newProductForm, productCode: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Depo Konumu</label>
                    <input
                      type="text"
                      placeholder="Örn: Saha A Raf 01"
                      value={newProductForm.location}
                      onChange={(e) => setNewProductForm({ ...newProductForm, location: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Palet Standartları */}
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2.5">
                  <span className="text-[11px] font-bold text-slate-800 block">Palet Standartları</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">1 Paletteki Adet</label>
                      <input
                        type="number"
                        min="1"
                        value={newProductForm.palletStandardQty}
                        onChange={(e) => setNewProductForm({ ...newProductForm, palletStandardQty: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">1 Palet Ağırlığı (kg)</label>
                      <input
                        type="number"
                        min="1"
                        value={newProductForm.palletWeightKg}
                        onChange={(e) => setNewProductForm({ ...newProductForm, palletWeightKg: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-900 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Başlangıç Stoğu */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Mevcut Palet Sayısı</label>
                    <input
                      type="number"
                      min="0"
                      value={newProductForm.currentPallets}
                      onChange={(e) => setNewProductForm({ ...newProductForm, currentPallets: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Açık / Kalan Adet</label>
                    <input
                      type="number"
                      min="0"
                      value={newProductForm.currentLooseQty}
                      onChange={(e) => setNewProductForm({ ...newProductForm, currentLooseQty: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Açıklama / Malzeme Notu</label>
                  <textarea
                    rows={2}
                    placeholder="GG25 Pik döküm vb."
                    value={newProductForm.description}
                    onChange={(e) => setNewProductForm({ ...newProductForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  onClick={handleCreateProduct}
                  className="flex-1 min-h-[44px] py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  Ürünü Kaydet
                </button>
                <button
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  İptal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: ÜRÜN DÜZENLE ─── */}
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setEditingProduct(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden z-10 p-5 sm:p-6 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-amber-500" />
                  Ürün ve Stok Bilgilerini Düzenle
                </h3>
                <button 
                  onClick={() => setEditingProduct(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Ürün Adı</label>
                  <input
                    type="text"
                    value={editProductForm.productName || ''}
                    onChange={(e) => setEditProductForm({ ...editProductForm, productName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Ürün Kodu</label>
                    <input
                      type="text"
                      value={editProductForm.productCode || ''}
                      onChange={(e) => setEditProductForm({ ...editProductForm, productCode: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Depo Konumu</label>
                    <input
                      type="text"
                      value={editProductForm.location || ''}
                      onChange={(e) => setEditProductForm({ ...editProductForm, location: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none"
                    />
                  </div>
                </div>

                {/* Palet Standartları */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">1 Paletteki Adet</label>
                    <input
                      type="number"
                      value={editProductForm.palletStandardQty || ''}
                      onChange={(e) => setEditProductForm({ ...editProductForm, palletStandardQty: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">1 Palet Ağırlığı (kg)</label>
                    <input
                      type="number"
                      value={editProductForm.palletWeightKg || ''}
                      onChange={(e) => setEditProductForm({ ...editProductForm, palletWeightKg: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-900 outline-none"
                    />
                  </div>
                </div>

                {/* Stok Sayımı Düzeltme */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Mevcut Palet Sayısı</label>
                    <input
                      type="number"
                      value={editProductForm.currentPallets ?? ''}
                      onChange={(e) => setEditProductForm({ ...editProductForm, currentPallets: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Açık / Kalan Adet</label>
                    <input
                      type="number"
                      value={editProductForm.currentLooseQty ?? ''}
                      onChange={(e) => setEditProductForm({ ...editProductForm, currentLooseQty: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  onClick={handleSaveEditProduct}
                  className="flex-1 min-h-[44px] py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  Değişiklikleri Kaydet
                </button>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  İptal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── CONFIRM DELETE PRODUCT DIALOG ─── */}
      <ConfirmDialog
        isOpen={!!deletingProduct}
        title="Ürünü Sil"
        message={`"${deletingProduct?.productName}" ürününü stok takip listesinden kaldırmak istediğinize emin misiniz?`}
        confirmLabel="Evet, Sil"
        cancelLabel="Vazgeç"
        isDanger={true}
        onConfirm={handleConfirmDeleteProduct}
        onCancel={() => setDeletingProduct(null)}
      />

      {/* ─── CONFIRM DELETE MOVEMENT DIALOG ─── */}
      <ConfirmDialog
        isOpen={!!deletingMovement}
        title="Sevkiyat Kaydını Sil"
        message={`"${deletingMovement?.productName}" ürününe ait ${deletingMovement?.pallets} paletlik (${deletingMovement?.weightKg} kg) sevkiyat/hareket kaydını silmek istediğinize emin misiniz?`}
        confirmLabel="Evet, Sil"
        cancelLabel="Vazgeç"
        isDanger={true}
        onConfirm={handleConfirmDeleteMovement}
        onCancel={() => setDeletingMovement(null)}
      />

      {/* ─── CONFIRM CLEAR ALL PRODUCTS DIALOG ─── */}
      <ConfirmDialog
        isOpen={showClearAllModal}
        title="Tüm Stok Kayıtlarını Temizle"
        message="Mevcut tüm stoklu ürün modellerini ve kayıtlarını listeden kaldırmak istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmLabel="Evet, Tümünü Temizle"
        cancelLabel="Vazgeç"
        isDanger={true}
        onConfirm={handleConfirmClearAllProducts}
        onCancel={() => setShowClearAllModal(false)}
      />

    </div>
  );
}
