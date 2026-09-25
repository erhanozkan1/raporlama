'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  DailyReport,
  AppSettings,
  TimelineEvent,
  ProductionItem,
  DailyFurnaceRecord,
  FurnaceStatus,
  ShiftPersonnel,
  DowntimeRecord,
  DowntimeCategory,
  ShiftHours,
  ShiftHandover
} from '@/lib/types';
import ModernSelect from './ui/ModernSelect';
import {
  Plus,
  Trash2,
  Save,
  Camera,
  X,
  Clock,
  Info,
  Loader2,
  Tag,
  Check,
  AlertCircle,
  Flame,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Users,
  AlertTriangle,
  Wrench,
  ShieldAlert,
  ArrowRightLeft,
  UserCheck,
  Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReportFormViewProps {
  initialDate?: string | null;
  reports: DailyReport[];
  settings: AppSettings | null;
  onSave: (report: DailyReport) => Promise<{ success: boolean; error?: string } | boolean | void> | void;
  onCancel?: () => void;
}

const DOWNTIME_CATEGORIES: DowntimeCategory[] = [
  'Mekanik Arıza',
  'Elektrik / Otomasyon',
  'Refrakter / Astar',
  'Kalıp / Maça',
  'Enerji / Yakıt Kesintisi',
  'Hammadde / Metal Bekleme',
  'İSG / Operasyonel Duruş',
  'Planlı Bakım',
  'Diğer'
];

export default function ReportFormView({
  initialDate,
  reports,
  settings,
  onSave,
  onCancel
}: ReportFormViewProps) {
  // Sihirbaz adım durumu (1-6)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  // Tarih ve id
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);
  const [currentReportId, setCurrentReportId] = useState<string>('');

  // Yardımcı: Rapor tarihine göre fırının geçerli durumu
  const getFurnaceStatusForDate = (furnace: import('@/lib/types').Furnace, date: string): FurnaceStatus => {
    const history = furnace.statusHistory;
    if (!history || history.length === 0) return furnace.status;
    const applicable = history
      .filter(h => h.date <= date)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (applicable.length === 0) return furnace.status;
    return applicable[applicable.length - 1].status;
  };

  // Form durumları - Temel
  const [shift, setShift] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [productions, setProductions] = useState<ProductionItem[]>([]);
  const [furnaceRecords, setFurnaceRecords] = useState<DailyFurnaceRecord[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [handoverJobs, setHandoverJobs] = useState<string>('');
  const [managerEvaluation, setManagerEvaluation] = useState<string>('');

  // Vardiya Ekibi & Çalışma Saatleri
  const [personnel, setPersonnel] = useState<ShiftPersonnel>({
    supervisorName: '',
    totalCount: 4,
    absentCount: 0,
    breakdown: {},
    notes: '',
  });

  const [shiftHours, setShiftHours] = useState<ShiftHours>({
    startTime: '09:00',
    endTime: '17:00',
    plannedDurationHours: 8,
    breakDurationMinutes: 60,
    totalDowntimeMinutes: 0,
    netWorkDurationHours: 7,
  });

  // Arıza ve Duruş Kayıtları (YENİ)
  const [downtimes, setDowntimes] = useState<DowntimeRecord[]>([]);

  // Sunucu Kaydetme ve Hata Durumları
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Yapılandırılmış Vardiya Devir Teslim (YENİ)
  const [handoverDetails, setHandoverDetails] = useState<ShiftHandover>({
    liquidMetalStatus: '',
    waitingMolds: '',
    criticalSafetyNotes: '',
    instructionsForNextShift: '',
    handedOverBy: '',
    receivedBy: '',
  });

  // Etiket ekleme ve yükleme durumları
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isGeneratingAiSummary, setIsGeneratingAiSummary] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadedKeyRef = useRef<string | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Toplam duruş süresi hesaplama
  const totalDowntimeMinutes = useMemo(() => {
    return downtimes.reduce((sum, d) => sum + (Number(d.durationMinutes) || 0), 0);
  }, [downtimes]);

  // Net çalışma süresi hesaplama (Saat cinsinden)
  const netWorkDurationHours = useMemo(() => {
    const plannedMinutes = (Number(shiftHours.plannedDurationHours) || 8) * 60;
    const breakMinutes = Number(shiftHours.breakDurationMinutes) || 0;
    const netMins = Math.max(0, plannedMinutes - breakMinutes - totalDowntimeMinutes);
    return parseFloat((netMins / 60).toFixed(1));
  }, [shiftHours.plannedDurationHours, shiftHours.breakDurationMinutes, totalDowntimeMinutes]);

  // Hızlı Vardiya Hazır Şablonları (Tek Tıkla Saat Doldurma)
  // Başlangıç ve bitiş saatine göre süre hesaplama (gece devri dahil)
  const calculateDurationBetween = (start: string, end: string): number => {
    if (!start || !end) return 8;
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return 8;
    let diff = (eH * 60 + eM) - (sH * 60 + sM);
    if (diff <= 0) diff += 24 * 60;
    return parseFloat((diff / 60).toFixed(1));
  };

  // AI İle Vardiya Genel Açıklaması (Rapor Özeti) Üretme
  const handleGenerateFormAiSummary = async () => {
    setIsGeneratingAiSummary(true);
    try {
      const currentDraft: DailyReport = {
        id: currentReportId || selectedDate,
        date: selectedDate,
        shift: `${shiftHours.startTime} - ${shiftHours.endTime}`,
        description,
        timeline,
        productions,
        furnaceRecords,
        personnel,
        downtimes,
        shiftHours,
        notes,
        tags: selectedTags,
        photos,
        createdAt: '',
        updatedAt: '',
      };

      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reports: [currentDraft] }),
      });

      const data = await res.json();
      if (data.success && (data.description || data.analysis)) {
        setDescription(data.description || data.analysis);
      } else {
        throw new Error('API yanıt vermedi');
      }
    } catch (err) {
      console.warn('Form AI summary fallback devreye girdi:', err);
      // Yerel akıllı yedek: API kapalı olsa dahi anında mükemmel açıklama üretir
      const totalKg = productions.reduce((s, p) => s + (p.tonnage || 0), 0);
      const totalAdet = productions.reduce((s, p) => s + (p.quantity || 0), 0);
      const totalCharges = furnaceRecords.reduce((s, f) => s + (f.chargeCount || 0), 0);
      const moldTypes = Array.from(new Set(productions.map(p => p.moldType || 'Kum Kalıp'))).join(', ') || 'Kum Kalıp';
      const totalDowntime = downtimes.reduce((s, d) => s + (Number(d.durationMinutes) || 0), 0);
      
      let fallbackDesc = `${shiftHours.startTime} - ${shiftHours.endTime} vardiyasında`;
      if (totalCharges > 0) fallbackDesc += ` ${totalCharges} şarj ergitme ile`;
      if (totalAdet > 0 || totalKg > 0) fallbackDesc += ` toplam ${totalAdet} adet ${moldTypes} (${totalKg.toLocaleString('tr-TR')} kg) dökümü tamamlanmıştır.`;
      else fallbackDesc += ` döküm ve ergitme operasyonları yürütülmüştür.`;

      if (totalDowntime > 0) fallbackDesc += ` Vardiya süresince ${totalDowntime} dk duruş kaydedilmiştir.`;
      else fallbackDesc += ` Vardiya boyunca herhangi bir duruş veya arıza yaşanmamıştır.`;

      setDescription(fallbackDesc);
    } finally {
      setIsGeneratingAiSummary(false);
    }
  };

  // Başlangıç saati değiştiğinde süreyi canlı güncelle
  const handleStartTimeChange = (val: string) => {
    setShiftHours(prev => {
      const calcHours = calculateDurationBetween(val, prev.endTime);
      return {
        ...prev,
        startTime: val,
        plannedDurationHours: calcHours,
      };
    });
  };

  // Bitiş saati değiştiğinde süreyi canlı güncelle
  const handleEndTimeChange = (val: string) => {
    setShiftHours(prev => {
      const calcHours = calculateDurationBetween(prev.startTime, val);
      return {
        ...prev,
        endTime: val,
        plannedDurationHours: calcHours,
      };
    });
  };

  // Rapor verisini yükle veya sıfırla
  useEffect(() => {
    const initialReport = initialDate ? reports.find(r => r.id === initialDate || r.date === initialDate) : null;
    const targetDate = initialReport ? initialReport.date : selectedDate;

    const currentKey = `${initialDate || 'new'}:${targetDate}`;
    if (loadedKeyRef.current === currentKey) return;

    const timer = setTimeout(() => {
      const existingReport = initialReport || reports.find(r => r.date === targetDate);

      if (existingReport) {
        setCurrentReportId(existingReport.id);
        setSelectedDate(existingReport.date);
        setShift(existingReport.shift || `${existingReport.shiftHours?.startTime || '08:00'} - ${existingReport.shiftHours?.endTime || '16:00'}`);
        setDescription(existingReport.description || '');
        setTimeline(existingReport.timeline || []);
        setProductions(existingReport.productions || []);
        setNotes(existingReport.notes || '');
        setSelectedTags(existingReport.tags || []);
        setPhotos(existingReport.photos || []);
        setHandoverJobs(existingReport.handoverJobs || '');
        setManagerEvaluation(existingReport.managerEvaluation || '');

        // Vardiya Ekibi Yükle
        if (existingReport.personnel) {
          setPersonnel({
            supervisorName: existingReport.personnel.supervisorName || '',
            totalCount: existingReport.personnel.totalCount || 0,
            absentCount: existingReport.personnel.absentCount || 0,
            breakdown: existingReport.personnel.breakdown || {},
            notes: existingReport.personnel.notes || '',
          });
        }

        // Çalışma Saatleri Yükle
        if (existingReport.shiftHours) {
          setShiftHours({
            startTime: existingReport.shiftHours.startTime || '09:00',
            endTime: existingReport.shiftHours.endTime || '17:00',
            plannedDurationHours: existingReport.shiftHours.plannedDurationHours || 8,
            breakDurationMinutes: existingReport.shiftHours.breakDurationMinutes ?? 60,
            totalDowntimeMinutes: existingReport.shiftHours.totalDowntimeMinutes || 0,
            netWorkDurationHours: existingReport.shiftHours.netWorkDurationHours || 7,
          });
        }

        // Duruş/Arıza Yükle
        setDowntimes(existingReport.downtimes || []);

        // Devir Teslim Yükle
        if (existingReport.handoverDetails) {
          setHandoverDetails({
            liquidMetalStatus: existingReport.handoverDetails.liquidMetalStatus || '',
            waitingMolds: existingReport.handoverDetails.waitingMolds || '',
            criticalSafetyNotes: existingReport.handoverDetails.criticalSafetyNotes || '',
            instructionsForNextShift: existingReport.handoverDetails.instructionsForNextShift || existingReport.handoverJobs || '',
            handedOverBy: existingReport.handoverDetails.handedOverBy || existingReport.personnel?.supervisorName || '',
            receivedBy: existingReport.handoverDetails.receivedBy || '',
          });
        } else if (existingReport.handoverJobs) {
          setHandoverDetails(prev => ({
            ...prev,
            instructionsForNextShift: existingReport.handoverJobs || '',
          }));
        }

        const loadedRecords = (existingReport.furnaceRecords || []).map(rec => ({ ...rec }));
        if (settings?.furnaces) {
          settings.furnaces.forEach(f => {
            const exists = loadedRecords.some(r => r.furnaceId === f.id);
            const status = getFurnaceStatusForDate(f, targetDate);
            // Sadece fırın o tarihte aktifse (Kullanım Dışı DEĞİLSE) otomatik ekle
            if (!exists && status !== 'Kullanım Dışı') {
              loadedRecords.push({
                furnaceId: f.id,
                name: f.name,
                capacity: f.capacity,
                status: status,
                chargeCount: 0,
                meltedAmount: 0,
                fuelConsumption: 0,
                workDuration: 0,
                description: '',
              });
            }
          });
        }
        setFurnaceRecords(loadedRecords);
      } else {
        setSelectedDate(targetDate);
        setShift('09:00 - 17:00');
        setCurrentReportId(`report-${targetDate}-${Math.random().toString(36).substring(2, 7)}`);
        setDescription('');
        setTimeline([
          { id: '1', time: '09:00', description: 'Çalışma başladı, iş güvenliği ve ocak kontrolleri yapıldı.', type: 'other' },
          { id: '2', time: '17:00', description: 'Günlük operasyon tamamlandı.', type: 'other' },
        ]);
        setProductions([]);
        setNotes('');
        setSelectedTags([]);
        setPhotos([]);
        setHandoverJobs('');
        setManagerEvaluation('');
        setDowntimes([]);
        setPersonnel({
          supervisorName: '',
          totalCount: 4,
          absentCount: 0,
          breakdown: {},
          notes: '',
        });
        setShiftHours({
          startTime: '09:00',
          endTime: '17:00',
          plannedDurationHours: 8,
          breakDurationMinutes: 60,
          totalDowntimeMinutes: 0,
          netWorkDurationHours: 7,
        });
        setHandoverDetails({
          liquidMetalStatus: '',
          waitingMolds: '',
          criticalSafetyNotes: '',
          instructionsForNextShift: '',
          handedOverBy: '',
          receivedBy: '',
        });

        if (settings?.furnaces) {
          // Yeni günlük raporda yalnızca aktif olan (Kullanım Dışı olmayan) ocakları getir
          const activeFurnaces = settings.furnaces.filter(f => {
            const status = getFurnaceStatusForDate(f, targetDate);
            return status !== 'Kullanım Dışı';
          });
          const initialFurnaces = activeFurnaces.map(f => ({
            furnaceId: f.id,
            name: f.name,
            capacity: f.capacity,
            status: getFurnaceStatusForDate(f, targetDate),
            chargeCount: 0,
            meltedAmount: 0,
            fuelConsumption: 0,
            workDuration: 0,
            description: '',
          }));
          setFurnaceRecords(initialFurnaces);
        } else {
          setFurnaceRecords([]);
        }
      }
      loadedKeyRef.current = currentKey;
    }, 0);

    return () => clearTimeout(timer);
  }, [selectedDate, shift, initialDate, reports, settings]);

  // Sayfa açıldığında eski yerel taslak varsa temizle (çakışmaları önlemek için)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('dokum_active_form_draft');
    } catch {
      // Hata durumunda yoksay
    }
  }, []);

  // Ürün Listesi İşlemleri
  const addProductionRow = () => {
    const nextId = Math.random().toString(36).substring(2, 9);
    setProductions(prev => [...prev, {
      id: nextId,
      productName: 'Kum Kalıp',
      productCode: '',
      moldType: 'Kum Kalıp',
      quantity: 1,
      tonnage: 0,
      description: '',
    }]);
  };

  const removeProductionRow = (id: string) => {
    setProductions(prev => prev.filter(item => item.id !== id));
  };

  const updateProductionRow = (id: string, field: keyof ProductionItem, value: any) => {
    setProductions(prev => prev.map(item => {
      if (item.id === id) {
        let val = value;
        if (field === 'quantity') val = parseInt(value) || 0;
        else if (field === 'tonnage') val = parseFloat(value) || 0;
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

  const updateProductionFields = (id: string, fields: Partial<ProductionItem>) => {
    setProductions(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...fields };
        if ('quantity' in fields) updated.quantity = parseInt(fields.quantity as any) || 0;
        if ('tonnage' in fields) updated.tonnage = parseFloat(fields.tonnage as any) || 0;
        return updated;
      }
      return item;
    }));
  };

  const calculatedTotalTonnage = useMemo(() => 
    productions.reduce((sum, item) => sum + (item.tonnage || 0), 0), 
    [productions]
  );

  // Arıza / Duruş İşlemleri
  const addDowntimeRow = () => {
    const nextId = 'dt-' + Math.random().toString(36).substring(2, 9);
    setDowntimes([
      ...downtimes,
      {
        id: nextId,
        furnaceId: settings?.furnaces?.[0]?.id || '',
        furnaceName: settings?.furnaces?.[0]?.name || 'Tüm Tesis',
        category: 'Mekanik Arıza',
        startTime: '10:00',
        endTime: '10:30',
        durationMinutes: 30,
        description: '',
        actionTaken: '',
        technician: '',
      }
    ]);
  };

  const removeDowntimeRow = (id: string) => {
    setDowntimes(downtimes.filter(d => d.id !== id));
  };

  const updateDowntimeRow = (id: string, field: keyof DowntimeRecord, value: any) => {
    setDowntimes(downtimes.map(d => {
      if (d.id === id) {
        const updated = { ...d, [field]: value };
        // Başlangıç ve bitiş saati girildiyse süreyi otomatik hesaplamayı dene
        if (field === 'startTime' || field === 'endTime') {
          const s = field === 'startTime' ? value : d.startTime;
          const e = field === 'endTime' ? value : d.endTime;
          if (s && e && s.includes(':') && e.includes(':')) {
            const [sh, sm] = s.split(':').map(Number);
            const [eh, em] = e.split(':').map(Number);
            if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
              let diff = (eh * 60 + em) - (sh * 60 + sm);
              if (diff < 0) diff += 24 * 60; // Gece devri
              updated.durationMinutes = diff;
            }
          }
        }
        if (field === 'durationMinutes') {
          updated.durationMinutes = parseInt(value) || 0;
        }
        if (field === 'furnaceId') {
          const matched = settings?.furnaces?.find(f => f.id === value);
          updated.furnaceName = matched ? matched.name : 'Tüm Tesis';
        }
        return updated;
      }
      return d;
    }));
  };

  // Ocak İşlemleri
  const updateFurnaceField = (furnaceId: string, field: keyof DailyFurnaceRecord, value: any) => {
    setFurnaceRecords(furnaceRecords.map(rec => {
      if (rec.furnaceId === furnaceId) {
        let val = value;
        if (field === 'chargeCount') val = parseInt(value) || 0;
        else if (field === 'meltedAmount') val = parseInt(value) || 0;
        else if (field === 'fuelConsumption') val = parseFloat(value) || 0;
        else if (field === 'workDuration') val = parseFloat(value) || 0;
        return { ...rec, [field]: val };
      }
      return rec;
    }));
  };

  const removeFurnaceRecord = (furnaceId: string) => {
    setFurnaceRecords(prev => prev.filter(r => r.furnaceId !== furnaceId));
  };

  const addFurnaceRecord = (furnace: import('@/lib/types').Furnace) => {
    if (furnaceRecords.some(r => r.furnaceId === furnace.id)) return;
    setFurnaceRecords(prev => [
      ...prev,
      {
        furnaceId: furnace.id,
        name: furnace.name,
        capacity: furnace.capacity,
        status: getFurnaceStatusForDate(furnace, selectedDate),
        chargeCount: 0,
        meltedAmount: 0,
        fuelConsumption: 0,
        workDuration: 0,
        description: '',
      }
    ]);
  };

  // Listede henüz bulunmayan diğer tanımlı ocaklar (kullanıcı isterse ekleyebilsin)
  const availableOtherFurnaces = useMemo(() => {
    if (!settings?.furnaces) return [];
    return settings.furnaces.filter(f => !furnaceRecords.some(r => r.furnaceId === f.id));
  }, [settings?.furnaces, furnaceRecords]);

  // Etiket İşlemleri
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleCreateTag = () => {
    const cleanTag = newTagInput.trim();
    if (cleanTag && settings) {
      if (!settings.tags.includes(cleanTag)) {
        settings.tags.push(cleanTag);
      }
      if (!selectedTags.includes(cleanTag)) {
        setSelectedTags([...selectedTags, cleanTag]);
      }
      setNewTagInput('');
    }
  };

  // Görsel Yükleme
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const text = await res.text();
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
          const data = JSON.parse(text);
          if (data.success && data.url) {
            setPhotos([...photos, data.url]);
          } else {
            setUploadError(data.error || 'Yükleme başarısız.');
          }
        } else {
          setUploadError('Sunucu şu an meşgul.');
        }
      }
    } catch {
      setUploadError('Bağlantı hatası.');
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, idx) => idx !== index));
  };

  // Formu Kaydet
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanProductions = productions
      .filter(p => (p.tonnage || 0) > 0 || (p.quantity || 0) > 0)
      .map(p => ({
        ...p,
        moldType: p.moldType || 'Kum Kalıp',
        productName: p.moldType || p.productName?.trim() || 'Kum Kalıp',
      }));

    const updatedShiftHours: ShiftHours = {
      ...shiftHours,
      totalDowntimeMinutes,
      netWorkDurationHours,
    };

    const effectiveShift = `${updatedShiftHours.startTime} - ${updatedShiftHours.endTime}`;

    const reportToSave: DailyReport = {
      id: currentReportId || selectedDate,
      date: selectedDate,
      shift: effectiveShift,
      description,
      timeline,
      productions: cleanProductions,
      furnaceRecords,
      personnel,
      downtimes,
      shiftHours: updatedShiftHours,
      notes,
      tags: selectedTags,
      photos,
      managerEvaluation,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const res: any = await onSave(reportToSave);
      if (res && res.success === false) {
        setSaveError(res.error || 'Rapor sunucuya kaydedilemedi. Lütfen bağlantınızı kontrol edip tekrar deneyiniz.');
      } else {
        loadedKeyRef.current = null;
      }
    } catch (err: any) {
      setSaveError(err?.message || 'Beklenmeyen bir hata oluştu. Rapor kaydedilemedi.');
    } finally {
      setIsSaving(false);
    }
  };

  // Adım Navigasyonu (1-5) - Her adım değişiminde en üste kaydır
  const nextStep = () => {
    if (currentStep < 5) {
      setDirection('forward');
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setDirection('backward');
      setCurrentStep(prev => prev - 1);
    }
  };

  // Form adımı her değiştiğinde sayfanın en üstünden açılmasını sağla
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  // Animasyon varyasyonları
  const slideVariants = {
    enter: (dir: 'forward' | 'backward') => ({
      opacity: 0,
      x: dir === 'forward' ? 30 : -30
    }),
    center: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.2, ease: 'easeOut' }
    },
    exit: (dir: 'forward' | 'backward') => ({
      opacity: 0,
      x: dir === 'forward' ? -30 : 30,
      transition: { duration: 0.15 }
    })
  };

  // 5 Adım Başlıkları ve İkonları
  const stepTitles = [
    { title: 'Çalışma Saatleri', icon: <Clock className="w-4 h-4" /> },
    { title: 'Ekip & Personel', icon: <Users className="w-4 h-4" /> },
    { title: 'Ocak Operasyonları', icon: <Flame className="w-4 h-4" /> },
    { title: 'Döküm & Kalıp Üretimi', icon: <Layers className="w-4 h-4" /> },
    { title: 'Arıza, Notlar & Onay', icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-2 sm:px-4" id="report-form">
      {/* Üst Başlık & Eylemler */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              Vardiya Operasyon Girişi
            </span>
            <span className="text-xs text-gray-400 font-mono">
              Adım {currentStep} / 5
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-display mt-1">
            {initialDate ? 'Vardiya Raporunu Düzenle' : 'Yeni Vardiya Raporu Kaydı'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Personel, çalışma saatleri, ocak ergitme, döküm ve arıza duruşlarını eksiksiz kaydedin.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl font-medium text-xs transition text-gray-600 active:scale-95 disabled:opacity-50"
            >
              Vazgeç
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSaving}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Kaydediliyor...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Raporu Kaydet</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Kaydetme Hatası Notu ve Uyarısı */}
      {saveError && (
        <div className="p-4 sm:p-5 bg-rose-50 border-2 border-rose-300 rounded-2xl flex flex-col sm:flex-row items-start justify-between gap-3 text-rose-950 shadow-md">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-rose-950 flex items-center gap-2">
                <span>⚠️ Kaydetme Hatası Oluştu</span>
              </h4>
              <p className="text-xs font-semibold text-rose-800 mt-1">
                {saveError}
              </p>
              <div className="mt-2 p-2.5 bg-white/70 border border-rose-200 rounded-xl text-[11px] text-rose-900 leading-relaxed font-medium">
                <strong>📌 Önemli Not:</strong> Verilerde çakışma ve veri kaybı yaşanmaması için tarayıcıda yerel veritabanı tutulmamaktadır. Formdaki bilgileriniz silinmemiştir; lütfen ağ/sunucu bağlantınızı kontrol ettikten sonra formu kapatmadan tekrar <strong>&quot;Raporu Kaydet&quot;</strong> butonuna basınız.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Tekrar Dene
            </button>
            <button
              type="button"
              onClick={() => setSaveError(null)}
              className="flex-1 sm:flex-none px-3 py-2 bg-white hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-300 rounded-xl transition"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* Sihirbaz Adım İlerleme Çubuğu (Mobilde Kompakt, Masaüstünde Tam Görünüm) */}
      <div className="bg-white border border-slate-100 p-3 sm:p-4 rounded-2xl shadow-sm">
        {/* MOBİL GÖRÜNÜM (< 640px) */}
        <div className="sm:hidden space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[11px] font-mono">
                {currentStep}
              </span>
              <span>{stepTitles[currentStep - 1].title}</span>
            </span>
            <span className="text-[11px] font-bold text-slate-400 font-mono">
              Adım {currentStep} / 5
            </span>
          </div>

          {/* İnce İlerleme Çizgisi */}
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
              initial={{ width: '0%' }}
              animate={{ width: `${(currentStep / 5) * 100}%` }}
              transition={{ duration: 0.25 }}
            />
          </div>

          {/* 5 Adım Butonu (Taşma Yapmayan Esnek Hiza) */}
          <div className="grid grid-cols-5 gap-1.5 pt-1">
            {stepTitles.map((s, idx) => {
              const stepNum = idx + 1;
              const isCompleted = currentStep > stepNum;
              const isActive = currentStep === stepNum;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setDirection(stepNum > currentStep ? 'forward' : 'backward');
                    setCurrentStep(stepNum);
                  }}
                  className={`h-8 rounded-lg flex items-center justify-center font-bold text-xs transition active:scale-95 ${
                    isActive
                      ? 'bg-amber-500 text-white shadow-xs'
                      : isCompleted
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200/70'
                  }`}
                  title={s.title}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3px]" /> : stepNum}
                </button>
              );
            })}
          </div>
        </div>

        {/* MASAÜSTÜ & TABLET GÖRÜNÜM (>= 640px) */}
        <div className="hidden sm:flex items-center justify-between relative px-2">
          {/* İlerleme Çizgisi */}
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-[2px] bg-gray-100 -z-0">
            <motion.div 
              className="h-full bg-amber-500" 
              initial={{ width: '0%' }}
              animate={{ width: `${((currentStep - 1) / 4) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Adım Butonları */}
          {stepTitles.map((s, idx) => {
            const stepNum = idx + 1;
            const isCompleted = currentStep > stepNum;
            const isActive = currentStep === stepNum;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setDirection(stepNum > currentStep ? 'forward' : 'backward');
                  setCurrentStep(stepNum);
                }}
                className="flex flex-col items-center gap-1.5 focus:outline-none group relative z-10 bg-white px-1"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 font-semibold text-xs border ${
                  isCompleted ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs' :
                  isActive ? 'bg-amber-500 border-amber-500 text-white ring-4 ring-amber-100' :
                  'bg-white border-gray-200 text-gray-400 group-hover:border-gray-300'
                }`}>
                  {isCompleted ? <Check className="w-4 h-4 stroke-[3px]" /> : stepNum}
                </div>
                <span className={`text-[11px] font-semibold text-center whitespace-nowrap ${
                  isActive ? 'text-amber-600' : isCompleted ? 'text-emerald-700' : 'text-gray-400'
                }`}>
                  {s.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Üst Hızlı Adım Navigasyon Çubuğu (Önceki - Adım - Sonraki) */}
      <div className="flex items-center justify-between gap-2 p-2 sm:p-2.5 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
        <button
          type="button"
          onClick={prevStep}
          disabled={currentStep === 1}
          className="h-10 px-3 sm:px-4 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition active:scale-95 shadow-2xs shrink-0"
        >
          <ChevronLeft className="w-4 h-4 text-slate-500" />
          <span className="hidden xs:inline">Önceki:</span>
          <span className="max-w-[85px] sm:max-w-[130px] truncate font-semibold text-slate-800">
            {currentStep > 1 ? stepTitles[currentStep - 2].title : 'Başlangıç'}
          </span>
        </button>

        <div className="flex flex-col items-center justify-center text-center px-1 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-mono font-bold text-amber-600 uppercase tracking-wider">
            Adım {currentStep} / 5
          </span>
          <span className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
            {stepTitles[currentStep - 1]?.title || ''}
          </span>
        </div>

        {currentStep < 5 ? (
          <button
            type="button"
            onClick={nextStep}
            className="h-10 px-3 sm:px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-xs shrink-0"
          >
            <span className="hidden xs:inline">Sonraki:</span>
            <span className="max-w-[85px] sm:max-w-[130px] truncate font-semibold">
              {stepTitles[currentStep]?.title || 'Sonraki'}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSubmit()}
            className="h-10 px-3.5 sm:px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-xs shrink-0"
          >
            <Save className="w-4 h-4" />
            <span className="hidden xs:inline">Raporu</span>
            <span>Kaydet</span>
          </button>
        )}
      </div>

      {/* Dinamik Adım İçerikleri */}
      <div className="min-h-[420px] bg-white border border-slate-100 rounded-3xl p-4 sm:p-6 shadow-sm relative overflow-hidden">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="space-y-6"
          >
            {/* ======================================================== */}
            {/* ADIM 1: ÇALIŞMA SAATLERİ & TARİH */}
            {/* ======================================================== */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Çalışma Saatleri & Rapor Tarihi</h2>
                    <p className="text-xs text-gray-500">Rapor tarihi, çalışma başlangıç/bitiş saatleri ve mola süreleri</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tarih */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                      Rapor Tarihi *
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="app-input font-medium"
                      required
                    />
                  </div>

                  {/* Vardiya Amiri */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                      Vardiya Amiri / Sorumlusu
                    </label>
                    <input
                      type="text"
                      value={personnel.supervisorName || ''}
                      onChange={(e) => setPersonnel({ ...personnel, supervisorName: e.target.value })}
                      placeholder="Örn: Ahmet Usta / Vardiya Mühendisi"
                      className="app-input"
                    />
                  </div>
                </div>

                {/* Çalışma Saatleri ve Duruş Kartı */}
                <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-50 to-slate-100/70 border border-slate-200/80 rounded-2xl space-y-4 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
                    <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Timer className="w-4 h-4 text-amber-600" />
                      Vardiya Çalışma Süreleri ve Canlı Hesaplama
                    </span>
                    <span className="text-xs font-semibold text-slate-600">
                      Başlangıç: <span className="font-mono font-bold text-slate-900">{shiftHours.startTime}</span> → Bitiş: <span className="font-mono font-bold text-slate-900">{shiftHours.endTime}</span>
                    </span>
                  </div>

                  {/* 4 Canlı Süre Metrik Kartı */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Planlanan Süre</span>
                      <span className="text-lg font-black text-slate-800 font-mono mt-0.5 block">{shiftHours.plannedDurationHours} sa</span>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mola & Yemek</span>
                      <span className="text-lg font-black text-amber-600 font-mono mt-0.5 block">{shiftHours.breakDurationMinutes} dk</span>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Toplam Duruş</span>
                      <span className="text-lg font-black text-rose-600 font-mono mt-0.5 block">{totalDowntimeMinutes} dk</span>
                    </div>
                    <div className="p-3 bg-emerald-500 text-white border border-emerald-600 rounded-xl shadow-xs">
                      <span className="text-[10px] font-extrabold text-emerald-100 uppercase tracking-wider block">Net Çalışma</span>
                      <span className="text-lg font-black font-mono mt-0.5 block">{netWorkDurationHours} sa</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                    {/* Başlangıç Saati */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">Başlangıç Saati</label>
                      <input
                        type="time"
                        value={shiftHours.startTime}
                        onChange={(e) => handleStartTimeChange(e.target.value)}
                        className="app-input text-center font-mono font-bold"
                      />
                    </div>

                    {/* Bitiş Saati */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">Bitiş Saati</label>
                      <input
                        type="time"
                        value={shiftHours.endTime}
                        onChange={(e) => handleEndTimeChange(e.target.value)}
                        className="app-input text-center font-mono font-bold"
                      />
                    </div>

                    {/* Planlanan Süre (Saat) + Hızlı Çipler */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">Planlanan Süre (sa)</label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        step="0.5"
                        value={shiftHours.plannedDurationHours}
                        onChange={(e) => setShiftHours({ ...shiftHours, plannedDurationHours: parseFloat(e.target.value) || 8 })}
                        className="app-input text-center font-mono font-bold"
                      />
                      <div className="flex flex-wrap gap-1 mt-1.5 justify-center">
                        {[7.5, 8, 8.5, 9, 10, 12].map((hrs) => (
                          <button
                            key={hrs}
                            type="button"
                            onClick={() => setShiftHours(prev => ({ ...prev, plannedDurationHours: hrs }))}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                              shiftHours.plannedDurationHours === hrs
                                ? 'bg-amber-500 text-white border-amber-600'
                                : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {hrs}s
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Mola & Yemek (dk) + Hızlı Çipler */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">Mola & Yemek (dk)</label>
                      <input
                        type="number"
                        min="0"
                        step="15"
                        value={shiftHours.breakDurationMinutes}
                        onChange={(e) => setShiftHours({ ...shiftHours, breakDurationMinutes: parseInt(e.target.value) || 0 })}
                        className="app-input text-center font-mono font-bold"
                      />
                      <div className="flex flex-wrap gap-1 mt-1.5 justify-center">
                        {[0, 30, 45, 60, 90].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setShiftHours(prev => ({ ...prev, breakDurationMinutes: mins }))}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                              shiftHours.breakDurationMinutes === mins
                                ? 'bg-amber-500 text-white border-amber-600'
                                : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {mins}dk
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {totalDowntimeMinutes > 0 && (
                    <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-100/70 p-2.5 rounded-xl border border-amber-200">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>
                        Bu vardiyada kayıtlı toplam <strong>{totalDowntimeMinutes} dakika</strong> arıza/duruş süresi net çalışma saatinden düşülmüştür.
                      </span>
                    </div>
                  )}
                </div>

                {/* Genel Açıklama */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                      Vardiya Genel Açıklaması / Başlık
                    </label>
                    <button
                      type="button"
                      id="btn-generate-ai-description"
                      onClick={handleGenerateFormAiSummary}
                      disabled={isGeneratingAiSummary}
                      className="px-3 py-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 shadow-sm cursor-pointer"
                      title="Vardiya verilerine göre otomatik genel açıklama oluştur"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAiSummary ? 'animate-spin' : 'text-amber-300'}`} />
                      <span>{isGeneratingAiSummary ? 'Özet Hazırlanıyor...' : '✨ AI ile Açıklama Oluştur'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Vardiyanın genel seyri ve yönetici özeti (AI ile otomatik oluşturulabilir)..."
                    className="app-textarea resize-y leading-relaxed text-xs sm:text-sm"
                  />
                </div>

                {/* Etiketler */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-gray-400" />
                    Vardiya Etiketleri
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {settings?.tags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 max-w-xs mt-2">
                    <input
                      type="text"
                      placeholder="Yeni etiket..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateTag())}
                      className="h-8 px-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-amber-500 w-full"
                    />
                    <button
                      type="button"
                      onClick={handleCreateTag}
                      className="h-8 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium"
                    >
                      Ekle
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* ADIM 2: VARDİYA EKİBİ & PERSONEL */}
            {/* ======================================================== */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">Vardiya Ekibi & Personel Sayıları</h2>
                      <p className="text-xs text-gray-500">Vardiyada fiili çalışan ve eksik/izinli personel sayıları</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPersonnel(p => ({
                        ...p,
                        totalCount: 4,
                        absentCount: 0,
                      }));
                    }}
                    className="w-full sm:w-auto px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200/60 transition active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Standart Kadro (4 Kişi)
                  </button>
                </div>

                {/* Personel Özet Sayaçları (Fiili Çalışan & Eksik İzinli) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Toplam Çalışan Sayısı */}
                  <div className="p-5 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                    <div>
                      <span className="text-sm font-bold text-blue-950 block">Fiili Çalışan Personel</span>
                      <span className="text-xs text-blue-700 mt-0.5 block">Vardiyada sahada aktif çalışan toplam kişi</span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setPersonnel(p => ({ ...p, totalCount: Math.max(1, (p.totalCount || 1) - 1) }))}
                        className="w-12 h-12 rounded-xl bg-white border border-blue-300 text-blue-900 font-bold hover:bg-blue-100 transition active:scale-95 flex items-center justify-center text-xl shadow-xs"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={personnel.totalCount}
                        onChange={(e) => setPersonnel(p => ({ ...p, totalCount: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="w-20 h-12 bg-white border border-blue-300 rounded-xl text-center font-bold text-blue-950 text-lg font-mono outline-none shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => setPersonnel(p => ({ ...p, totalCount: (p.totalCount || 0) + 1 }))}
                        className="w-12 h-12 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition active:scale-95 flex items-center justify-center text-xl shadow-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* İzinli / Gelmeyen Personel */}
                  <div className="p-5 bg-rose-50/70 border border-rose-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                    <div>
                      <span className="text-sm font-bold text-rose-950 block">Eksik / İzinli Personel</span>
                      <span className="text-xs text-rose-700 mt-0.5 block">Raporlu, izinli veya devamsız personel</span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setPersonnel(p => ({ ...p, absentCount: Math.max(0, (p.absentCount || 0) - 1) }))}
                        className="w-12 h-12 rounded-xl bg-white border border-rose-300 text-rose-900 font-bold hover:bg-rose-100 transition active:scale-95 flex items-center justify-center text-xl shadow-xs"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={personnel.absentCount || 0}
                        onChange={(e) => setPersonnel(p => ({ ...p, absentCount: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="w-20 h-12 bg-white border border-rose-300 rounded-xl text-center font-bold text-rose-950 text-lg font-mono outline-none shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => setPersonnel(p => ({ ...p, absentCount: (p.absentCount || 0) + 1 }))}
                        className="w-12 h-12 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition active:scale-95 flex items-center justify-center text-xl shadow-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Personel Notları */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                    Personel & Ekip Notları (Devamsızlıklar, mesai, görev değişiklikleri)
                  </label>
                  <textarea
                    rows={3}
                    value={personnel.notes || ''}
                    onChange={(e) => setPersonnel({ ...personnel, notes: e.target.value })}
                    placeholder="Örn: 1 operatör yıllık izinde. Vardiya amiri takviyesi yapıldı."
                    className="app-textarea"
                  />
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* ADIM 3: OCAK OPERASYONLARI */}
            {/* ======================================================== */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Ocak Operasyonları & Ergitme</h2>
                    <p className="text-xs text-gray-500">Her fırın için şarj sayısı, eritilen metal miktarı ve çalışma süresi</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {furnaceRecords.map((rec) => (
                    <div
                      key={rec.furnaceId}
                      className="p-4 sm:p-5 rounded-2xl border border-gray-200/90 bg-white hover:border-amber-300 transition-all shadow-xs space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs">
                            <Flame className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-gray-900">{rec.name}</h3>
                            <span className="text-[11px] text-gray-500">Kapasite: {rec.capacity}</span>
                          </div>
                        </div>

                        {/* Ocak Durumu ve Kaldır Butonu */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <div className="w-full sm:w-44">
                            <ModernSelect
                              value={rec.status}
                              onChange={(val) => updateFurnaceField(rec.furnaceId, 'status', val)}
                              options={[
                                { value: 'Çalışıyor', label: 'Çalışıyor' },
                                { value: 'Bakımda', label: 'Bakımda' },
                                { value: 'Arızalı', label: 'Arızalı' },
                                { value: 'Kullanım Dışı', label: 'Kullanım Dışı' },
                              ]}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFurnaceRecord(rec.furnaceId)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition shrink-0"
                            title="Bu ocağı rapordan çıkar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-gray-700 block">Şarj Sayısı</label>
                            <button
                              type="button"
                              onClick={() => updateFurnaceField(rec.furnaceId, 'chargeCount', (rec.chargeCount || 0) + 1)}
                              className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold rounded-lg border border-amber-200 tap-bounce"
                            >
                              +1 Şarj
                            </button>
                          </div>
                          <input
                            type="number"
                            min="0"
                            value={rec.chargeCount}
                            onChange={(e) => updateFurnaceField(rec.furnaceId, 'chargeCount', e.target.value)}
                            className="app-input text-center font-mono font-bold"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-gray-700 block">Eritilen Metal (kg)</label>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => updateFurnaceField(rec.furnaceId, 'meltedAmount', (rec.meltedAmount || 0) + 250)}
                                className="px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold rounded-lg border border-amber-200 tap-bounce"
                              >
                                +250
                              </button>
                              <button
                                type="button"
                                onClick={() => updateFurnaceField(rec.furnaceId, 'meltedAmount', (rec.meltedAmount || 0) + 500)}
                                className="px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold rounded-lg border border-amber-200 tap-bounce"
                              >
                                +500
                              </button>
                            </div>
                          </div>
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={rec.meltedAmount}
                            onChange={(e) => updateFurnaceField(rec.furnaceId, 'meltedAmount', e.target.value)}
                            className="app-input text-center text-amber-700 font-mono font-bold"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-gray-700 block">Çalışma Saati</label>
                            <button
                              type="button"
                              onClick={() => updateFurnaceField(rec.furnaceId, 'workDuration', (rec.workDuration || 0) + 1)}
                              className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold rounded-lg border border-amber-200 tap-bounce"
                            >
                              +1 Sa
                            </button>
                          </div>
                          <input
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            value={rec.workDuration}
                            onChange={(e) => updateFurnaceField(rec.furnaceId, 'workDuration', e.target.value)}
                            className="app-input text-center font-mono font-bold"
                          />
                        </div>
                      </div>

                      <div>
                        <input
                          type="text"
                          value={rec.description}
                          onChange={(e) => updateFurnaceField(rec.furnaceId, 'description', e.target.value)}
                          placeholder="Bu ocakla ilgili operasyon notu veya astar/brülör gözlemi..."
                          className="app-input text-xs"
                        />
                      </div>
                    </div>
                  ))}

                  {/* Hiç ocak kalmadıysa */}
                  {furnaceRecords.length === 0 && (
                    <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-2xl space-y-2">
                      <Flame className="w-8 h-8 text-gray-300 mx-auto" />
                      <p className="text-sm font-bold text-gray-600">Bu raporda henüz listelenen bir ocak yok</p>
                      <p className="text-xs text-gray-400">Yalnızca aktif ocaklar listelenir. Aşağıdan dilediğiniz ocağı rapora ekleyebilirsiniz.</p>
                    </div>
                  )}

                  {/* Kullanım dışı veya henüz eklenmemiş ocakları isteğe bağlı ekleme paneli */}
                  {availableOtherFurnaces.length > 0 && (
                    <div className="p-4 bg-amber-50/40 border border-dashed border-amber-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-gray-800 block">
                          Diğer / Kullanım Dışı Ergitme Ocakları
                        </span>
                        <span className="text-[11px] text-gray-500">
                          Gerektiğinde kullanım dışındaki ocakları da bu rapora ekleyebilirsiniz.
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availableOtherFurnaces.map(f => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => addFurnaceRecord(f)}
                            className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5 text-amber-600" />
                            <span>{f.name} ({f.capacity}) Ekle</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* ADIM 4: DÖKÜM ÜRETİM LİSTESİ */}
            {/* ======================================================== */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">Dökülen Parçalar & Üretim Listesi</h2>
                      <p className="text-xs text-gray-500">Vardiyada dökümü tamamlanan mamul ve ağırlık (kg) bilgisi</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between">
                    <div className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200/60 text-xs font-bold font-mono">
                      Toplam: {calculatedTotalTonnage.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kg
                    </div>
                    <button
                      type="button"
                      onClick={addProductionRow}
                      className="h-11 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition shadow-sm active:scale-95 touch-manipulation cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Parça Ekle</span>
                    </button>
                  </div>
                </div>

                {productions.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl space-y-3">
                    <Layers className="w-10 h-10 mx-auto text-gray-300" />
                    <p className="text-sm font-medium text-gray-500">Henüz döküm parçası eklenmedi.</p>
                    <button
                      type="button"
                      onClick={addProductionRow}
                      className="h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition shadow-sm active:scale-95 touch-manipulation"
                    >
                      <Plus className="w-4 h-4" />
                      <span>İlk Döküm Parçasını Ekle</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {productions.map((p, idx) => (
                      <div
                        key={p.id}
                        className="p-4 bg-gray-50/80 border border-gray-200 rounded-2xl flex flex-col md:grid md:grid-cols-12 gap-3.5 items-stretch md:items-center hover:bg-gray-50 transition shadow-2xs"
                      >
                        {/* Mobilde Başlık ve Sil Butonu */}
                        <div className="flex items-center justify-between md:hidden border-b border-gray-200/80 pb-2">
                          <span className="font-extrabold text-xs text-gray-600">Parça #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeProductionRow(p.id)}
                            className="h-8 px-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                            title="Parçayı Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Sil</span>
                          </button>
                        </div>

                        <div className="hidden md:block md:col-span-1 text-center font-bold text-xs text-gray-400 font-mono">
                          #{idx + 1}
                        </div>

                        {/* Kalıp Türü (Mobil ve Masaüstü Tam Uyumlu Select) */}
                        <div className="md:col-span-5 space-y-1.5">
                          <label className="text-[11px] font-bold text-gray-700 block">Kalıp Türü</label>
                          <select
                            value={p.moldType || 'Kum Kalıp'}
                            onChange={(e) => {
                              const selectedType = e.target.value;
                              updateProductionFields(p.id, {
                                moldType: selectedType,
                                productName: selectedType
                              });
                            }}
                            className="w-full h-11 px-3 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/30 touch-manipulation cursor-pointer"
                          >
                            <option value="Kum Kalıp">Kum Kalıp</option>
                            <option value="Fren Diski">Fren Diski</option>
                            <option value="Fren Diski Kalıbı">Fren Diski Kalıbı</option>
                            <option value="Döküm Kalıp">Döküm Kalıp</option>
                            <option value="Kokil Kalıp">Kokil Kalıp</option>
                            <option value="Reçineli Kalıp">Reçineli Kalıp</option>
                            <option value="Maçalı Döküm">Maçalı Döküm</option>
                            <option value="Poyra Kalıbı">Poyra Kalıbı</option>
                            <option value="Kasnak Kalıbı">Kasnak Kalıbı</option>
                            {p.moldType && ![
                              'Kum Kalıp', 'Fren Diski', 'Fren Diski Kalıbı', 'Döküm Kalıp',
                              'Kokil Kalıp', 'Reçineli Kalıp', 'Maçalı Döküm', 'Poyra Kalıbı', 'Kasnak Kalıbı'
                            ].includes(p.moldType) && (
                              <option value={p.moldType}>{p.moldType}</option>
                            )}
                          </select>

                          {/* Hızlı Dokunmatik Butonlar */}
                          <div className="flex flex-wrap gap-1.5">
                            {['Kum Kalıp', 'Fren Diski', 'Döküm Kalıp'].map((quickType) => (
                              <button
                                key={quickType}
                                type="button"
                                onClick={() => {
                                  updateProductionFields(p.id, {
                                    moldType: quickType,
                                    productName: quickType
                                  });
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition touch-manipulation ${
                                  p.moldType === quickType
                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                                    : 'bg-white hover:bg-emerald-50 text-gray-700 border-gray-200'
                                }`}
                              >
                                {quickType}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Kalıp Adedi */}
                        <div className="md:col-span-3 space-y-1.5">
                          <label className="text-[11px] font-bold text-gray-700 block">Kalıp Adedi</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="1"
                              placeholder="Adet"
                              value={p.quantity}
                              onChange={(e) => updateProductionRow(p.id, 'quantity', e.target.value)}
                              className="w-full h-11 px-3 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm font-bold text-center font-mono outline-none focus:ring-2 focus:ring-emerald-500/30"
                            />
                            <span className="absolute right-3 top-3 text-xs text-gray-400 font-semibold pointer-events-none">Adet</span>
                          </div>
                        </div>

                        {/* Ağırlık / Tonaj (kg) */}
                        <div className="md:col-span-2 space-y-1.5">
                          <label className="text-[11px] font-bold text-gray-700 block">Ağırlık (kg)</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              placeholder="0"
                              value={p.tonnage || ''}
                              onChange={(e) => updateProductionRow(p.id, 'tonnage', e.target.value)}
                              className="w-full h-11 px-3 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm font-bold text-center text-emerald-700 font-mono outline-none focus:ring-2 focus:ring-emerald-500/30"
                            />
                            <span className="absolute right-3 top-3 text-xs text-emerald-600 font-bold pointer-events-none">kg</span>
                          </div>
                        </div>

                        {/* Masaüstü Sil Butonu */}
                        <div className="hidden md:flex md:col-span-1 justify-center pt-5">
                          <button
                            type="button"
                            onClick={() => removeProductionRow(p.id)}
                            className="p-2 text-gray-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition"
                            title="Parçayı Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* ADIM 5: ARIZA VE DURUŞ TAKİBİ (DOWNTIME) */}
            {/* ======================================================== */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">Arıza ve Duruş Kayıtları (Downtime)</h2>
                      <p className="text-xs text-gray-500">Mekanik, elektrik, refrakter veya operasyonel duruşların takibi</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between">
                    <div className="px-3 py-1 bg-rose-50 text-rose-800 rounded-xl border border-rose-200/60 text-xs font-bold font-mono">
                      Toplam Duruş: {totalDowntimeMinutes} dk ({parseFloat((totalDowntimeMinutes / 60).toFixed(1))} saat)
                    </div>
                    <button
                      type="button"
                      onClick={addDowntimeRow}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Arıza / Duruş Ekle
                    </button>
                  </div>
                </div>



                {downtimes.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl space-y-3">
                    <Check className="w-10 h-10 mx-auto text-emerald-500 bg-emerald-50 p-2 rounded-full" />
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">Bu Vardiyada Arıza Kaydı Yok</h3>
                      <p className="text-xs text-gray-500 mt-1">Eğer herhangi bir duruş veya arıza meydana geldiyse butonla ekleyebilirsiniz.</p>
                    </div>
                    <button
                      type="button"
                      onClick={addDowntimeRow}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-4 h-4" />
                      Arıza / Duruş Kaydet
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {downtimes.map((d, idx) => (
                      <div
                        key={d.id}
                        className="p-4 bg-rose-50/30 border border-rose-200/80 rounded-2xl space-y-3 relative hover:border-rose-300 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center text-[10px] font-mono">
                              {idx + 1}
                            </span>
                            Duruş Kaydı
                          </span>
                          <button
                            type="button"
                            onClick={() => removeDowntimeRow(d.id)}
                            className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-100/60 rounded-lg transition"
                            title="Bu Duruşu Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {/* İlgili Ekipman */}
                          <div>
                            <label className="text-xs font-bold text-gray-700 block mb-1.5">İlgili Ocak / Hat</label>
                            <select
                              value={d.furnaceId || ''}
                              onChange={(e) => updateDowntimeRow(d.id, 'furnaceId', e.target.value)}
                              className="app-input text-xs font-semibold"
                            >
                              <option value="">Tüm Tesis / Genel</option>
                              {settings?.furnaces?.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Kategori */}
                          <div>
                            <label className="text-xs font-bold text-gray-700 block mb-1.5">Arıza / Duruş Nedeni</label>
                            <select
                              value={d.category}
                              onChange={(e) => updateDowntimeRow(d.id, 'category', e.target.value as DowntimeCategory)}
                              className="app-input text-xs font-semibold"
                            >
                              {DOWNTIME_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>

                          {/* Saatler */}
                          <div>
                            <label className="text-xs font-bold text-gray-700 block mb-1.5">Zaman Aralığı</label>
                            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                              <input
                                type="time"
                                value={d.startTime}
                                onChange={(e) => updateDowntimeRow(d.id, 'startTime', e.target.value)}
                                className="app-input text-xs text-center font-mono px-1 sm:px-2.5"
                                title="Başlangıç Saati"
                              />
                              <input
                                type="time"
                                value={d.endTime}
                                onChange={(e) => updateDowntimeRow(d.id, 'endTime', e.target.value)}
                                className="app-input text-xs text-center font-mono px-1 sm:px-2.5"
                                title="Bitiş Saati"
                              />
                            </div>
                          </div>

                          {/* Süre Dakika */}
                          <div>
                            <label className="text-xs font-bold text-gray-700 block mb-1.5">Duruş Süresi (dk)</label>
                            <input
                              type="number"
                              min="1"
                              value={d.durationMinutes}
                              onChange={(e) => updateDowntimeRow(d.id, 'durationMinutes', e.target.value)}
                              className="app-input text-xs font-bold text-center text-rose-700 font-mono"
                            />
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {[15, 30, 45, 60, 90].map((mins) => (
                                <button
                                  key={mins}
                                  type="button"
                                  onClick={() => updateDowntimeRow(d.id, 'durationMinutes', mins)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                                    d.durationMinutes === mins
                                      ? 'bg-rose-600 text-white border-rose-600'
                                      : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200'
                                  }`}
                                >
                                  {mins}dk
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Açıklama ve Müdahale */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="text-xs font-bold text-gray-700 block mb-1.5">Arıza Tanımı *</label>
                            <input
                              type="text"
                              placeholder="Arıza tanımı / ne oldu? *"
                              value={d.description}
                              onChange={(e) => updateDowntimeRow(d.id, 'description', e.target.value)}
                              className="app-input text-xs"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs font-bold text-gray-700 block mb-1.5">Müdahale / Yapılan İş</label>
                              <input
                                type="text"
                                placeholder="Yapılan müdahale / parça"
                                value={d.actionTaken || ''}
                                onChange={(e) => updateDowntimeRow(d.id, 'actionTaken', e.target.value)}
                                className="app-input text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-gray-700 block mb-1.5">Müdahale Eden Personel</label>
                              <input
                                type="text"
                                placeholder="Müdahale eden ekip/kişi"
                                value={d.technician || ''}
                                onChange={(e) => updateDowntimeRow(d.id, 'technician', e.target.value)}
                                className="app-input text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Vardiya Genel Notları */}
                <div className="pt-6 border-t border-gray-100 space-y-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                    Operasyon & Vardiya Genel Notları
                  </label>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Günün genel seyri, hammadde teslimatı, kalite veya saha operasyon notları..."
                    className="app-textarea"
                  />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Alt Navigasyon Butonları (Mobilde Alt Barın Üstünde Kalması İçin pb-24 Eklendi) */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 pb-24 sm:pb-8">
        <button
          type="button"
          onClick={prevStep}
          disabled={currentStep === 1}
          className="h-12 px-5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-30 disabled:pointer-events-none transition active:scale-95 shadow-2xs w-full sm:w-auto"
        >
          <ChevronLeft className="w-4 h-4 text-slate-500" />
          <span>Önceki Adım</span>
          {currentStep > 1 && (
            <span className="text-slate-400 font-normal hidden xs:inline">
              ({stepTitles[currentStep - 2].title})
            </span>
          )}
        </button>

        <div className="text-center text-xs text-slate-500 font-medium py-1 sm:py-0">
          Adım {currentStep} / 5: <strong className="text-slate-900">{stepTitles[currentStep - 1]?.title || ''}</strong>
        </div>

        {currentStep < 5 ? (
          <button
            type="button"
            onClick={nextStep}
            className="h-12 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-amber-500/20 w-full sm:w-auto"
          >
            <span>Sonraki Adım:</span>
            <span className="font-semibold text-amber-100">
              {stepTitles[currentStep]?.title || 'Sonraki'}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSaving}
            className="h-12 px-7 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-emerald-600/30 w-full sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Kaydediliyor...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Raporu Tamamla ve Kaydet</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
