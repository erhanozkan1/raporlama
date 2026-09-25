'use client';

import * as XLSX from 'xlsx';

import React, { useState, useEffect, useMemo } from 'react';
import { DailyReport, AppSettings, TimelineEvent, EventType, DailyFurnaceRecord } from '@/lib/types';
import PdfReportModal from './PdfReportModal';
import AiAnalysisModal from './AiAnalysisModal';
import ModernSelect from './ui/ModernSelect';
import ConfirmDialog from './ui/ConfirmDialog';
import {
  Trash2,
  Search,
  Calendar,
  Tag,
  Flame,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Printer,
  Eye,
  Edit3,
  X,
  FileText,
  Clock,
  Briefcase,
  TrendingUp,
  BarChart4,
  Layers,
  Cpu,
  CalendarDays,
  Info,
  ChevronLeft,
  ChevronRight,
  Camera,
  AlertCircle,
  Wrench,
  Truck,
  UserCheck,
  Package,
  BookOpen,
  ArrowRight,
  ClipboardList,
  Check,
  Plus,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface HistoryViewProps {
  reports: DailyReport[];
  settings: AppSettings | null;
  onEditReport: (date: string) => void;
  onDeleteReport?: (id: string) => void;
}

type ViewMode = 'list' | 'calendar' | 'stats';

export default function HistoryView({ reports, settings, onEditReport, onDeleteReport }: HistoryViewProps) {
  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedFurnace, setSelectedFurnace] = useState('');
  const [selectedShift, setSelectedShift] = useState('');

  // Calendar navigation state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Detail Modal & Lightbox
  const [activeDetailReport, setActiveDetailReport] = useState<DailyReport | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);

  // AI Executive Summary Modal
  const [aiModalReports, setAiModalReports] = useState<DailyReport[] | null>(null);
  const [aiModalTitle, setAiModalTitle] = useState<string>('');



  // Safeguard Recharts mounting
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Advanced Search and Filter Logic (Unified)
  const filteredReports = reports.filter((report) => {
    // A. Full Text Search
    const cleanSearch = searchTerm.toLowerCase().trim();
    let matchesSearch = true;
    if (cleanSearch) {
      const dateMatch = report.date.includes(cleanSearch);
      const descMatch = (report.description || '').toLowerCase().includes(cleanSearch);
      const noteMatch = (report.notes || '').toLowerCase().includes(cleanSearch);
      const handoverMatch = (report.handoverJobs || '').toLowerCase().includes(cleanSearch);
      const evalMatch = (report.managerEvaluation || '').toLowerCase().includes(cleanSearch);

      const tagMatch = report.tags.some(t => t.toLowerCase().includes(cleanSearch));
      const prodMatch = report.productions.some(p =>
        p.productName.toLowerCase().includes(cleanSearch) ||
        (p.productCode || '').toLowerCase().includes(cleanSearch) ||
        (p.description || '').toLowerCase().includes(cleanSearch)
      );
      const eventMatch = report.timeline.some(e =>
        e.description.toLowerCase().includes(cleanSearch) ||
        e.time.includes(cleanSearch)
      );
      const furnaceMatch = report.furnaceRecords.some(f =>
        f.name.toLowerCase().includes(cleanSearch) ||
        (f.description || '').toLowerCase().includes(cleanSearch)
      );

      matchesSearch = dateMatch || descMatch || noteMatch || handoverMatch || evalMatch || tagMatch || prodMatch || eventMatch || furnaceMatch;
    }

    // B. Date Range
    const matchesStart = !startDate || report.date >= startDate;
    const matchesEnd = !endDate || report.date <= endDate;

    // C. Tag Selection
    const matchesTag = !selectedTag || report.tags.includes(selectedTag);

    // D. Furnace Selection
    const matchesFurnace = !selectedFurnace || report.furnaceRecords.some(f => f.furnaceId === selectedFurnace && f.chargeCount > 0);

    // E. Shift Selection
    const matchesShift = !selectedShift || report.shift === selectedShift;

    return matchesSearch && matchesStart && matchesEnd && matchesTag && matchesFurnace && matchesShift;
  });

  const selectedCalendarReports = useMemo(() => {
    return reports.filter(r => r.date === selectedCalendarDate);
  }, [reports, selectedCalendarDate]);

  const [activeShiftIndex, setActiveShiftIndex] = useState<number>(0);

  const selectedReport = useMemo(() => {
    if (selectedCalendarReports.length === 0) return null;
    return selectedCalendarReports[activeShiftIndex] || selectedCalendarReports[0];
  }, [selectedCalendarReports, activeShiftIndex]);

  // Reset Filters helper
  const handleClearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setSelectedTag('');
    setSelectedFurnace('');
    setSelectedShift('');
  };

  // 2. Calendar view helper calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (y: number, m: number) => {
    // 0 = Sunday, 1 = Monday, etc. Adjust so 0 = Monday
    let day = new Date(y, m, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);
  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // 3. Advanced Statistics Page calculations
  const totalProductionTonnage = filteredReports.reduce((sum, r) =>
    sum + r.productions.reduce((pSum, p) => pSum + (p.tonnage || 0), 0), 0
  );

  const totalChargesCount = filteredReports.reduce((sum, r) =>
    sum + r.furnaceRecords.reduce((fSum, f) => fSum + (f.chargeCount || 0), 0), 0
  );

  const totalQuantityProduced = filteredReports.reduce((sum, r) =>
    sum + r.productions.reduce((pSum, p) => pSum + (p.quantity || 0), 0), 0
  );

  const activeDaysCount = filteredReports.length;
  const averageDailyTonnage = activeDaysCount > 0 ? totalProductionTonnage / activeDaysCount : 0;

  // Peak production day find
  let peakDayStr = '-';
  let peakDayTonnage = 0;
  filteredReports.forEach(r => {
    const t = r.productions.reduce((sum, p) => sum + (p.tonnage || 0), 0);
    if (t > peakDayTonnage) {
      peakDayTonnage = t;
      peakDayStr = r.date;
    }
  });

  // Furnace Performance summaries (Dinamik ve güvenli fırın eşleştirmesi)
  const furnaceStats = useMemo(() => {
    const furnaceMap = new Map<string, { id: string; name: string; capacity: string }>();
    if (settings?.furnaces) {
      settings.furnaces.forEach(f => furnaceMap.set(f.id, { id: f.id, name: f.name, capacity: f.capacity || '-' }));
    }
    filteredReports.forEach(r => {
      (r.furnaceRecords || []).forEach(rec => {
        if (!furnaceMap.has(rec.furnaceId)) {
          furnaceMap.set(rec.furnaceId, { id: rec.furnaceId, name: rec.name || rec.furnaceId, capacity: rec.capacity || '-' });
        }
      });
    });

    return Array.from(furnaceMap.values()).map(f => {
      const records = filteredReports.flatMap(r => r.furnaceRecords ? r.furnaceRecords.filter(rec => rec.furnaceId === f.id) : []);
      const activeRecords = records.filter(rec => rec.status === 'Çalışıyor');
      const totalCharges = records.reduce((sum, rec) => sum + (rec.chargeCount || 0), 0);
      const totalMelted = records.reduce((sum, rec) => sum + (rec.meltedAmount || 0), 0);
      const totalDuration = records.reduce((sum, rec) => sum + (rec.workDuration || 0), 0);

      let maxMelted = 0;
      let maxMeltedDate = '-';
      filteredReports.forEach(r => {
        const match = r.furnaceRecords?.find(rec => rec.furnaceId === f.id);
        if (match && match.meltedAmount > maxMelted) {
          maxMelted = match.meltedAmount;
          maxMeltedDate = r.date;
        }
      });

      return {
        id: f.id,
        name: f.name,
        capacity: f.capacity,
        activeDays: activeRecords.length,
        totalCharges,
        totalMelted,
        totalDuration,
        busiestDay: maxMelted > 0 ? `${maxMeltedDate} (${maxMelted} kg)` : '-',
      };
    }).filter(f => f.totalCharges > 0 || f.totalMelted > 0);
  }, [settings, filteredReports]);

  // Sort furnaces by melted amount for contribution donut chart
  const pieChartData = furnaceStats.map(f => ({
    name: f.name,
    value: f.totalMelted,
  })).filter(item => item.value > 0);

  // Recharts color list
  const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#6B7280'];

  // Tag distribution count
  const tagCounts: { [tag: string]: number } = {};
  filteredReports.forEach(r => {
    r.tags.forEach(t => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });
  const tagDistributionData = Object.keys(tagCounts).map(tag => ({
    tag,
    count: tagCounts[tag]
  })).sort((a, b) => b.count - a.count).slice(0, 7);

  // Daily Trend analysis (max last 15 reports for a clean trend chart)
  const trendData = [...filteredReports].reverse().slice(-15).map(r => ({
    date: r.date.split('-').slice(1).reverse().join('/'), // format as DD/MM
    tonnage: r.productions.reduce((sum, p) => sum + (p.tonnage || 0), 0),
    charges: r.furnaceRecords.reduce((sum, f) => sum + (f.chargeCount || 0), 0),
  }));

  // Weekly Total aggregation
  const getWeekNumber = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const weeklyTonnages: { [week: string]: number } = {};
  filteredReports.forEach(r => {
    const d = new Date(r.date);
    const weekKey = `${d.getFullYear()}-W${getWeekNumber(d).toString().padStart(2, '0')}`;
    weeklyTonnages[weekKey] = (weeklyTonnages[weekKey] || 0) + r.productions.reduce((sum, p) => sum + (p.tonnage || 0), 0);
  });

  const weeklyChartData = Object.keys(weeklyTonnages).sort().map(week => ({
    week: week.replace(/^\d+-W/, 'Hafta'),
    tonnage: weeklyTonnages[week]
  })).slice(-8); // last 8 weeks

  // Event types and downtime statistics
  let failureCount = 0;
  let failureMinutes = 0;
  let maintenanceCount = 0;
  let productionEventCount = 0;
  let shippingCount = 0;

  filteredReports.forEach(r => {
    // 1. downtimes dizisinden arıza / duruş olayları ve süreleri
    if (r.downtimes && r.downtimes.length > 0) {
      r.downtimes.forEach(d => {
        failureCount++;
        failureMinutes += (d.durationMinutes || 0);
      });
    }

    // 2. timeline dizisindeki olaylar
    r.timeline.forEach(e => {
      if (e.type === 'failure' || e.description.toLowerCase().includes('arıza')) {
        // Eğer downtimes dizisi yoksa veya timeline'daki olay downtimes'ta sayılmamışsa
        if (!r.downtimes || r.downtimes.length === 0) {
          failureCount++;
        }
      }
      else if (e.type === 'maintenance' || e.description.toLowerCase().includes('bakım')) maintenanceCount++;
      else if (e.type === 'production' || e.description.toLowerCase().includes('döküm') || e.description.toLowerCase().includes('ergitme')) productionEventCount++;
      else if (e.type === 'shipping' || e.description.toLowerCase().includes('sevkiyat')) shippingCount++;
    });
  });

  // Filtrelenen raporlardaki tüm duruşların listesi (Tablo için)
  const allDowntimes = filteredReports.flatMap(r => 
    (r.downtimes || []).map(d => ({
      ...d,
      date: r.date,
      shift: r.shift
    }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 4. ÇOK SAYFALI GERÇEK .XLSX DIŞA AKTARMA (SheetJS)
  const handleExportMultiSheetExcel = () => {
    const wb = XLSX.utils.book_new();

    const eventTypeLabel = (type?: string) =>
      type === 'production' ? 'Üretim' :
        type === 'failure' ? 'Arıza' :
          type === 'maintenance' ? 'Bakım' :
            type === 'shipping' ? 'Sevkiyat' :
              type === 'visit' ? 'Ziyaret' :
                type === 'raw_material' ? 'Hammadde' : 'Diğer';

    // SAYFA 1: Özet & Metrikler
    const summaryRows: (string | number)[][] = [
      ['DÖKÜM OPERASYON GENEL DEĞERLENDİRME RAPORU'],
      [],
      ['Rapor Tarihi', new Date().toLocaleDateString('tr-TR'), 'Filtrelenen Vardiya Sayısı', activeDaysCount],
      ['Tarih Aralığı', `${startDate || 'İlk Kayıt'} - ${endDate || 'Son Kayıt'}`, 'Bulunan Sonuç Sayısı', filteredReports.length],
      [],
      ['SİSTEM GENEL PERFORMANS GÖSTERGELERİ (KPI)'],
      ['Toplam Döküm Ağırlığı (kg)', Number(Number(totalProductionTonnage).toFixed(2)), 'En Çok Üretim Yapılan Gün', peakDayStr],
      ['Toplam Şarj Sayısı', totalChargesCount, 'Günün Rekor Ağırlığı (kg)', Number(Number(peakDayTonnage).toFixed(2))],
      ['Ortalama Günlük Döküm (kg/Gün)', Number(Number(averageDailyTonnage).toFixed(2)), 'Toplam Üretilen Parça (Adet)', totalQuantityProduced],
      ['Kayıtlı Arıza Olayları', failureCount, 'Bakım Olayları', maintenanceCount],
      [],
      ['FİLTRELENEN RAPOR LİSTESİ'],
      ['Tarih', 'Çalışma Saatleri', 'Toplam Ağırlık (kg)', 'Açıklama'],
      ...filteredReports.map((r): (string | number)[] => [
        r.date,
        r.shiftHours?.startTime && r.shiftHours?.endTime
          ? `${r.shiftHours.startTime} - ${r.shiftHours.endTime}`
          : (r.shift || '-'),
        Number(r.productions.reduce((s, p) => s + (p.tonnage || 0), 0).toFixed(2)),
        (r.description || '').slice(0, 200),
      ]),
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 24 }, { wch: 30 }, { wch: 20 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Özet ve Metrikler');

    // SAYFA 2: Üretilen Mamuller
    // SAYFA 2: Kalıp ve Döküm Üretimi
    const productionRows: (string | number)[][] = [
      ['GÜNLÜK KALIP VE DÖKÜM ÜRETİM LİSTESİ'],
      ['Tarih', 'Çalışma Saatleri', 'Kalıp Türü', 'Kalıp Adedi', 'Ağırlık (kg)'],
    ];
    filteredReports.forEach((r) => {
      r.productions.forEach((p) => {
        productionRows.push([
          r.date,
          r.shiftHours?.startTime && r.shiftHours?.endTime
            ? `${r.shiftHours.startTime} - ${r.shiftHours.endTime}`
            : (r.shift || '-'),
          p.moldType || p.productName || 'Kum Kalıp',
          p.quantity,
          Number((p.tonnage || 0).toFixed(2)),
        ]);
      });
    });
    const wsProduction = XLSX.utils.aoa_to_sheet(productionRows);
    wsProduction['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsProduction, 'Kalıp Üretimi');

    // SAYFA 3: Ocak Performansları
    const furnaceRows: (string | number)[][] = [
      ['OCAK BAZINDA ÇALIŞMA VE ERGİTME VERİLERİ'],
      ['Tarih', 'Ocak Adı', 'Durum', 'Şarj Sayısı', 'Eritilen (kg)', 'İş Birimi (Şarj)', 'Çalışma Saatleri', 'Ocak Notları'],
    ];
    filteredReports.forEach((r) => {
      r.furnaceRecords.forEach((f) => {
        furnaceRows.push([
          r.date,
          f.name,
          f.status,
          f.chargeCount,
          f.meltedAmount,
          f.workDuration,
          r.shiftHours?.startTime && r.shiftHours?.endTime
            ? `${r.shiftHours.startTime} - ${r.shiftHours.endTime}`
            : (r.shift || '-'),
          f.description || '-',
        ]);
      });
    });
    const wsFurnaces = XLSX.utils.aoa_to_sheet(furnaceRows);
    wsFurnaces['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 24 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsFurnaces, 'Ocak Performansları');

    // SAYFA 4: Günlük Olaylar (Zaman Tüneli)
    const eventRows: (string | number)[][] = [
      ['SAAT BAZINDA GÜNLÜK OLAY VE OPERASYON KAYITLARI'],
      ['Tarih', 'Vardiya', 'Saat', 'Olay Türü', 'Olay Açıklaması'],
    ];
    filteredReports.forEach((r) => {
      r.timeline.forEach((e) => {
        eventRows.push([r.date, r.shift || '-', e.time, eventTypeLabel(e.type), e.description]);
      });
    });
    const wsEvents = XLSX.utils.aoa_to_sheet(eventRows);
    wsEvents['!cols'] = [{ wch: 12 }, { wch: 24 }, { wch: 8 }, { wch: 12 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsEvents, 'Günlük Olaylar');

    // SAYFA 5: Vardiya Defteri
    const diaryRows: (string | number)[][] = [
      ['VARDİYA DEFTERİ, DEVİR NOTLARI VE YÖNETİCİ DEĞERLENDİRMELERİ'],
      ['Tarih', 'Vardiya', 'Genel Özet', 'Vardiya Özel Notları', 'Sonraki Güne Devreden İşler', 'Yönetici Değerlendirmesi'],
    ];
    filteredReports.forEach((r) => {
      diaryRows.push([
        r.date,
        r.shift || '-',
        r.description || '-',
        r.notes || '-',
        r.handoverJobs || '-',
        r.managerEvaluation || '-',
      ]);
    });
    const wsDiary = XLSX.utils.aoa_to_sheet(diaryRows);
    wsDiary['!cols'] = [{ wch: 12 }, { wch: 24 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsDiary, 'Vardiya Defteri');

    // SAYFA 6: İstatistik Özetleri (Ocak verimlilik analizi)
    const statsRows: (string | number)[][] = [
      ['OCAK PERFORMANS VE ERGİTME ANALİZİ'],
      ['Ocak Adı', 'Kapasite', 'Çalıştığı Gün', 'Toplam Şarj', 'Toplam Ergitme (kg)', 'Toplam Çalışma Süresi (Sa)'],
    ];
    furnaceStats.forEach((f) => {
      statsRows.push([
        f.name,
        f.capacity,
        f.activeDays,
        f.totalCharges,
        f.totalMelted,
        f.totalDuration,
      ]);
    });
    const wsStats = XLSX.utils.aoa_to_sheet(statsRows);
    wsStats['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, wsStats, 'İstatistik Özetleri');

    // SAYFA 7: Vardiya Ekibi ve Çalışma Saatleri (YENİ)
    const personnelRows: (string | number)[][] = [
      ['VARDİYA EKİBİ, PERSONEL SAYILARI VE ÇALIŞMA SAATLERİ'],
      ['Tarih', 'Vardiya', 'Vardiya Amiri', 'Fiili Çalışan', 'İzinli / Eksik', 'Planlanan (Sa)', 'Mola (dk)', 'Net Çalışma (Sa)', 'Ekip Notları'],
    ];
    filteredReports.forEach((r) => {
      personnelRows.push([
        r.date,
        r.shift || '-',
        r.personnel?.supervisorName || '-',
        r.personnel?.totalCount ?? '-',
        r.personnel?.absentCount ?? 0,
        r.shiftHours?.plannedDurationHours ?? 8,
        r.shiftHours?.breakDurationMinutes ?? 60,
        r.shiftHours?.netWorkDurationHours ?? '-',
        r.personnel?.notes || '-',
      ]);
    });
    const wsPersonnel = XLSX.utils.aoa_to_sheet(personnelRows);
    wsPersonnel['!cols'] = [{ wch: 12 }, { wch: 24 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsPersonnel, 'Vardiya Ekibi');

    // SAYFA 8: Arıza ve Duruş Kayıtları (YENİ)
    const downtimeRows: (string | number)[][] = [
      ['ARIZA VE DURUŞ KAYITLARI (DOWNTIME DETAYI)'],
      ['Tarih', 'Vardiya', 'Ocak / Hat', 'Duruş Nedeni', 'Başlangıç', 'Bitiş', 'Süre (dk)', 'Arıza Tanımı', 'Yapılan Müdahale', 'Teknisyen / Ekip'],
    ];
    filteredReports.forEach((r) => {
      (r.downtimes || []).forEach((d) => {
        downtimeRows.push([
          r.date,
          r.shift || '-',
          d.furnaceName || 'Genel Tesis',
          d.category,
          d.startTime,
          d.endTime,
          d.durationMinutes,
          d.description,
          d.actionTaken || '-',
          d.technician || '-',
        ]);
      });
    });
    const wsDowntime = XLSX.utils.aoa_to_sheet(downtimeRows);
    wsDowntime['!cols'] = [{ wch: 12 }, { wch: 24 }, { wch: 24 }, { wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 35 }, { wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsDowntime, 'Arıza ve Duruşlar');

    // Gerçek .xlsx dosyası olarak indir
    XLSX.writeFile(wb, `dokum_analiz_raporu_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Event category color code lookup
  const getEventCategoryStyles = (type?: EventType) => {
    switch (type) {
      case 'production':
        return {
          icon: <Check className="w-3.5 h-3.5 text-emerald-600" />,
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-100',
          textColor: 'text-emerald-700',
          label: 'Üretim',
          indicatorColor: 'bg-emerald-500'
        };
      case 'failure':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5 text-red-600" />,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-100',
          textColor: 'text-red-700',
          label: 'Arıza',
          indicatorColor: 'bg-red-500'
        };
      case 'maintenance':
        return {
          icon: <Wrench className="w-3.5 h-3.5 text-amber-600" />,
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-100',
          textColor: 'text-amber-700',
          label: 'Bakım',
          indicatorColor: 'bg-amber-500'
        };
      case 'shipping':
        return {
          icon: <Truck className="w-3.5 h-3.5 text-blue-600" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-100',
          textColor: 'text-blue-700',
          label: 'Sevkiyat',
          indicatorColor: 'bg-blue-500'
        };
      case 'visit':
        return {
          icon: <UserCheck className="w-3.5 h-3.5 text-purple-600" />,
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-100',
          textColor: 'text-purple-700',
          label: 'Ziyaret',
          indicatorColor: 'bg-purple-500'
        };
      case 'raw_material':
        return {
          icon: <Package className="w-3.5 h-3.5 text-amber-800" />,
          bgColor: 'bg-amber-900/10',
          borderColor: 'border-amber-900/10',
          textColor: 'text-amber-800',
          label: 'Hammadde',
          indicatorColor: 'bg-amber-800'
        };
      default:
        return {
          icon: <Clock className="w-3.5 h-3.5 text-gray-500" />,
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-100',
          textColor: 'text-gray-700',
          label: 'Diğer',
          indicatorColor: 'bg-gray-400'
        };
    }
  };

  // Calendar render grid helper
  const renderCalendarDays = () => {
    const cells: React.ReactNode[] = [];

    // Fill blank cells before 1st of month
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(
        <div
          key={`blank-${i}`}
          className="aspect-square bg-slate-50/30 border border-slate-100/20 rounded-xl"
        />
      );
    }

    // Generate day cards
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
      const matchReport = reports.find(r => r.date === dateStr);
      const isSelected = selectedCalendarDate === dateStr;

      // Check if report matches filters
      const isMatchingFilter = matchReport && filteredReports.some(r => r.id === matchReport.id);

      // Analyze states for color dots
      let hasProduction = false;
      let hasFailure = false;
      let hasMaintenance = false;

      if (matchReport) {
        hasProduction = matchReport.productions.reduce((sum, p) => sum + (p.tonnage || 0), 0) > 0;
        hasFailure = matchReport.timeline.some(e => e.type === 'failure' || e.description.toLowerCase().includes('arıza'));
        hasMaintenance = matchReport.timeline.some(e => e.type === 'maintenance' || e.description.toLowerCase().includes('bakım'));
      }

      cells.push(
        <div
          key={`day-${dayNum}`}
          onClick={() => setSelectedCalendarDate(dateStr)}
          className={`aspect-square p-2 rounded-xl border transition-all flex flex-col justify-between relative group cursor-pointer ${
            isSelected
              ? 'bg-amber-50/80 border-amber-500 text-amber-950 ring-2 ring-amber-500/30 shadow-sm scale-102 z-10'
              : matchReport
                ? isMatchingFilter
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 hover:bg-emerald-100/80 hover:border-emerald-400'
                  : 'bg-emerald-50/30 border-emerald-200/60 opacity-80 hover:opacity-100'
                : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50 hover:border-slate-200'
          }`}
        >
          {/* Day number */}
          <div className="flex justify-between items-start">
            <span className={`text-xs font-bold font-mono ${isSelected ? 'text-amber-800' : matchReport ? 'text-emerald-900' : 'text-slate-500'}`}>
              {dayNum}
            </span>
            {matchReport && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </div>

          {/* Mini indicators */}
          <div className="flex gap-1 items-center mt-auto">
            {hasProduction && <span className="w-1 h-1 rounded-full bg-emerald-600" title="Üretim Mevcut" />}
            {hasFailure && <span className="w-1 h-1 rounded-full bg-red-500" title="Arıza Olayı" />}
            {hasMaintenance && <span className="w-1 h-1 rounded-full bg-amber-500" title="Bakım Olayı" />}
          </div>
        </div>
      );
    }

    return cells;
  };

  const handlePrintSingleReport = (report: DailyReport) => {
    const printContent = document.getElementById('detail-sheet-print');
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=1100,height=850');
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="utf-8">
        <title>Günlük Operasyon Föyü - ${report.date}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: white !important;
            color: #0f172a !important;
            margin: 0;
            padding: 24px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .signature-block, .signature-area, .print-signature, [class*="signature"] {
            display: none !important;
          }
          .print-header {
            display: block !important;
          }
          @media print {
            body {
              padding: 0 !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="printable-report">
          ${printContent.innerHTML}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 600);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6" id="history-view">
      {/* SCOPED PRINT CSS ENHANCEMENT */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #detail-sheet-print, #detail-sheet-print *,
          #pdf-printable-area, #pdf-printable-area * {
            visibility: visible !important;
          }
          #detail-sheet-print, #pdf-printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print-header {
            display: block !important;
          }
          .printable-report {
            max-height: none !important;
            overflow-y: visible !important;
          }
          .no-print {
            display: none !important;
          }
          .print-break-before {
            page-break-before: always !important;
          }
          .print-row-block {
            page-break-inside: avoid !important;
          }
        }
`}</style>

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-display">
            Raporlama ve Analiz Modülü
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gelişmiş veri filtreleme, aylık döküm takvimi, interaktif fırın grafikleri ve vardiya defteri devir notları.
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowPdfModal(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>PDF Raporu Oluştur (Tarih Aralıklı)</span>
          </button>

          <button
            id="btn-ai-summary"
            type="button"
            onClick={() => {
              const targetReports = filteredReports.length > 0 ? filteredReports : reports;
              setAiModalReports(targetReports.slice(0, 15));
              setAiModalTitle('Yönetici Operasyon Özeti (AI)');
            }}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>AI Yönetici Özeti</span>
          </button>

          <button
            id="btn-export-excel"
            onClick={handleExportMultiSheetExcel}
            disabled={filteredReports.length === 0}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel&apos;e Aktar</span>
          </button>
        </div>
      </div>

      {/* View Mode Tabs Selector */}
      <div className="flex bg-slate-100 p-1 rounded-2xl w-full sm:w-fit overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setViewMode('list')}
          className={`shrink-0 flex-1 sm:flex-none justify-center px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${viewMode === 'list'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
            }`}
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span className="sm:hidden">Liste ({filteredReports.length})</span>
          <span className="hidden sm:inline">Rapor Listesi ({filteredReports.length})</span>
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={`shrink-0 flex-1 sm:flex-none justify-center px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${viewMode === 'calendar'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
            }`}
        >
          <CalendarDays className="w-3.5 h-3.5 shrink-0" />
          <span className="sm:hidden">Takvim</span>
          <span className="hidden sm:inline">Aylık Takvim Görünümü</span>
        </button>
        <button
          onClick={() => setViewMode('stats')}
          className={`shrink-0 flex-1 sm:flex-none justify-center px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${viewMode === 'stats'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
            }`}
        >
          <BarChart4 className="w-3.5 h-3.5 shrink-0" />
          <span className="sm:hidden">İstatistik</span>
          <span className="hidden sm:inline">Gelişmiş İstatistikler &amp; Grafikler</span>
        </button>
      </div>

      {/* Filter Options Panel */}
      <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-xs font-bold text-gray-400 tracking-wider uppercase">Çok Kriterli Gelişmiş Filtreler</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Kelime Arama */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              id="filter-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Kelime / kod / ürün ara..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none text-gray-900 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Başlangıç Tarihi */}
          <div className="relative">
            <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none z-10" />
            <input
              type="date"
              id="filter-start-date"
              value={startDate}
              title="Başlangıç Tarihi"
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none text-gray-900 focus:ring-1 focus:ring-amber-500 font-medium"
            />
          </div>

          {/* Bitiş Tarihi */}
          <div className="relative">
            <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none z-10" />
            <input
              type="date"
              id="filter-end-date"
              value={endDate}
              title="Bitiş Tarihi"
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none text-gray-900 focus:ring-1 focus:ring-amber-500 font-medium"
            />
          </div>

          {/* Etiket Seçimi */}
          <ModernSelect
            id="filter-select-tag"
            icon={<Tag className="w-4 h-4" />}
            placeholder="Tüm Etiketler"
            value={selectedTag}
            onChange={setSelectedTag}
            options={[
              { value: '', label: 'Tüm Etiketler' },
              ...(settings?.tags.map((t) => ({ value: t, label: t })) || []),
            ]}
          />

          {/* Ocak Seçimi */}
          <ModernSelect
            id="filter-select-furnace"
            icon={<Flame className="w-4 h-4" />}
            placeholder="Tüm Ocaklar"
            value={selectedFurnace}
            onChange={setSelectedFurnace}
            options={(() => {
              const map = new Map<string, string>();
              (settings?.furnaces || []).forEach(f => map.set(f.id, f.name));
              reports.forEach(r => {
                (r.furnaceRecords || []).forEach(fr => {
                  if (!map.has(fr.furnaceId)) {
                    map.set(fr.furnaceId, fr.name || fr.furnaceId);
                  }
                });
              });
              return [
                { value: '', label: 'Tüm Ocaklar' },
                ...Array.from(map.entries()).map(([value, label]) => ({ value, label })),
              ];
            })()}
          />

          {/* Vardiya Seçimi */}
          <ModernSelect
            id="filter-select-shift"
            icon={<Briefcase className="w-4 h-4" />}
            placeholder="Tüm Vardiyalar"
            value={selectedShift}
            onChange={setSelectedShift}
            options={[
              { value: '', label: 'Tüm Vardiyalar' },
              ...(settings?.shifts.map((s) => ({ value: s, label: s })) || []),
            ]}
          />
        </div>

        {/* Clear filters row */}
        {(searchTerm || startDate || endDate || selectedTag || selectedFurnace || selectedShift) && (
          <div className="flex justify-between items-center pt-1 border-t border-gray-50 ">
            <span className="text-xs text-gray-400 font-medium">
              Aktif filtrelerle eşleşen <strong>{filteredReports.length}</strong> rapor bulundu.
            </span>
            <button
              onClick={handleClearFilters}
              className="text-xs text-amber-600 hover:underline font-bold"
            >
              Filtreleri Temizle
            </button>
          </div>
        )}
      </div>

      {/* VIEW PANEL ROUTER */}
      <AnimatePresence>
        {/* VIEW 1: REPORT LIST */}
        {viewMode === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.15 }}
            className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm"
          >
            {filteredReports.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">
                Arama kriterlerine uygun döküm raporu bulunamadı.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Desktop Table Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <div className="col-span-2">Tarih</div>
                  <div className="col-span-2">Çalışma Saatleri</div>
                  <div className="col-span-3">Genel Özet / Notlar</div>
                  <div className="col-span-2 text-right">Ağırlık (kg)</div>
                  <div className="col-span-1 text-center">Şarj</div>
                  <div className="col-span-2 text-center">İşlemler</div>
                </div>

                {/* List Items */}
                <div className="divide-y divide-gray-100 space-y-3">
                  {filteredReports.map((report) => {
                    const totalTonnage = report.productions.reduce((sum, p) => sum + (p.tonnage || 0), 0);
                    const totalCharges = report.furnaceRecords.reduce((sum, f) => sum + (f.chargeCount || 0), 0);
                    const dateObj = new Date(report.date);
                    const dateFormatted = dateObj.toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      weekday: 'short'
                    });

                    return (
                      <div
                        key={report.id}
                        className="pt-3 pb-3 border-b md:border-b-0 border-gray-100 last:border-b-0"
                      >
                        {/* ======================================================== */}
                        {/* MOBİL GÖRÜNÜM: DOKUNMATİK KART DÜZENİ (< md) */}
                        {/* ======================================================== */}
                        <div className="md:hidden p-4 bg-white rounded-2xl border border-gray-100 shadow-2xs space-y-3">
                          {/* Kart Üst Başlık: Tarih & Çalışma Saatleri */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-xs font-bold text-gray-900 block">{dateFormatted}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{report.date}</span>
                            </div>
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-[10px] font-extrabold tracking-wide">
                              {report.shiftHours?.startTime && report.shiftHours?.endTime 
                                ? `${report.shiftHours.startTime} - ${report.shiftHours.endTime}`
                                : (report.shift || 'Çalışma Saatleri')}
                            </span>
                          </div>

                          {/* Ekip & Amir Bilgisi */}
                          {(report.personnel?.supervisorName || typeof report.personnel?.totalCount === 'number') && (
                            <div className="flex items-center gap-3 text-xs bg-blue-50/50 p-2 rounded-xl border border-blue-100/60">
                              {report.personnel?.supervisorName && (
                                <span className="font-semibold text-blue-900 truncate">
                                  👤 {report.personnel.supervisorName}
                                </span>
                              )}
                              {typeof report.personnel?.totalCount === 'number' && (
                                <span className="text-blue-700 font-medium ml-auto">
                                  👥 {report.personnel.totalCount} Personel
                                </span>
                              )}
                            </div>
                          )}

                          {/* Genel Açıklama & Duruş Rozeti */}
                          <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">
                            {report.description || <span className="text-gray-400 italic">Genel özet yazılmamış.</span>}
                          </p>

                          {/* Rozetler (Duruş & Etiketler) */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {report.downtimes && report.downtimes.length > 0 && (
                              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold flex items-center gap-1">
                                ⚠️ {report.downtimes.reduce((s, d) => s + (Number(d.durationMinutes) || 0), 0)} dk duruş
                              </span>
                            )}
                            {report.tags.map((t, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-lg text-[10px] font-semibold"
                              >
                                {t}
                              </span>
                            ))}
                          </div>

                          {/* Özet Metrikler: Ağırlık ve Şarj */}
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
                            <div className="p-2 bg-gray-50/70 rounded-xl">
                              <span className="text-[10px] font-bold text-gray-400 uppercase block">Toplam Döküm</span>
                              <span className="font-extrabold text-amber-600 text-sm font-mono">
                                {totalTonnage.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                              </span>
                            </div>
                            <div className="p-2 bg-gray-50/70 rounded-xl">
                              <span className="text-[10px] font-bold text-gray-400 uppercase block">Şarj Sayısı</span>
                              <span className="font-extrabold text-slate-800 text-sm font-mono">
                                {totalCharges} Şarj
                              </span>
                            </div>
                          </div>

                          {/* Mobil Butonlar (Minimum 44px dokunma hedefi) */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                            <button
                              onClick={() => setActiveDetailReport(report)}
                              className="h-11 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl transition flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95"
                            >
                              <Eye className="w-4 h-4" />
                              İncele
                            </button>
                            <button
                              onClick={() => onEditReport(report.id)}
                              className="h-11 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl transition flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 border border-amber-200/60"
                            >
                              <Edit3 className="w-4 h-4" />
                              Düzenle
                            </button>
                            {onDeleteReport && (
                              <button
                                onClick={() => setDeletingReportId(report.id)}
                                className="col-span-2 sm:col-span-1 h-11 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 border border-rose-200/60"
                              >
                                <Trash2 className="w-4 h-4" />
                                Sil
                              </button>
                            )}
                          </div>
                        </div>

                        {/* ======================================================== */}
                        {/* MASAÜSTÜ GÖRÜNÜM: TABLO SATIRI (>= md) */}
                        {/* ======================================================== */}
                        <div className="hidden md:grid grid-cols-12 gap-4 items-center hover:bg-gray-50/60 px-3 py-2 rounded-xl transition duration-150">
                          {/* Date */}
                          <div className="col-span-2 space-y-1">
                            <p className="font-bold text-gray-900 text-sm">{dateFormatted}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{report.date}</p>
                          </div>

                          {/* Shift / Hours */}
                          <div className="col-span-2 flex flex-col items-start gap-1">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-lg text-[10px] font-extrabold tracking-wide">
                              {report.shiftHours?.startTime && report.shiftHours?.endTime 
                                ? `${report.shiftHours.startTime} - ${report.shiftHours.endTime}`
                                : (report.shift || 'Belirtilmedi')}
                            </span>
                            {report.personnel?.supervisorName && (
                              <span className="text-[10px] text-blue-700 font-semibold truncate max-w-[150px]">
                                Amir: {report.personnel.supervisorName}
                              </span>
                            )}
                            {typeof report.personnel?.totalCount === 'number' && (
                              <span className="text-[10px] text-gray-500 font-medium">
                                👥 {report.personnel.totalCount} Personel
                              </span>
                            )}
                          </div>

                          {/* Description & Tags */}
                          <div className="col-span-3 space-y-1.5">
                            <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">
                              {report.description || <span className="text-gray-400 italic">Genel özet yazılmamış.</span>}
                            </p>
                            <div className="flex flex-wrap items-center gap-1">
                              {report.downtimes && report.downtimes.length > 0 && (
                                <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[9px] font-bold flex items-center gap-0.5">
                                  ⚠️ {report.downtimes.reduce((s, d) => s + (Number(d.durationMinutes) || 0), 0)} dk duruş
                                </span>
                              )}
                              {report.tags.map((t, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 bg-amber-50/60 text-amber-600 border border-amber-100/40 rounded text-[9px] font-bold"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Total Tonnage */}
                          <div className="col-span-2 text-right font-mono">
                            <span className="font-extrabold text-amber-600 text-sm sm:text-base">
                              {totalTonnage.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-gray-400 ml-1">kg</span>
                          </div>

                          {/* Charge */}
                          <div className="col-span-1 text-center font-mono">
                            <span className="font-bold text-slate-900 ">
                              {totalCharges}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="col-span-2 flex flex-wrap items-center justify-center gap-1.5">
                            <button
                              onClick={() => setActiveDetailReport(report)}
                              id={`btn-view-detail-${report.id}`}
                              className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl transition duration-150 flex items-center gap-1 text-xs font-bold"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              İncele
                            </button>
                            <button
                              onClick={() => onEditReport(report.id)}
                              id={`btn-edit-report-${report.id}`}
                              className="p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition duration-150 flex items-center gap-1 text-xs font-bold"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Düzenle
                            </button>
                            {onDeleteReport && (
                              <button
                                onClick={() => setDeletingReportId(report.id)}
                                id={`btn-delete-report-${report.id}`}
                                className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition duration-150 flex items-center gap-1 text-xs font-bold"
                                title="Raporu Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Sil
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Delete Report Confirmation Dialog */}
        <ConfirmDialog
          isOpen={!!deletingReportId}
          title="Günlük Raporu Silmek İstiyor Musunuz?"
          message="Bu günlük rapor veritabanından kalıcı olarak silinecektir. Bu işlem geri alınamaz."
          confirmLabel="Evet, Raporu Sil"
          onConfirm={() => {
            if (deletingReportId && onDeleteReport) {
              onDeleteReport(deletingReportId);
              if (activeDetailReport?.id === deletingReportId || activeDetailReport?.date === deletingReportId) {
                setActiveDetailReport(null);
              }
              setDeletingReportId(null);
            }
          }}
          onCancel={() => setDeletingReportId(null)}
        />

        {/* VIEW 2: INTERACTIVE CALENDAR */}
        {viewMode === 'calendar' && (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* SOL BÖLÜM: Minimal Kompakt Takvim Kartı */}
            <div className="lg:col-span-5 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col justify-between h-fit">
              {/* Takvim Kontrolü */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-bold text-slate-800 font-display">
                    {monthNames[month]} {year}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 transition"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600 transition"
                  >
                    Bugün
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 transition"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Hafta Günleri Başlığı */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                <div>Pt</div>
                <div>Sa</div>
                <div>Ça</div>
                <div>Pe</div>
                <div>Cu</div>
                <div className="text-amber-500">Ct</div>
                <div className="text-red-500 font-bold">Pz</div>
              </div>

              {/* Takvim Günleri */}
              <div className="grid grid-cols-7 gap-1">
                {renderCalendarDays()}
              </div>

              {/* Lejant (Legend) */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-[9px] text-slate-400 font-mono">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-[3px] bg-emerald-500/20 border border-emerald-300" />
                  <span>Rapor Kaydı</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>Üretim</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span>Arıza</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Bakım</span>
                </div>
              </div>
            </div>

            {/* SAĞ BÖLÜM: Seçili Gün Detay ve Aksiyon Kartı */}
            <div className="lg:col-span-7 p-6 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-5 min-h-[380px] flex flex-col justify-between">
              {selectedReport ? (
                // KAYIT VARSA DETAY ARAYÜZÜ
                <div className="space-y-4 flex-1">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono block">
                        SEÇİLİ GÜNÜN DETAYI
                      </span>
                      <h3 className="text-base font-extrabold text-slate-800 mt-0.5">
                        {new Date(selectedReport.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-bold font-mono">
                      {selectedReport.shiftHours?.startTime && selectedReport.shiftHours?.endTime
                        ? `${selectedReport.shiftHours.startTime} - ${selectedReport.shiftHours.endTime}`
                        : (selectedReport.shift || 'Çalışma Saati')}
                    </span>
                  </div>

                  {/* Birden fazla kayıt varsa çalışma saati sekmeleri */}
                  {selectedCalendarReports.length > 1 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Kayıtlar:</span>
                      {selectedCalendarReports.map((r, idx) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setActiveShiftIndex(idx)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                            selectedReport?.id === r.id
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {r.shiftHours?.startTime && r.shiftHours?.endTime
                            ? `${r.shiftHours.startTime} - ${r.shiftHours.endTime}`
                            : (r.shift || `${idx + 1}. Kayıt`)}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* KPI Değerleri */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 block mb-0.5">TOPLAM DÖKÜM PERFORMASI</span>
                      <span className="text-lg font-black text-slate-800 font-mono">
                        {selectedReport.productions.reduce((sum, p) => sum + (p.tonnage || 0), 0).toLocaleString('tr-TR')}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1 font-bold">kg</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 block mb-0.5">TOPLAM ERGİTME ŞARJI</span>
                      <span className="text-lg font-black text-amber-600 font-mono">
                        {selectedReport.furnaceRecords.reduce((sum, f) => sum + (f.chargeCount || 0), 0)}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1 font-bold">Şarj</span>
                    </div>
                  </div>

                  {/* Çalışan Ocaklar */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono block">OCAK DURUMLARI</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {selectedReport.furnaceRecords.map((f, i) => (
                        <div key={i} className="p-2 border border-slate-100 rounded-lg flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 truncate">{f.name}</span>
                          <span className={`w-2 h-2 rounded-full ${
                            f.status === 'Çalışıyor' ? 'bg-emerald-500' :
                            f.status === 'Bakımda' ? 'bg-amber-500' :
                            f.status === 'Arızalı' ? 'bg-red-500' : 'bg-slate-300'
                          }`} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Genel Açıklama */}
                  {selectedReport.description && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono block">VARDİYA DEFTERİ ÖZETİ</span>
                      <p className="text-xs text-slate-600 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 leading-relaxed max-h-24 overflow-y-auto custom-scrollbar">
                        {selectedReport.description}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // KAYIT YOKSA ARAYÜZ
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-8">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-450">
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <h4 className="text-sm font-bold text-slate-700">Operasyon Raporu Bulunmuyor</h4>
                    <p className="text-xs text-slate-400">
                      {new Date(selectedCalendarDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} tarihine ait döküm operasyon raporu henüz girilmemiştir.
                    </p>
                  </div>
                  <button
                    onClick={() => onEditReport(selectedCalendarDate)}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs transition shadow-sm active:scale-95 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Bu Tarihe Rapor Ekle</span>
                  </button>
                </div>
              )}

              {/* AKSİYON BUTONLARI (Kayıt varsa alt kısım) */}
              {selectedReport && (
                <div className="flex gap-2 border-t border-slate-100 pt-4 mt-auto">
                  <button
                    onClick={() => setActiveDetailReport(selectedReport)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Detay İncele</span>
                  </button>
                  <button
                    onClick={() => onEditReport(selectedReport.id)}
                    className="flex-1 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Raporu Düzenle</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* VIEW 3: ADVANCED STATISTICS */}
        {viewMode === 'stats' && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* KPI Cards row inside stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase block mb-1">
                  SEÇİLİ ARALIK TOPLAM ÜRETİM
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-gray-900 font-mono">
                    {totalProductionTonnage.toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-500 font-semibold">kg</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Eşleşen döküm mamul ağırlıkları toplamı</p>
              </div>

              <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase block mb-1">
                  TOPLAM SIVI METAL ŞARJ
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-amber-600 font-mono">
                    {totalChargesCount}
                  </span>
                  <span className="text-xs text-gray-500">Şarj</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Ocaklar tarafından yapılan toplam ergitme</p>
              </div>

              <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase block mb-1">
                  ORTALAMA GÜNLÜK DÖKÜM
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-emerald-600 font-mono">
                    {averageDailyTonnage.toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-500 font-semibold">kg/Gün</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Vardiya başına düşen verimli üretim ağırlığı</p>
              </div>

              <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase block mb-1">
                  ARIZALI & DURUŞ SÜRECİ
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-red-600 font-mono">
                    {failureCount}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">Olay</span>
                  {failureMinutes > 0 && (
                    <span className="text-xs text-red-500 font-mono font-bold ml-auto bg-red-50 px-2 py-0.5 rounded-full">
                      {(failureMinutes / 60).toFixed(1)} sa ({failureMinutes} dk)
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Filtrelenen arıza ve duruş olayları toplamı</p>
              </div>
            </div>

            {/* Recharts Graphical Dashboard */}
            {mounted ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* 1. Daily Production Trend Chart */}
                <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                  <h3 className="text-xs font-extrabold text-gray-400 tracking-wider uppercase mb-4">GÜNLÜK DÖKÜM AĞIRLIĞI & ŞARJ SEYRİ</h3>
                  {trendData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-xs text-gray-400">Veri bulunmamaktadır.</div>
                  ) : (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorTonnage" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748B' }} />
                          <YAxis tick={{ fontSize: 9, fill: '#64748B' }} />
                          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Area type="monotone" dataKey="tonnage" name="Net Ağırlık (kg)" stroke="#F59E0B" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTonnage)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* 2. Weekly Total Production Bar Chart */}
                <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                  <h3 className="text-xs font-extrabold text-gray-400 tracking-wider uppercase mb-4">HAFTALIK TOPLAM DÖKÜLEN AĞIRLIK</h3>
                  {weeklyChartData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-xs text-gray-400">Veri bulunmamaktadır.</div>
                  ) : (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#64748B' }} />
                          <YAxis tick={{ fontSize: 9, fill: '#64748B' }} />
                          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                          <Bar dataKey="tonnage" name="Haftalık Toplam (kg)" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={45} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* 3. Furnace Melting Contribution (Donut) */}
                <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                  <h3 className="text-xs font-extrabold text-gray-400 tracking-wider uppercase mb-4">OCAK ERGİTME KATKI ORANLARI (% KG)</h3>
                  {pieChartData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-xs text-gray-400">Aktif ergitme döküm verisi bulunmamaktadır.</div>
                  ) : (
                    <div className="h-64 w-full grid grid-cols-1 md:grid-cols-5 items-center">
                      <div className="col-span-3 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={85}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {pieChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v) => `${Number(v).toLocaleString('tr-TR')} kg`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="col-span-2 text-xs space-y-2 pl-2">
                        {pieChartData.map((item, index) => (
                          <div key={index} className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span className="text-gray-600 line-clamp-1 font-medium">{item.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Tags Frequencies Chart */}
                <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                  <h3 className="text-xs font-extrabold text-gray-400 tracking-wider uppercase mb-4">Sık Yaşanan Süreçler & Etiketler</h3>
                  {tagDistributionData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-xs text-gray-400">Etiket verisi bulunmamaktadır.</div>
                  ) : (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={tagDistributionData}
                          layout="vertical"
                          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                          <XAxis type="number" tick={{ fontSize: 9, fill: '#64748B' }} />
                          <YAxis dataKey="tag" type="category" tick={{ fontSize: 9, fill: '#64748B' }} width={80} />
                          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                          <Bar dataKey="count" name="Görülme Sıklığı" fill="#8B5CF6" radius={[0, 4, 4, 0]} maxBarSize={18} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Furnace Performance Detailed Table */}
            <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 font-display mb-4">
                Ocak Performans & Ergitme Analizi Tablosu
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 border-b border-gray-100 ">
                      <th className="p-3 font-semibold">Ocak Adı</th>
                      <th className="p-3 font-semibold">Kapasite</th>
                      <th className="p-3 font-semibold text-center">Çalıştığı Gün</th>
                      <th className="p-3 font-semibold text-center">Toplam Şarj</th>
                      <th className="p-3 font-semibold text-right">Eritilen Toplam (kg)</th>
                      <th className="p-3 font-semibold">En Yoğun Gün</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700 ">
                    {furnaceStats.map((f, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 ">
                        <td className="p-3 font-bold">{f.name}</td>
                        <td className="p-3 font-mono">{f.capacity}</td>
                        <td className="p-3 text-center font-mono">{f.activeDays} gün</td>
                        <td className="p-3 text-center font-mono font-bold text-amber-600 ">{f.totalCharges}</td>
                        <td className="p-3 text-right font-mono font-semibold">{f.totalMelted.toLocaleString('tr-TR')} kg</td>
                        <td className="p-3 text-gray-500">{f.busiestDay}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Duruş ve Arıza Olayları Detaylı Tablosu */}
            <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 font-display">
                    Duruş ve Arıza Olayları Tablosu
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Filtrelenen aralıkta kaydedilen tüm arıza ve kesinti kayıtları ({allDowntimes.length} Olay)
                  </p>
                </div>
                {failureMinutes > 0 && (
                  <span className="self-start sm:self-auto text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-3 py-1 rounded-full font-mono">
                    Toplam Kayıp: {(failureMinutes / 60).toFixed(1)} Saat ({failureMinutes} dk)
                  </span>
                )}
              </div>

              {allDowntimes.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400 bg-gray-50/50 rounded-xl">
                  Seçili filtre kriterlerinde herhangi bir arıza veya duruş kaydı bulunamadı.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
                        <th className="p-3 font-semibold">Tarih</th>
                        <th className="p-3 font-semibold">Ocak / Kategori</th>
                        <th className="p-3 font-semibold text-center">Süre</th>
                        <th className="p-3 font-semibold">Duruş & Arıza Açıklaması</th>
                        <th className="p-3 font-semibold">Yapılan Müdahale / Aksiyon</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {allDowntimes.map((d, idx) => (
                        <tr key={idx} className="hover:bg-red-50/20 transition-colors">
                          <td className="p-3 font-mono font-medium whitespace-nowrap text-gray-900">
                            {d.date}
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-gray-900 block">{d.furnaceName || 'Genel Tesis'}</span>
                            <span className="text-[10px] text-gray-500">{d.category || 'Arıza / Duruş'}</span>
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <span className="font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                              {d.durationMinutes ? `${d.durationMinutes} dk (${(d.durationMinutes / 60).toFixed(1)} sa)` : '-'}
                            </span>
                          </td>
                          <td className="p-3 text-gray-800 font-medium max-w-xs sm:max-w-md">
                            {d.description || '-'}
                          </td>
                          <td className="p-3 text-gray-600 max-w-xs">
                            {d.actionTaken && d.actionTaken.trim() ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-100">
                                🔧 {d.actionTaken}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SINGLE REPORT DETAIL & PRINT MODAL */}
      <AnimatePresence>
        {activeDetailReport && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-2 sm:p-4 pb-24 sm:pb-6 overflow-y-auto backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-gray-100 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[82vh] sm:max-h-[88vh] flex flex-col relative"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-gray-100 flex justify-between items-center gap-3 bg-gray-50/70 shrink-0 no-print">
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 font-display flex items-center gap-1.5">
                    <BookOpen className="w-5 h-5 text-amber-500 shrink-0" />
                    <span className="truncate">Günlük Operasyon & Vardiya Föyü</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {activeDetailReport.date} tarihine ait tescilli dökümhane kayıtları.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setAiModalReports([activeDetailReport]);
                      setAiModalTitle(`${activeDetailReport.date} Yönetici Özeti (AI)`);
                    }}
                    title="Vardiya Yönetici Özeti"
                    className="h-10 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 rounded-xl transition flex items-center gap-1.5 text-xs font-bold active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="hidden sm:inline">AI Yönetici Özeti</span>
                  </button>
                  <button
                    onClick={() => handlePrintSingleReport(activeDetailReport)}
                    title="Yazdır / PDF Raporu"
                    className="h-10 px-3 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition flex items-center gap-1.5 text-xs font-bold text-gray-700 active:scale-95"
                  >
                    <Printer className="w-4 h-4 text-slate-500" />
                    <span className="hidden sm:inline">Yazdır / PDF</span>
                  </button>
                  <button
                    onClick={() => setActiveDetailReport(null)}
                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition min-w-[40px] min-h-[40px] flex items-center justify-center"
                    aria-label="Modalı Kapat"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-6 printable-report" id="detail-sheet-print">

                {/* PDF PRINT ONLY COVER PAGE SECTION (Strictly requested by PDF/Print specs!) */}
                <div className="hidden print-header block print-cover border-b-2 border-slate-900 pb-8 mb-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="p-2 bg-slate-950 text-white rounded-lg font-bold text-sm">DÖKÜM TAKİP SİSTEMİ</span>
                      </div>
                      <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 uppercase">GÜNLÜK VARDİYA OPERASYONEL RAPORU</h1>
                      <p className="text-xs text-slate-500 font-medium">Metalürjik Tesis Yönetimi ve Verimlilik İzleme Föyü</p>
                    </div>
                    <div className="text-right border-l-2 border-slate-300 pl-4">
                      <p className="text-xs font-bold text-slate-400">RAPOR NO</p>
                      <p className="font-mono text-sm font-bold text-slate-900">#RP-${activeDetailReport.id.slice(-6).toUpperCase()}</p>
                      <p className="text-xs text-slate-500 mt-1">Oturum: erhn.ozkan@gmail.com</p>
                    </div>
                  </div>

                  {/* Table of contents and metadata */}
                  <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t border-slate-100 text-xs">
                    <div>
                      <h4 className="font-bold text-slate-400 uppercase mb-1">Rapor Bilgileri</h4>
                      <p className="font-bold text-slate-900">Tarih: {activeDetailReport.date}</p>
                      <p className="text-slate-700">Vardiya: {activeDetailReport.shift || '1. Vardiya'}</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-400 uppercase mb-1">Hesaplanan Toplamlar</h4>
                      <p className="font-bold text-slate-900">Toplam Ağırlık: {activeDetailReport.productions.reduce((s, p) => s + (p.tonnage || 0), 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</p>
                      <p className="text-slate-700">Toplam Adet: {activeDetailReport.productions.reduce((s, p) => s + (p.quantity || 0), 0)} Pcs</p>
                      <p className="text-slate-700">Toplam Şarj: {activeDetailReport.furnaceRecords.reduce((s, f) => s + (f.chargeCount || 0), 0)} Döküm</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-400 uppercase mb-1">Emniyet & Değerlendirme</h4>
                      <p className="text-slate-700">Olay Bildirimleri: {activeDetailReport.timeline.length} adet</p>
                      <p className="text-slate-700">Etiketler: {activeDetailReport.tags.join(',') || 'Yok'}</p>
                      <p className="text-slate-700">Sistem Durumu: Çevrimiçi Senkronize</p>
                    </div>
                  </div>
                </div>

                {/* Grid: 1. Vardiya Genel Bilgileri & Ekip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100 print-row-block">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tarih & Çalışma Saatleri</span>
                    <p className="font-bold text-xs text-gray-900">{activeDetailReport.date}</p>
                    <p className="text-[11px] text-gray-600 font-medium">
                      {activeDetailReport.shiftHours?.startTime && activeDetailReport.shiftHours?.endTime
                        ? `${activeDetailReport.shiftHours.startTime} - ${activeDetailReport.shiftHours.endTime}`
                        : (activeDetailReport.shift || '-')}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Vardiya Amiri</span>
                    <p className="font-bold text-xs text-blue-900">{activeDetailReport.personnel?.supervisorName || '-'}</p>
                    <p className="text-[11px] text-gray-500">
                      👥 {activeDetailReport.personnel?.totalCount ?? '-'} Çalışan {activeDetailReport.personnel?.absentCount ? `(${activeDetailReport.personnel.absentCount} İzinli)` : ''}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Çalışma / Net Saat</span>
                    <p className="font-bold text-xs text-emerald-700 font-mono">
                      {activeDetailReport.shiftHours?.netWorkDurationHours ? `${activeDetailReport.shiftHours.netWorkDurationHours} saat` : '-'}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Planlanan: {activeDetailReport.shiftHours?.plannedDurationHours ?? 8} sa / Mola: {activeDetailReport.shiftHours?.breakDurationMinutes ?? 60} dk
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Toplam Duruş</span>
                    <p className="font-bold text-xs text-rose-700 font-mono">
                      {activeDetailReport.downtimes && activeDetailReport.downtimes.length > 0
                        ? `${activeDetailReport.downtimes.reduce((s, d) => s + (Number(d.durationMinutes) || 0), 0)} dk`
                        : '0 dk'}
                    </p>
                    <p className="text-[11px] text-gray-400 font-mono">#{activeDetailReport.id.slice(-6).toUpperCase()}</p>
                  </div>
                </div>

                {/* Arıza ve Duruşlar (Varsa) */}
                {activeDetailReport.downtimes && activeDetailReport.downtimes.length > 0 && (
                  <div className="space-y-2 print-row-block">
                    <span className="text-xs font-bold text-rose-700 uppercase flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      Vardiya İçi Arıza ve Duruş Kayıtları (Downtime)
                    </span>
                    <div className="border border-rose-100 rounded-xl overflow-x-auto bg-rose-50/20">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-rose-100/60 text-rose-900 border-b border-rose-200">
                            <th className="p-2.5 font-bold">Ocak / Ekipman</th>
                            <th className="p-2.5 font-bold">Duruş Nedeni</th>
                            <th className="p-2.5 font-bold text-center">Zaman Aralığı</th>
                            <th className="p-2.5 font-bold text-center">Süre (dk)</th>
                            <th className="p-2.5 font-bold">Arıza & Müdahale</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rose-100 text-gray-800">
                          {activeDetailReport.downtimes.map((dt, idx) => (
                            <tr key={idx} className="hover:bg-rose-50/50">
                              <td className="p-2.5 font-semibold text-gray-900">{dt.furnaceName || 'Tüm Tesis'}</td>
                              <td className="p-2.5">
                                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                                  {dt.category}
                                </span>
                              </td>
                              <td className="p-2.5 text-center font-mono">{dt.startTime} - {dt.endTime}</td>
                              <td className="p-2.5 text-center font-bold text-rose-700 font-mono">{dt.durationMinutes} dk</td>
                              <td className="p-2.5">
                                <div className="font-medium">{dt.description}</div>
                                {dt.actionTaken && <div className="text-[11px] text-gray-500">Müdahale: {dt.actionTaken} ({dt.technician || 'Ekip'})</div>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Description - Executive Summary */}
                {activeDetailReport.description && (
                  <div className="space-y-1.5 print-row-block">
                    <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-500" />
                      Yönetici Özeti / Günün Genel Değerlendirmesi
                    </span>
                    <div className="text-sm text-gray-800 bg-amber-50/20 p-4 rounded-xl border border-amber-100/30 leading-relaxed font-sans">
                      {activeDetailReport.description}
                    </div>
                  </div>
                )}

                {/* Production list - Detailed Production Tonnages */}
                {/* Production list - Detailed Mold Production */}
                <div className="space-y-2.5 print-row-block">
                  <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-amber-500" />
                    Dökümü Yapılan Kalıplar ve Ağırlıklar (kg)
                  </span>
                  {activeDetailReport.productions && activeDetailReport.productions.length > 0 ? (
                    <div className="border border-gray-100 rounded-xl overflow-x-auto custom-scrollbar">
                      <table className="w-full min-w-[500px] text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-gray-50 text-gray-500">
                            <th className="p-3 font-semibold">#</th>
                            <th className="p-3 font-semibold">Kalıp Türü</th>
                            <th className="p-3 font-semibold text-center">Kalıp Adedi</th>
                            <th className="p-3 font-semibold text-right">Ağırlık (kg)</th>
                            <th className="p-3 font-semibold text-right">Birim Ağırlık</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                          {activeDetailReport.productions.map((p, idx) => {
                            const unitWeight = p.quantity > 0 ? (p.tonnage / p.quantity).toFixed(2) : '-';
                            return (
                              <tr key={idx} className="hover:bg-gray-50/50">
                                <td className="p-3 font-mono text-gray-400">{idx + 1}</td>
                                <td className="p-3 font-bold text-gray-900">
                                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-semibold text-[11px]">
                                    {p.moldType || p.productName || 'Kum Kalıp'}
                                  </span>
                                </td>
                                <td className="p-3 text-center font-mono font-semibold">{p.quantity} Adet</td>
                                <td className="p-3 text-right font-mono text-emerald-600 font-bold">{p.tonnage.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</td>
                                <td className="p-3 text-right font-mono text-gray-500">{unitWeight !== '-' ? `${unitWeight} kg/ad` : '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50/50 font-bold text-gray-900 border-t border-gray-200">
                            <td className="p-3" colSpan={2}>Toplam Kalıp ve Döküm</td>
                            <td className="p-3 text-center font-mono">
                              {activeDetailReport.productions.reduce((s, p) => s + (p.quantity || 0), 0)} Adet
                            </td>
                            <td className="p-3 text-right font-mono text-emerald-700 font-bold">
                              {activeDetailReport.productions.reduce((s, p) => s + (p.tonnage || 0), 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Üretim döküm girdisi bulunmamaktadır.</p>
                  )}
                </div>

                {/* Furnace Performance Cards */}
                <div className="space-y-2.5 print-row-block">
                  <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    Fırın Performansları ve Eritme Verileri
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {activeDetailReport.furnaceRecords && activeDetailReport.furnaceRecords.map((f, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-gray-100 bg-gray-50/30"
                      >
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2.5 mb-2.5">
                          <span className="font-extrabold text-xs text-gray-800 ">{f.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${f.status === 'Çalışıyor' ? 'bg-emerald-100 text-emerald-700' :
                              f.status === 'Bakımda' ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                            }`}>
                            {f.status}
                          </span>
                        </div>

                        {f.status === 'Çalışıyor' ? (
                          <div className="space-y-1.5 text-xs font-mono">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Şarj Sayısı:</span>
                              <span className="font-bold text-gray-900 ">{f.chargeCount} döküm</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Toplam Eritilen:</span>
                              <span className="font-bold text-amber-600 ">{f.meltedAmount} kg</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Çalışma Süresi:</span>
                              <span className="font-bold text-gray-950 ">{f.workDuration} sa</span>
                            </div>
                            {f.description && (
                              <div className="pt-2 mt-2 border-t border-gray-100 text-[10px] text-gray-500 font-sans leading-relaxed">
                                <strong>Gözlem:</strong> {f.description}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-center text-gray-400 italic py-4">Fırın bugün aktif edilmedi.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Daily events timeline with colors */}
                <div className="space-y-2.5 print-row-block">
                  <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    Saat Bazında Olay Zaman Akışı (Timeline)
                  </span>
                  {activeDetailReport.timeline && activeDetailReport.timeline.length > 0 ? (
                    <div className="space-y-2">
                      {activeDetailReport.timeline.map((item, idx) => {
                        const styles = getEventCategoryStyles(item.type);
                        return (
                          <div
                            key={idx}
                            className={`flex gap-3 p-3 rounded-xl border items-start ${styles.bgColor} ${styles.borderColor}`}
                          >
                            <span className="font-mono text-[11px] font-bold text-slate-700 bg-white/70 px-2 py-1 rounded-lg text-center shrink-0 border border-slate-200/50 ">
                              {item.time}
                            </span>
                            <div className="flex-1 space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-bold uppercase ${styles.textColor}`}>
                                  {styles.label}
                                </span>
                              </div>
                              <p className="text-xs text-gray-800 leading-relaxed font-sans">{item.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Zaman tüneli kaydı bulunmamaktadır.</p>
                  )}
                </div>

                {/* Evaluation and Supervisor notes */}
                {activeDetailReport.managerEvaluation && (
                  <div className="p-4 rounded-xl border border-gray-100 bg-slate-50/40 space-y-2 print-row-block">
                    <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                      Yönetici Değerlendirmesi & Emniyet
                    </span>
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line font-sans">
                      {activeDetailReport.managerEvaluation}
                    </p>
                  </div>
                )}

                {/* Notes and Tags */}
                {activeDetailReport.notes && (
                  <div className="space-y-1.5 print-row-block">
                    <span className="text-xs font-bold text-gray-400 uppercase">Önemli Olay & Vardiya Notları</span>
                    <p className="text-xs bg-gray-50/50 p-3 rounded-xl border border-gray-100 text-gray-700 leading-relaxed whitespace-pre-line font-sans">
                      {activeDetailReport.notes}
                    </p>
                  </div>
                )}

                {/* Daily Photos Gallery with lightbox capabilities */}
                {activeDetailReport.photos && activeDetailReport.photos.length > 0 && (
                  <div className="space-y-2 print-row-block no-print">
                    <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-amber-500" />
                      Sahadan Görseller & Fotoğraflar
                    </span>
                    <div className="grid grid-cols-4 gap-3">
                      {activeDetailReport.photos.map((url, idx) => (
                        <div
                          key={idx}
                          onClick={() => setLightboxIndex(idx)}
                          className="aspect-square relative rounded-xl overflow-hidden border border-gray-100 cursor-zoom-in bg-gray-50 hover:opacity-85 shadow-sm"
                        >
                          <img src={url} alt={`Sahadan Görsel ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer (Sticky, Safe Bottom Padding, Always Reachable) */}
              <div className="p-3 sm:p-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2.5 bg-white/95 backdrop-blur-md shrink-0">
                <div>
                  {onDeleteReport && (
                    <button
                      type="button"
                      onClick={() => {
                        const delId = activeDetailReport.id || activeDetailReport.date;
                        setDeletingReportId(delId);
                      }}
                      className="min-h-[44px] px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs transition active:scale-95 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Raporu Sil
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const editId = activeDetailReport.id || activeDetailReport.date;
                      setActiveDetailReport(null);
                      onEditReport(editId);
                    }}
                    className="min-h-[44px] px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs transition active:scale-95 flex items-center justify-center"
                  >
                    Raporu Düzenle
                  </button>
                  <button
                    onClick={() => setActiveDetailReport(null)}
                    className="min-h-[44px] px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-xs transition active:scale-95 flex items-center justify-center"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN PREMUIM PHOTO LIGHTBOX OVERLAY */}
      <AnimatePresence>
        {lightboxIndex !== null && activeDetailReport && (
          <div className="fixed inset-0 bg-black/95 z-[99] flex flex-col justify-between p-4 no-print select-none">
            {/* Lightbox Header */}
            <div className="flex justify-between items-center text-white p-2">
              <span className="text-xs font-mono font-bold">
                FOTOĞRAF {lightboxIndex + 1} / {activeDetailReport.photos.length} — {activeDetailReport.date}
              </span>
              <button
                onClick={() => setLightboxIndex(null)}
                className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Lightbox Center content */}
            <div className="flex-1 flex items-center justify-between gap-4 max-w-5xl mx-auto w-full">
              {/* Prev Button */}
              <button
                onClick={() => setLightboxIndex(prev => prev !== null && prev > 0 ? prev - 1 : (activeDetailReport.photos.length - 1))}
                className="p-3 bg-zinc-900/60 hover:bg-zinc-800 text-white rounded-full transition shrink-0 active:scale-95"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Main Image container */}
              <div className="flex-1 h-[70vh] relative flex justify-center items-center">
                <img
                  src={activeDetailReport.photos[lightboxIndex]}
                  alt="Enlarged"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-zinc-800/40"
                />
              </div>

              {/* Next Button */}
              <button
                onClick={() => setLightboxIndex(prev => prev !== null && prev < (activeDetailReport.photos.length - 1) ? prev + 1 : 0)}
                className="p-3 bg-zinc-900/60 hover:bg-zinc-800 text-white rounded-full transition shrink-0 active:scale-95"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Lightbox Footer thumbnails */}
            <div className="flex justify-center gap-2 overflow-x-auto py-4">
              {activeDetailReport.photos.map((url, idx) => (
                <div
                  key={idx}
                  onClick={() => setLightboxIndex(idx)}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 cursor-pointer transition ${lightboxIndex === idx ? 'border-amber-500 scale-105' : 'border-zinc-800 opacity-60 hover:opacity-100'
                    }`}
                >
                  <img src={url} alt="Thumbnail" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>



      {/* Date-Range Corporate PDF Report Generator Modal */}
      <PdfReportModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        reports={reports}
        settings={settings}
      />

      {/* AI Executive Summary Modal */}
      {aiModalReports && (
        <AiAnalysisModal
          isOpen={!!aiModalReports}
          onClose={() => setAiModalReports(null)}
          reports={aiModalReports}
          title={aiModalTitle}
        />
      )}
    </div>
  );
}
