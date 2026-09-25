'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
}

interface ModernSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  id?: string;
}

export default function ModernSelect({
  options,
  value,
  onChange,
  placeholder = 'Seçiniz...',
  icon,
  className = '',
  id,
}: ModernSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`} id={id}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-11 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs font-semibold text-slate-900 flex items-center justify-between gap-2 transition shadow-2xs active:scale-[0.99] outline-none"
      >
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
          {selectedOption ? (
            <div className="flex items-center gap-2 truncate">
              {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
              <span className="truncate">{selectedOption.label}</span>
            </div>
          ) : (
            <span className="text-gray-400 font-normal truncate">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180 text-amber-500' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Popup */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 right-0 mt-1.5 py-1.5 bg-white/95 backdrop-blur-md border border-gray-100 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar"
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 text-xs font-medium flex items-center justify-between transition ${
                    isSelected
                      ? 'bg-amber-50 text-amber-600 font-bold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <span className="truncate">{opt.label}</span>
                  </div>

                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-2" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
