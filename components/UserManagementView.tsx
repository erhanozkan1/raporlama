'use client';

import React, { useState } from 'react';
import { User, SafeUser, UserRole } from '@/lib/types';
import { getRoleBadgeConfig } from '@/lib/auth-client';
import ModernSelect from './ui/ModernSelect';
import { 
  Users, UserPlus, Shield, Mail, Lock, Trash2, Edit2, 
  CheckCircle, X, KeyRound, UserCheck, Sparkles, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserManagementViewProps {
  users: SafeUser[];
  onAddUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  onDeleteUser: (userId: string) => void;
  onUpdateRole: (userId: string, newRole: UserRole) => void;
}

export default function UserManagementView({
  users,
  onAddUser,
  onDeleteUser,
  onUpdateRole,
}: UserManagementViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'operator' as UserRole,
  });
  const [error, setError] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('Tüm alanları doldurunuz.');
      return;
    }

    if (users.some((u) => u.email.toLowerCase() === formData.email.toLowerCase())) {
      setError('Bu e-posta adresiyle kayıtlı bir kullanıcı zaten var.');
      return;
    }

    onAddUser({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
    });

    setShowAddModal(false);
    setFormData({ name: '', email: '', password: '', role: 'operator' });
  };

  return (
    <div className="space-y-6" id="user-management-view">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-display flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500" />
            Kullanıcı Yönetimi
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Sisteme erişim yetkisi olan kullanıcıların ve rollerinin (SuperAdmin, Admin, Operatör) yönetimi.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold text-xs transition shadow-md flex items-center gap-2 active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          Yeni Kullanıcı Ekle
        </button>
      </div>

      {/* Users List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => {
          const badge = getRoleBadgeConfig(user.role);
          const initials = user.name
            .split('')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                    {initials}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 font-display">
                      {user.name}
                    </h3>
                    <p className="text-xs text-gray-400 font-sans mt-0.5">{user.email}</p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                  {badge.label}
                </span>
              </div>

              {/* Role Change & Actions Footer */}
              <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2 w-[135px] shrink-0">
                  <span className="text-[10px] text-gray-400 font-bold uppercase shrink-0">Rol:</span>
                  <ModernSelect
                    value={user.role}
                    onChange={(val) => onUpdateRole(user.id, val as UserRole)}
                    options={[
                      { value: 'superadmin', label: 'Super Admin' },
                      { value: 'admin', label: 'Admin' },
                      { value: 'operator', label: 'Operatör' },
                    ]}
                  />
                </div>

                {user.role !== 'superadmin' && (
                  <button
                    onClick={() => onDeleteUser(user.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
                    title="Kullanıcıyı Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 pb-24 sm:pb-6 overflow-y-auto"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md max-h-[82vh] sm:max-h-[88vh] bg-white rounded-3xl shadow-2xl overflow-y-auto p-5 sm:p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg font-bold text-gray-900 font-display">Yeni Kullanıcı</h2>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center"
                  aria-label="Modalı Kapat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Ad Soyad</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none text-gray-900 focus:ring-2 focus:ring-amber-500/40"
                    placeholder="Erhan Özkan"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">E-Posta</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none text-gray-900 focus:ring-2 focus:ring-amber-500/40"
                    placeholder="erhan@firma.com"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Şifre</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none text-gray-900 focus:ring-2 focus:ring-amber-500/40"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Rol</label>
                  <ModernSelect
                    value={formData.role}
                    onChange={(val) => setFormData({ ...formData, role: val as UserRole })}
                    options={[
                      { value: 'operator', label: 'Operatör (Rapor yazabilir)' },
                      { value: 'admin', label: 'Admin (Ocak & Sistem yönetimi)' },
                      { value: 'superadmin', label: 'Super Admin (Tam Yetki)' },
                    ]}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 min-h-[44px] py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-md active:scale-95 flex items-center justify-center"
                  >
                    Kullanıcıyı Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="min-h-[44px] px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition flex items-center justify-center"
                  >
                    İptal
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
