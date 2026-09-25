'use client';

import React, { useState, useMemo } from 'react';
import { DailyReport, Furnace } from '@/lib/types';
import { 
  Flame, 
  TrendingUp,
  TrendingDown,
  Calendar, 
  Layers, 
  Cpu, 
  ArrowRight, 
  Sparkles,
  Loader2,
  FileText,
  Minus,
  Users,
  AlertTriangle,
  ArrowRightLeft,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCountUp } from '@/hooks/useCountUp';

interface DashboardViewProps {
  reports: DailyReport[];
  furnaces: Furnace[];
  monthlyTargetKg?: number;
  onNavigateToReport: (date: string) => void;
  onNewReport: () => void;
  onNavigateToTab?: (tab: string) => void;
}

/* ─── Sparkline Mini-Grafik Bileşeni ─── */
function Sparkline({ data, color = '#1e293b', height = 32, className = '' }: {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 100;
  const padding = 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const areaPoints = [
    `${padding},${height}`,
    ...points,
    `${width - padding},${height}`,
  ].join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full ${className}`}
      style={{ height }}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`sparkGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#sparkGrad-${color.replace('#', '')})`}
      />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Son nokta vurgusu */}
      {data.length > 0 && (
        <circle
          cx={parseFloat(points[points.length - 1].split(',')[0])}
          cy={parseFloat(points[points.length - 1].split(',')[1])}
          r="2.5"
          fill={color}
          stroke="white"
          strokeWidth="1"
        />
      )}
    </svg>
  );
}

