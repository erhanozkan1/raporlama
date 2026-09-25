'use client';

import React from 'react';
import { AppNotification } from '@/lib/notifications';
import { Bell, AlertTriangle, ShieldAlert, Info, CheckCircle2, CheckCheck, Trash2, X } from 'lucide-react';
import { motion } from 'motion/react';

interface NotificationPanelProps {
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onClearNotification: (id: string) => void;
  onNavigateToTab?: (tab: string) => void;
  onClose: () => void;
}

export default function NotificationPanel({
  notifications,
  onMarkAllAsRead,
  onClearNotification,
  onNavigateToTab,
  onClose,
}: NotificationPanelProps) {
  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'danger':
        return <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-blue-500 shrink-0" />;
    }
  };

  const getBgColor = (type: AppNotification['type']) => {
    switch (type) {
      case 'danger':
        return 'bg-red-50/60 border-red-100 hover:bg-red-100/70';
      case 'warning':
        return 'bg-amber-50/60 border-amber-100 hover:bg-amber-100/70';
      case 'success':
        return 'bg-emerald-50/60 border-emerald-100 hover:bg-emerald-100/70';
      default:
        return 'bg-blue-50/60 border-blue-100 hover:bg-blue-100/70';
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-1.5rem))] sm:w-96 bg-white border border-gray-100 rounded-3xl shadow-2xl p-4 z-50 space-y-3"
      role="dialog"
      aria-label="Bildirimler paneli"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100 ">
        <div className="flex items-center gap-2 min-w-0">
          <Bell className="w-4 h-4 text-amber-500 shrink-0" />
          <h3 className="text-xs font-bold text-gray-900 font-display truncate">Bildirimler</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold font-mono whitespace-nowrap shrink-0">
              {unreadCount} Yeni
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              title="Tümünü Okundu İşaretle"
              className="text-[10px] text-amber-600 font-bold hover:bg-amber-50 rounded-lg px-2 py-1.5 flex items-center gap-1 transition whitespace-nowrap"
            >
              <CheckCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Tümünü Okundu İşaretle</span>
            </button>
          )}
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto space-y-2 custom-scrollbar pr-1">
        {notifications.length === 0 ? (
          <div className="py-8 text-center space-y-1">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
            <p className="text-xs font-bold text-gray-500 ">Bildirim Bulunmuyor</p>
            <p className="text-[10px] text-gray-400">Tüm sistem operasyonları normal çalışıyor.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                if (n.targetTab && onNavigateToTab) {
                  onNavigateToTab(n.targetTab);
                  onClose();
                }
              }}
              className={`p-3 rounded-2xl border transition flex items-start justify-between gap-3 ${getBgColor(n.type)} ${
                n.read ? 'opacity-60' : 'opacity-100'
              } ${n.targetTab ? 'cursor-pointer' : ''}`}
            >
              <div className="flex items-start gap-2.5">
                {getIcon(n.type)}
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-gray-900 ">{n.title}</h4>
                  <p className="text-[11px] text-gray-600 leading-relaxed">{n.message}</p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearNotification(n.id);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
