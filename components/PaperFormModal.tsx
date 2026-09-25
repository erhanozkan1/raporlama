'use client';

import React, { useState } from 'react';
import { AppSettings, Furnace } from '@/lib/types';
import {
  FileText,
  Printer,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Check,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PaperFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings | null;
}

export default function PaperFormModal({ isOpen, onClose, settings }: PaperFormModalProps) {
  // Düzenlenebilir Form Başlık ve Meta Bilgileri
  const [companyName, setCompanyName] = useState('DÖKÜMHANE METALURJİ VE OPERASYON TAKİP SİSTEMİ');
  const [formTitle, setFormTitle] = useState('GÜNLÜK VARDİYA OPERASYON VE DÖKÜM TAKİP FÖYÜ');
  const [docCode, setDocCode] = useState('FRM-DKM-01');
  const [revNo, setRevNo] = useState('Rev: 02 / 2026');
  const [department, setDepartment] = useState('Ergitme & Dökümhane Vardiya Amirliği');

  // Satır sayıları
  const [furnaceRowsCount, setFurnaceRowsCount] = useState<number>(6);
  const [moldRowsCount, setMoldRowsCount] = useState<number>(6);
  const [downtimeRowsCount, setDowntimeRowsCount] = useState<number>(4);

  // Önceden tanımlı ocakları doldur
  const [prefillFurnaces, setPrefillFurnaces] = useState<boolean>(true);

  // Özel not ve talimatlar
  const [specialInstructions, setSpecialInstructions] = useState<string>(
    '1. Her şarjın ergitme başlangıç/bitiş saati ve döküm sıcaklığı eksiksiz işlenecektir.\n2. Duruş ve arızalar anında kaydedilerek kayıp dakikalar net yazılacaktır.'
  );

  // Kontrol panelini aç/kapa
  const [isControlsOpen, setIsControlsOpen] = useState(true);

  if (!isOpen) return null;

  const handlePrint = () => {
    const printArea = document.getElementById('paper-form-printable');
    if (!printArea) return;

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
      window.print();
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="utf-8">
        <title>${formTitle} - ${docCode}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: white !important;
            color: #0f172a !important;
            margin: 0;
            padding: 12px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @media print {
            body { padding: 0 !important; }
          }
        </style>
      </head>
      <body>
        ${printArea.innerHTML}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 400);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const furnacesList: Furnace[] = settings?.furnaces || [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
        {/* Arka Plan */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
        />

        {/* Modal Kutusu */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-7xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 text-slate-100"
        >
          {/* Üst Başlık Çubuğu */}
          <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl shadow-lg shadow-amber-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white font-display">
                  Kağıt Üretim & Döküm Takip Formu (Matbu Şablon)
                </h2>
                <p className="text-xs text-slate-400">
                  Saha personelinin el ile doldurabilmesi için düzenlenebilir A4 baskı şablonu.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsControlsOpen(!isControlsOpen)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                  isControlsOpen
                    ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">{isControlsOpen ? 'Ayarları Kapat' : 'Şablonu Düzenle ⚙️'}</span>
                {isControlsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Formu Yazdır / PDF Al</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Gövde: Çift Panel (Sol Ayarlar, Sağ A4 Önizleme) */}
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
            {/* Sol Panel: Düzenleme Seçenekleri */}
            {isControlsOpen && (
              <div className="p-4 sm:p-5 bg-slate-900 overflow-y-auto custom-scrollbar space-y-4 shrink-0 lg:w-[380px] max-h-[40vh] lg:max-h-none">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Şablon Düzenleyici</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCompanyName('DÖKÜMHANE METALURJİ VE OPERASYON TAKİP SİSTEMİ');
                      setFormTitle('GÜNLÜK VARDİYA OPERASYON VE DÖKÜM TAKİP FÖYÜ');
                      setDocCode('FRM-DKM-01');
                      setRevNo('Rev: 02 / 2026');
                      setDepartment('Ergitme & Dökümhane Vardiya Amirliği');
                      setFurnaceRowsCount(6);
                      setMoldRowsCount(6);
                      setDowntimeRowsCount(4);
                    }}
                    className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Sıfırla
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Kurum / Tesis Başlığı</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Form Adı</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Form Kodu</label>
                      <input
                        type="text"
                        value={docCode}
                        onChange={(e) => setDocCode(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Revizyon</label>
                      <input
                        type="text"
                        value={revNo}
                        onChange={(e) => setRevNo(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Departman</label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Satır Sayıları Ayarları */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Tablo Boş Satır Sayıları</span>
                    
                    <div className="flex items-center justify-between text-xs bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <span>Ocak Ergitme Satırları</span>
                      <div className="flex items-center gap-2 font-mono">
                        <button
                          type="button"
                          onClick={() => setFurnaceRowsCount(Math.max(2, furnaceRowsCount - 1))}
                          className="p-1 hover:bg-slate-800 rounded"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center font-bold text-amber-400">{furnaceRowsCount}</span>
                        <button
                          type="button"
                          onClick={() => setFurnaceRowsCount(Math.min(15, furnaceRowsCount + 1))}
                          className="p-1 hover:bg-slate-800 rounded"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <span>Kalıp Döküm Satırları</span>
                      <div className="flex items-center gap-2 font-mono">
                        <button
                          type="button"
                          onClick={() => setMoldRowsCount(Math.max(2, moldRowsCount - 1))}
                          className="p-1 hover:bg-slate-800 rounded"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center font-bold text-amber-400">{moldRowsCount}</span>
                        <button
                          type="button"
                          onClick={() => setMoldRowsCount(Math.min(15, moldRowsCount + 1))}
                          className="p-1 hover:bg-slate-800 rounded"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <span>Arıza & Duruş Satırları</span>
                      <div className="flex items-center gap-2 font-mono">
                        <button
                          type="button"
                          onClick={() => setDowntimeRowsCount(Math.max(1, downtimeRowsCount - 1))}
                          className="p-1 hover:bg-slate-800 rounded"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center font-bold text-amber-400">{downtimeRowsCount}</span>
                        <button
                          type="button"
                          onClick={() => setDowntimeRowsCount(Math.min(10, downtimeRowsCount + 1))}
                          className="p-1 hover:bg-slate-800 rounded"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Ocak İsimlerini Otomatik Doldurma */}
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={prefillFurnaces}
                      onChange={(e) => setPrefillFurnaces(e.target.checked)}
                      className="rounded accent-amber-500"
                    />
                    <span>Tanımlı ocak isimlerini ilk satırlara yaz</span>
                  </label>

                  {/* Özel Talimatlar */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Form Altı Talimat Notu</label>
                    <textarea
                      rows={3}
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-500 resize-none font-sans"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Sağ Panel: A4 Önizleme */}
            <div className="flex-1 bg-slate-950/80 p-3 sm:p-6 overflow-y-auto custom-scrollbar flex justify-center">
              <div
                id="paper-form-printable"
                className="w-full max-w-[800px] bg-white text-slate-900 p-6 sm:p-8 shadow-2xl rounded-sm border border-slate-300 text-xs font-sans leading-tight"
                style={{ minHeight: '1050px' }}
              >
                {/* 1. ÜST BAŞLIK & DOKÜMAN BİLGİSİ */}
                <div className="border-2 border-slate-900 mb-3">
                  <div className="grid grid-cols-12 border-b-2 border-slate-900 divide-x-2 divide-slate-900">
                    <div className="col-span-3 p-2 flex flex-col justify-center items-center text-center">
                      <span className="font-black text-sm tracking-tighter text-slate-950 uppercase">DÖKÜM TAKİP</span>
                      <span className="text-[9px] font-bold text-slate-600">OPERASYON YÖNETİMİ</span>
                    </div>
                    <div className="col-span-6 p-2 flex flex-col justify-center items-center text-center">
                      <span className="text-[10px] font-extrabold uppercase text-slate-600">{companyName}</span>
                      <h1 className="text-sm font-black text-slate-950 uppercase mt-0.5">{formTitle}</h1>
                      <span className="text-[9px] font-semibold text-slate-500">{department}</span>
                    </div>
                    <div className="col-span-3 p-1.5 text-[9px] flex flex-col justify-center space-y-0.5">
                      <div><span className="font-bold">Doküman No:</span> <span className="font-mono">{docCode}</span></div>
                      <div><span className="font-bold">Revizyon:</span> <span className="font-mono">{revNo}</span></div>
                      <div><span className="font-bold">Tarih:</span> ____ / ____ / 2026</div>
                      <div><span className="font-bold">Sayfa:</span> 1 / 1</div>
                    </div>
                  </div>

                  {/* ÜST GENEL VARDİYA BİLGİ KUTULARI */}
                  <div className="grid grid-cols-12 divide-x divide-slate-400 text-[11px] bg-slate-50/50">
                    <div className="col-span-3 p-1.5">
                      <span className="font-bold block text-[9px] text-slate-500 uppercase">Tarih / Gün:</span>
                      <span className="text-slate-400 font-mono">...................................</span>
                    </div>
                    <div className="col-span-3 p-1.5">
                      <span className="font-bold block text-[9px] text-slate-500 uppercase">Vardiya:</span>
                      <span className="text-slate-800 font-semibold">[ ] 08-16 &nbsp; [ ] 16-24 &nbsp; [ ] 24-08</span>
                    </div>
                    <div className="col-span-3 p-1.5">
                      <span className="font-bold block text-[9px] text-slate-500 uppercase">Vardiya Amiri:</span>
                      <span className="text-slate-400">...................................</span>
                    </div>
                    <div className="col-span-3 p-1.5">
                      <span className="font-bold block text-[9px] text-slate-500 uppercase">Toplam Ekip:</span>
                      <span className="text-slate-400 font-mono">____ Kişi</span>
                    </div>
                  </div>
                </div>

                {/* 2. OCAK ERGİTME VE ŞARJ TABLOSU */}
                <div className="mb-3">
                  <div className="bg-slate-900 text-white font-extrabold px-2 py-1 text-[10px] uppercase flex justify-between items-center">
                    <span>1. OCAK ERGİTME VE SIVI METAL ŞARJ TABLOSU</span>
                    <span className="text-[9px] font-normal text-slate-300">İş Birimi: Şarj Başı Takip</span>
                  </div>
                  <table className="w-full border-collapse border border-slate-900 text-[10px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-900 text-center">
                        <th className="border border-slate-400 p-1 w-8">Şarj</th>
                        <th className="border border-slate-400 p-1 w-36 text-left">Ocak Adı</th>
                        <th className="border border-slate-400 p-1 w-14">Başlangıç</th>
                        <th className="border border-slate-400 p-1 w-14">Döküm Saati</th>
                        <th className="border border-slate-400 p-1 w-20 text-right">Ergitilen (kg)</th>
                        <th className="border border-slate-400 p-1 w-16">Sıcaklık (°C)</th>
                        <th className="border border-slate-400 p-1">Ocak Operatörü / Not</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: furnaceRowsCount }).map((_, idx) => {
                        const prefilledName = prefillFurnaces && furnacesList[idx] ? furnacesList[idx].name : '';
                        return (
                          <tr key={idx} className="h-6">
                            <td className="border border-slate-300 text-center font-mono font-semibold">{idx + 1}</td>
                            <td className="border border-slate-300 px-1.5 font-medium">{prefilledName}</td>
                            <td className="border border-slate-300 text-center font-mono"></td>
                            <td className="border border-slate-300 text-center font-mono"></td>
                            <td className="border border-slate-300 text-right px-1 font-mono"></td>
                            <td className="border border-slate-300 text-center font-mono"></td>
                            <td className="border border-slate-300 px-1"></td>
                          </tr>
                        );
                      })}
                      <tr className="bg-slate-50 font-bold border-t-2 border-slate-900 h-6">
                        <td colSpan={4} className="border border-slate-400 text-right px-2 uppercase">VARDİYA TOPLAM ERGİTME:</td>
                        <td className="border border-slate-400 text-right px-1 font-mono">______ kg</td>
                        <td colSpan={2} className="border border-slate-400 px-2 font-mono">Toplam: ______ Şarj</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 3. KALIP VE DÖKÜM ÜRETİM TABLOSU */}
                <div className="mb-3">
                  <div className="bg-slate-900 text-white font-extrabold px-2 py-1 text-[10px] uppercase flex justify-between items-center">
                    <span>2. KALIP VE DÖKÜM ÜRETİM TABLOSU</span>
                    <span className="text-[9px] font-normal text-slate-300">Mamul ve Parça Bazında</span>
                  </div>
                  <table className="w-full border-collapse border border-slate-900 text-[10px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-900 text-center">
                        <th className="border border-slate-400 p-1 w-8">No</th>
                        <th className="border border-slate-400 p-1 text-left">Dökülen Parça / Model</th>
                        <th className="border border-slate-400 p-1 w-32">Kalıp Türü</th>
                        <th className="border border-slate-400 p-1 w-16 text-right">Dökülen Adet</th>
                        <th className="border border-slate-400 p-1 w-20 text-right">Toplam (kg)</th>
                        <th className="border border-slate-400 p-1 w-14 text-center">Sağlam</th>
                        <th className="border border-slate-400 p-1 w-14 text-center">Fire / Hurda</th>
                        <th className="border border-slate-400 p-1 w-24">Açıklama</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: moldRowsCount }).map((_, idx) => (
                        <tr key={idx} className="h-6">
                          <td className="border border-slate-300 text-center font-mono font-semibold">{idx + 1}</td>
                          <td className="border border-slate-300 px-1.5 font-medium">
                            {idx === 0 && 'Fren Diski Kalıbı'}
                            {idx === 1 && 'Kum Kalıp'}
                          </td>
                          <td className="border border-slate-300 px-1 text-center">
                            {idx === 0 && 'Fren Diski'}
                            {idx === 1 && 'Kum Kalıp'}
                          </td>
                          <td className="border border-slate-300 text-right px-1 font-mono"></td>
                          <td className="border border-slate-300 text-right px-1 font-mono"></td>
                          <td className="border border-slate-300 text-center font-mono"></td>
                          <td className="border border-slate-300 text-center font-mono"></td>
                          <td className="border border-slate-300 px-1"></td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold border-t-2 border-slate-900 h-6">
                        <td colSpan={3} className="border border-slate-400 text-right px-2 uppercase">GENEL ÜRETİM TOPLAMI:</td>
                        <td className="border border-slate-400 text-right px-1 font-mono">____ Adet</td>
                        <td className="border border-slate-400 text-right px-1 font-mono">______ kg</td>
                        <td colSpan={3} className="border border-slate-400 px-2 font-mono">Net Döküm: ______ kg</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 4. ARIZA, DURUŞ VE BAKIM KAYITLARI */}
                <div className="mb-3">
                  <div className="bg-slate-900 text-white font-extrabold px-2 py-1 text-[10px] uppercase flex justify-between items-center">
                    <span>3. ARIZA, DURUŞ VE BAKIM KAYITLARI (DOWNTIME)</span>
                    <span className="text-[9px] font-normal text-slate-300">Elektrik / Mekanik / Ocak Duruşları</span>
                  </div>
                  <table className="w-full border-collapse border border-slate-900 text-[10px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-900 text-center">
                        <th className="border border-slate-400 p-1 w-20">Başlangıç / Bitiş</th>
                        <th className="border border-slate-400 p-1 w-28">Ocak / Ekipman</th>
                        <th className="border border-slate-400 p-1">Duruş Nedeni / Arıza Tanımı</th>
                        <th className="border border-slate-400 p-1 w-16 text-center">Süre (Dk)</th>
                        <th className="border border-slate-400 p-1 w-40">Yapılan Müdahale / Teknisyen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: downtimeRowsCount }).map((_, idx) => (
                        <tr key={idx} className="h-6">
                          <td className="border border-slate-300 text-center font-mono"></td>
                          <td className="border border-slate-300 px-1 font-medium"></td>
                          <td className="border border-slate-300 px-1.5"></td>
                          <td className="border border-slate-300 text-center font-mono font-bold"></td>
                          <td className="border border-slate-300 px-1"></td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold border-t-2 border-slate-900 h-6">
                        <td colSpan={3} className="border border-slate-400 text-right px-2 uppercase">TOPLAM KAYIP SÜRE:</td>
                        <td className="border border-slate-400 text-center font-mono text-rose-700">____ dk</td>
                        <td className="border border-slate-400 px-2 font-mono">(Yaklaşık: ____ saat)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 5. PERSONEL VE VARDİYA NOTLARI - YAN YANA */}
                <div className="grid grid-cols-12 gap-3 mb-3">
                  {/* Personel Dağılımı */}
                  <div className="col-span-5 border border-slate-900">
                    <div className="bg-slate-800 text-white font-bold px-2 py-0.5 text-[9px] uppercase">
                      4. Personel Dağılımı
                    </div>
                    <div className="p-1.5 space-y-1 text-[10px]">
                      <div className="flex justify-between border-b border-dashed border-slate-300 pb-0.5">
                        <span>Ocak Ergitme Ekibi:</span>
                        <span className="font-mono font-bold">____ Kişi</span>
                      </div>
                      <div className="flex justify-between border-b border-dashed border-slate-300 pb-0.5">
                        <span>Kalıp & Maça Ekibi:</span>
                        <span className="font-mono font-bold">____ Kişi</span>
                      </div>
                      <div className="flex justify-between border-b border-dashed border-slate-300 pb-0.5">
                        <span>Bakım & Elektrik:</span>
                        <span className="font-mono font-bold">____ Kişi</span>
                      </div>
                      <div className="flex justify-between font-bold pt-0.5 text-slate-950">
                        <span>Vardiya Genel Toplam:</span>
                        <span className="font-mono">____ Kişi</span>
                      </div>
                    </div>
                  </div>

                  {/* Özel Talimat ve Önemli Notlar */}
                  <div className="col-span-7 border border-slate-900">
                    <div className="bg-slate-800 text-white font-bold px-2 py-0.5 text-[9px] uppercase">
                      5. Operasyon Talimatları & Vardiya Notları
                    </div>
                    <div className="p-2 text-[9px] text-slate-700 leading-relaxed min-h-[70px] whitespace-pre-line font-medium">
                      {specialInstructions || 'Herhangi bir özel talimat bulunmuyor.'}
                    </div>
                  </div>
                </div>

                {/* 6. TESLİM VE ONAY İMZALARI */}
                <div className="border-2 border-slate-900 mt-2">
                  <div className="grid grid-cols-3 divide-x-2 divide-slate-900 text-center text-[10px]">
                    <div className="p-2 h-16 flex flex-col justify-between">
                      <span className="font-bold text-[9px] text-slate-600 uppercase">TESLİM EDEN VARDİYA AMİRİ</span>
                      <span className="text-[9px] text-slate-400">Ad Soyad / İmza</span>
                    </div>
                    <div className="p-2 h-16 flex flex-col justify-between">
                      <span className="font-bold text-[9px] text-slate-600 uppercase">TESLİM ALAN VARDİYA AMİRİ</span>
                      <span className="text-[9px] text-slate-400">Ad Soyad / İmza</span>
                    </div>
                    <div className="p-2 h-16 flex flex-col justify-between">
                      <span className="font-bold text-[9px] text-slate-600 uppercase">KALİTE KONTROL / ÜRETİM MÜDÜRÜ</span>
                      <span className="text-[9px] text-slate-400">Onay & Tarih</span>
                    </div>
                  </div>
                </div>

                {/* Alt Dipnot */}
                <div className="mt-2 text-[8px] text-slate-400 text-center flex justify-between items-center">
                  <span>Dökümhane Operasyonel Takip Sistemi tarafından matbu form olarak üretilmiştir.</span>
                  <span>Form Doğrulama: #{docCode}-2026</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
