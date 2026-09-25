'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { DailyReport, Furnace, AppSettings } from '@/lib/types';
import {
  FileText,
  Printer,
  X,
  Calendar,
  TrendingUp,
  Flame,
  Layers,
  Briefcase,
  CheckCircle,
  AlertTriangle,
  Wrench,
  Sparkles,
  Award,
  ShieldCheck,
  Building2,
  ChevronUp,
  ChevronDown,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: DailyReport[];
  settings: AppSettings | null;
}

export default function PdfReportModal({
  isOpen,
  onClose,
  reports,
  settings,
}: PdfReportModalProps) {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Raporların tarih aralığı
  const allDates = useMemo(() => {
    if (!reports || reports.length === 0) return [];
    return reports.map(r => r.date).filter(Boolean).sort();
  }, [reports]);

  const defaultStartDate = useMemo(() => {
    if (allDates.length > 0) return allDates[0];
    const d = new Date();
    d.setDate(d.getDate() - 13);
    return d.toISOString().split('T')[0];
  }, [allDates]);

  const defaultEndDate = useMemo(() => {
    if (allDates.length > 0) return allDates[allDates.length - 1];
    return new Date().toISOString().split('T')[0];
  }, [allDates]);

  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [endDate, setEndDate] = useState<string>(defaultEndDate);
  const [reportTitle, setReportTitle] = useState<string>('Dökümhane Operasyonel Değerlendirme Raporu');
  const [customSummary, setCustomSummary] = useState<string>('');
  const [executiveEvaluation, setExecutiveEvaluation] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Modal her açıldığında tarih aralığını en güncel rapor aralığına senkronize et
  useEffect(() => {
    if (isOpen && allDates.length > 0) {
      setStartDate(allDates[0]);
      setEndDate(allDates[allDates.length - 1]);
      setReportTitle('Genel Döküm Operasyonları Raporu');
    }
  }, [isOpen, allDates]);

  // Toggle Control Panel Collapse/Expand
  const [isControlsOpen, setIsControlsOpen] = useState<boolean>(true);

  // Branding & Document Metadata
  const [companyName, setCompanyName] = useState<string>('DÖKÜMHANE TAKİP SİSTEMİ');
  const [departmentName, setDepartmentName] = useState<string>('Ergitme & Metalürji Operasyonları');
  const [docClassification, setDocClassification] = useState<string>('YÖNETİCİ ÖZETİ');

  // Filter specific furnace in PDF
  const [selectedFurnaceId, setSelectedFurnaceId] = useState<string>('all');

  // Theme & Layout Customizations
  const [pdfTheme, setPdfTheme] = useState<'slate' | 'navy' | 'amber' | 'emerald'>('slate');
  const [fontScale, setFontScale] = useState<'normal' | 'compact'>('normal');

  // Individual section visibility toggles
  const [visibleSections, setVisibleSections] = useState({
    headerBranding: true,
    kpiCards: true,
    customSummary: true,
    furnaceBreakdown: true,
    moldBreakdown: true,
    dailyLogs: true,
    downtimesList: true,
    executiveNotes: true,
  });

  // Table Column Visibility Toggles
  const [tableColumns, setTableColumns] = useState({
    date: true,
    shift: true,
    description: true,
    tonnage: true,
    quantity: true,
    charges: true,
  });

  const themeClasses = useMemo(() => {
    switch (pdfTheme) {
      case 'navy':
        return {
          primaryText: 'text-blue-900',
          primaryBg: 'bg-blue-900',
          border: 'border-blue-900',
          lightBg: 'bg-blue-50/50',
          lightBorder: 'border-blue-100',
          accentText: 'text-blue-700',
          tableHeaderBg: 'bg-blue-50',
          textMuted: 'text-blue-600/80',
          iconColor: 'text-blue-900',
        };
      case 'amber':
        return {
          primaryText: 'text-amber-950',
          primaryBg: 'bg-amber-950',
          border: 'border-amber-950',
          lightBg: 'bg-amber-50/40',
          lightBorder: 'border-amber-100',
          accentText: 'text-amber-700',
          tableHeaderBg: 'bg-amber-50',
          textMuted: 'text-amber-600/80',
          iconColor: 'text-amber-800',
        };
      case 'emerald':
        return {
          primaryText: 'text-emerald-950',
          primaryBg: 'bg-emerald-950',
          border: 'border-emerald-950',
          lightBg: 'bg-emerald-50/40',
          lightBorder: 'border-emerald-100',
          accentText: 'text-emerald-700',
          tableHeaderBg: 'bg-emerald-50',
          textMuted: 'text-emerald-600/80',
          iconColor: 'text-emerald-850',
        };
      case 'slate':
      default:
        return {
          primaryText: 'text-slate-900',
          primaryBg: 'bg-slate-900',
          border: 'border-slate-900',
          lightBg: 'bg-slate-50',
          lightBorder: 'border-slate-200/80',
          accentText: 'text-slate-700',
          tableHeaderBg: 'bg-slate-100/70',
          textMuted: 'text-slate-500',
          iconColor: 'text-slate-900',
        };
    }
  }, [pdfTheme]);

  const toggleSection = (key: keyof typeof visibleSections) => {
    setVisibleSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleColumn = (key: keyof typeof tableColumns) => {
    setTableColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const insertFormatting = (prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = prefix + selectedText + suffix;

    setCustomSummary(
      text.substring(0, start) + replacement + text.substring(end)
    );

    // Refocus textarea and select the newly inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  };

  const handleGenerateAiSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const reportsToAnalyze = (filteredReports && filteredReports.length > 0)
        ? filteredReports
        : (reports && reports.length > 0 ? reports : []);

      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reports: reportsToAnalyze }),
      });
      const data = await res.json();
      if (data.success && (data.description || data.analysis)) {
        setCustomSummary(data.description || data.analysis);
      } else {
        setCustomSummary(`${startDate} - ${endDate} döneminde döküm ve ocak ergitme operasyonları planlanan programa uygun şekilde tamamlanmıştır.`);
      }
    } catch (err) {
      console.error('AI summary error:', err);
      setCustomSummary(`${startDate} - ${endDate} döneminde döküm ve ocak ergitme operasyonları planlanan programa uygun şekilde tamamlanmıştır.`);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const renderFormattedText = (text: string) => {
    if (!text) return null;
    
    // Split text by lines to keep paragraph formatting
    return text.split('\n').map((line, idx) => {
      // Simple HTML entities escape to prevent raw HTML execution
      let escaped = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      // Parse **bold** -> <strong>
      escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Parse *italic* -> <em>
      escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
      // Parse __underline__ -> <u>
      escaped = escaped.replace(/__(.*?)__/g, '<u>$1</u>');
      
      return (
        <span
          key={idx}
          className="block min-h-[1em] text-justify"
          dangerouslySetInnerHTML={{ __html: escaped }}
        />
      );
    });
  };

  // Quick preset handlers
  const handlePreset14Days = () => {
    setStartDate(defaultStartDate);
    setEndDate(todayStr);
    setReportTitle('14 Günlük Döküm Operasyon Raporu');
  };

  const handlePresetThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    setStartDate(firstDay);
    setEndDate(todayStr);
    setReportTitle(`${now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} Ayı Operasyon Raporu`);
  };

  const handlePresetLast30Days = () => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    setStartDate(d.toISOString().split('T')[0]);
    setEndDate(todayStr);
    setReportTitle('Son 30 Günlük Dökümhane Performans Raporu');
  };

  const handlePresetAllTime = () => {
    if (reports.length > 0) {
      const sortedDates = [...reports].map(r => r.date).sort();
      setStartDate(sortedDates[0]);
      setEndDate(sortedDates[sortedDates.length - 1]);
      setReportTitle('Genel Döküm Operasyonları Raporu');
    }
  };

  // Filter reports within the date range
  const filteredReports = useMemo(() => {
    return reports.filter(r => r.date >= startDate && r.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [reports, startDate, endDate]);

  // Aggregate Calculations
  const metrics = useMemo(() => {
    let totalTonnage = 0;
    let totalQty = 0;
    let totalCharges = 0;
    let totalMeltedKg = 0;
    let failureCount = 0;
    let maintenanceCount = 0;

    const furnaceStatsMap = new Map<string, {
      name: string;
      charges: number;
      meltedKg: number;
      hours: number;
    }>();

    // Initialize map with current settings furnaces
    if (settings?.furnaces) {
      settings.furnaces.forEach(f => {
        furnaceStatsMap.set(f.id, {
          name: f.name,
          charges: 0,
          meltedKg: 0,
          hours: 0,
        });
      });
    }

    const moldStatsMap = new Map<string, { moldType: string; quantity: number; tonnage: number }>();

    filteredReports.forEach(r => {
      // Belirli bir ocak filtrelenmişse ve o gün o ocakta döküm yapılmamışsa atla
      if (selectedFurnaceId !== 'all') {
        const hasFurnace = (r.furnaceRecords || []).some(f => f.furnaceId === selectedFurnaceId && f.chargeCount > 0);
        if (!hasFurnace) return;
      }

      // Production items
      r.productions.forEach(p => {
        totalTonnage += (p.tonnage || 0);
        totalQty += (p.quantity || 0);
        const mType = p.moldType || p.productName || 'Kum Kalıp';
        const cur = moldStatsMap.get(mType) || { moldType: mType, quantity: 0, tonnage: 0 };
        cur.quantity += (p.quantity || 0);
        cur.tonnage += (p.tonnage || 0);
        moldStatsMap.set(mType, cur);
      });

      // Furnace records
      r.furnaceRecords.forEach(f => {
        if (selectedFurnaceId !== 'all' && f.furnaceId !== selectedFurnaceId) return;

        totalCharges += (f.chargeCount || 0);
        totalMeltedKg += (f.meltedAmount || 0);

        const current = furnaceStatsMap.get(f.furnaceId) || {
          name: f.name || f.furnaceId,
          charges: 0,
          meltedKg: 0,
          hours: 0,
        };

        furnaceStatsMap.set(f.furnaceId, {
          name: f.name || current.name,
          charges: current.charges + (f.chargeCount || 0),
          meltedKg: current.meltedKg + (f.meltedAmount || 0),
          hours: current.hours + (f.workDuration || 0),
        });
      });

      // Arıza ve Duruşlar (downtimes + timeline)
      if (r.downtimes && r.downtimes.length > 0) {
        failureCount += r.downtimes.length;
      }
      r.timeline.forEach(t => {
        if (t.type === 'failure' || t.description.toLowerCase().includes('arıza')) {
          if (!r.downtimes || r.downtimes.length === 0) failureCount++;
        }
        if (t.type === 'maintenance' || t.description.toLowerCase().includes('bakım')) maintenanceCount++;
      });
    });

    return {
      totalTonnage,
      totalQty,
      totalCharges,
      totalMeltedKg,
      failureCount,
      maintenanceCount,
      furnaceBreakdown: Array.from(furnaceStatsMap.values()).filter(f => f.charges > 0 || f.meltedKg > 0),
      moldBreakdown: Array.from(moldStatsMap.values()).filter(m => m.quantity > 0 || m.tonnage > 0),
      totalDaysCount: filteredReports.length,
    };
  }, [filteredReports, settings, selectedFurnaceId]);

  const handlePrintPdf = () => {
    const printContent = document.getElementById('pdf-printable-area');
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
        <title>${reportTitle}</title>
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
          @media print {
            body {
              padding: 0 !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="printable-pdf-document">
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 pb-24 sm:pb-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md no-print"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-7xl max-h-[82vh] sm:max-h-[88vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col z-10"
        >
          {/* Header Bar */}
          <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0 no-print">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl shadow-lg shadow-amber-500/20">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white font-display">
                  Kurumsal PDF Rapor Oluşturucu
                </h2>
                <p className="text-xs text-slate-400">
                  Seçilen tarih aralığı için canlı önizlemeli operasyonel PDF raporu.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsControlsOpen(!isControlsOpen)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${isControlsOpen
                  ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                  }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">{isControlsOpen ? 'Ayarları Daralt' : 'Rapor Ayarları (Aç ⚙️)'}</span>
                {isControlsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={handlePrintPdf}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>PDF İndir / Yazdır</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Content Area: Split View Layout */}
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
            {/* Left Controls Side Panel */}
            {isControlsOpen && (
              <div className="p-4 sm:p-5 bg-slate-900 overflow-y-auto custom-scrollbar space-y-4 shrink-0 lg:w-[420px] max-h-[45vh] lg:max-h-none no-print">
                {/* Quick Presets */}
                <div className="flex items-center flex-wrap gap-2">
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mr-1">Hızlı Tarih:</span>
                  <button
                    type="button"
                    onClick={handlePreset14Days}
                    className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Son 14 Gün
                  </button>
                  <button
                    type="button"
                    onClick={handlePresetThisMonth}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    Bu Ay
                  </button>
                  <button
                    type="button"
                    onClick={handlePresetLast30Days}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    Son 30 Gün
                  </button>
                  <button
                    type="button"
                    onClick={handlePresetAllTime}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    Tüm Zamanlar
                  </button>
                </div>

                {/* Date Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Başlangıç Tarihi
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Bitiş Tarihi
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Firma / Logo Adı
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Departman / Birim
                    </label>
                    <input
                      type="text"
                      value={departmentName}
                      onChange={(e) => setDepartmentName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Belge Sınıflandırması
                    </label>
                    <input
                      type="text"
                      value={docClassification}
                      onChange={(e) => setDocClassification(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Rapor Başlığı
                  </label>
                  <input
                    type="text"
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                {/* Custom Manual Executive Summary Note */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      ✍️ Dönem Özel Özet Notu (Opsiyonel)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleGenerateAiSummary}
                        disabled={isGeneratingSummary}
                        className="px-2 py-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-md text-[10px] font-bold flex items-center gap-1 transition active:scale-95 disabled:opacity-50 shadow-xs cursor-pointer"
                      >
                        <Sparkles className={`w-3 h-3 ${isGeneratingSummary ? 'animate-spin' : 'text-amber-300'}`} />
                        <span>{isGeneratingSummary ? 'Oluşturuluyor...' : '✨ AI ile Oluştur'}</span>
                      </button>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => insertFormatting('**', '**')}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold rounded text-slate-300"
                          title="Kalın"
                        >
                          <b>K</b>
                        </button>
                        <button
                          type="button"
                          onClick={() => insertFormatting('*', '*')}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] italic rounded text-slate-300"
                          title="Eğik"
                        >
                          <i>E</i>
                        </button>
                        <button
                          type="button"
                          onClick={() => insertFormatting('__', '__')}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] underline rounded text-slate-300"
                          title="Altı Çizili"
                        >
                          <u>A</u>
                        </button>
                      </div>
                    </div>
                  </div>
                  <textarea
                    ref={textareaRef}
                    rows={3}
                    value={customSummary}
                    onChange={(e) => setCustomSummary(e.target.value)}
                    placeholder="Seçili metni K, E, A butonlarıyla kalın, eğik veya altı çizili yapabilirsiniz. Örnek: **kalın yazı**"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-500 font-medium resize-none"
                  />
                </div>

                {/* Executive & Quality Evaluation Note */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      🛡️ Yönetici & Kalite Değerlendirmesi (Opsiyonel)
                    </label>
                    {executiveEvaluation && (
                      <button
                        type="button"
                        onClick={() => setExecutiveEvaluation('')}
                        className="text-[10px] text-slate-400 hover:text-rose-400 transition"
                      >
                        Temizle
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    value={executiveEvaluation}
                    onChange={(e) => setExecutiveEvaluation(e.target.value)}
                    placeholder="Yönetici ve kalite onay notu (boş bırakılırsa raporda yer almaz)..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-500 font-medium resize-none"
                  />
                </div>

                {/* Advanced Filters & Customization Grid */}
                <div className="space-y-3 pt-2 border-t border-slate-800/80">
                  {/* Furnace Filter */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      🔥 Filtrelenecek Ocak
                    </label>
                    <select
                      value={selectedFurnaceId}
                      onChange={(e) => setSelectedFurnaceId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-500 font-medium"
                    >
                      <option value="all">Tüm Ocaklar (Genel)</option>
                      {(() => {
                        const map = new Map<string, string>();
                        (settings?.furnaces || []).forEach(f => map.set(f.id, f.name));
                        reports.forEach(r => {
                          (r.furnaceRecords || []).forEach(fr => {
                            if (!map.has(fr.furnaceId)) {
                              map.set(fr.furnaceId, fr.name || fr.furnaceId);
                            }
                          });
                        });
                        return Array.from(map.entries()).map(([id, name]) => (
                          <option key={id} value={id}>{name}</option>
                        ));
                      })()}
                    </select>
                  </div>

                  {/* Font Scale / Density */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      📐 Yazı Boyutu & Sayfa Yoğunluğu
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFontScale('normal')}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition border ${fontScale === 'normal'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                      >
                        Standart
                      </button>
                      <button
                        type="button"
                        onClick={() => setFontScale('compact')}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition border ${fontScale === 'compact'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                      >
                        Sıkışık (A4)
                      </button>
                    </div>
                  </div>

                  {/* Color Theme */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      🎨 Renk Teması
                    </label>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPdfTheme('slate')}
                        className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold transition border ${pdfTheme === 'slate' ? 'bg-slate-700 border-white text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                      >
                        Slate
                      </button>
                      <button
                        type="button"
                        onClick={() => setPdfTheme('navy')}
                        className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold transition border ${pdfTheme === 'navy' ? 'bg-blue-900 border-blue-400 text-blue-200' : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                      >
                        Navy
                      </button>
                      <button
                        type="button"
                        onClick={() => setPdfTheme('amber')}
                        className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold transition border ${pdfTheme === 'amber' ? 'bg-amber-900/60 border-amber-400 text-amber-200' : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                      >
                        Amber
                      </button>
                      <button
                        type="button"
                        onClick={() => setPdfTheme('emerald')}
                        className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold transition border ${pdfTheme === 'emerald' ? 'bg-emerald-900/60 border-emerald-400 text-emerald-200' : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                      >
                        Yeşil
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section Visibility Toggles */}
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                    👁️ Rapor Bölümleri Görünürlüğü:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleSection('kpiCards')}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 border ${visibleSections.kpiCards
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                        : 'bg-slate-950 border-slate-800 text-slate-500 line-through opacity-60'
                        }`}
                    >
                      <TrendingUp className="w-3 h-3" />
                      <span>Özet KPI</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleSection('customSummary')}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 border ${visibleSections.customSummary
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                        : 'bg-slate-950 border-slate-800 text-slate-500 line-through opacity-60'
                        }`}
                    >
                      <FileText className="w-3 h-3" />
                      <span>Elle Not</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleSection('furnaceBreakdown')}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 border ${visibleSections.furnaceBreakdown
                        ? 'bg-orange-500/10 border-orange-500/40 text-orange-400'
                        : 'bg-slate-950 border-slate-800 text-slate-500 line-through opacity-60'
                        }`}
                    >
                      <Flame className="w-3 h-3" />
                      <span>Ocak Tablosu</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleSection('moldBreakdown')}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 border ${visibleSections.moldBreakdown
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                        : 'bg-slate-950 border-slate-800 text-slate-500 line-through opacity-60'
                        }`}
                    >
                      <Briefcase className="w-3 h-3" />
                      <span>Kalıp Dağılımı</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleSection('dailyLogs')}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 border ${visibleSections.dailyLogs
                        ? 'bg-blue-500/10 border-blue-500/40 text-blue-400'
                        : 'bg-slate-950 border-slate-800 text-slate-500 line-through opacity-60'
                        }`}
                    >
                      <Layers className="w-3 h-3" />
                      <span>Günlük Loglar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleSection('downtimesList')}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 border ${visibleSections.downtimesList
                        ? 'bg-rose-500/10 border-rose-500/40 text-rose-400'
                        : 'bg-slate-950 border-slate-800 text-slate-500 line-through opacity-60'
                        }`}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      <span>Arıza / Duruşlar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleSection('executiveNotes')}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 border ${visibleSections.executiveNotes
                        ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400'
                        : 'bg-slate-950 border-slate-800 text-slate-500 line-through opacity-60'
                        }`}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>Yönetici & Kalite</span>
                    </button>
                  </div>
                </div>

                {/* Table Column Toggles */}
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                    📊 Operasyon Tablosu Sütunları:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries({
                      date: 'Tarih',
                      shift: 'Çalışma Saatleri',
                      description: 'Notlar',
                      tonnage: 'Ağırlık (kg)',
                      quantity: 'Adet',
                      charges: 'Şarj'
                    }).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleColumn(key as keyof typeof tableColumns)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition border ${tableColumns[key as keyof typeof tableColumns]
                          ? 'bg-slate-800 border-slate-700 text-slate-200'
                          : 'bg-slate-950 border-slate-900 text-slate-600 line-through'
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Right PDF Live Preview Container Area */}
            <div className="flex-1 p-4 sm:p-8 overflow-y-auto custom-scrollbar space-y-6 bg-slate-950/60">
              <div className={`max-w-4xl mx-auto bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200 font-sans printable-pdf-document ${fontScale === 'compact' ? 'p-4 sm:p-6 text-[11px] leading-tight space-y-4' : 'p-6 sm:p-10 text-xs leading-normal space-y-6'
                }`} id="pdf-printable-area">

                {/* PRINT ONLY STYLING */}
                <style jsx global>{`
                @media print {
                  @page {
                    size: A4 portrait;
                    margin: 10mm 12mm;
                  }
                  body * {
                    visibility: hidden !important;
                  }
                  .printable-pdf-document,
                  .printable-pdf-document * {
                    visibility: visible !important;
                  }
                  .printable-pdf-document {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    background: white !important;
                    color: black !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                  .pdf-page-break {
                    page-break-before: always !important;
                  }
                  tr {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                  }
                  td, th {
                    word-break: break-word !important;
                    overflow-wrap: anywhere !important;
                    white-space: normal !important;
                  }
                  .pdf-avoid-break {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                  }
                }
              `}</style>

                {/* PDF HEADER SECTION */}
                <div className={`flex justify-between items-start border-b-2 ${themeClasses.border} pb-6 mb-6`}>
                  <div>
                    <div className="flex items-center gap-2 font-extrabold text-lg font-display tracking-tight text-slate-900">
                      <Building2 className={`w-6 h-6 ${themeClasses.iconColor}`} />
                      <span className="uppercase">{companyName}</span>
                      {docClassification && (
                        <span className="ml-2 px-2 py-0.5 bg-slate-900 text-white rounded text-[9px] font-extrabold uppercase tracking-wider">
                          {docClassification}
                        </span>
                      )}
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-2 font-display leading-tight">
                      {reportTitle}
                    </h1>
                    <p className={`text-xs ${themeClasses.textMuted} font-medium mt-1`}>
                      {departmentName}
                    </p>
                  </div>

                  <div className="text-right text-xs font-mono space-y-1 shrink-0">
                    <div className={`px-3 py-1 ${themeClasses.lightBg} border ${themeClasses.lightBorder} rounded-lg text-[10px] font-bold ${themeClasses.primaryText}`}>
                      KOD: DKS-RPR-{startDate ? startDate.replace(/-/g, '') : '2026'}
                    </div>
                    <p className="text-slate-500 text-[10px] pt-1">Tarih Aralığı:</p>
                    <p className="font-extrabold text-slate-900 text-xs">{startDate} / {endDate}</p>
                    <p className="text-[10px] text-slate-400">Raporlanan Gün: {metrics.totalDaysCount} Gün</p>
                  </div>
                </div>

                {/* KPI SUMMARY CARDS */}
                {visibleSections.kpiCards && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className={`p-4 ${themeClasses.lightBg} border ${themeClasses.lightBorder} rounded-xl`}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Toplam Üretim</span>
                      <p className="text-xl font-bold text-slate-900 font-mono mt-1">
                        {metrics.totalTonnage.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-slate-500 font-sans font-normal">kg</span>
                      </p>
                      <p className={`text-[10px] ${themeClasses.textMuted} font-medium mt-1`}>
                        {metrics.totalQty.toLocaleString('tr-TR')} Adet Döküm
                      </p>
                    </div>

                    <div className={`p-4 ${themeClasses.lightBg} border ${themeClasses.lightBorder} rounded-xl`}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ergitme Şarjı</span>
                      <p className="text-xl font-bold text-slate-900 font-mono mt-1">
                        {metrics.totalCharges} <span className="text-xs text-slate-500 font-sans font-normal">Şarj</span>
                      </p>
                      <p className={`text-[10px] ${themeClasses.textMuted} font-medium mt-1`}>
                        {metrics.totalMeltedKg.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg Sıvı Metal
                      </p>
                    </div>

                    <div className={`p-4 ${themeClasses.lightBg} border ${themeClasses.lightBorder} rounded-xl`}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Olay Kayıtları</span>
                      <p className="text-xl font-bold text-slate-900 font-mono mt-1">
                        {metrics.failureCount + metrics.maintenanceCount} <span className="text-xs text-slate-500 font-sans font-normal">Kayıt</span>
                      </p>
                      <p className={`text-[10px] ${themeClasses.textMuted} font-medium mt-1`}>
                        {metrics.failureCount} Arıza / {metrics.maintenanceCount} Bakım
                      </p>
                    </div>
                  </div>
                )}

                {/* MANUALLY ENTERED EXECUTIVE SUMMARY / CUSTOM NOTES */}
                {visibleSections.customSummary && customSummary.trim() && (
                  <div className={`mb-6 p-4 ${themeClasses.lightBg} border ${themeClasses.lightBorder} rounded-xl break-words overflow-hidden w-full pdf-avoid-break`} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display mb-1.5 flex items-center gap-1.5 border-b border-slate-200/60 pb-1">
                      <FileText className={`w-4 h-4 ${themeClasses.iconColor}`} />
                      Dönem Operasyonel Özet & Yönetici Değerlendirme Notu
                    </h3>
                    <div className="text-xs text-slate-800 leading-relaxed font-sans text-justify space-y-1.5 break-words overflow-hidden w-full">
                      {renderFormattedText(customSummary)}
                    </div>
                  </div>
                )}

                {/* FURNACE BREAKDOWN TABLE */}
                {visibleSections.furnaceBreakdown && metrics.furnaceBreakdown.length > 0 && (
                  <div className="mb-6 space-y-2">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                      <Flame className="w-4 h-4 text-slate-700" />
                      Ocak Bazlı Ergitme Performansı
                    </h3>

                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className={`${themeClasses.tableHeaderBg} border-y ${themeClasses.lightBorder} text-[10px] text-slate-600 font-bold uppercase`}>
                          <th className="py-2 px-3">Ocak Adı</th>
                          <th className="py-2 px-3 text-right">Toplam Şarj</th>
                          <th className="py-2 px-3 text-right">Eritilen Metal (kg)</th>
                          <th className="py-2 px-3 text-right">Ortalama / Şarj</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {metrics.furnaceBreakdown.map((f, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-bold font-sans text-slate-900">{f.name}</td>
                            <td className="py-2 px-3 text-right text-slate-900 font-bold">{f.charges} Şarj</td>
                            <td className="py-2 px-3 text-right text-slate-800">{f.meltedKg.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</td>
                            <td className="py-2 px-3 text-right text-slate-800 font-semibold">{f.charges > 0 ? Math.round(f.meltedKg / f.charges).toLocaleString('tr-TR') : 0} kg/şarj</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* MOLD BREAKDOWN TABLE */}
                {visibleSections.moldBreakdown && metrics.moldBreakdown.length > 0 && (
                  <div className="mb-6 space-y-2 pdf-avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                      <Briefcase className={`w-4 h-4 ${themeClasses.iconColor}`} />
                      Dökülen Kalıp Türleri & Ağırlık Dağılımı
                    </h3>

                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className={`${themeClasses.tableHeaderBg} border-y ${themeClasses.lightBorder} text-[10px] text-slate-600 font-bold uppercase`}>
                          <th className="py-2 px-3">Kalıp Türü</th>
                          <th className="py-2 px-3 text-right">Dökülen Adet</th>
                          <th className="py-2 px-3 text-right">Toplam Ağırlık (kg)</th>
                          <th className="py-2 px-3 text-right">Oran (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {metrics.moldBreakdown.map((m, idx) => {
                          const percent = metrics.totalTonnage > 0
                            ? ((m.tonnage / metrics.totalTonnage) * 100).toFixed(1)
                            : '0';
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-bold font-sans text-slate-900">{m.moldType}</td>
                              <td className="py-2 px-3 text-right text-slate-900 font-bold">{m.quantity.toLocaleString('tr-TR')} Adet</td>
                              <td className="py-2 px-3 text-right text-slate-800">{m.tonnage.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900">%{percent}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* DAILY OPERATIONS LOG TABLE */}
                {visibleSections.dailyLogs && (
                  <div className="mb-6 space-y-2">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                      <Layers className={`w-4 h-4 ${themeClasses.iconColor}`} />
                      Günlük Operasyon Kayıtları ({filteredReports.length} Gün)
                    </h3>

                    {filteredReports.length === 0 ? (
                      <div className={`p-6 text-center text-slate-400 text-xs ${themeClasses.lightBg} rounded-xl border border-dashed ${themeClasses.lightBorder}`}>
                        Seçilen tarih aralığında kaydedilmiş operasyon raporu bulunamadı.
                      </div>
                    ) : (
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className={`${themeClasses.tableHeaderBg} border-y ${themeClasses.lightBorder} text-[10px] text-slate-600 font-bold uppercase`}>
                            {tableColumns.date && <th className="py-2 px-3">Tarih</th>}
                            {tableColumns.shift && <th className="py-2 px-3">Çalışma Saatleri</th>}
                            {tableColumns.description && <th className="py-2 px-3">Genel Özet / Notlar</th>}
                            {tableColumns.tonnage && <th className="py-2 px-3 text-right">Dökülen Ağırlık</th>}
                            {tableColumns.quantity && <th className="py-2 px-3 text-right">Adet</th>}
                            {tableColumns.charges && <th className="py-2 px-3 text-right">Şarj</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredReports
                            .filter(r => selectedFurnaceId === 'all' || (r.furnaceRecords || []).some(f => f.furnaceId === selectedFurnaceId && f.chargeCount > 0))
                            .map((r) => {
                            const dayTonnage = selectedFurnaceId === 'all'
                              ? r.productions.reduce((s, p) => s + (p.tonnage || 0), 0)
                              : (r.furnaceRecords.find(f => f.furnaceId === selectedFurnaceId)?.meltedAmount || 0);
                            const dayQty = r.productions.reduce((s, p) => s + (p.quantity || 0), 0);
                            const dayCharges = r.furnaceRecords
                              .filter(f => selectedFurnaceId === 'all' || f.furnaceId === selectedFurnaceId)
                              .reduce((s, f) => s + (f.chargeCount || 0), 0);
                            const shiftDisplay = r.shiftHours?.startTime && r.shiftHours?.endTime 
                              ? `${r.shiftHours.startTime} - ${r.shiftHours.endTime}` 
                              : (r.shift || '-');

                            return (
                              <tr key={r.id} className="hover:bg-slate-50/50">
                                {tableColumns.date && <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">{r.date}</td>}
                                {tableColumns.shift && (
                                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                                    <div className="font-semibold text-slate-900">{shiftDisplay}</div>
                                    {r.personnel?.supervisorName && (
                                      <div className="text-[10px] text-blue-700">Amir: {r.personnel.supervisorName}</div>
                                    )}
                                    {typeof r.personnel?.totalCount === 'number' && (
                                      <div className="text-[9px] text-slate-400">👥 {r.personnel.totalCount} Personel</div>
                                    )}
                                  </td>
                                )}
                                {tableColumns.description && (
                                  <td className="py-2.5 px-3 text-slate-700 break-words whitespace-pre-wrap min-w-[200px] leading-relaxed">
                                    <div>{r.description || r.notes || 'Açıklama girilmemiş.'}</div>
                                    {r.downtimes && r.downtimes.length > 0 && (
                                      <div className="text-[10px] text-rose-600 font-semibold mt-1">
                                        ⚠️ {r.downtimes.reduce((s, d) => s + (Number(d.durationMinutes) || 0), 0)} dk arıza/duruş
                                      </div>
                                    )}
                                  </td>
                                )}
                                {tableColumns.tonnage && (
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                    {dayTonnage.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                                  </td>
                                )}
                                {tableColumns.quantity && (
                                  <td className="py-2.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                                    {dayQty}
                                  </td>
                                )}
                                {tableColumns.charges && (
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                    {dayCharges}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* DOWNTIMES SUMMARY TABLE */}
                {visibleSections.downtimesList && (
                  <div className="mb-6 space-y-2 pdf-avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                      <AlertTriangle className={`w-4 h-4 ${themeClasses.iconColor}`} />
                      Arıza ve Duruş Tutanakları (Downtime Özeti)
                    </h3>

                    {filteredReports.flatMap(r => r.downtimes || []).length === 0 ? (
                      <div className={`p-4 text-center text-slate-400 text-xs ${themeClasses.lightBg} rounded-xl border border-dashed ${themeClasses.lightBorder}`}>
                        Bu rapor döneminde kayıtlı arıza veya duruş olayı bulunmamaktadır.
                      </div>
                    ) : (
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className={`${themeClasses.tableHeaderBg} border-y ${themeClasses.lightBorder} text-[10px] text-slate-600 font-bold uppercase`}>
                            <th className="py-2 px-3">Tarih</th>
                            <th className="py-2 px-3">Ocak / Hat</th>
                            <th className="py-2 px-3">Kategori</th>
                            <th className="py-2 px-3 text-center">Zaman</th>
                            <th className="py-2 px-3 text-center">Süre (dk)</th>
                            <th className="py-2 px-3">Arıza Tanımı & Müdahale</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredReports.flatMap(r => (r.downtimes || []).map(dt => ({ ...dt, reportDate: r.date, reportShift: r.shift }))).map((dt, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                                {dt.reportDate}
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">
                                {dt.furnaceName || 'Tüm Tesis'}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-100 text-[10px] font-bold">
                                  {dt.category}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center font-mono whitespace-nowrap text-slate-600">
                                {dt.startTime} - {dt.endTime}
                              </td>
                              <td className="py-2 px-3 text-center font-mono font-bold text-rose-700 whitespace-nowrap">
                                {dt.durationMinutes} dk
                              </td>
                              <td className="py-2 px-3 text-slate-700 leading-relaxed">
                                <span className="font-medium text-slate-900">{dt.description}</span>
                                {dt.actionTaken && (
                                  <span className="text-[11px] text-slate-500 block mt-0.5">
                                    Müdahale: {dt.actionTaken} ({dt.technician || 'Ekip'})
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* EXECUTIVE EVALUATION */}
                {visibleSections.executiveNotes && executiveEvaluation.trim() && (
                  <div className="mb-6 pdf-avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className={`p-4 ${themeClasses.lightBg} border ${themeClasses.lightBorder} rounded-xl space-y-1.5 pdf-avoid-break`} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className={`w-3.5 h-3.5 ${themeClasses.iconColor}`} />
                        Yönetici & Kalite Değerlendirmesi
                      </h4>
                      <p className="text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                        {executiveEvaluation}
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-200 text-center text-[9px] text-slate-400 font-mono pdf-avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  Bu belge {companyName || 'Döküm Takip Sistemi'} tarafından otomatik olarak oluşturulmuştur. Bu bilgiler gönderenin izni olmadan paylaşılamaz.
                </div>
              </div>
            </div>
          </div>

          {/* Modal Sticky Footer */}
          <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0 no-print">
            <span className="text-xs text-slate-400 hidden sm:inline font-mono">
              {filteredReports.length} rapor dahil edildi
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handlePrintPdf}
                className="flex-1 sm:flex-none min-h-[44px] px-5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Yazdır / PDF İndir</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none min-h-[44px] px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition active:scale-95 border border-slate-700 flex items-center justify-center"
              >
                Kapat
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
