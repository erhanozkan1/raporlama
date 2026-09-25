'use client';

import React from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 z-[60] flex flex-col gap-2.5 sm:w-full sm:max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className={`pointer-events-auto p-4 rounded-2xl shadow-xl border flex items-start gap-3 backdrop-blur-md transition-all ${
                isSuccess
                  ? 'bg-emerald-500/95 text-white border-emerald-400'
                  : isError
                  ? 'bg-red-500/95 text-white border-red-400'
                  : isWarning
                  ? 'bg-amber-500/95 text-white border-amber-400'
                  : 'bg-slate-900/95 text-white border-slate-700'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle className="w-5 h-5" />}
                {isError && <AlertCircle className="w-5 h-5" />}
                {isWarning && <AlertTriangle className="w-5 h-5" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold font-display leading-tight">{toast.title}</h4>
                {toast.message && (
                  <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed font-sans">{toast.message}</p>
                )}
              </div>

              <button
                onClick={() => onDismiss(toast.id)}
                className="p-1 hover:bg-white/20 rounded-lg transition shrink-0 -mr-1 -mt-1 opacity-80 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
