'use client';

import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title = 'Kaydı Silmek İstediğinize Emin Misiniz?',
  message = 'Bu işlem kalıcı olarak veritabanından silinecektir. Silinen veriler geri alınamaz.',
  confirmLabel = 'Evet, Sil',
  cancelLabel = 'İptal Et',
  isDanger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 pb-24 sm:pb-6 overflow-y-auto"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md max-h-[85vh] overflow-y-auto bg-white rounded-3xl shadow-2xl p-5 sm:p-6 border border-gray-100 z-10 space-y-5"
        >
          {/* Header & Icon */}
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl shrink-0 ${
              isDanger ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
            }`}>
              {isDanger ? <Trash2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900 font-display leading-snug">{title}</h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed font-sans">{message}</p>
            </div>

            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[44px] px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition active:scale-95 flex items-center justify-center"
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              className={`min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition active:scale-95 flex items-center justify-center ${
                isDanger
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                  : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
