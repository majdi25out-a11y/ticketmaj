import React, { useState } from 'react';
import { Developer, Ticket, ViewMode, AppBrandingConfig } from '../../types';
import { DEFAULT_USER_AVATAR, compressImageFile } from '../../data/avatars';

interface TeamViewProps {
  developers: Developer[];
  tickets: Ticket[];
  onAddDeveloper: (dev: Omit<Developer, 'id'>) => void;
  onUpdateDeveloper: (devId: string, updated: Partial<Developer>) => void;
  onDeleteDeveloper: (devId: string, reassignTicketsToDevId?: string) => void;
  onResetPassword: (devId: string, newPass: string) => void;
  onSelectDev?: (devId: string) => void;
  currentUser?: { name: string; role: string; avatar: string; email?: string };
  onNavigate?: (view: ViewMode) => void;
  branding?: AppBrandingConfig;
}

const PRESET_ROLES = [
  'Administrateur Système',
  'Chef de Projet / QA',
  'Lead Développeur',
  'Développeur Fullstack',
  'Développeur Frontend',
  'Développeur Backend',
  'Développeur Mobile',
  'DevOps / Infrastructure',
  'Support & Relation Client',
  'Autre / Personnalisé',
];

const SUGGESTED_SKILLS = [
  'React',
  'TypeScript',
  'Node.js',
  'Next.js',
  'Python',
  'Docker',
  'MySQL',
  'PostgreSQL',
  'DevOps',
  'TailwindCSS',
  'GraphQL',
  'AWS',
  'Figma',
  'QA Testing',
];

