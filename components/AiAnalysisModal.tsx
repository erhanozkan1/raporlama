'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, X, Copy, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { DailyReport } from '@/lib/types';

interface AiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: DailyReport[];
  title?: string;
  onApplySummary?: (summaryText: string) => void;
}

export default function AiAnalysisModal({
  isOpen,
  onClose,
  reports,
  title = 'AI Yönetici Operasyon Özeti',
  onApplySummary,
}: AiAnalysisModalProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [summary, setSummary] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reports }),
      });
      const data = await res.json();
      if (data.success && (data.description || data.analysis)) {
        setSummary(data.description || data.analysis);
      } else {
        throw new Error(data.error || 'Özet oluşturulamadı');
      }
    } catch (err: any) {
      console.error('AI summary fetch error:', err);
      setError('Özet oluşturulurken bir aksaklık yaşandı. Lütfen tekrar deneyiniz.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSummary();
    } else {
      setSummary('');
      setError(null);
      setCopied(false);
    }
  }, [isOpen, reports]);

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white">{title}</h2>
              <p className="text-[11px] text-slate-300">Kurumsal ve edilgen dille hazırlanmış yönetici özeti</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition active:scale-95"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
                <Sparkles className="w-5 h-5 text-amber-500 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Yönetici Özeti Hazırlanıyor...</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Operasyon verileri analiz edilip edilgen dilde özetleniyor.</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{error}</p>
                <button
                  type="button"
                  onClick={fetchSummary}
                  className="mt-2 px-3 py-1 bg-rose-600 text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1 hover:bg-rose-700 transition"
                >
                  <RefreshCw className="w-3 h-3" /> Tekrar Dene
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 text-slate-800 text-xs sm:text-sm leading-relaxed space-y-3 font-normal selection:bg-amber-100">
                {summary.split('\n\n').filter(Boolean).map((paragraph, idx) => (
                  <p key={idx} className="text-justify font-serif sm:font-sans">
                    {paragraph}
                  </p>
                ))}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>⚡ Üst yönetim raporlama standardında oluşturuldu</span>
                <span>{summary.split(/\s+/).length} kelime</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchSummary}
            disabled={loading}
            className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Yeniden Üret</span>
          </button>

          <div className="flex items-center gap-2">
            {onApplySummary && summary && (
              <button
                type="button"
                onClick={() => {
                  onApplySummary(summary);
                  onClose();
                }}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition active:scale-95 shadow-xs"
              >
                Rapor Açıklamasına Aktar
              </button>
            )}
            <button
              type="button"
              onClick={handleCopy}
              disabled={!summary || loading}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-xs ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
              } disabled:opacity-50`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Kopyalandı' : 'Metni Kopyala'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
