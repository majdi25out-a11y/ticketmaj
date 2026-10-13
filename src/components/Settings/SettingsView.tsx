import React, { useState, useEffect } from 'react';
import { colorThemes, applyTheme, getInitialTheme, ColorTheme, applyFontSize, getInitialFontSize } from '../../utils/theme';
import { AppBrandingConfig, UserProfile, ProposedAvatar } from '../../types';
import { compressImageFile } from '../../data/avatars';

interface SettingsViewProps {
  branding?: AppBrandingConfig;
  onSaveBranding?: (newBranding: AppBrandingConfig) => void;
  currentUser?: UserProfile;
  onSaveUserProfile?: (newProfile: UserProfile) => void;
  isAdmin?: boolean;
  onManualSync?: () => void;
  isSyncing?: boolean;
  dbStatus?: { connected: boolean; message?: string; syncStatus?: string; engine?: string };
  onOpenImportModal?: () => void;
  onOpenExportModal?: () => void;
  onOpenMobileApkModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  branding,
  onSaveBranding,
  currentUser,
  onSaveUserProfile,
  isAdmin = true,
  onManualSync,
  isSyncing = false,
  dbStatus = { connected: true, syncStatus: 'synced', engine: 'persistent_store', message: 'Base de données synchronisée et active en continu.' },
  onOpenImportModal,
  onOpenExportModal,
  onOpenMobileApkModal,
}) => {
  const [slaAlertHours, setSlaAlertHours] = useState('4');
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<ColorTheme>(getInitialTheme());
  const [fontSizePct, setFontSizePct] = useState<number>(getInitialFontSize());

  // Branding states
  const [appName, setAppName] = useState(branding?.appName || 'TicketFlow');
  const [appSubtitle, setAppSubtitle] = useState(branding?.appSubtitle || 'Operational Control');
  const [appLogoUrl, setAppLogoUrl] = useState(branding?.appLogoUrl || '');
  const [commentary, setCommentary] = useState(branding?.commentary || 'Plateforme de gestion centralisée des tickets et suivi des équipes de développement.');
  const [proposedAvatars, setProposedAvatars] = useState<ProposedAvatar[]>(branding?.proposedAvatars || []);
  const [sessionTimeout, setSessionTimeout] = useState<string>(() => {
    if (branding?.sessionTimeout) return branding.sessionTimeout;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tf_session_timeout') || '1h';
    }
    return '1h';
  });

  // Form states for Admin to add proposed avatars
  const [newProposedName, setNewProposedName] = useState('');
  const [newProposedCategory, setNewProposedCategory] = useState('');
  const [newProposedUrl, setNewProposedUrl] = useState('');

  // User Profile states
  const [userName, setUserName] = useState(currentUser?.name || '');
  const [userRole, setUserRole] = useState(currentUser?.role || '');
  const [userEmail, setUserEmail] = useState(currentUser?.email || '');
  const [userAvatar, setUserAvatar] = useState(currentUser?.avatar || '');

  const brandingKey = branding
    ? `${branding.appName}-${branding.appSubtitle}-${branding.appLogoUrl}-${branding.commentary}-${(branding.proposedAvatars || []).length}-${branding.sessionTimeout || ''}`
    : '';
  const [syncedBrandingKey, setSyncedBrandingKey] = useState(brandingKey);

  useEffect(() => {
    if (branding && brandingKey !== syncedBrandingKey) {
      setSyncedBrandingKey(brandingKey);
      setAppName(branding.appName || 'TicketFlow');
      setAppSubtitle(branding.appSubtitle || 'Operational Control');
      setAppLogoUrl(branding.appLogoUrl || '');
      setCommentary(branding.commentary || '');
      setProposedAvatars(branding.proposedAvatars || []);
      if (branding.sessionTimeout) {
        setSessionTimeout(branding.sessionTimeout);
      }
    }
  }, [branding, brandingKey, syncedBrandingKey]);

  // Track initial user key to avoid overwriting form values while editing
  const accountKey = currentUser?.email || currentUser?.name || '';
  const [syncedAccountKey, setSyncedAccountKey] = useState(accountKey);

  useEffect(() => {
    if (accountKey && accountKey !== syncedAccountKey) {
      setSyncedAccountKey(accountKey);
      setUserName(currentUser?.name || '');
      setUserRole(currentUser?.role || '');
      setUserEmail(currentUser?.email || '');
      setUserAvatar(currentUser?.avatar || '');
    }
  }, [accountKey, syncedAccountKey, currentUser]);

  useEffect(() => {
    applyTheme(selectedTheme);
  }, [selectedTheme]);

  useEffect(() => {
    applyFontSize(fontSizePct);
  }, [fontSizePct]);

  const handleSelectTheme = (theme: ColorTheme) => {
    setSelectedTheme(theme);
    applyTheme(theme);
  };

  const handleFontSizeChange = (pct: number) => {
    setFontSizePct(pct);
    applyFontSize(pct);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setFormError('Le fichier sélectionné dépasse la taille maximale autorisée de 2 Mo.');
        return;
      }
      setFormError(null);
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setAppLogoUrl(uploadEvent.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setFormError(null);
        const compressedUrl = await compressImageFile(file);
        setUserAvatar(compressedUrl);
      } catch (err: any) {
        setFormError(err.message || 'Erreur lors du traitement de la photo de profil.');
      }
    }
  };

  const handleAddProposedAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setFormError(null);
      const compressed = await compressImageFile(file);
      const item: ProposedAvatar = {
        id: `pa-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: newProposedName.trim() || `Avatar ${proposedAvatars.length + 1}`,
        category: newProposedCategory.trim() || 'Proposé par l\'Admin',
        url: compressed,
        createdAt: new Date().toISOString(),
      };
      const updated = [...proposedAvatars, item];
      setProposedAvatars(updated);
      setNewProposedName('');
      setNewProposedCategory('');

      if (isAdmin && onSaveBranding) {
        onSaveBranding({
          appName,
          appSubtitle,
          appLogoUrl,
          commentary,
          proposedAvatars: updated,
        });
      }
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors du traitement du fichier.');
    }
  };

  const handleAddProposedAvatarUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProposedUrl.trim()) return;
    const item: ProposedAvatar = {
      id: `pa-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newProposedName.trim() || `Avatar ${proposedAvatars.length + 1}`,
      category: newProposedCategory.trim() || 'Proposé par l\'Admin',
      url: newProposedUrl.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...proposedAvatars, item];
    setProposedAvatars(updated);
    setNewProposedName('');
    setNewProposedCategory('');
    setNewProposedUrl('');

    if (isAdmin && onSaveBranding) {
      onSaveBranding({
        appName,
        appSubtitle,
        appLogoUrl,
        commentary,
        proposedAvatars: updated,
      });
    }
  };

  const handleDeleteProposedAvatar = (id: string) => {
    const updated = proposedAvatars.filter((a) => a.id !== id);
    setProposedAvatars(updated);
    if (isAdmin && onSaveBranding) {
      onSaveBranding({
        appName,
        appSubtitle,
        appLogoUrl,
        commentary,
        proposedAvatars: updated,
      });
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const newProfileConfig = {
      name: userName,
      role: userRole,
      email: userEmail,
      avatar: userAvatar,
    };

    if (isAdmin) {
      const newBrandingConfig = {
        appName,
        appSubtitle,
        appLogoUrl,
        commentary,
        proposedAvatars,
        sessionTimeout,
      };

      setSyncedBrandingKey(`${appName}-${appSubtitle}-${appLogoUrl}-${commentary}-${proposedAvatars.length}-${sessionTimeout}`);

      try {
        localStorage.setItem('tf_session_timeout', sessionTimeout);
      } catch (_e) {}

      if (onSaveBranding) {
        onSaveBranding(newBrandingConfig);
      }
    }

    setSyncedAccountKey(userEmail || userName);

    if (onSaveUserProfile) {
      onSaveUserProfile(newProfileConfig);
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
  };

  return (
    <div className="pt-20 pb-16 px-4 md:px-10 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#0b1c30]">Paramètres du Système</h1>
        <p className="text-sm text-[#464553] mt-1">
          Configuration du moteur de tri, règles de SLA et personnalisation visuelle.
        </p>
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2.5 shadow-2xs">
          <span className="material-symbols-outlined text-lg text-amber-600 flex-shrink-0">lock</span>
          <span>
            <strong>Accès Développeur :</strong> Vous pouvez librement modifier votre <strong>photo de profil / avatar</strong> (illustrations BD, photos HD, badges ou fichier personnel), personnaliser la <strong>couleur du thème</strong> et la <strong>taille d'affichage</strong>. Les paramètres globaux système restent gérés par l'Administrateur.
          </span>
        </div>
      )}

      {saved && (
        <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{isAdmin ? 'Paramètres enregistrés avec succès.' : 'Préférences visuelles enregistrées.'}</span>
        </div>
      )}

      {formError && (
        <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-red-600">error</span>
            <span>{formError}</span>
          </div>
          <button
            type="button"
            onClick={() => setFormError(null)}
            className="p-1 hover:bg-black/5 rounded cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white border border-[#c8c4d5]/60 rounded-2xl p-6 md:p-8 space-y-8 shadow-xs">
        {/* User Profile Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#c8c4d5]/40 pb-2">
            <h2 className="text-base font-bold text-[#0b1c30] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#1f108e]">account_circle</span>
              <span>Mon Profil Utilisateur & Compte</span>
            </h2>
            <span className="text-xs text-theme-primary font-bold bg-theme-light px-2.5 py-1 rounded-lg">
              {isAdmin ? 'Administrateur' : 'Développeur'}
            </span>
          </div>

          <p className="text-xs text-[#777584]">
            {isAdmin
              ? "Modifiez votre nom d'affichage, votre rôle professionnel, votre adresse e-mail et votre photo de profil."
              : "Vos informations de profil sont gérées par l'administrateur système."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                Nom complet
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                disabled={!isAdmin}
                placeholder="Ex: Alexandre Dubois"
                className={`w-full h-11 border rounded-xl px-4 text-xs font-semibold outline-none ${
                  !isAdmin
                    ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                    : 'bg-white text-[#0b1c30] border-[#c8c4d5] focus:ring-2 focus:ring-[#1f108e]/20'
                }`}
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                Adresse E-mail
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                disabled={!isAdmin}
                placeholder="nom.prenom@ticketflow.io"
                className={`w-full h-11 border rounded-xl px-4 text-xs outline-none ${
                  !isAdmin
                    ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                    : 'bg-white text-[#0b1c30] border-[#c8c4d5] focus:ring-2 focus:ring-[#1f108e]/20'
                }`}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                Rôle / Titre
              </label>
              <input
                type="text"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                disabled={!isAdmin}
                placeholder="Ex: Architecte Système & Admin"
                className={`w-full h-11 border rounded-xl px-4 text-xs outline-none ${
                  !isAdmin
                    ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                    : 'bg-white text-[#0b1c30] border-[#c8c4d5] focus:ring-2 focus:ring-[#1f108e]/20'
                }`}
              />
            </div>
          </div>

          {/* User Avatar Upload & Custom Image Input */}
          <div className="bg-[#f8f9ff] p-5 rounded-2xl border border-[#c8c4d5]/50 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#0b1c30] flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-[#1f108e]">photo_camera</span>
                <span>Votre Photo de profil / Image Personnalisée</span>
              </label>
              <span className="text-[11px] text-[#777584] font-medium">
                S'affiche sur vos tickets, tâches et commentaires
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 bg-white rounded-xl border border-[#c8c4d5]/40 shadow-2xs">
              <div className="relative group flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 text-[#1f108e] flex items-center justify-center font-bold text-2xl overflow-hidden border-2 border-[#1f108e] shadow-md ring-2 ring-[#1f108e]/20">
                  {userAvatar ? (
                    <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                  ) : (
                    userName ? userName.substring(0, 2).toUpperCase() : 'US'
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-3 w-full">
                <div className="flex flex-wrap items-center gap-2.5">
                  <label className="bg-[#1f108e] hover:bg-[#1f108e]/90 text-white px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 shadow-xs active:scale-95">
                    <span className="material-symbols-outlined text-base">upload_file</span>
                    <span>Choisir une image sur mon appareil</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>

                  {userAvatar && (
                    <button
                      type="button"
                      onClick={() => setUserAvatar('')}
                      className="text-xs text-[#ba1a1a] hover:bg-red-50 px-3.5 py-2.5 rounded-xl transition-colors font-semibold flex items-center gap-1.5 border border-red-200"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                      <span>Supprimer l'image (Initiales)</span>
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#0b1c30] block mb-1">
                    Ou collez le lien (URL) direct d'une image web :
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={userAvatar}
                      onChange={(e) => setUserAvatar(e.target.value)}
                      placeholder="https://domaine.com/mon-image.jpg"
                      className="flex-1 h-10 border border-[#c8c4d5] rounded-xl px-3 text-xs text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/20 outline-none font-mono bg-slate-50 focus:bg-white"
                    />
                    {userAvatar && (
                      <button
                        type="button"
                        onClick={() => setUserAvatar('')}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                        title="Effacer le lien"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-[#777584]">
                  Formats acceptés : PNG, JPG, WEBP, GIF, SVG. Vous êtes libre de téléverser le fichier de votre choix.
                </p>
              </div>
            </div>

            {/* Proposed Avatars Gallery for All Users */}
            {proposedAvatars.length > 0 ? (
              <div className="space-y-2.5 pt-3 border-t border-[#c8c4d5]/30">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#0b1c30] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-[#1f108e]">workspace_premium</span>
                    <span>Avatars proposés par l'Administrateur :</span>
                  </p>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md border border-indigo-200">
                    {proposedAvatars.length} modèle{proposedAvatars.length > 1 ? 's' : ''} disponible{proposedAvatars.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {proposedAvatars.map((preset) => {
                    const isSelected = userAvatar === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setUserAvatar(preset.url)}
                        className={`relative group p-2 rounded-2xl border-2 transition-all text-left flex flex-col items-center bg-white hover:border-[#1f108e] ${
                          isSelected
                            ? 'border-[#1f108e] bg-indigo-50/50 shadow-md ring-2 ring-[#1f108e]/20 scale-[1.02]'
                            : 'border-[#c8c4d5]/40 hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 mb-1.5 flex items-center justify-center border border-slate-200">
                          <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs font-bold text-[#0b1c30] truncate w-full text-center leading-tight">
                          {preset.name}
                        </span>
                        {preset.category && (
                          <span className="text-[10px] text-[#1f108e] font-medium truncate w-full text-center">
                            {preset.category}
                          </span>
                        )}
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#1f108e] text-white flex items-center justify-center shadow-xs">
                            <span className="material-symbols-outlined text-xs">check</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-[#777584] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-slate-400">info</span>
                  <span>Aucun avatar proposé par l'administrateur pour l'instant.</span>
                </span>
                {isAdmin && (
                  <span className="text-xs font-bold text-[#1f108e]">
                    (Ajoutez-en ci-dessous)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* App Branding Customization Section (ONLY VISIBLE TO ADMINS) */}
        {isAdmin && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#c8c4d5]/40 pb-2">
              <h2 className="text-base font-bold text-[#0b1c30] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1f108e]">badge</span>
                <span>Personnalisation de l'Application (Logo, Nom & Description)</span>
              </h2>
              <span className="text-xs text-theme-primary font-bold bg-theme-light px-2.5 py-1 rounded-lg">
                Identité Visuelle
              </span>
            </div>

            <p className="text-xs text-[#777584]">
              Modifiez le nom officiel, le slogan, la description et le logo de votre application. Ces informations s'afficheront sur la barre de navigation, le menu latéral et l'écran de connexion.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                  Nom de l'application
                </label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Ex: TicketFlow"
                  className="w-full h-11 border border-[#c8c4d5] rounded-xl px-4 text-xs font-semibold text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/20 outline-none bg-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                  Sous-titre / Slogan
                </label>
                <input
                  type="text"
                  value={appSubtitle}
                  onChange={(e) => setAppSubtitle(e.target.value)}
                  placeholder="Ex: Operational Control"
                  className="w-full h-11 border border-[#c8c4d5] rounded-xl px-4 text-xs text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/20 outline-none bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                Description / Commentaire de l'application
              </label>
              <textarea
                value={commentary}
                onChange={(e) => setCommentary(e.target.value)}
                rows={2}
                placeholder="Description affichée sur la page de connexion..."
                className="w-full border border-[#c8c4d5] rounded-xl p-3 text-xs text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/20 outline-none resize-none bg-white"
              />
            </div>

            {/* Logo Upload & Preview */}
            <div className="bg-[#f8f9ff] p-4 rounded-2xl border border-[#c8c4d5]/40 space-y-3">
              <label className="text-xs font-bold text-[#0b1c30] block">
                Logo de l'application
              </label>

              <div className="flex flex-wrap items-center gap-4">
                {/* Current Logo Preview */}
                <div className="w-14 h-14 bg-[#1f108e] rounded-2xl flex items-center justify-center text-white shadow-md overflow-hidden border border-white/20">
                  {appLogoUrl ? (
                    <img src={appLogoUrl} alt="App Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-3xl">confirmation_number</span>
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <label className="bg-[#1f108e] hover:bg-[#1f108e]/90 text-white px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-xs">
                      <span className="material-symbols-outlined text-base">upload</span>
                      <span>Charger un logo depuis mon PC</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp, image/svg+xml"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>

                    {appLogoUrl && (
                      <button
                        type="button"
                        onClick={() => setAppLogoUrl('')}
                        className="text-xs text-[#ba1a1a] hover:bg-red-50 px-3 py-2 rounded-xl transition-colors font-semibold flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                        <span>Reinitialiser</span>
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-[#777584]">
                    Formats acceptés : PNG, JPG, WEBP, SVG (Taille max : 2 Mo).
                  </p>
                </div>
              </div>
            </div>

            {/* Admin Avatar Management Catalogue */}
            <div className="bg-[#f8f9ff] p-5 rounded-2xl border border-[#c8c4d5]/60 space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#0b1c30] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#1f108e]">add_photo_alternate</span>
                    <span>Gestion des Avatars Proposés par l'Administrateur</span>
                  </h3>
                  <p className="text-[11px] text-[#777584] mt-0.5">
                    Téléversez des avatars ou images pour enrichir le catalogue proposé à votre équipe.
                  </p>
                </div>
                <span className="text-xs bg-indigo-100 text-[#1f108e] font-extrabold px-2.5 py-1 rounded-lg">
                  {proposedAvatars.length} Avatar{proposedAvatars.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Form to add a new avatar */}
              <div className="bg-white p-4 rounded-xl border border-[#c8c4d5]/40 space-y-3">
                <p className="text-xs font-bold text-[#0b1c30]">Ajouter un nouvel avatar au catalogue :</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#0b1c30] block mb-1">
                      Nom / Libellé de l'avatar
                    </label>
                    <input
                      type="text"
                      value={newProposedName}
                      onChange={(e) => setNewProposedName(e.target.value)}
                      placeholder="Ex: Avatar Direction 3D"
                      className="w-full h-9 border border-[#c8c4d5] rounded-xl px-3 text-xs text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#1f108e]/20"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#0b1c30] block mb-1">
                      Catégorie / Rôle (optionnel)
                    </label>
                    <input
                      type="text"
                      value={newProposedCategory}
                      onChange={(e) => setNewProposedCategory(e.target.value)}
                      placeholder="Ex: Management, Dev, Commercial..."
                      className="w-full h-9 border border-[#c8c4d5] rounded-xl px-3 text-xs text-[#0b1c30] outline-none focus:ring-2 focus:ring-[#1f108e]/20"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  <label className="bg-[#1f108e] hover:bg-[#1f108e]/90 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2 shadow-xs flex-shrink-0">
                    <span className="material-symbols-outlined text-base">file_upload</span>
                    <span>Téléverser depuis mon appareil</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
                      onChange={handleAddProposedAvatarFile}
                      className="hidden"
                    />
                  </label>

                  <span className="text-xs text-slate-400 font-bold text-center">ou</span>

                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={newProposedUrl}
                      onChange={(e) => setNewProposedUrl(e.target.value)}
                      placeholder="Collez le lien URL d'une image web (https://...)"
                      className="flex-1 h-9 border border-[#c8c4d5] rounded-xl px-3 text-xs text-[#0b1c30] outline-none font-mono focus:ring-2 focus:ring-[#1f108e]/20 bg-slate-50 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddProposedAvatarUrl}
                      disabled={!newProposedUrl.trim()}
                      className="bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0"
                    >
                      <span className="material-symbols-outlined text-sm">add_link</span>
                      <span>Ajouter par URL</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Existing Proposed Avatars Grid */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-[#0b1c30]">
                  Avatars actuellement proposés aux utilisateurs ({proposedAvatars.length}) :
                </p>

                {proposedAvatars.length === 0 ? (
                  <div className="text-center py-6 bg-white rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
                    <span className="material-symbols-outlined text-3xl text-slate-300 block mb-1">
                      no_photography
                    </span>
                    Vous n'avez pas encore téléversé d'avatar proposé. Vous pouvez téléverser vos premières images ci-dessus.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {proposedAvatars.map((item) => (
                      <div
                        key={item.id}
                        className="relative bg-white p-2.5 rounded-2xl border border-[#c8c4d5]/50 flex flex-col items-center group shadow-2xs hover:shadow-md transition-all"
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 mb-1.5 flex items-center justify-center">
                          <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs font-bold text-[#0b1c30] truncate w-full text-center">
                          {item.name}
                        </span>
                        {item.category && (
                          <span className="text-[10px] text-[#1f108e] font-semibold truncate w-full text-center">
                            {item.category}
                          </span>
                        )}

                        <div className="flex items-center gap-1 mt-2 w-full pt-1 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setUserAvatar(item.url)}
                            className="flex-1 py-1 px-1.5 bg-indigo-50 hover:bg-indigo-100 text-[#1f108e] text-[10px] font-bold rounded-lg transition-colors text-center"
                            title="Utiliser pour mon profil"
                          >
                            Utiliser
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProposedAvatar(item.id)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer cet avatar proposé"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Theme Section (ALWAYS EDITABLE BY ALL USERS, INCLUDING DEVS) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#c8c4d5]/40 pb-2">
            <h2 className="text-base font-bold text-[#0b1c30] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#1f108e]">palette</span>
              <span>Thème & Apparence Visuelle (Couleur de thème)</span>
            </h2>
            <span className="text-xs text-theme-primary font-bold bg-theme-light px-2.5 py-1 rounded-lg">
              Actuel : {selectedTheme.name}
            </span>
          </div>

          <p className="text-xs text-[#777584]">
            Personnalisez la couleur de base de l'interface d'application.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 pt-1">
            {colorThemes.map((theme) => {
              const isSelected = selectedTheme.id === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleSelectTheme(theme)}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-2 border-theme-primary bg-theme-light shadow-sm scale-102'
                      : 'border-[#c8c4d5]/50 bg-white hover:bg-gray-50'
                  }`}
                >
                  <span
                    className="w-7 h-7 rounded-full shadow-sm flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: theme.primary }}
                  >
                    {isSelected && <span className="material-symbols-outlined text-sm">check</span>}
                  </span>
                  <span className="text-[11px] font-bold text-[#0b1c30] text-center line-clamp-1">
                    {theme.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Size & Scale Section (ALWAYS EDITABLE BY ALL USERS) */}
        <div className="space-y-4 pt-4 border-t border-[#c8c4d5]/40">
          <div className="flex items-center justify-between border-b border-[#c8c4d5]/40 pb-2">
            <h2 className="text-base font-bold text-[#0b1c30] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#1f108e]">format_size</span>
              <span>Taille de la Police & Échelle de l'Interface</span>
            </h2>
            <span className="text-xs text-theme-primary font-bold bg-theme-light px-2.5 py-1 rounded-lg">
              Échelle Actuelle : {fontSizePct}%
            </span>
          </div>

          <p className="text-xs text-[#777584]">
            Ajustez la taille globale des textes de l'application en pourcentage pour une meilleure densité d'affichage.
          </p>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2.5">
              {[
                { label: 'Compact (80%)', value: 80 },
                { label: 'Réduit (85%)', value: 85 },
                { label: 'Recommandé (90%)', value: 90 },
                { label: 'Standard (95%)', value: 95 },
                { label: 'Grand (100%)', value: 100 },
                { label: 'Très grand (110%)', value: 110 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleFontSizeChange(opt.value)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    fontSizePct === opt.value
                      ? 'border-2 border-theme-primary bg-theme-light text-theme-primary shadow-xs font-bold'
                      : 'border-[#c8c4d5]/60 bg-white text-[#464553] hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 bg-[#f8f9ff] p-4 rounded-2xl border border-[#c8c4d5]/40">
              <span className="text-xs font-bold text-[#0b1c30] flex-shrink-0">
                Ajustement précis :
              </span>
              <input
                type="range"
                min="75"
                max="120"
                step="1"
                value={fontSizePct}
                onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                className="w-full accent-[#1f108e] cursor-pointer"
              />
              <span className="text-xs font-bold text-[#1f108e] min-w-[45px] text-right">
                {fontSizePct}%
              </span>
            </div>
          </div>
        </div>

        {/* SLA & Webhooks section (ONLY VISIBLE TO ADMINS) */}
        {isAdmin && (
          <>
            {/* Database Synchronisation & Real-time Persistence (ONLY VISIBLE TO ADMINS) */}
            <div className="space-y-4 pt-4 border-t border-[#c8c4d5]/40">
              <div className="flex items-center justify-between border-b border-[#c8c4d5]/40 pb-2">
                <h2 className="text-base font-bold text-[#0b1c30] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#1f108e]">database</span>
                  <span>Base de Données & Synchronisation Temps Réel</span>
                </h2>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      dbStatus.connected
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        dbStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                      }`}
                    />
                    {dbStatus.connected ? 'Synchronisée & Connectée' : 'Mode Mémoire'}
                  </span>
                </div>
              </div>

              <div className="bg-[#f8f9ff] p-4 rounded-2xl border border-[#c8c4d5]/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#0b1c30] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-emerald-600">sync_saved_locally</span>
                    <span>État de la synchronisation</span>
                  </p>
                  <p className="text-[11px] text-[#464553]">
                    {dbStatus.message || 'La base de données et l\'application sont synchronisées en continu.'}
                  </p>
                </div>

                {onManualSync && (
                  <button
                    type="button"
                    onClick={onManualSync}
                    disabled={isSyncing}
                    className="w-full md:w-auto bg-[#1f108e] hover:bg-[#312e81] disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer"
                  >
                    <span className={`material-symbols-outlined text-base ${isSyncing ? 'animate-spin' : ''}`}>
                      sync
                    </span>
                    <span>{isSyncing ? 'Synchronisation en cours...' : 'Synchroniser maintenant'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Excel Data Import & Export Management Section */}
            <div className="space-y-4 pt-4 border-t border-[#c8c4d5]/40">
              <div className="flex items-center justify-between border-b border-[#c8c4d5]/40 pb-2">
                <h2 className="text-base font-bold text-[#0b1c30] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#006c4a]">table_chart</span>
                  <span>Gestion des Données Excel & Rapports (.xlsx, .csv)</span>
                </h2>
                <span className="bg-emerald-100 text-[#006c4a] text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Import / Export
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Import Card */}
                <div className="bg-[#f8f9ff] p-4 rounded-2xl border border-[#c8c4d5]/50 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 text-[#006c4a] font-bold text-xs">
                        <span className="material-symbols-outlined text-base">upload_file</span>
                        <span>Importer des tickets depuis Excel</span>
                      </div>
                      {!isAdmin && (
                        <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">lock</span>
                          <span>Admin uniquement</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#464553]">
                      Importez et synchronisez vos tickets en masse depuis un classeur Excel ou fichier CSV avec prévisualisation et options d'assignation.
                    </p>
                  </div>

                  {isAdmin && onOpenImportModal ? (
                    <button
                      type="button"
                      onClick={onOpenImportModal}
                      className="w-full bg-[#006c4a] hover:bg-[#005238] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">upload</span>
                      <span>Ouvrir l'outil d'importation Excel</span>
                    </button>
                  ) : (
                    <div className="w-full bg-slate-100 text-slate-500 px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                      <span className="material-symbols-outlined text-base">lock</span>
                      <span>Réservé aux administrateurs</span>
                    </div>
                  )}
                </div>

                {/* Export Card */}
                <div className="bg-[#f8f9ff] p-4 rounded-2xl border border-[#c8c4d5]/50 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-[#1f108e] font-bold text-xs mb-1">
                      <span className="material-symbols-outlined text-base">download</span>
                      <span>Exporter les données & rapports</span>
                    </div>
                    <p className="text-[11px] text-[#464553]">
                      Générez des rapports complets au format Excel (.xlsx), CSV ou PDF selon des filtres avancés par statut, développeur et date.
                    </p>
                  </div>

                  {onOpenExportModal && (
                    <button
                      type="button"
                      onClick={onOpenExportModal}
                      className="w-full bg-[#1f108e] hover:bg-[#312e81] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">file_download</span>
                      <span>Exporter en XLSX / PDF</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Session Timeout & Security (ONLY VISIBLE TO ADMINS) */}
            <div className="space-y-4 pt-4 border-t border-[#c8c4d5]/40">
              <h2 className="text-base font-bold text-[#0b1c30] border-b border-[#c8c4d5]/40 pb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1f108e]">lock_clock</span>
                <span>Durée de validité de session & Token (1h par défaut)</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div>
                  <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                    Expiration automatique de session
                  </label>
                  <p className="text-[11px] text-[#777584] mb-2">
                    Le token de session expire par défaut après 1 heure pour sécuriser l'accès aux données.
                  </p>
                  <select
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(e.target.value)}
                    className="w-full h-11 border border-[#c8c4d5] rounded-xl px-4 text-xs font-semibold text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/20 outline-none bg-white"
                  >
                    <option value="1h">1 heure (Standard & Recommandé - Token valide 1h)</option>
                    <option value="15m">15 minutes d'inactivité</option>
                    <option value="30m">30 minutes d'inactivité</option>
                    <option value="4h">4 heures</option>
                    <option value="8h">8 heures (Journée de travail)</option>
                    <option value="24h">24 heures (1 jour)</option>
                    <option value="7d">7 jours</option>
                    <option value="never">Illimitée (Pas d'expiration automatique)</option>
                  </select>
                </div>

                <div className="p-4 rounded-xl bg-[#eff4ff] border border-[#c8c4d5]/60 flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#1f108e] text-xl mt-0.5">verified_user</span>
                  <div className="text-xs text-[#464553] space-y-1">
                    <p className="font-bold text-[#0b1c30]">Sécurité & Token 1h</p>
                    <p className="text-[11px] leading-relaxed">
                      Chaque connexion génère un jeton d'authentification unique valide 1 heure. L'application vérifie périodiquement la validité du token.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Application & APK Generation Section */}
            <div className="space-y-4 pt-4 border-t border-[#c8c4d5]/40">
              <div className="flex items-center justify-between border-b border-[#c8c4d5]/40 pb-2">
                <h2 className="text-base font-bold text-[#0b1c30] flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600">android</span>
                  <span>Version Mobile & Générateur APK (Android & iOS)</span>
                </h2>
                <span className="text-xs text-emerald-800 font-extrabold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  WebAPK & Native Ready
                </span>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50/70 to-indigo-50/70 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Application Mobile Installable (PWA / WebAPK / Capacitor)
                  </p>
                  <p className="text-[11px] text-slate-600 max-w-xl leading-relaxed">
                    Installez l'application directement sur Android via WebAPK, convertissez en APK autonome via PWABuilder dans le cloud, ou téléchargez le projet Android Studio (.zip) pour une compilation locale.
                  </p>
                </div>

                {onOpenMobileApkModal && (
                  <button
                    type="button"
                    onClick={onOpenMobileApkModal}
                    className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-base">install_mobile</span>
                    <span>Ouvrir Générateur Mobile (APK)</span>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-[#c8c4d5]/40">
              <h2 className="text-base font-bold text-[#0b1c30] border-b border-[#c8c4d5]/40 pb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1f108e]">timer</span>
                <span>Règles SLA & Automatisation</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                    Seuil d'alerte SLA (Heures)
                  </label>
                  <input
                    type="number"
                    value={slaAlertHours}
                    onChange={(e) => setSlaAlertHours(e.target.value)}
                    className="w-full h-11 border border-[#c8c4d5] rounded-xl px-4 text-xs text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/20 outline-none bg-white"
                  />
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div>
                    <p className="text-xs font-bold text-[#0b1c30]">Attribution Automatique</p>
                    <p className="text-[11px] text-[#777584]">Assigner les tickets selon la charge actuelle</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoAssignEnabled}
                    onChange={(e) => setAutoAssignEnabled(e.target.checked)}
                    className="w-5 h-5 accent-[#1f108e] rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-[#c8c4d5]/40">
              <h2 className="text-base font-bold text-[#0b1c30] border-b border-[#c8c4d5]/40 pb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1f108e]">notifications</span>
                <span>Notifications & Webhooks</span>
              </h2>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#0b1c30]">Notifications Email</p>
                  <p className="text-[11px] text-[#777584]">Recevoir un résumé quotidien des tickets urgents</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="w-5 h-5 accent-[#1f108e] rounded cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                  URL Webhook Slack / Discord
                </label>
                <input
                  type="text"
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full h-11 border border-[#c8c4d5] rounded-xl px-4 text-xs font-geist text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/20 outline-none bg-white"
                />
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end pt-4 border-t border-[#c8c4d5]/40">
          <button
            type="submit"
            className="bg-[#1f108e] text-white px-6 py-2.5 rounded-xl font-semibold text-xs hover:opacity-90 active:scale-95 transition-all shadow-sm"
          >
            {isAdmin ? 'Enregistrer les modifications' : 'Enregistrer les préférences visuelles'}
          </button>
        </div>
      </form>
    </div>
  );
};
