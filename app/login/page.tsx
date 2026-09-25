'use client';

import React, { useState, useEffect } from 'react';
import { Flame, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        // Store session info in localStorage for client-side access
        localStorage.setItem('dokum_user', JSON.stringify(data.user));
        localStorage.setItem('dokum_token', data.token);
        // Redirect to main app
        window.location.href = '/';
      } else {
        setError(data.error || 'Giriş başarısız');
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
    } catch (err) {
      setError('Sunucuya bağlanılamadı');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-zinc-900 to-slate-950" />
      
      {/* Ambient Light Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-amber-500/8 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-orange-600/6 rounded-full blur-3xl" style={{ animationDelay: '1s' }} />
      <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] bg-amber-400/5 rounded-full blur-3xl" />

      {/* Subtle Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{ 
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }}
      />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Glass Card */}
        <motion.div
          animate={shake ? { x: [0, -10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-black/30 p-8 sm:p-10 space-y-8"
        >
          {/* Logo & Header */}
          <div className="text-center space-y-4">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
              className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 pulse-glow"
            >
              <Flame className="w-8 h-8 text-white" />
            </motion.div>

            <div>
              <h1 className="text-2xl font-bold text-white font-display tracking-tight">
                Döküm Takip Sistemi
              </h1>
              <p className="text-sm text-zinc-400 mt-2">
                Operasyon yönetim paneline giriş yapın
              </p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                E-Posta Adresi
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder-zinc-600 outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all duration-200"
                  placeholder="ornek@firma.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder-zinc-600 outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all duration-200"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                <>
                  Giriş Yap
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center">
            <p className="text-[10px] text-zinc-600">
              Döküm Operasyon Takip Sistemi v2.0 — Tüm hakları saklıdır.
            </p>
          </div>
        </motion.div>

        {/* Alt bilgi */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 text-center"
        >
          <p className="text-xs text-zinc-600">
            Erişim bilgileriniz için sistem yöneticinizle iletişime geçin.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
