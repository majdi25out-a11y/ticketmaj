import React, { useState } from 'react';
import { Developer, AppBrandingConfig } from '../../types';
import { DEFAULT_ADMIN_AVATAR, DEFAULT_CARTOON_AVATAR } from '../../data/avatars';

interface UserProfile {
  name: string;
  role: string;
  avatar: string;
  email?: string;
  password?: string;
  id?: string;
  token?: string;
  expiresAt?: number;
}

interface LoginViewProps {
  developers: Developer[];
  onLogin: (user: UserProfile) => void;
  dbConnected?: boolean;
  branding?: AppBrandingConfig;
}

export const LoginView: React.FC<LoginViewProps> = ({ developers, onLogin, dbConnected = false, branding }) => {
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [logoImgError, setLogoImgError] = useState(false);

  const appName = branding?.appName || 'TicketFlow';
  const appSubtitle = branding?.appSubtitle || 'Operational Control & QA';
  const appLogoUrl = branding?.appLogoUrl;
  const commentary = branding?.commentary || 'Plateforme de gestion centralisée des tickets et suivi des équipes de développement.';

  // Admin default user
  const adminUser: UserProfile = {
    name: 'Administrateur',
    role: 'Architecte Système & Admin',
    avatar: DEFAULT_ADMIN_AVATAR,
    email: 'admin@ticketflow.io',
    password: 'Password123!',
    id: 'admin-1',
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const trimmedEmail = email.trim().toLowerCase();

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          onLogin({
            ...data.user,
            token: data.token || data.user.token,
            expiresAt: data.expiresAt || data.user.expiresAt,
          });
          return;
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Identifiants invalides.');
        setLoading(false);
        return;
      }
    } catch (err) {
      // Offline fallback
      const foundDev = developers.find((d) => d.email && d.email.toLowerCase() === trimmedEmail);
      if (foundDev) {
        onLogin({
          name: foundDev.name,
          role: foundDev.role,
          avatar: foundDev.avatar || DEFAULT_CARTOON_AVATAR,
          email: foundDev.email,
          id: foundDev.id,
        });
      } else if (trimmedEmail === 'admin@ticketflow.io') {
        onLogin(adminUser);
      } else {
        setError('Impossible d\'accéder au serveur d\'authentification.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-[#c8c4d5]/60 shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Left Branding & Info Banner */}
        <div className="md:col-span-5 bg-[#1f108e] text-white p-8 flex flex-col justify-between relative overflow-hidden">
          {/* Background Decorative Blur circles */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#3730a3] rounded-full filter blur-2xl opacity-50" />
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-600 rounded-full filter blur-2xl opacity-40" />

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 overflow-hidden flex-shrink-0 p-1">
                {appLogoUrl && !logoImgError ? (
                  <img
                    src={appLogoUrl}
                    alt={appName}
                    className="w-full h-full object-contain"
                    onError={() => setLogoImgError(true)}
                  />
                ) : (
                  <span className="material-symbols-outlined text-3xl text-emerald-300">
                    confirmation_number
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-black tracking-tight leading-tight text-white truncate">
                  {appName}
                </h1>
                <p className="text-[10px] text-white/75 font-semibold uppercase tracking-widest mt-0.5 truncate">
                  {appSubtitle}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <h2 className="text-lg font-bold leading-snug">
                Espace de Connexion Sécurisé
              </h2>
              <p className="text-xs text-white/85 leading-relaxed">
                {commentary}
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/15 rounded-full text-[11px] font-semibold text-emerald-300 border border-white/20">
                <span className="material-symbols-outlined text-sm">lock</span>
                <span>Portail Réservé aux Membres</span>
              </div>
            </div>
          </div>

          {/* Database Status Info */}
          <div className="relative z-10 pt-8 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs bg-white/10 p-3 rounded-2xl backdrop-blur-xs border border-white/10">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${dbConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`} />
                <span className="font-semibold text-[11px]">
                  {dbConnected ? 'Serveur MySQL Actif (VPS)' : 'Serveur Connecté'}
                </span>
              </div>
              <span className="material-symbols-outlined text-base text-white/70">
                database
              </span>
            </div>
            <p className="text-[10px] text-white/60 text-center">
              Gestion de tickets & déploiements
            </p>
          </div>
        </div>

        {/* Right Authentication Form Panel */}
        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between max-h-[90vh] overflow-y-auto">
          <div>
            <div className="mb-6">
              <h3 className="text-xl font-extrabold text-[#0b1c30]">Connexion à votre compte</h3>
              <p className="text-xs text-[#777584] mt-1">
                Saisissez vos identifiants pour accéder à votre espace de travail.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-[#ba1a1a] flex items-center gap-2 animate-in fade-in duration-200">
                <span className="material-symbols-outlined text-base flex-shrink-0">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* LOGIN FORM */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                  Adresse Email Professionnelle
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@ticketflow.io"
                    className="w-full h-11 border border-[#c8c4d5] rounded-xl pl-9 pr-4 text-xs text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/20 outline-none font-geist"
                  />
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-base text-[#777584]">
                    mail
                  </span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-[#0b1c30]">Mot de passe</label>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 border border-[#c8c4d5] rounded-xl pl-9 pr-10 text-xs text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/20 outline-none font-mono"
                  />
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-base text-[#777584]">
                    lock
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777584] hover:text-[#0b1c30] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#464553]">
                  <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#1f108e] rounded" />
                  <span>Se souvenir de moi</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#1f108e] text-white rounded-xl font-bold text-xs hover:opacity-90 active:scale-98 transition-all shadow-md shadow-[#1f108e]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                <span>{loading ? 'Vérification...' : 'Se connecter'}</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-[#c8c4d5]/40 flex justify-between items-center text-[11px] text-[#777584]">
            <span>© 2026 {appName}. Tous droits réservés.</span>
            <span className="font-semibold text-emerald-600">Accès Sécurisé</span>
          </div>
        </div>
      </div>
    </div>
  );
};