const createSymbolicAvatar = (icon: string, bgHex: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect width="200" height="200" rx="100" fill="${bgHex}"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="90" fill="#ffffff">${icon}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const SYMBOLIC_AVATARS = [
  { icon: '💻', name: 'Code', url: createSymbolicAvatar('💻', '#1f108e') },
  { icon: '⚡', name: 'Rapide', url: createSymbolicAvatar('⚡', '#059669') },
  { icon: '🛡️', name: 'Sécurité', url: createSymbolicAvatar('🛡️', '#3730a3') },
  { icon: '🚀', name: 'Fusée', url: createSymbolicAvatar('🚀', '#d97706') },
  { icon: '⚙️', name: 'Moteur', url: createSymbolicAvatar('⚙️', '#4f46e5') },
  { icon: '🧠', name: 'IA & Logique', url: createSymbolicAvatar('🧠', '#9333ea') },
  { icon: '🔧', name: 'Outils', url: createSymbolicAvatar('🔧', '#2563eb') },
  { icon: '🎨', name: 'Design', url: createSymbolicAvatar('🎨', '#db2777') },
  { icon: '📊', name: 'Données', url: createSymbolicAvatar('📊', '#0284c7') },
  { icon: '🔍', name: 'QA / Audit', url: createSymbolicAvatar('🔍', '#0d9488') },
];

export const TeamView: React.FC<TeamViewProps> = ({
  developers,
  tickets,
  onAddDeveloper,
  onUpdateDeveloper,
  onDeleteDeveloper,
  onResetPassword,
  currentUser,
  branding,
}) => {
  const isAdmin =
    currentUser?.role?.toLowerCase().includes('admin') ||
    currentUser?.role?.toLowerCase().includes('architect') ||
    currentUser?.email === 'admin@ticketflow.io';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingDev, setEditingDev] = useState<Developer | null>(null);
  const [passwordModalDev, setPasswordModalDev] = useState<Developer | null>(null);
  const [deletingDev, setDeletingDev] = useState<Developer | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form state for Add/Edit
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRoleSelect, setFormRoleSelect] = useState('Développeur Fullstack');
  const [formCustomRole, setFormCustomRole] = useState('');
  const [formAvatar, setFormAvatar] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formSkills, setFormSkills] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showFormPassword, setShowFormPassword] = useState(false);

  // Form state for Password Reset Modal
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Form state for Delete Modal
  const [reassignDevId, setReassignDevId] = useState<string>('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filter developers
  const filteredDevelopers = developers.filter((dev) => {
    const matchesSearch =
      dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dev.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dev.email && dev.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (dev.skills && dev.skills.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase())));

    if (!matchesSearch) return false;
    if (statusFilter === 'active') return dev.active !== false;
    if (statusFilter === 'inactive') return dev.active === false;
    return true;
  });

  const handleOpenAddModal = () => {
    setEditingDev(null);
    setFormName('');
    setFormEmail('');
    setFormRoleSelect('Développeur Fullstack');
    setFormCustomRole('');
    setFormAvatar('');
    setFormActive(true);
    setFormSkills('React, TypeScript, Node.js');
    setFormPassword(generateRandomPassword());
    setShowFormPassword(false);
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (dev: Developer) => {
    setEditingDev(dev);
    setFormName(dev.name);
    setFormEmail(dev.email || `${dev.name.toLowerCase().replace(/\s+/g, '.')}@ticketflow.io`);
    
    if (PRESET_ROLES.includes(dev.role)) {
      setFormRoleSelect(dev.role);
      setFormCustomRole('');
    } else {
      setFormRoleSelect('Autre / Personnalisé');
      setFormCustomRole(dev.role);
    }

    setFormAvatar(dev.avatar || '');
    setFormActive(dev.active !== false);
    setFormSkills(dev.skills ? dev.skills.join(', ') : '');
    setFormPassword('');
    setShowFormPassword(false);
    setIsAddEditModalOpen(true);
  };

  const handleOpenPasswordModal = (dev: Developer) => {
    setPasswordModalDev(dev);
    setNewPassword(generateRandomPassword());
    setConfirmPassword('');
    setShowNewPassword(true);
  };

  const handleOpenDeleteModal = (dev: Developer) => {
    setDeletingDev(dev);
    const otherDevs = developers.filter((d) => d.id !== dev.id);
    setReassignDevId(otherDevs.length > 0 ? otherDevs[0].id : '');
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const handleToggleSkillChip = (skillName: string) => {
    const currentSkills = formSkills
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (currentSkills.includes(skillName)) {
      setFormSkills(currentSkills.filter((s) => s !== skillName).join(', '));
    } else {
      setFormSkills([...currentSkills, skillName].join(', '));
    }
  };

  const handleSaveDev = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const finalRole = formRoleSelect === 'Autre / Personnalisé' ? (formCustomRole.trim() || 'Membre') : formRoleSelect;

    const skillsArray = formSkills
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const finalAvatar = formAvatar.trim() || DEFAULT_USER_AVATAR;

    if (editingDev) {
      // Update existing
      onUpdateDeveloper(editingDev.id, {
        name: formName.trim(),
        email: formEmail.trim(),
        role: finalRole,
        avatar: finalAvatar,
        active: formActive,
        skills: skillsArray,
        ...(formPassword ? { password: formPassword } : {}),
      });
      triggerToast(`Profil de ${formName} mis à jour avec succès`);
    } else {
      // Create new (no limitation on count)
      onAddDeveloper({
        name: formName.trim(),
        email: formEmail.trim() || `${formName.toLowerCase().replace(/\s+/g, '.')}@ticketflow.io`,
        role: finalRole,
        avatar: finalAvatar,
        active: formActive,
        skills: skillsArray,
        password: formPassword || 'Password123!',
        tagColor: 'bg-indigo-100 text-indigo-800',
        createdAt: new Date().toISOString().split('T')[0],
      });
      triggerToast(`Nouveau compte ${formName} (${finalRole}) ajouté !`);
    }

    setIsAddEditModalOpen(false);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalDev || !newPassword) return;

    if (confirmPassword && newPassword !== confirmPassword) {
      triggerToast('Les mots de passe ne correspondent pas.');
      return;
    }

    onResetPassword(passwordModalDev.id, newPassword);
    triggerToast(`Mot de passe de ${passwordModalDev.name} réinitialisé avec succès`);
    setPasswordModalDev(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingDev) return;

    onDeleteDeveloper(deletingDev.id, reassignDevId);
    triggerToast(`Utilisateur ${deletingDev.name} supprimé de l'équipe`);
    setDeletingDev(null);
  };

  // Quick test user generator helper
  const handleAddSampleUser = () => {
    const sampleNames = ['Thomas Leroy', 'Camille Bernard', 'Lucas Morel', 'Léa Petit', 'Hugo Robert', 'Emma Richard'];
    const sampleRoles = ['Développeur Frontend', 'Développeur Backend', 'QA Specialist', 'Ingénieur DevOps', 'Chef de Projet'];
    const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)] + ` (${Math.floor(100 + Math.random() * 899)})`;
    const randomRole = sampleRoles[Math.floor(Math.random() * sampleRoles.length)];
    const randomSymbol = SYMBOLIC_AVATARS[Math.floor(Math.random() * SYMBOLIC_AVATARS.length)];

    onAddDeveloper({
      name: randomName,
      email: `${randomName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@ticketflow.io`,
      role: randomRole,
      avatar: randomSymbol.url,
      active: true,
      skills: ['React', 'TypeScript', 'Node.js'],
      password: 'Password123!',
      tagColor: 'bg-indigo-100 text-indigo-800',
      createdAt: new Date().toISOString().split('T')[0],
    });
    triggerToast(`Utilisateur démo ${randomName} ajouté instantanément !`);
  };

  const activeDevsCount = developers.filter((d) => d.active !== false).length;
  const totalAssignedTickets = tickets.filter((t) => t.assignedTo).length;

  return (
    <div className="pt-20 pb-20 px-3.5 md:px-8 max-w-[1300px] mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 bg-[#0b1c30] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-3">
          <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Title & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-[#0b1c30] tracking-tight">
              {isAdmin ? 'Équipe & Utilisateurs' : 'Annuaire Équipe'}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-bold font-geist">
              <span>{developers.length} membre{developers.length > 1 ? 's' : ''}</span>
            </span>
          </div>
          <p className="text-xs text-[#464553] mt-0.5">
            {isAdmin
              ? 'Gérez vos développeurs, chefs de projet et permissions d\'accès.'
              : 'Consultez les coordonnées et tickets en cours de vos collègues.'}
          </p>
        </div>

        {isAdmin ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddSampleUser}
              className="hidden sm:flex items-center gap-1 bg-[#eff4ff] text-[#1f108e] border border-[#c8c4d5]/60 px-3 py-2 rounded-xl font-bold text-xs hover:bg-[#dce9ff] transition-all cursor-pointer"
              title="Ajoute instantanément un membre démo pour tester"
            >
              <span className="material-symbols-outlined text-base">auto_fix_high</span>
              <span>+ Démo</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="flex items-center justify-center gap-1.5 bg-[#1f108e] text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-[#312e81] active:scale-95 transition-all shadow-xs cursor-pointer touch-manipulation"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              <span>Ajouter un Membre</span>
            </button>
          </div>
        ) : (
          <div className="px-3 py-1.5 bg-[#eff4ff] text-[#464553] border border-[#c8c4d5]/60 rounded-xl text-xs flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-[#1f108e]">info</span>
            <span>Consultation</span>
          </div>
        )}
      </div>

      {/* Stats Bento Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bento-card p-5 rounded-2xl flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-[#464553]">Total Effectif</span>
            <span className="material-symbols-outlined text-[#1f108e]">groups</span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#0b1c30]">{developers.length}</span>
              <span className="text-xs font-bold text-emerald-600 uppercase">Illimité</span>
            </div>
            <p className="text-xs text-[#777584] mt-1 font-geist">Comptes enregistrés</p>
          </div>
        </div>

        <div className="bento-card p-5 rounded-2xl border-l-4 border-l-emerald-500 flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-[#464553]">Comptes Actifs</span>
            <span className="material-symbols-outlined text-emerald-600">verified</span>
          </div>
          <div>
            <span className="text-3xl font-extrabold text-[#0b1c30]">{activeDevsCount}</span>
            <p className="text-xs text-emerald-700 font-semibold mt-1">
              {Math.round((activeDevsCount / (developers.length || 1)) * 100)}% de l'équipe
            </p>
          </div>
        </div>

        <div className="bento-card p-5 rounded-2xl border-l-4 border-l-[#1f108e] flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-[#464553]">Tickets Assignés</span>
            <span className="material-symbols-outlined text-[#1f108e]">assignment_ind</span>
          </div>
          <div>
            <span className="text-3xl font-extrabold text-[#0b1c30]">{totalAssignedTickets}</span>
            <p className="text-xs text-[#464553] mt-1 font-geist">Charges de travail</p>
          </div>
        </div>

        <div className="bento-card p-5 rounded-2xl border-l-4 border-l-purple-500 flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-[#464553]">Moyenne par Membre</span>
            <span className="material-symbols-outlined text-purple-600">speed</span>
          </div>
          <div>
            <span className="text-3xl font-extrabold text-[#0b1c30]">
              {(totalAssignedTickets / (activeDevsCount || 1)).toFixed(1)}
            </span>
            <p className="text-xs text-purple-700 font-semibold mt-1">Tickets / membre</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#c8c4d5]/60 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Rechercher par nom, rôle, email ou compétence..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#f8f9ff] border border-[#c8c4d5]/60 rounded-xl pl-9 pr-4 py-2 text-xs text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/20 outline-none font-geist"
          />
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-base text-[#777584]">
            search
          </span>
        </div>

        <div className="flex bg-[#eff4ff] p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'all'
                ? 'bg-white text-[#1f108e] shadow-xs'
                : 'text-[#464553] hover:text-[#0b1c30]'
            }`}
          >
            Tous ({developers.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'active'
                ? 'bg-white text-[#1f108e] shadow-xs'
                : 'text-[#464553] hover:text-[#0b1c30]'
            }`}
          >
            Actifs ({activeDevsCount})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'inactive'
                ? 'bg-white text-[#1f108e] shadow-xs'
                : 'text-[#464553] hover:text-[#0b1c30]'
            }`}
          >
            Inactifs ({developers.length - activeDevsCount})
          </button>
        </div>
      </div>

      {/* Developer Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredDevelopers.length === 0 ? (
          <div className="col-span-full bg-white border border-[#c8c4d5]/60 rounded-2xl p-12 text-center text-[#464553] space-y-4">
            <span className="material-symbols-outlined text-5xl text-[#777584]">person_off</span>
            <div>
              <p className="text-base font-bold text-[#0b1c30]">Aucun utilisateur trouvé</p>
              <p className="text-xs text-[#777584] mt-1">
                Ajustez votre recherche ou ajoutez un nouveau membre dans l'équipe.
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 bg-[#1f108e] text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90"
              >
                <span className="material-symbols-outlined text-sm">person_add</span>
                <span>Ajouter un utilisateur</span>
              </button>
            )}
          </div>
        ) : (
          filteredDevelopers.map((dev) => {
            const assignedTickets = tickets.filter((t) => t.assignedTo?.id === dev.id);
            const isDevActive = dev.active !== false;

            return (
              <div
                key={dev.id}
                className={`bento-card p-6 rounded-2xl flex flex-col justify-between space-y-5 relative transition-all duration-200 hover:shadow-md ${
                  !isDevActive ? 'opacity-70 bg-slate-50 border-slate-200' : ''
                }`}
              >
                {/* Active Status Badge */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#1f108e]/20 shadow-xs bg-slate-100 flex items-center justify-center font-bold text-base text-[#1f108e]">
                        {dev.avatar ? (
                          <img
                            src={dev.avatar}
                            alt={dev.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          dev.name ? dev.name.substring(0, 2).toUpperCase() : 'DEV'
                        )}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          isDevActive ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                        title={isDevActive ? 'Compte Actif' : 'Compte Inactif'}
                      />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-bold text-base text-[#0b1c30] leading-snug truncate">
                        {dev.name}
                      </h3>
                      <p className="text-xs text-[#1f108e] font-semibold truncate">{dev.role}</p>
                      <p className="text-[11px] text-[#777584] font-geist truncate max-w-[170px] mt-0.5">
                        {dev.email || `${dev.name.toLowerCase().replace(/\s+/g, '.')}@ticketflow.io`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Skills Badges */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-[#777584] uppercase tracking-wider font-geist">
                    Compétences
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {dev.skills && dev.skills.length > 0 ? (
                      dev.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="bg-[#eff4ff] text-[#1f108e] px-2 py-0.5 rounded text-[10px] font-bold font-geist"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-[#777584] italic">Non spécifiées</span>
                    )}
                  </div>
                </div>

                {/* Password Credentials Box (Admins only) */}
                {isAdmin ? (
                  <div className="bg-[#eff4ff]/70 p-3 rounded-xl border border-[#c8c4d5]/40 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-[#1f108e]">lock</span>
                      <div>
                        <p className="text-[10px] font-bold text-[#777584] uppercase">Accès Compte</p>
                        <p className="font-mono text-xs font-bold text-[#0b1c30]">
                          ••••••••
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenPasswordModal(dev)}
                      className="p-1.5 text-[#1f108e] hover:bg-white rounded-lg transition-colors flex items-center gap-1 font-semibold text-[11px] cursor-pointer"
                      title="Changer le mot de passe"
                    >
                      <span className="material-symbols-outlined text-sm">key</span>
                      <span>Reset</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#eff4ff]/40 p-2.5 rounded-xl border border-[#c8c4d5]/30 text-[11px] text-[#464553] flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-[#1f108e]">badge</span>
                    <span>Membre enregistré</span>
                  </div>
                )}

                {/* Active Tickets Summary */}
                <div className="space-y-1.5 pt-1 border-t border-[#c8c4d5]/40">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#777584] font-semibold">Tickets assignés</span>
                    <span className="bg-[#1f108e] text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {assignedTickets.length}
                    </span>
                  </div>

                  {assignedTickets.length > 0 && (
                    <div className="space-y-1">
                      {assignedTickets.slice(0, 2).map((t) => (
                        <div key={t.id} className="text-[11px] truncate text-[#0b1c30]">
                          <span className="font-bold text-[#1f108e]">#{t.id}</span> {t.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Action Toolbar (Admins only) */}
                {isAdmin && (
                  <div className="flex gap-2 pt-2 border-t border-[#c8c4d5]/40">
                    <button
                      onClick={() => handleOpenEditModal(dev)}
                      className="flex-1 py-2 border border-[#c8c4d5] rounded-xl text-xs font-semibold text-[#0b1c30] hover:bg-[#eff4ff] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      <span>Éditer</span>
                    </button>

                    <button
                      onClick={() => handleOpenDeleteModal(dev)}
                      className="p-2 border border-[#c8c4d5] text-[#ba1a1a] hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                      title="Supprimer le compte"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 1. Add / Edit Developer Modal */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-[#c8c4d5]/60 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#eff4ff] p-5 border-b border-[#c8c4d5]/40 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1f108e]">
                  {editingDev ? 'edit_note' : 'person_add'}
                </span>
                <div>
                  <h3 className="font-bold text-base text-[#0b1c30]">
                    {editingDev ? 'Modifier le Membre' : 'Ajouter un Membre / Développeur'}
                  </h3>
                  <p className="text-[11px] text-[#777584]">Capacité illimitée — Aucun quota d'utilisateurs</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1 text-[#777584] hover:bg-[#dce9ff] rounded-full transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveDev} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                  Nom & Prénom <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (!editingDev && !formEmail) {
                      setFormEmail(`${e.target.value.toLowerCase().replace(/\s+/g, '.')}@ticketflow.io`);
                    }
                  }}
                  placeholder="Ex: Jean Dupont"
                  className="w-full h-10 border border-[#c8c4d5] rounded-xl px-3 text-xs text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/20 outline-none"
                />
              </div>

              {/* Professional Email */}
              <div>
                <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                  Adresse Email Professionnelle
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="Ex: jean.dupont@ticketflow.io"
                  className="w-full h-10 border border-[#c8c4d5] rounded-xl px-3 text-xs text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/20 outline-none font-geist"
                />
              </div>

              {/* Role & Position */}
              <div>
                <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                  Rôle / Fonction <span className="text-[#ba1a1a]">*</span>
                </label>
                <select
                  value={formRoleSelect}
                  onChange={(e) => setFormRoleSelect(e.target.value)}
                  className="w-full h-10 border border-[#c8c4d5] rounded-xl px-3 text-xs text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/20 outline-none bg-white font-semibold"
                >
                  {PRESET_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {formRoleSelect === 'Autre / Personnalisé' && (
                <div>
                  <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                    Précisez l'intitulé du poste
                  </label>
                  <input
                    type="text"
                    required
                    value={formCustomRole}
                    onChange={(e) => setFormCustomRole(e.target.value)}
                    placeholder="Ex: Architecte Cloud, Lead Mobile, Security Officer"
                    className="w-full h-10 border border-[#c8c4d5] rounded-xl px-3 text-xs text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/20 outline-none"
                  />
                </div>
              )}

              {/* Skills Input + Quick chips */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0b1c30] block">
                  Compétences techniques
                </label>
                <input
                  type="text"
                  value={formSkills}
                  onChange={(e) => setFormSkills(e.target.value)}
                  placeholder="Ex: React, Node.js, Docker, Python"
                  className="w-full h-10 border border-[#c8c4d5] rounded-xl px-3 text-xs text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/20 outline-none font-geist"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {SUGGESTED_SKILLS.map((skill) => {
                    const isSelected = formSkills.toLowerCase().includes(skill.toLowerCase());
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => handleToggleSkillChip(skill)}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1f108e] text-white'
                            : 'bg-[#eff4ff] text-[#464553] hover:bg-[#dce9ff]'
                        }`}
                      >
                        + {skill}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Avatar Options: Upload, URL, Badges */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0b1c30] block">
                  Photo / Avatar du Membre
                </label>
                <div className="p-3.5 bg-[#f8f9ff] rounded-2xl border border-[#c8c4d5]/50 space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-[#1f108e] shadow-xs flex-shrink-0 bg-slate-100 flex items-center justify-center font-bold text-lg text-[#1f108e]">
                      {formAvatar ? (
                        <img src={formAvatar} alt="Avatar Preview" className="w-full h-full object-cover" />
                      ) : (
                        formName ? formName.substring(0, 2).toUpperCase() : 'DEV'
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex flex-wrap gap-2 items-center">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1f108e] text-white text-[11px] font-bold rounded-xl hover:opacity-90 transition-all shadow-xs">
                          <span className="material-symbols-outlined text-sm">upload_file</span>
                          <span>Téléverser photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const compressedUrl = await compressImageFile(file);
                                setFormAvatar(compressedUrl);
                              } catch (err: any) {
                                triggerToast(err.message || 'Erreur lors du traitement du fichier.');
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                        {formAvatar && (
                          <button
                            type="button"
                            onClick={() => setFormAvatar('')}
                            className="text-[11px] text-[#ba1a1a] hover:bg-red-50 px-2 py-1 rounded-lg border border-red-200 transition-colors font-semibold"
                          >
                            Effacer
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-[#777584]">
                        PNG, JPG, SVG ou badges symboliques ci-dessous
                      </p>
                    </div>
                  </div>

                  {/* Symbolic Preset Badges */}
                  <div className="pt-2 border-t border-[#c8c4d5]/30 space-y-1.5">
                    <p className="text-[10px] font-bold text-[#777584] uppercase">
                      Ou choisissez un badge instantané :
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {SYMBOLIC_AVATARS.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormAvatar(s.url)}
                          title={s.name}
                          className={`w-8 h-8 rounded-xl overflow-hidden cursor-pointer border-2 transition-all flex items-center justify-center bg-slate-100 ${
                            formAvatar === s.url
                              ? 'border-[#1f108e] scale-110 shadow-md ring-2 ring-[#1f108e]/30'
                              : 'border-transparent opacity-75 hover:opacity-100'
                          }`}
                        >
                          <img src={s.url} alt={s.name} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Proposed Avatars by Admin */}
                  {branding?.proposedAvatars && branding.proposedAvatars.length > 0 && (
                    <div className="pt-2 border-t border-[#c8c4d5]/30 space-y-1.5">
                      <p className="text-[11px] font-bold text-[#0b1c30]">
                        Avatars configurés dans l'application :
                      </p>
                      <div className="grid grid-cols-5 gap-1.5 max-h-32 overflow-y-auto p-1.5 border border-[#c8c4d5]/30 rounded-xl bg-white">
                        {branding.proposedAvatars.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setFormAvatar(preset.url)}
                            title={preset.name}
                            className={`w-9 h-9 rounded-xl overflow-hidden cursor-pointer border-2 transition-all flex-shrink-0 bg-slate-100 ${
                              formAvatar === preset.url
                                ? 'border-[#1f108e] scale-105 shadow-md ring-2 ring-[#1f108e]/30'
                                : 'border-transparent opacity-80 hover:opacity-100'
                            }`}
                          >
                            <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Initial Password (if adding or updating password) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-[#0b1c30]">
                    {editingDev ? 'Nouveau mot de passe (Optionnel)' : 'Mot de passe initial'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormPassword(generateRandomPassword())}
                    className="text-[11px] text-[#1f108e] font-bold hover:underline cursor-pointer"
                  >
                    Générer mot de passe
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showFormPassword ? 'text' : 'password'}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={editingDev ? 'Laisser vide pour ne pas modifier' : 'Mot de passe sécurisé'}
                    className="w-full h-10 border border-[#c8c4d5] rounded-xl pl-3 pr-10 text-xs text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/20 outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777584] hover:text-[#0b1c30] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">
                      {showFormPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Status Switch (Active / Inactive) */}
              <div className="flex items-center justify-between p-3 bg-[#eff4ff] rounded-xl border border-[#c8c4d5]/40">
                <div>
                  <p className="text-xs font-bold text-[#0b1c30]">Statut du Compte</p>
                  <p className="text-[11px] text-[#777584]">
                    {formActive ? 'Compte actif et éligible aux assignations' : 'Compte inactif / suspendu'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="w-5 h-5 accent-[#1f108e] rounded cursor-pointer"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[#c8c4d5]/40">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#464553] hover:bg-[#eff4ff] rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-[#1f108e] text-white px-5 py-2 rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer"
                >
                  {editingDev ? 'Enregistrer les modifications' : 'Créer le Compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Password Reset Modal */}
      {passwordModalDev && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border border-[#c8c4d5]/60 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#3730a3] text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">key</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm">Gestion des Mots de Passe</h3>
                  <p className="text-xs text-white/80">{passwordModalDev.name}</p>
                </div>
              </div>
              <button
                onClick={() => setPasswordModalDev(null)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="p-6 space-y-4">
              <p className="text-xs text-[#464553]">
                Définissez un nouveau mot de passe pour le compte de{' '}
                <span className="font-bold text-[#0b1c30]">{passwordModalDev.name}</span>.
              </p>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-[#0b1c30]">
                    Nouveau Mot de Passe
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const gen = generateRandomPassword();
                      setNewPassword(gen);
                      setConfirmPassword(gen);
                    }}
                    className="text-[11px] text-[#1f108e] font-bold hover:underline cursor-pointer"
                  >
                    Générer mot de passe fort
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-10 border border-[#c8c4d5] rounded-xl pl-3 pr-10 text-xs text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/20 outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777584] hover:text-[#0b1c30] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">
                      {showNewPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                  Confirmer le Mot de Passe
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  className="w-full h-10 border border-[#c8c4d5] rounded-xl px-3 text-xs text-[#0b1c30] focus:ring-2 focus:ring-[#1f108e]/20 outline-none font-mono"
                />
              </div>

              {/* Password Strength Indicator */}
              <div className="p-3 bg-[#eff4ff] rounded-xl border border-[#c8c4d5]/40 text-xs space-y-1">
                <div className="flex justify-between font-bold text-[#777584]">
                  <span>Sécurité du mot de passe</span>
                  <span className="text-emerald-700">FORTE</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-emerald-500 rounded-full" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#c8c4d5]/40">
                <button
                  type="button"
                  onClick={() => setPasswordModalDev(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#464553] hover:bg-[#eff4ff] rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-[#1f108e] text-white px-5 py-2 rounded-xl text-xs font-semibold hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer"
                >
                  Mettre à jour le mot de passe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Delete Confirmation Modal */}
      {deletingDev && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border border-[#c8c4d5]/60 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 text-[#ba1a1a] flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-2xl">warning</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0b1c30]">Supprimer l'utilisateur ?</h3>
                  <p className="text-xs text-[#777584]">{deletingDev.name} ({deletingDev.role})</p>
                </div>
              </div>

              <p className="text-xs text-[#464553] leading-relaxed">
                Cette action supprimera définitivement le compte de{' '}
                <span className="font-bold text-[#0b1c30]">{deletingDev.name}</span>.
              </p>

              {/* Check assigned tickets */}
              {tickets.filter((t) => t.assignedTo?.id === deletingDev.id).length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
                  <p className="font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">assignment_late</span>
                    <span>
                      {tickets.filter((t) => t.assignedTo?.id === deletingDev.id).length} ticket(s) en cours
                      sont actuellement assignés à ce développeur.
                    </span>
                  </p>
                  <div>
                    <label className="text-[11px] font-bold block mb-1">
                      Réassigner les tickets à :
                    </label>
                    <select
                      value={reassignDevId}
                      onChange={(e) => setReassignDevId(e.target.value)}
                      className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-[#0b1c30] outline-none"
                    >
                      {developers
                        .filter((d) => d.id !== deletingDev.id)
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.role})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-[#eff4ff] px-6 py-4 flex justify-end gap-3 border-t border-[#c8c4d5]/40">
              <button
                type="button"
                onClick={() => setDeletingDev(null)}
                className="px-4 py-2 text-xs font-semibold text-[#464553] hover:bg-[#dce9ff] rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="bg-[#ba1a1a] text-white px-5 py-2 rounded-xl text-xs font-semibold hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