/* ─── Karşılaştırma Badge ─── */
function ComparisonBadge({ current, previous, suffix = '' }: {
  current: number;
  previous: number;
  suffix?: string;
}) {
  if (previous === 0 && current === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-50 text-gray-400 rounded-lg text-[9px] font-bold border border-gray-100">
        <Minus className="w-2.5 h-2.5" />
        Veri yok
      </span>
    );
  }

  const diff = previous > 0 ? ((current - previous) / previous) * 100 : (current > 0 ? 100 : 0);
  const isPositive = diff > 0;
  const isNeutral = diff === 0;

  if (isNeutral) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-50 text-gray-400 rounded-lg text-[9px] font-bold border border-gray-100">
        <Minus className="w-2.5 h-2.5" />
        Değişim yok{suffix}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[9px] font-bold border ${
      isPositive 
        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
        : 'bg-red-50 text-red-500 border-red-100'
    }`}>
      {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {isPositive ? '+' : ''}{diff.toFixed(1)}%{suffix}
    </span>
  );
}

/* ─── Count-Up KPI Değeri ─── */
function AnimatedKpiValue({ value, decimals = 2, suffix = '' }: {
  value: number;
  decimals?: number;
  suffix?: string;
}) {
  const animated = useCountUp({ end: value, duration: 1400, decimals, delay: 200 });
  return (
    <span className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
      {animated.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix && <span className="text-sm font-semibold text-slate-500 ml-1.5">{suffix}</span>}
    </span>
  );
}

/* ─── Stagger Motion Varyantları ─── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 }
  }
};

export default function DashboardView({
  reports,
  furnaces,
  monthlyTargetKg,
  onNavigateToReport,
  onNewReport,
  onNavigateToTab
}: DashboardViewProps) {
  const monthlyTarget = monthlyTargetKg && monthlyTargetKg > 0 ? monthlyTargetKg : 75000;

  // Kritik Astar Ömrü ve Arıza Uyarı Kontrolü
  const criticalFurnaces = useMemo(() => {
    return furnaces.filter(f => {
      if (f.status === 'Arızalı') return true;
      if (f.liningLifeMax && f.liningLifeMax > 0) {
        const pct = Math.round(((f.liningChargeCount || 0) / f.liningLifeMax) * 100);
        return pct >= 80;
      }
      return false;
    });
  }, [furnaces]);

  // 1. Precise local date calculations
  const now = new Date();
  const localYear = now.getFullYear();
  const localMonth = now.getMonth();
  const localDay = now.getDate();
  const todayStr = `${localYear}-${(localMonth + 1).toString().padStart(2, '0')}-${localDay.toString().padStart(2, '0')}`;

  const todayReports = reports.filter(r => r.date === todayStr);

  // Today's production across all shifts
  const todayProductionTonnage = todayReports.reduce((sum, r) => 
    sum + r.productions.reduce((pSum, p) => pSum + (p.tonnage || 0), 0), 0
  );
  const todayProductionQty = todayReports.reduce((sum, r) => 
    sum + r.productions.reduce((pSum, p) => pSum + (p.quantity || 0), 0), 0
  );

  // Monthly stats (current month)
  const thisMonthReports = useMemo(() => reports.filter(r => {
    if (!r.date) return false;
    const parts = r.date.split('-').map(Number);
    if (parts.length < 2) return false;
    const [y, m] = parts;
    return y === localYear && (m - 1) === localMonth;
  }), [reports, localYear, localMonth]);

  const thisMonthTonnage = useMemo(() => thisMonthReports.reduce((sum, r) => 
    sum + r.productions.reduce((pSum, p) => pSum + (p.tonnage || 0), 0), 0
  ), [thisMonthReports]);

  const thisMonthCharges = useMemo(() => thisMonthReports.reduce((sum, r) => 
    sum + r.furnaceRecords.reduce((fSum, f) => fSum + (f.chargeCount || 0), 0), 0
  ), [thisMonthReports]);

  // Previous month stats (for comparison badges)
  const prevMonthReports = useMemo(() => {
    const prevMonth = localMonth === 0 ? 11 : localMonth - 1;
    const prevYear = localMonth === 0 ? localYear - 1 : localYear;
    return reports.filter(r => {
      if (!r.date) return false;
      const parts = r.date.split('-').map(Number);
      if (parts.length < 2) return false;
      const [y, m] = parts;
      return y === prevYear && (m - 1) === prevMonth;
    });
  }, [reports, localYear, localMonth]);

  const prevMonthTonnage = useMemo(() => prevMonthReports.reduce((sum, r) => 
    sum + r.productions.reduce((pSum, p) => pSum + (p.tonnage || 0), 0), 0
  ), [prevMonthReports]);

  const prevMonthCharges = useMemo(() => prevMonthReports.reduce((sum, r) => 
    sum + r.furnaceRecords.reduce((fSum, f) => fSum + (f.chargeCount || 0), 0), 0
  ), [prevMonthReports]);

  // Son girilen rapor (aktif/son vardiya)
  const latestReport = useMemo(() => {
    if (!reports || reports.length === 0) return null;
    return [...reports].sort((a, b) => (b.date + (b.shift || '')).localeCompare(a.date + (a.shift || '')))[0];
  }, [reports]);

  // Bu ayki toplam duruş süresi (dk)
  const thisMonthDowntimeMinutes = useMemo(() => {
    return thisMonthReports.reduce((sum, r) => 
      sum + (r.downtimes?.reduce((dSum, d) => dSum + (Number(d.durationMinutes) || 0), 0) || 0), 0
    );
  }, [thisMonthReports]);

  // Bugünkü toplam duruş süresi (dk)
  const todayDowntimeMinutes = useMemo(() => {
    return todayReports.reduce((sum, r) => 
      sum + (r.downtimes?.reduce((dSum, d) => dSum + (Number(d.durationMinutes) || 0), 0) || 0), 0
    );
  }, [todayReports]);

  // Yesterday comparison
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const yesterdayReports = reports.filter(r => r.date === yesterdayStr);
  const yesterdayTonnage = yesterdayReports.reduce((sum, r) => 
    sum + r.productions.reduce((pSum, p) => pSum + (p.tonnage || 0), 0), 0
  );

  // Total statistics
  const totalTonnage = reports.reduce((sum, r) => 
    sum + r.productions.reduce((pSum, p) => pSum + (p.tonnage || 0), 0), 0
  );

  const totalCharges = reports.reduce((sum, r) => 
    sum + r.furnaceRecords.reduce((fSum, f) => fSum + (f.chargeCount || 0), 0), 0
  );

  // Furnace counts
  const activeFurnacesCount = furnaces.filter(f => f.status === 'Çalışıyor').length;
  const brokenFurnacesCount = furnaces.filter(f => f.status === 'Arızalı').length;
  const maintenanceFurnacesCount = furnaces.filter(f => f.status === 'Bakımda').length;

  // Recent reports (last 5)
  const recentReports = reports.slice(0, 5);

  // Last 7 days production for chart + sparkline data
  const chartData = useMemo(() => {
    const data: { dateLabel: string; tonnage: number; charges: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayReports = reports.filter(r => r.date === dateStr);
      
      const tonnage = dayReports.reduce((sum, r) => 
        sum + r.productions.reduce((pSum, p) => pSum + (p.tonnage || 0), 0), 0
      );

      const charges = dayReports.reduce((sum, r) => 
        sum + r.furnaceRecords.reduce((fSum, f) => fSum + (f.chargeCount || 0), 0), 0
      );

      const day = d.getDate();
      const monthNames = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
      const label = `${day} ${monthNames[d.getMonth()]}`;

      data.push({ dateLabel: label, tonnage, charges });
    }
    return data;
  }, [reports]);

  const sparklineData = useMemo(() => chartData.map(d => d.tonnage), [chartData]);
  const sparklineCharges = useMemo(() => chartData.map(d => d.charges), [chartData]);
  const maxTonnage = Math.max(...chartData.map(d => d.tonnage), 1);



  return (
    <motion.div
      className="space-y-6"
      id="dashboard-view"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      role="main"
      aria-label="Operasyon Kontrol Paneli"
    >
      {/* Header section */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-display">
            Operasyon Kontrol Paneli
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Döküm tesisi günlük üretimi, ocak durumları ve performans göstergeleri.
          </p>
        </div>
        <button
          id="btn-quick-new-report"
          onClick={onNewReport}
          aria-label="Yeni Günlük Rapor Oluştur"
          className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium text-sm transition-all duration-200 shadow-sm flex items-center gap-2 active:scale-95"
        >
          <Calendar className="w-4 h-4" />
          Yeni Günlük Rapor Ekle
        </button>
      </motion.div>

      {/* Kritik Astar & Ocak Bakım Uyarı Bandı */}
      {criticalFurnaces.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold font-display text-amber-900">
                Ocak Astar / Bakım Uyarısı ({criticalFurnaces.length} Ocak Kritik)
              </h4>
              <p className="text-xs text-amber-800/90 mt-0.5">
                {criticalFurnaces.map(f => {
                  const pct = f.liningLifeMax ? Math.round(((f.liningChargeCount || 0) / f.liningLifeMax) * 100) : 0;
                  return `${f.name} (${f.status === 'Arızalı' ? 'Arızalı' : `%${pct} Astar`})`;
                }).join(', ')} durumu dikkat gerektiriyor.
              </p>
            </div>
          </div>
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('furnaces')}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs transition shadow-sm shrink-0 active:scale-95 flex items-center gap-1"
            >
              <span>Ocakları İncele</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </motion.div>
      )}

      {/* Primary Metrics Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        variants={containerVariants}
      >
        {/* Today's Tonnage */}
        <motion.div variants={itemVariants} className="p-5 rounded-2xl bg-white border border-slate-200/60 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 tracking-wider uppercase font-sans">
                  BUGÜNKÜ ÜRETİM
                </span>
                <ComparisonBadge current={todayProductionTonnage} previous={yesterdayTonnage} suffix=" düne" />
              </div>
              <div className="flex items-baseline gap-2">
                <AnimatedKpiValue value={todayProductionTonnage} suffix="kg" />
              </div>
              <p className="text-xs text-slate-500">
                {todayProductionQty} adet mamul döküldü
              </p>
            </div>
          </div>
          {/* Sparkline */}
          <div className="mt-3 -mx-1">
            <Sparkline data={sparklineData} color="#1e293b" height={28} />
          </div>
          <div className="absolute bottom-0 left-0 h-1 bg-slate-900 w-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
        </motion.div>

        {/* Month's Total Tonnage */}
        <motion.div variants={itemVariants} className="p-5 rounded-2xl bg-white border border-slate-200/60 shadow-sm relative overflow-hidden group">
          <div className="space-y-1 w-full">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-slate-400 tracking-wider uppercase">
                BU AY TOPLAM ÜRETİM
              </span>
              <ComparisonBadge current={thisMonthTonnage} previous={prevMonthTonnage} suffix=" önceki ay" />
            </div>
            <div className="flex items-baseline gap-2">
              <AnimatedKpiValue value={thisMonthTonnage} suffix="kg" />
            </div>
            
            {/* Target Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (thisMonthTonnage / monthlyTarget) * 100)}%` }}
                  transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-gray-400 font-mono">
                <span>Hedef: {monthlyTarget.toLocaleString('tr-TR')} kg</span>
                <span className="font-bold text-gray-600">
                  {Math.min(100, Math.round((thisMonthTonnage / monthlyTarget) * 100))}%
                </span>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 h-1 bg-slate-800 w-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
        </motion.div>

        {/* Total stats */}
        <motion.div variants={itemVariants} className="p-5 rounded-2xl bg-white border border-slate-200/60 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 tracking-wider uppercase">
                  BU AY ŞARJ TOPLAMI
                </span>
                <ComparisonBadge current={thisMonthCharges} previous={prevMonthCharges} suffix=" önceki ay" />
              </div>
              <div className="flex items-baseline gap-2">
                <AnimatedKpiValue value={thisMonthCharges} decimals={0} suffix="Şarj" />
              </div>
              <p className="text-xs text-slate-500">
                Toplam ergitilen: {totalTonnage.toLocaleString('tr-TR')} kg sıvı metal ({totalCharges} Şarj)
              </p>
            </div>
          </div>
          {/* Sparkline - charges */}
          <div className="mt-3 -mx-1">
            <Sparkline data={sparklineCharges} color="#6366f1" height={28} />
          </div>
          <div className="absolute bottom-0 left-0 h-1 bg-slate-800 w-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
        </motion.div>

        {/* Furnace Status */}
        <motion.div variants={itemVariants} className="p-5 rounded-2xl bg-white border border-slate-200/60 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-400 tracking-wider uppercase">
                OCAK DURUMLARI
              </span>
              <div className="flex items-baseline gap-2">
                <AnimatedKpiValue value={activeFurnacesCount} decimals={0} />
                <span className="text-lg font-bold text-slate-400 font-mono">/ {furnaces.length}</span>
                <span className="text-sm font-semibold text-emerald-500">Aktif</span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                {brokenFurnacesCount} Arızalı, {maintenanceFurnacesCount} Bakımda
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 text-slate-800 border border-slate-100">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          {/* Furnace mini indicators */}
          <div className="mt-3 flex gap-1">
            {furnaces.map(f => (
              <div 
                key={f.id}
                title={`${f.name}: ${f.status}`}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  f.status === 'Çalışıyor' ? 'bg-emerald-400' :
                  f.status === 'Bakımda' ? 'bg-amber-400' :
                  f.status === 'Arızalı' ? 'bg-red-400' :
                  'bg-gray-300'
                }`}
              />
            ))}
          </div>
          <div className="absolute bottom-0 left-0 h-1 bg-slate-800 w-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
        </motion.div>
      </motion.div>

      {/* Vardiya ve Duruş Operasyon Paneli */}
      {latestReport && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Son Vardiya Ekip ve Çalışma Kartı */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/70 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 font-display">
                    Son Vardiya Ekibi & Çalışma Süresi
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    {latestReport.date} — {latestReport.shift || '1. Vardiya'}
                  </p>
                </div>
              </div>

              {latestReport.personnel?.supervisorName && (
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-100">
                  Amir: {latestReport.personnel.supervisorName}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 bg-gray-50 rounded-xl">
                <span className="text-[10px] text-gray-500 font-semibold block uppercase">Çalışan Personel</span>
                <span className="text-lg font-bold text-blue-900 font-mono">
                  {latestReport.personnel?.totalCount ?? '-'}
                </span>
              </div>
              <div className="p-2.5 bg-gray-50 rounded-xl">
                <span className="text-[10px] text-gray-500 font-semibold block uppercase">İzinli / Eksik</span>
                <span className="text-lg font-bold text-rose-700 font-mono">
                  {latestReport.personnel?.absentCount ?? 0}
                </span>
              </div>
              <div className="p-2.5 bg-gray-50 rounded-xl">
                <span className="text-[10px] text-gray-500 font-semibold block uppercase">Net Üretim Saati</span>
                <span className="text-lg font-bold text-emerald-700 font-mono">
                  {latestReport.shiftHours?.netWorkDurationHours ? `${latestReport.shiftHours.netWorkDurationHours} sa` : '-'}
                </span>
              </div>
            </div>

            {/* Görev Dağılımı Mini Rozetler */}
            {latestReport.personnel?.breakdown && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(latestReport.personnel.breakdown.melters || 0) > 0 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[11px]">
                    🔥 {latestReport.personnel.breakdown.melters} Ocakçı
                  </span>
                )}
                {(latestReport.personnel.breakdown.molders || 0) > 0 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[11px]">
                    🧱 {latestReport.personnel.breakdown.molders} Kalıpçı
                  </span>
                )}
                {(latestReport.personnel.breakdown.casters || 0) > 0 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[11px]">
                    🫗 {latestReport.personnel.breakdown.casters} Dökümcü
                  </span>
                )}
                {(latestReport.personnel.breakdown.craneOperators || 0) > 0 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[11px]">
                    🏗️ {latestReport.personnel.breakdown.craneOperators} Vinççi
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Arıza Duruşları ve Devir Durumu */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/70 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 font-display">
                    Duruş & Vardiya Devir Özeti
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Kayıtlı duruş süreleri ve sonraki vardiyaya notlar
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold font-mono border border-rose-100">
                Bu Ay: {thisMonthDowntimeMinutes} dk ({parseFloat((thisMonthDowntimeMinutes / 60).toFixed(1))} sa)
              </span>
            </div>

            {/* Devir Teslim Notları Vurgusu */}
            <div className="space-y-2 text-xs">
              {latestReport.handoverDetails?.liquidMetalStatus ? (
                <div className="p-2.5 bg-amber-50/60 border border-amber-200/70 rounded-xl text-amber-900">
                  <strong className="block text-[10px] uppercase font-bold text-amber-800">Sıvı Metal / Ocak Durumu:</strong>
                  <span>{latestReport.handoverDetails.liquidMetalStatus}</span>
                </div>
              ) : latestReport.handoverJobs ? (
                <div className="p-2.5 bg-gray-50 border border-gray-200/70 rounded-xl text-gray-700">
                  <strong className="block text-[10px] uppercase font-bold text-gray-500">Devreden İşler:</strong>
                  <span>{latestReport.handoverJobs}</span>
                </div>
              ) : (
                <div className="p-3 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                  Son vardiyada devir uyarısı bulunmuyor.
                </div>
              )}

              {latestReport.handoverDetails?.criticalSafetyNotes && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span><strong>İSG Notu:</strong> {latestReport.handoverDetails.criticalSafetyNotes}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Graphical section */}
      <motion.div variants={itemVariants} className="w-full">
        {/* Custom SVG Line/Bar Chart (7-day production trend) */}
        <div className="w-full p-6 rounded-2xl bg-white border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display">
                Son 7 Günlük Üretim Trendi
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Vardiya bazında dökülen net tonaj ve şarj sayıları.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="inline-block w-3 h-3 bg-slate-900 rounded-sm" />
                Döküm (kg)
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="inline-block w-3 h-1 bg-indigo-500 rounded-full" />
                Şarj Adet
              </span>
            </div>
          </div>

          {/* Bespoke Responsive SVG Chart Container */}
          <div className="h-48 sm:h-64 w-full relative group">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 600 220" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Son 7 günlük üretim grafiği">
              {/* Grid Lines */}
              <line x1="40" y1="20" x2="580" y2="20" stroke="#f1f5f9" strokeDasharray="4 4" />
              <line x1="40" y1="70" x2="580" y2="70" stroke="#f1f5f9" strokeDasharray="4 4" />
              <line x1="40" y1="120" x2="580" y2="120" stroke="#f1f5f9" strokeDasharray="4 4" />
              <line x1="40" y1="170" x2="580" y2="170" stroke="#e2e8f0" />

              {/* Chart bars & lines */}
              {chartData.map((d, index) => {
                const x = 60 + index * 80;
                const barHeight = (d.tonnage / maxTonnage) * 140;
                const barY = 170 - barHeight;
                const chargeY = 170 - Math.min(d.charges * 15, 140);

                return (
                  <g key={index} className="transition-all duration-300">
                    <rect
                      x={x - 16}
                      y={barY}
                      width="32"
                      height={Math.max(barHeight, 3)}
                      rx="4"
                      className="fill-slate-900 hover:fill-slate-800 transition-all duration-200 cursor-pointer"
                    />
                    {d.charges > 0 && (
                      <circle
                        cx={x}
                        cy={chargeY}
                        r="5"
                        className="fill-indigo-500 stroke-white"
                        strokeWidth="1.5"
                      />
                    )}
                    {d.tonnage > 0 && (
                      <text
                        x={x}
                        y={barY - 6}
                        textAnchor="middle"
                        className="text-[10px] font-mono font-bold fill-gray-700"
                      >
                        {d.tonnage.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                      </text>
                    )}
                    <text
                      x={x}
                      y="190"
                      textAnchor="middle"
                      className="text-[10px] font-medium fill-gray-400 font-sans"
                    >
                      {d.dateLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between text-xs text-gray-500">
            <span>Döküm performansı günlük olarak şarj sayılarıyla dengeli ilerlemektedir.</span>
            <span className="font-mono text-[10px]">Ölçek: Otomatik</span>
          </div>
        </div>
      </motion.div>

      {/* Bottom section: Son eklenen raporlar */}
      <motion.div variants={itemVariants} className="p-6 rounded-2xl bg-white border border-slate-200/60 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-500" />
              Son Günlük Raporlar
            </h2>
            <p className="text-xs text-slate-500">
              Tesis tarafından son girilen 5 operasyon kaydı.
            </p>
          </div>
          <button
            onClick={onNewReport}
            aria-label="Hızlı rapor ekle"
            className="text-xs text-slate-900 hover:text-slate-700 flex items-center gap-1 font-extrabold shrink-0 whitespace-nowrap"
          >
            Hızlı Ekle <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentReports.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            Henüz rapor eklenmemiş. &quot;Yeni Günlük Rapor&quot; sekmesinden ilk kaydı girebilirsiniz.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentReports.map((report, idx) => {
              const rTonnage = report.productions.reduce((sum, p) => sum + (p.tonnage || 0), 0);
              const totalQty = report.productions.reduce((sum, p) => sum + (p.quantity || 0), 0);
              const rCharges = report.furnaceRecords.reduce((sum, f) => sum + (f.chargeCount || 0), 0);
              const dateObj = new Date(report.date);
              const dateStr = dateObj.toLocaleDateString('tr-TR', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric',
                weekday: 'short'
              });

              return (
                <motion.div 
                  key={report.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => onNavigateToReport(report.date)}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 px-2 rounded-xl transition-all duration-150 cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={`${dateStr} tarihli raporu düzenle`}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigateToReport(report.date); }}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold text-gray-900 text-sm">
                        {dateStr}
                      </span>
                      {report.shift && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[10px] font-medium whitespace-nowrap shrink-0">
                          {report.shift}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {report.description || 'Açıklama girilmemiş.'}
                    </p>
                  </div>

                  <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-xs font-mono shrink-0">
                    <div className="text-left sm:text-right">
                      <p className="text-gray-400 text-[10px]">DÖKÜM</p>
                      <p className="font-extrabold text-slate-900">{rTonnage.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</p>
                    </div>
                    <div className="text-left sm:text-right border-l border-gray-100 pl-4">
                      <p className="text-gray-400 text-[10px]">ŞARJ</p>
                      <p className="font-extrabold text-indigo-600">{rCharges}</p>
                    </div>
                    <div className="text-left sm:text-right border-l border-gray-100 pl-4">
                      <p className="text-gray-400 text-[10px]">ADET</p>
                      <p className="font-extrabold text-gray-700">{totalQty}</p>
                    </div>
                    {report.tags.length > 0 && (
                      <div className="text-right border-l border-gray-100 pl-4">
                        <div className="flex flex-wrap gap-1">
                          {report.tags.slice(0, 2).map((t, tidx) => (
                            <span
                              key={tidx}
                              className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-medium border border-slate-200"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
