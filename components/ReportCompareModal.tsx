'use client';

import React from 'react';
import { DailyReport } from '@/lib/types';
import { 
  X, Flame, Calendar, Layers, Clock, TrendingUp, TrendingDown,
  Minus, AlertCircle, Wrench, CheckCircle, Info, FileText, Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';

interface ReportCompareModalProps {
  reportA: DailyReport;
  reportB: DailyReport;
  onClose: () => void;
}

export default function ReportCompareModal({ reportA, reportB, onClose }: ReportCompareModalProps) {
  // Sort chronologically (earlier report is A, later is B)
  const [earlier, later] = [reportA, reportB].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Tonnage calculations
  const tonA = earlier.productions.reduce((sum, p) => sum + (p.tonnage || 0), 0);
  const tonB = later.productions.reduce((sum, p) => sum + (p.tonnage || 0), 0);
  const tonDiff = tonB - tonA;

  // Qty calculations
  const qtyA = earlier.productions.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const qtyB = later.productions.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const qtyDiff = qtyB - qtyA;

  // Furnace Charges
  const chargesA = earlier.furnaceRecords.reduce((sum, f) => sum + (f.chargeCount || 0), 0);
  const chargesB = later.furnaceRecords.reduce((sum, f) => sum + (f.chargeCount || 0), 0);
  const chargesDiff = chargesB - chargesA;

  // Timeline events count
  const eventsA = earlier.timeline.length;
  const eventsB = later.timeline.length;

  const renderDiffBadge = (diff: number, unit: string = '') => {
    if (diff > 0) {
      return (
        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold border border-emerald-100 flex items-center gap-0.5 inline-flex">
          <TrendingUp className="w-3 h-3" />
          +{diff.toFixed(2)} {unit}
        </span>
      );
    }
    if (diff < 0) {
      return (
        <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold border border-red-100 flex items-center gap-0.5 inline-flex">
          <TrendingDown className="w-3 h-3" />
          {diff.toFixed(2)} {unit}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-gray-50 text-gray-400 rounded-lg text-[10px] font-bold flex items-center gap-0.5 inline-flex">
        <Minus className="w-3 h-3" />
        Fark Yok
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 pb-24 sm:pb-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-5xl max-h-[82vh] sm:max-h-[88vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white shadow-md shadow-amber-500/20 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-bold text-gray-900 font-display">
                Karşılaştırmalı Rapor Analizi
              </h2>
              <p className="text-[10px] sm:text-xs text-gray-400">
                {earlier.date} ile {later.date} tarihlerinin yan yana karşılaştırması.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 custom-scrollbar">
          
          {/* Key Differences Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Tonnage Diff */}
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Üretim Ağırlığı Farkı</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-mono text-gray-500">{tonA.toFixed(2)} kg → {tonB.toFixed(2)} kg</span>
                {renderDiffBadge(tonDiff, 'kg')}
              </div>
            </div>

            {/* Qty Diff */}
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Dökülen Adet Farkı</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-mono text-gray-500">{qtyA} Adet → {qtyB} Adet</span>
                {renderDiffBadge(qtyDiff, 'Adet')}
              </div>
            </div>

            {/* Charges Diff */}
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Şarj Sayısı Farkı</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-mono text-gray-500">{chargesA} Şarj → {chargesB} Şarj</span>
                {renderDiffBadge(chargesDiff, 'Şarj')}
              </div>
            </div>
          </div>

          {/* Side by Side Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* LEFT COLUMN: EARLIER REPORT */}
            <div className="space-y-4 p-5 bg-gray-50/50 border border-gray-100 rounded-2xl">
              <div className="flex justify-between items-center pb-3 border-b border-gray-200 ">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-sm text-gray-900 font-mono">{earlier.date}</span>
                </div>
                <span className="text-xs font-semibold text-gray-500 font-mono">
                  {earlier.shiftHours?.startTime && earlier.shiftHours?.endTime
                    ? `${earlier.shiftHours.startTime} - ${earlier.shiftHours.endTime}`
                    : (earlier.shift || '-')}
                </span>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {earlier.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold">
                    #{t}
                  </span>
                ))}
              </div>

              {/* Productions List */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Üretim Kalemleri</h4>
                {earlier.productions.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Üretim kaydı yok.</p>
                ) : (
                  earlier.productions.map((p, idx) => (
                    <div key={idx} className="p-2.5 bg-white rounded-xl text-xs flex justify-between items-center border border-gray-100 ">
                      <div>
                        <span className="font-bold text-gray-800 block">{p.productName}</span>
                        {p.moldType && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                            {p.moldType}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-gray-500 font-bold">{p.tonnage.toFixed(2)} kg / {p.quantity} Adet</span>
                    </div>
                  ))
                )}
              </div>

              {/* Furnace Records */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ocak Verileri</h4>
                {earlier.furnaceRecords.map((f, idx) => (
                  <div key={idx} className="p-2.5 bg-white rounded-xl text-xs space-y-1 border border-gray-100 ">
                    <div className="flex justify-between font-bold text-gray-800 ">
                      <span>{f.name}</span>
                      <span className="font-mono text-amber-600 ">{f.chargeCount} Şarj</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Eritilen: {f.meltedAmount} kg</span>
                      <span>Kapasite: {f.capacity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN: LATER REPORT */}
            <div className="space-y-4 p-5 bg-gray-50/50 border border-gray-100 rounded-2xl">
              <div className="flex justify-between items-center pb-3 border-b border-gray-200 ">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  <span className="font-bold text-sm text-gray-900 font-mono">{later.date}</span>
                </div>
                <span className="text-xs font-semibold text-gray-500 font-mono">
                  {later.shiftHours?.startTime && later.shiftHours?.endTime
                    ? `${later.shiftHours.startTime} - ${later.shiftHours.endTime}`
                    : (later.shift || '-')}
                </span>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {later.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold">
                    #{t}
                  </span>
                ))}
              </div>

              {/* Productions List */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Üretim Kalemleri</h4>
                {later.productions.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Üretim kaydı yok.</p>
                ) : (
                  later.productions.map((p, idx) => (
                    <div key={idx} className="p-2.5 bg-white rounded-xl text-xs flex justify-between items-center border border-gray-100 ">
                      <div>
                        <span className="font-bold text-gray-800 block">{p.productName}</span>
                        {p.moldType && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                            {p.moldType}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-gray-500 font-bold">{p.tonnage.toFixed(2)} kg / {p.quantity} Adet</span>
                    </div>
                  ))
                )}
              </div>

              {/* Furnace Records */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ocak Verileri</h4>
                {later.furnaceRecords.map((f, idx) => (
                  <div key={idx} className="p-2.5 bg-white rounded-xl text-xs space-y-1 border border-gray-100 ">
                    <div className="flex justify-between font-bold text-gray-800 ">
                      <span>{f.name}</span>
                      <span className="font-mono text-emerald-600 ">{f.chargeCount} Şarj</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Eritilen: {f.meltedAmount} kg</span>
                      <span>Kapasite: {f.capacity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
