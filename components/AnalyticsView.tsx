'use client';

import React, { useState, useMemo } from 'react';
import { DailyReport, Furnace, AppSettings } from '@/lib/types';
import {
  BarChart4,
  TrendingUp,
  Calendar,
  Layers,
  Flame,
  Activity,
  Target,
  Gauge,
  ChevronLeft,
  ChevronRight,
  Info,
  AlertTriangle,
  Wrench
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import { motion } from 'motion/react';

interface AnalyticsViewProps {
  reports: DailyReport[];
  settings: AppSettings | null;
}

type Period = 'weekly' | 'monthly' | 'yearly';

/* ─── Stagger Motion ─── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

/* ─── Heatmap Takvim ─── */
// Tek renk skalası (Amber/Döküm Teması)
const heatmapTheme = {
  bgEmpty: '#f1f5f9',      // Üretim yok
  light: '#fef3c7',        // Ortalama altı
  medium: '#fbbf24',       // Ortalama
  dark: '#d97706',         // Ortalama üstü
  textLight: '#92400e',    // Ortalama altı yazı rengi
  textMedium: '#78350f',   // Ortalama yazı rengi
  textDark: '#ffffff',     // Ortalama üstü yazı rengi
  labelColor: '#b45309'    // Ay etiket rengi
};

function ProductionHeatmap({ reports, year }: { reports: DailyReport[]; year: number }) {
  // Günlük döküm tonajı eşleştirmesi
  const dayData = useMemo(() => {
    const map = new Map<string, number>();
    reports.forEach(r => {
      const tonnage = r.productions.reduce((s, p) => s + (p.tonnage || 0), 0);
      map.set(r.date, tonnage);
    });
    return map;
  }, [reports]);

  // Yılın tüm günlerini haftalık dikey sütunlar halinde oluştur
  const weeks = useMemo(() => {
    const result: { date: string; tonnage: number; day: number; month: number }[][] = [];
    const start = new Date(year, 0, 1);
    
    // Pazartesi'den başlamak üzere (0 = Pzt, 6 = Pzr)
    const startDay = (start.getDay() + 6) % 7; 
    let currentWeek: { date: string; tonnage: number; day: number; month: number }[] = [];
    
    for (let i = 0; i < startDay; i++) {
      currentWeek.push({ date: '', tonnage: -1, day: -1, month: -1 });
    }
    
    const d = new Date(year, 0, 1);
    while (d.getFullYear() === year) {
      const dateStr = d.toISOString().split('T')[0];
      currentWeek.push({
        date: dateStr,
        tonnage: dayData.get(dateStr) || 0,
        day: d.getDate(),
        month: d.getMonth(),
      });
      
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
      
      d.setDate(d.getDate() + 1);
    }
    
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', tonnage: -1, day: -1, month: -1 });
      }
      result.push(currentWeek);
    }
    
    return result;
  }, [year, dayData]);

  // Üretim olan günlerin genel ortalama döküm tonajını hesapla
  const avgTonnage = useMemo(() => {
    let sum = 0;
    let count = 0;
    dayData.forEach(v => {
      if (v > 0) {
        sum += v;
        count++;
      }
    });
    return count > 0 ? sum / count : 1;
  }, [dayData]);

  // Ay geçişlerindeki dikey boşluklardan kaynaklanan yatay piksel kaymalarını hesapla
  const weekOffsets = useMemo(() => {
    const offsets: number[] = [];
    let currentOffset = 0;
    weeks.forEach((week, wi) => {
      const hasMonthTransition = wi > 0 && week.some(day => day.day === 1);
      if (hasMonthTransition) {
        currentOffset += 6; // Ay geçişinde 6px dikey boşluk eklenir
      }
      offsets.push(currentOffset);
    });
    return offsets;
  }, [weeks]);

  const monthNames = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  const dayNames = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Pzr"];

  // Döküm tonajına göre hücre rengi (Ortalamaya göre)
  const getCellBg = (tonnage: number) => {
    if (tonnage === 0) return heatmapTheme.bgEmpty;
    if (tonnage < avgTonnage * 0.8) return heatmapTheme.light;
    if (tonnage <= avgTonnage * 1.2) return heatmapTheme.medium;
    return heatmapTheme.dark;
  };

  const getCellTextColor = (tonnage: number) => {
    if (tonnage === 0) return 'text-slate-400';
    if (tonnage < avgTonnage * 0.8) return 'text-amber-800';
    if (tonnage <= avgTonnage * 1.2) return 'text-amber-950';
    return 'text-white';
  };

  // Ay etiketlerini haftalara göre konumlandır
  const monthLabels = useMemo(() => {
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      week.forEach(day => {
        if (day.month >= 0 && day.month !== lastMonth && day.day <= 7) {
          labels.push({ label: monthNames[day.month], weekIndex: wi });
          lastMonth = day.month;
        }
      });
    });
    return labels;
  }, [weeks]);

  return (
    <div className="w-full overflow-x-auto custom-scrollbar" role="img" aria-label={`${year} yılı döküm yoğunluk haritası`}>
      <div className="w-max mx-auto min-w-[940px] py-3 pr-2">
        {/* Ay Etiketleri Satırı (Sol marj gün kolonuna eşit: 38px, ek kaymalar hesaba katıldı) */}
        <div className="relative ml-[38px] flex text-[9px] text-gray-400 font-mono mb-2 h-4">
          {monthLabels.map((ml, i) => (
            <span 
              key={i} 
              className="absolute text-[9px] font-bold"
              style={{ 
                left: `${ml.weekIndex * 18 + weekOffsets[ml.weekIndex]}px`,
                color: heatmapTheme.labelColor
              }}
            >
              {ml.label}
            </span>
          ))}
        </div>

        {/* Tablo Şeridi (Sol gün adları + Sağ haftalık grid) */}
        <div className="flex gap-[2px]">
          {/* Dikey Gün İsimleri */}
          <div className="flex flex-col gap-[2px] mr-1.5 justify-between py-[1px]">
            {dayNames.map((name, i) => (
              <div key={i} className="w-8 h-[16px] flex items-center justify-end pr-1 text-[9px] text-gray-400 font-mono">
                {name}
              </div>
            ))}
          </div>

          {/* Haftalık Sütunlar (Grid) */}
          <div className="flex gap-[2px]">
            {weeks.map((week, wi) => {
              const isNewMonth = wi > 0 && week.some(d => d.day === 1);
              return (
                <div 
                  key={wi} 
                  className="flex flex-col gap-[2px]"
                  style={{ marginLeft: isNewMonth ? '6px' : '0px' }}
                >
                  {week.map((day, di) => {
                    if (day.month === -1) {
                      return <div key={di} className="w-[16px] h-[16px] bg-transparent" />;
                    }

                    const cellBg = getCellBg(day.tonnage);
                    const cellTextClass = getCellTextColor(day.tonnage);
                    const isFirstDayOfMonth = day.day === 1;

                    return (
                      <div
                        key={di}
                        style={{ backgroundColor: cellBg }}
                        className={`w-[16px] h-[16px] rounded-[2px] flex items-center justify-center text-[8px] font-mono font-bold transition-all duration-150 hover:ring-1 hover:ring-slate-400 cursor-default ${cellTextClass} ${
                          isFirstDayOfMonth ? 'border border-amber-600/40 bg-amber-50/50' : ''
                        }`}
                        title={day.tonnage > 0 
                          ? `${day.day} ${monthNames[day.month]} ${year}: ${day.tonnage.toLocaleString('tr-TR')} kg döküm (${day.tonnage > avgTonnage * 1.2 ? 'Ortalama Üstü' : day.tonnage < avgTonnage * 0.8 ? 'Ortalama Altı' : 'Ortalama'})`
                          : `${day.day} ${monthNames[day.month]} ${year}: Üretim kaydı yok`
                        }
                      >
                        {day.day}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-end gap-2.5 text-[9px] text-gray-400 font-mono mr-2">
          <span className="text-[10px] text-slate-500 font-bold mr-2">Genel Ortalama: {Math.round(avgTonnage).toLocaleString('tr-TR')} kg</span>
          <span>Üretim Yok</span>
          <div className="w-3.5 h-3.5 bg-[#f1f5f9] rounded-[2px] border border-slate-100" />
          <span>Ortalama Altı</span>
          <div className="w-3.5 h-3.5 bg-amber-50 rounded-[2px] border border-amber-100" />
          <span>Ortalama</span>
          <div className="w-3.5 h-3.5 bg-amber-200 rounded-[2px] border border-amber-300" />
          <span>Ortalama Üstü</span>
          <div className="w-3.5 h-3.5 bg-amber-600 rounded-[2px]" />
        </div>
      </div>
    </div>
  );
}

/* ─── Ana Bileşen ─── */
export default function AnalyticsView({ reports, settings }: AnalyticsViewProps) {
  const [period, setPeriod] = useState<Period>('monthly');
  const [heatmapYear, setHeatmapYear] = useState(new Date().getFullYear());
  const [furnacePeriod, setFurnacePeriod] = useState<'all' | 'thisMonth' | '30days' | '7days'>('all');
  const furnaces = settings?.furnaces || [];

  const now = new Date();
  const localYear = now.getFullYear();
  const localMonth = now.getMonth();

  // ─── Dönem bazlı veriler ─── 
  const periodData = useMemo(() => {
    if (period === 'weekly') {
      // Son 12 hafta
      const weeks: { label: string; tonnage: number; charges: number; days: number }[] = [];
      for (let w = 11; w >= 0; w--) {
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - (w * 7));
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);

        const weekReports = reports.filter(r => {
          const d = new Date(r.date);
          return d >= weekStart && d <= weekEnd;
        });

        const tonnage = weekReports.reduce((s, r) => s + r.productions.reduce((ps, p) => ps + (p.tonnage || 0), 0), 0);
        const charges = weekReports.reduce((s, r) => s + r.furnaceRecords.reduce((fs, f) => fs + (f.chargeCount || 0), 0), 0);

        const startLabel = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
        const endLabel = `${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`;

        weeks.push({ label: `${startLabel}-${endLabel}`, tonnage, charges, days: weekReports.length });
      }
      return weeks;
    }

    if (period === 'monthly') {
      // Son 12 ay
      const months: { label: string; tonnage: number; charges: number; days: number }[] = [];
      const monthNames = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
      for (let m = 11; m >= 0; m--) {
        const mIdx = (localMonth - m + 12) % 12;
        const mYear = localMonth - m < 0 ? localYear - 1 : localYear;

        const monthReports = reports.filter(r => {
          const parts = r.date.split('-').map(Number);
          return parts[0] === mYear && (parts[1] - 1) === mIdx;
        });

        const tonnage = monthReports.reduce((s, r) => s + r.productions.reduce((ps, p) => ps + (p.tonnage || 0), 0), 0);
        const charges = monthReports.reduce((s, r) => s + r.furnaceRecords.reduce((fs, f) => fs + (f.chargeCount || 0), 0), 0);

        months.push({ label: `${monthNames[mIdx]} ${mYear}`, tonnage, charges, days: monthReports.length });
      }
      return months;
    }

    // Yearly — son 5 yıl
    const years: { label: string; tonnage: number; charges: number; days: number }[] = [];
    for (let y = localYear - 4; y <= localYear; y++) {
      const yearReports = reports.filter(r => r.date.startsWith(`${y}-`));
      const tonnage = yearReports.reduce((s, r) => s + r.productions.reduce((ps, p) => ps + (p.tonnage || 0), 0), 0);
      const charges = yearReports.reduce((s, r) => s + r.furnaceRecords.reduce((fs, f) => fs + (f.chargeCount || 0), 0), 0);
      years.push({ label: `${y}`, tonnage, charges, days: yearReports.length });
    }
    return years;
  }, [reports, period, localYear, localMonth]);

  // ─── Trend Tahmini ─── 
  const trendData = useMemo(() => {
    // Son 30 günün verisinden lineer regresyon ile ay sonu tahmini
    const last30: { x: number; y: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayReports = reports.filter(rep => rep.date === dateStr);
      const tonnage = dayReports.reduce((s, rep) => s + rep.productions.reduce((ps, p) => ps + (p.tonnage || 0), 0), 0);
      last30.push({ x: 30 - i, y: tonnage });
    }

    // Sadece üretim olan günleri lineer regresyona al
    const validDays = last30.filter(d => d.y > 0);
    if (validDays.length < 3) return { predicted: 0, daily: 0, data: last30 };

    const n = validDays.length;
    const sumX = validDays.reduce((s, d) => s + d.x, 0);
    const sumY = validDays.reduce((s, d) => s + d.y, 0);
    const sumXY = validDays.reduce((s, d) => s + d.x * d.y, 0);
    const sumX2 = validDays.reduce((s, d) => s + d.x * d.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Kalan gün sayısı ile ay sonu tahmini
    const daysInMonth = new Date(localYear, localMonth + 1, 0).getDate();
    const daysPassed = now.getDate();
    const remainingDays = daysInMonth - daysPassed;

    // Bu aydaki mevcut toplam
    const currentMonthTotal = reports
      .filter(r => {
        const parts = r.date.split('-').map(Number);
        return parts[0] === localYear && (parts[1] - 1) === localMonth;
      })
      .reduce((s, r) => s + r.productions.reduce((ps, p) => ps + (p.tonnage || 0), 0), 0);

    const dailyAvg = sumY / n;
    const predicted = currentMonthTotal + (dailyAvg * remainingDays);

    return { predicted, daily: dailyAvg, data: last30 };
  }, [reports, localYear, localMonth, now]);

  // ─── Ocak bazlı performans (Seçilen dönem ve tüm verilerle tam tutarlı & dinamik) ─── 
  const filteredFurnaceReports = useMemo(() => {
    if (furnacePeriod === 'all') return reports;
    if (furnacePeriod === 'thisMonth') {
      return reports.filter(r => {
        const parts = r.date.split('-').map(Number);
        return parts[0] === localYear && (parts[1] - 1) === localMonth;
      });
    }
    if (furnacePeriod === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return reports.filter(r => new Date(r.date) >= d);
    }
    if (furnacePeriod === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return reports.filter(r => new Date(r.date) >= d);
    }
    return reports;
  }, [reports, furnacePeriod, localYear, localMonth]);

  const furnacePerformance = useMemo(() => {
    const furnaceMap = new Map<string, { id: string; name: string; status: string }>();
    furnaces.forEach(f => furnaceMap.set(f.id, { id: f.id, name: f.name, status: f.status }));
    reports.forEach(r => {
      (r.furnaceRecords || []).forEach(fr => {
        if (!furnaceMap.has(fr.furnaceId)) {
          furnaceMap.set(fr.furnaceId, { id: fr.furnaceId, name: fr.name || fr.furnaceId, status: fr.status || 'Çalışıyor' });
        }
      });
    });

    return Array.from(furnaceMap.values()).map(f => {
      const records = filteredFurnaceReports.flatMap(r => (r.furnaceRecords || []).filter(fr => fr.furnaceId === f.id));
      const totalMelted = records.reduce((s, r) => s + (r.meltedAmount || 0), 0);
      const totalCharges = records.reduce((s, r) => s + (r.chargeCount || 0), 0);
      const totalHours = records.reduce((s, r) => s + (r.workDuration || 0), 0);
      const efficiency = totalCharges > 0 ? totalMelted / totalCharges : 0; // kg / şarj
      const productivity = totalHours > 0 ? totalMelted / totalHours : 0; // kg / saat

      return {
        name: f.name,
        status: f.status,
        totalMelted,
        totalCharges,
        totalHours,
        efficiency: parseFloat(efficiency.toFixed(2)),
        productivity: parseFloat(productivity.toFixed(1)),
      };
    });
  }, [reports, filteredFurnaceReports, furnaces]);

  // ─── Verimlilik Skoru (0-100) ─── 
  const efficiencyScore = useMemo(() => {
    if (furnacePerformance.length === 0) return 0;
    const activeFurnaces = furnacePerformance.filter(f => f.totalCharges > 0);
    if (activeFurnaces.length === 0) return 0;

    // Normalize edilen faktörler
    const maxEfficiency = Math.max(...activeFurnaces.map(f => f.efficiency), 1);
    const maxProductivity = Math.max(...activeFurnaces.map(f => f.productivity), 1);

    const avgEfficiency = activeFurnaces.reduce((s, f) => s + f.efficiency, 0) / activeFurnaces.length;
    const avgProductivity = activeFurnaces.reduce((s, f) => s + f.productivity, 0) / activeFurnaces.length;

    // Ocak çalışma oranı
    const activeRatio = furnaces.filter(f => f.status === 'Çalışıyor').length / Math.max(furnaces.length, 1);

    // Hedef ilerlemesi
    const monthlyTarget = settings?.monthlyTargetKg || 75000;
    const currentMonth = reports
      .filter(r => {
        const parts = r.date.split('-').map(Number);
        return parts[0] === localYear && (parts[1] - 1) === localMonth;
      })
      .reduce((s, r) => s + r.productions.reduce((ps, p) => ps + (p.tonnage || 0), 0), 0);
    const targetProgress = Math.min(currentMonth / monthlyTarget, 1);

    // Ağırlıklı skor
    const score = (
      (avgEfficiency / maxEfficiency) * 25 +
      (avgProductivity / maxProductivity) * 25 +
      activeRatio * 25 +
      targetProgress * 25
    );

    return Math.round(Math.min(score, 100));
  }, [furnacePerformance, furnaces, reports, settings, localYear, localMonth]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Mükemmel';
    if (score >= 60) return 'İyi';
    if (score >= 40) return 'Orta';
    return 'Düşük';
  };

  const monthlyTarget = settings?.monthlyTargetKg || 75000;

  // Duruş ve Arıza Analitiği (Downtime Analysis)
  const downtimeAnalytics = useMemo(() => {
    const categoryMap: { [cat: string]: { category: string; totalMinutes: number; count: number } } = {};
    let totalMinutes = 0;
    let totalCount = 0;

    reports.forEach(r => {
      (r.downtimes || []).forEach(d => {
        const cat = d.category || 'Diğer';
        const mins = Number(d.durationMinutes) || 0;
        totalMinutes += mins;
        totalCount += 1;
        if (!categoryMap[cat]) {
          categoryMap[cat] = { category: cat, totalMinutes: 0, count: 0 };
        }
        categoryMap[cat].totalMinutes += mins;
        categoryMap[cat].count += 1;
      });
    });

    const list = Object.values(categoryMap).sort((a, b) => b.totalMinutes - a.totalMinutes);
    return {
      list,
      totalMinutes,
      totalCount,
      avgMinutes: totalCount > 0 ? Math.round(totalMinutes / totalCount) : 0,
    };
  }, [reports]);

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      role="main"
      aria-label="Gelişmiş Analitik Sayfası"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-display flex items-center gap-2">
            <BarChart4 className="w-6 h-6 text-amber-500" />
            Gelişmiş Analitik
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Üretim trendleri, ocak performansı, verimlilik skoru ve tahmin analitiği.
          </p>
        </div>

        {/* Dönem Seçici */}
        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5" role="tablist" aria-label="Dönem seçici">
          {([
            { key: 'weekly', label: 'Haftalık' },
            { key: 'monthly', label: 'Aylık' },
            { key: 'yearly', label: 'Yıllık' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={period === key}
              onClick={() => setPeriod(key)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${period === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Top Row: Verimlilik Skoru + Trend Tahmini */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Verimlilik Skoru */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/60 shadow-sm flex flex-col items-center justify-center text-center">
          <span className="text-xs font-medium text-slate-400 tracking-wider uppercase mb-4">
            GENEL VERİMLİLİK SKORU
          </span>
          <div className="relative w-36 h-36 mb-3">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#f1f5f9" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="52" fill="none"
                stroke={efficiencyScore >= 80 ? '#10b981' : efficiencyScore >= 60 ? '#f59e0b' : efficiencyScore >= 40 ? '#f97316' : '#ef4444'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(efficiencyScore / 100) * 326.7} 326.7`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold font-mono ${getScoreColor(efficiencyScore)}`}>
                {efficiencyScore}
              </span>
              <span className="text-[10px] text-gray-400 font-bold uppercase">{getScoreLabel(efficiencyScore)}</span>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 max-w-[200px]">
            Yakıt verimi, saatlik üretkenlik, ocak çalışma oranı ve hedef ilerlemesi bazında hesaplanır.
          </p>
        </div>

        {/* Trend Tahmini */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200/60 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-500" />
                Ay Sonu Üretim Tahmini
              </h2>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Son 30 günün üretim trendine dayalı lineer tahmin.
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400">Tahmini Ay Sonu</p>
              <p className="text-xl font-bold text-slate-900 font-mono">
                {trendData.predicted.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} kg
              </p>
              <p className={`text-[10px] font-bold ${trendData.predicted >= monthlyTarget ? 'text-emerald-500' : 'text-red-500'}`}>
                {trendData.predicted >= monthlyTarget ? '✓ Hedef Aşılacak' : '✗ Hedef Altı Kalabilir'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-3 bg-gray-50 rounded-xl text-center">
              <p className="text-[10px] text-gray-400 font-medium">Günlük Ort.</p>
              <p className="text-sm font-bold text-slate-900 font-mono">
                {trendData.daily.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} kg
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl text-center">
              <p className="text-[10px] text-gray-400 font-medium">Aylık Hedef</p>
              <p className="text-sm font-bold text-slate-900 font-mono">
                {monthlyTarget.toLocaleString('tr-TR')} kg
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl text-center">
              <p className="text-[10px] text-gray-400 font-medium">Hedefe Kalan</p>
              <p className="text-sm font-bold text-slate-900 font-mono">
                {Math.max(0, monthlyTarget - (reports
                  .filter(r => {
                    const parts = r.date.split('-').map(Number);
                    return parts[0] === localYear && (parts[1] - 1) === localMonth;
                  })
                  .reduce((s, r) => s + r.productions.reduce((ps, p) => ps + (p.tonnage || 0), 0), 0)
                )).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} kg
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (trendData.predicted / monthlyTarget) * 100)}%` }}
                transition={{ duration: 1.5, delay: 0.3, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-gray-400 font-mono">
              <span>%0</span>
              <span className="font-bold text-gray-600">
                Tahmini: %{Math.min(100, Math.round((trendData.predicted / monthlyTarget) * 100))}
              </span>
              <span>%100</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Dönem Bazlı Üretim Grafiği */}
      <motion.div variants={itemVariants} className="p-6 rounded-2xl bg-white border border-slate-200/60 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-display">
              {period === 'weekly' ? 'Haftalık' : period === 'monthly' ? 'Aylık' : 'Yıllık'} Üretim Trendi
            </h2>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Üretim tonnajı ve şarj sayıları karşılaştırmalı grafik.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="inline-block w-3 h-3 bg-amber-500 rounded-sm" />
              Üretim (kg)
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="inline-block w-3 h-1 bg-indigo-500 rounded-full" />
              Şarj
            </span>
          </div>
        </div>

        <div className="h-72" role="img" aria-label={`${period === 'weekly' ? 'Haftalık' : period === 'monthly' ? 'Aylık' : 'Yıllık'} üretim grafiği`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={periodData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px', fontFamily: 'monospace' }}
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${name === 'tonnage' ? 'kg' : 'adet'}`,
                  name === 'tonnage' ? 'Üretim' : 'Şarj'
                ]}
              />
              <Bar yAxisId="left" dataKey="tonnage" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={40} />
              <Line yAxisId="right" type="monotone" dataKey="charges" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Üretim Yoğunluk Haritası (Heatmap) - Tam Genişlik */}
      <motion.div variants={itemVariants} className="p-6 rounded-2xl bg-white border border-slate-200/60 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              Üretim Yoğunluk Haritası
            </h2>
            <p className="text-[10px] text-gray-400 mt-0.5">Yıl boyunca günlük döküm tonajı dağılımı</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setHeatmapYear(y => y - 1)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition"
              aria-label="Önceki yıl"
            >
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-xs font-bold font-mono text-gray-700 min-w-[40px] text-center">{heatmapYear}</span>
            <button
              onClick={() => setHeatmapYear(y => Math.min(y + 1, localYear))}
              disabled={heatmapYear >= localYear}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition disabled:opacity-30"
              aria-label="Sonraki yıl"
            >
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        <ProductionHeatmap reports={reports} year={heatmapYear} />
      </motion.div>

      {/* Ocak Analizleri (Ocak Performansı + Radar Grafiği) */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ocak Performans */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  Ocak Performans Karşılaştırması
                </h2>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {furnacePeriod === 'all' && 'Tüm zamanların operasyon verileri bazında ocak metrikleri.'}
                  {furnacePeriod === 'thisMonth' && 'Bu ayın operasyon verileri bazında ocak metrikleri.'}
                  {furnacePeriod === '30days' && 'Son 30 günlük operasyon verileri bazında ocak metrikleri.'}
                  {furnacePeriod === '7days' && 'Son 7 günlük operasyon verileri bazında ocak metrikleri.'}
                </p>
              </div>
              <div className="flex bg-slate-100 p-0.5 rounded-xl text-[10px] font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => setFurnacePeriod('all')}
                  className={`px-2.5 py-1 rounded-lg transition ${furnacePeriod === 'all' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Tümü
                </button>
                <button
                  type="button"
                  onClick={() => setFurnacePeriod('thisMonth')}
                  className={`px-2.5 py-1 rounded-lg transition ${furnacePeriod === 'thisMonth' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Bu Ay
                </button>
                <button
                  type="button"
                  onClick={() => setFurnacePeriod('30days')}
                  className={`px-2.5 py-1 rounded-lg transition ${furnacePeriod === '30days' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  30 Gün
                </button>
                <button
                  type="button"
                  onClick={() => setFurnacePeriod('7days')}
                  className={`px-2.5 py-1 rounded-lg transition ${furnacePeriod === '7days' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  7 Gün
                </button>
              </div>
            </div>

            {furnacePerformance.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">Ocak verisi bulunamadı.</div>
            ) : (
              <div className="space-y-3">
                {furnacePerformance.map((fp, i) => {
                  const maxMelted = Math.max(...furnacePerformance.map(f => f.totalMelted), 1);
                  const barWidth = (fp.totalMelted / maxMelted) * 100;
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700">{fp.name}</span>
                          <span className={`w-2 h-2 rounded-full ${fp.status === 'Çalışıyor' ? 'bg-emerald-400' :
                              fp.status === 'Bakımda' ? 'bg-amber-400' :
                                fp.status === 'Arızalı' ? 'bg-red-400' : 'bg-gray-300'
                            }`} />
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-mono text-gray-500">
                          <span>{fp.totalMelted.toLocaleString('tr-TR')} kg</span>
                          <span>{fp.totalCharges} şarj</span>
                          <span className="text-amber-600 font-bold">{fp.efficiency} eff</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidth}%` }}
                          transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Ocak Saatlik Üretkenlik Radar Chart */}
        {furnacePerformance.some(f => f.productivity > 0) ? (
          <div className="p-6 rounded-2xl bg-white border border-slate-200/60 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 font-display flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-indigo-500" />
              Ocak Saatlik Üretkenlik Radarı
            </h2>
            <p className="text-[10px] text-gray-400 mb-4">
              Her ocağın saatte ürettiği kg miktarı karşılaştırması ({furnacePeriod === 'all' ? 'tüm zamanlar' : furnacePeriod === 'thisMonth' ? 'bu ay' : furnacePeriod === '30days' ? 'son 30 gün' : 'son 7 gün'}).
            </p>

            <div className="h-72" role="img" aria-label="Ocak üretkenlik radar grafiği">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={furnacePerformance.filter(f => f.productivity > 0)}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <PolarRadiusAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <Radar
                    name="Üretkenlik (kg/saat)"
                    dataKey="productivity"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                    formatter={(value: number) => [`${value.toLocaleString('tr-TR')} kg/saat`, 'Üretkenlik']}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-white border border-slate-200/60 shadow-sm flex items-center justify-center text-gray-400 text-xs">
            Radar grafik için yeterli ocak üretkenlik verisi bulunmuyor.
          </div>
        )}
      </motion.div>

      {/* Arıza ve Duruş Analizi (Downtime Pareto & Analitik) */}
      <motion.div variants={itemVariants} className="p-6 rounded-2xl bg-white border border-slate-200/60 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Arıza ve Duruş Analitiği (Downtime Dağılımı)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Vardiyalarda kaybedilen üretim saatleri ve en sık duruşa neden olan kategoriler.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="px-3 py-1 bg-rose-50 text-rose-700 rounded-lg border border-rose-100 font-bold">
              Toplam: {downtimeAnalytics.totalMinutes} dk ({parseFloat((downtimeAnalytics.totalMinutes / 60).toFixed(1))} saat)
            </span>
          </div>
        </div>

        {downtimeAnalytics.list.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-xs border border-dashed border-gray-200 rounded-xl">
            Sistemde henüz kayıtlı arıza veya duruş olayı bulunmuyor.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* KPI Kartları */}
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Kayıtlı Duruş Olayı</span>
                <span className="text-2xl font-bold text-slate-800 font-mono">{downtimeAnalytics.totalCount} Adet</span>
              </div>
              <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-rose-700 block">Olay Başı Ortalama Duruş</span>
                <span className="text-2xl font-bold text-rose-900 font-mono">{downtimeAnalytics.avgMinutes} Dakika</span>
              </div>
              <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-700 block">En Çok Duruş Nedeni</span>
                <span className="text-base font-bold text-amber-950 truncate block">
                  {downtimeAnalytics.list[0]?.category || '-'}
                </span>
                <span className="text-[11px] text-amber-800 font-mono font-semibold">
                  {downtimeAnalytics.list[0]?.totalMinutes} dk ({downtimeAnalytics.list[0]?.count} olay)
                </span>
              </div>
            </div>

            {/* Kategori Bazlı Dağılım Çubukları */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Kategori Bazında Kaybedilen Süre
              </h3>
              <div className="space-y-3">
                {downtimeAnalytics.list.map((item, idx) => {
                  const maxMins = downtimeAnalytics.list[0]?.totalMinutes || 1;
                  const pct = Math.round((item.totalMinutes / maxMins) * 100);
                  const totalPct = Math.round((item.totalMinutes / downtimeAnalytics.totalMinutes) * 100);

                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          {item.category}
                        </span>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-gray-400">{item.count} olay</span>
                          <span className="font-bold text-rose-700">{item.totalMinutes} dk (%{totalPct})</span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
