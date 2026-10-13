import React, { useState } from 'react';
import { Project, Ticket, Developer } from '../../types';
import { 
  FolderKanban, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Ticket as TicketIcon, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
  X,
  Link2,
  Unlink,
  CheckSquare,
  Square
} from 'lucide-react';

interface ProjectsViewProps {
  projects: Project[];
  tickets: Ticket[];
  developers: Developer[];
  onSelectProjectFilter: (projectId: string) => void;
  onSaveProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onNavigateToTicket: (ticketId: string) => void;
  onCreateTicketForProject?: (projectId: string) => void;
  onAssignProject?: (ticketId: string, projectId: string) => void;
  onAssignTicketsToProject?: (projectId: string, ticketIds: string[]) => void;
}

const PRESET_COLORS = [
  '#1f108e', // Bleu Nuit TicketFlow
  '#059669', // Emeraude
  '#d97706', // Ambre / Orange
  '#7c3aed', // Violet
  '#dc2626', // Rouge
  '#0284c7', // Bleu Ciel
  '#4f46e5', // Indigo
  '#0d9488', // Turquoise
  '#be185d', // Rose Foncé
  '#475569', // Ardoise
];

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  tickets,
  developers: _developers,
  onSelectProjectFilter,
  onSaveProject,
  onDeleteProject,
  onNavigateToTicket,
  onCreateTicketForProject,
  onAssignProject,
  onAssignTicketsToProject,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Assign Tickets Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [ticketSearchQuery, setTicketSearchQuery] = useState('');
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(true);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState('#1f108e');
  const [formStatus, setFormStatus] = useState<'active' | 'archived' | 'paused'>('active');

  const openCreateModal = () => {
    setEditingProject(null);
    setFormName('');
    setFormCode('');
    setFormDescription('');
    setFormColor(PRESET_COLORS[0]);
    setFormStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (proj: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(proj);
    setFormName(proj.name);
    setFormCode(proj.code || '');
    setFormDescription(proj.description || '');
    setFormColor(proj.color || '#1f108e');
    setFormStatus(proj.status || 'active');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const projectData: Project = {
      id: editingProject ? editingProject.id : `proj-${Date.now()}`,
      name: formName.trim(),
      code: (formCode.trim() || formName.trim().substring(0, 3)).toUpperCase(),
      description: formDescription.trim(),
      color: formColor,
      status: formStatus,
      createdAt: editingProject?.createdAt || new Date().toISOString().split('T')[0],
    };

    onSaveProject(projectData);
    setIsModalOpen(false);
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = 
      statusFilter === 'all' ? true :
      statusFilter === 'active' ? (p.status !== 'archived') :
      p.status === 'archived';

    return matchesSearch && matchesStatus;
  });

  const getProjectStats = (projId: string) => {
    const projTickets = tickets.filter((t) => t.projectId === projId);
    const total = projTickets.length;
    const pending = projTickets.filter((t) => t.status === 'pending').length;
    const inProgress = projTickets.filter((t) => t.status === 'in_progress').length;
    const completed = projTickets.filter((t) => t.status === 'completed').length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, pending, inProgress, completed, percent, tickets: projTickets };
  };

  const activeSelectedProject = selectedProjectId ? projects.find((p) => p.id === selectedProjectId) : null;
  const activeSelectedStats = activeSelectedProject ? getProjectStats(activeSelectedProject.id) : null;

  return (
    <div id="projects-view-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestion des Projets</h1>
              <p className="text-sm text-slate-500">
                Organisez, classez et suivez l'ensemble de vos tickets par projet et pôle applicatif
              </p>
            </div>
          </div>
        </div>

        <button
          id="btn-create-project"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm hover:shadow transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Nouveau Projet
        </button>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="search-projects-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un projet par nom, code ou description..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 placeholder-slate-400"
          />
        </div>

        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tous ({projects.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Actifs ({projects.filter((p) => p.status !== 'archived').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('archived')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'archived' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Archivés ({projects.filter((p) => p.status === 'archived').length})
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => {
          const stats = getProjectStats(project.id);
          const isSelected = selectedProjectId === project.id;

          return (
            <div
              key={project.id}
              id={`project-card-${project.id}`}
              onClick={() => setSelectedProjectId(isSelected ? null : project.id)}
              className={`group bg-white rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col ${
                isSelected 
                  ? 'border-indigo-600 ring-2 ring-indigo-600/10 shadow-md' 
                  : 'border-slate-200/80 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              {/* Card Top Banner with Color */}
              <div 
                className="h-2 w-full transition-all"
                style={{ backgroundColor: project.color || '#1f108e' }}
              />

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span 
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-xs"
                        style={{ backgroundColor: project.color || '#1f108e' }}
                      >
                        {project.code || 'PRJ'}
                      </span>
                      <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {project.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        title="Modifier le projet"
                        onClick={(e) => openEditModal(project, e)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        title="Supprimer le projet"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Confirmez-vous la suppression du projet "${project.name}" ? Les tickets associés resteront dans le système.`)) {
                            onDeleteProject(project.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                    {project.description || 'Aucune description spécifiée.'}
                  </p>
                </div>

                <div>
                  {/* Progress Bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-xs font-medium text-slate-600">
                      <span>Progression globale</span>
                      <span className="font-bold text-slate-900">{stats.percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${stats.percent}%`,
                          backgroundColor: project.color || '#1f108e' 
                        }}
                      />
                    </div>
                  </div>

                  {/* Metrics Pills */}
                  <div className="grid grid-cols-4 gap-1.5 py-2 px-2.5 bg-slate-50 rounded-xl text-center border border-slate-100 mb-4">
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400">Total</div>
                      <div className="text-sm font-bold text-slate-800">{stats.total}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-amber-500">À Valider</div>
                      <div className="text-sm font-bold text-amber-600">{stats.pending}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-indigo-500">En cours</div>
                      <div className="text-sm font-bold text-indigo-600">{stats.inProgress}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-emerald-500">Terminés</div>
                      <div className="text-sm font-bold text-emerald-600">{stats.completed}</div>
                    </div>
                  </div>

                  {/* Action link */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-400">
                      Créé le {project.createdAt || 'N/A'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProjectFilter(project.id);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Voir les tickets
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredProjects.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200/80 p-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <FolderKanban className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">Aucun projet trouvé</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
              Aucun projet ne correspond à vos critères de recherche. Créez un projet pour y associer vos tickets.
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all"
            >
              <Plus className="w-4 h-4" />
              Créer le premier projet
            </button>
          </div>
        )}
      </div>

      {/* Selected Project Expanded Drawer / Details View */}
      {activeSelectedProject && activeSelectedStats && (
        <div className="mt-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center shadow-xs"
                style={{ backgroundColor: activeSelectedProject.color || '#1f108e' }}
              >
                {activeSelectedProject.code || 'PRJ'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{activeSelectedProject.name}</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                    {activeSelectedStats.total} ticket{activeSelectedStats.total > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{activeSelectedProject.description || 'Projet actif.'}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onAssignTicketsToProject && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTicketIds([]);
                    setTicketSearchQuery('');
                    setShowOnlyUnassigned(true);
                    setIsAssignModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-emerald-200"
                  title="Assigner des tickets existants à ce projet"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Assigner des tickets
                </button>
              )}
              {onCreateTicketForProject && (
                <button
                  type="button"
                  onClick={() => onCreateTicketForProject(activeSelectedProject.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nouveau ticket
                </button>
              )}
              <button
                type="button"
                onClick={() => onSelectProjectFilter(activeSelectedProject.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                Afficher dans la vue tickets
              </button>
            </div>
          </div>

          {/* Ticket list of this project */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Tickets associés ({activeSelectedStats.total})
              </h4>
              {onAssignTicketsToProject && activeSelectedStats.tickets.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTicketIds([]);
                    setTicketSearchQuery('');
                    setShowOnlyUnassigned(true);
                    setIsAssignModalOpen(true);
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Ajouter d'autres tickets
                </button>
              )}
            </div>

            {activeSelectedStats.tickets.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {activeSelectedStats.tickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onNavigateToTicket(t.id)}
                    className="py-3 px-3 hover:bg-slate-50/80 rounded-xl transition-colors flex items-center justify-between gap-4 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs font-bold text-indigo-600 group-hover:underline shrink-0">
                        {t.id}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {t.title}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          Créé par {t.requestedBy} • {t.createdDate}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        t.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                        t.status === 'in_progress' ? 'bg-indigo-100 text-indigo-800' :
                        t.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {t.statusLabel || t.status}
                      </span>

                      {t.assignedTo && (
                        <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-200">
                          <img 
                            src={t.assignedTo.avatar} 
                            alt={t.assignedTo.name} 
                            className="w-5 h-5 rounded-full object-cover"
                          />
                          <span className="text-[11px] text-slate-600">{t.assignedTo.name}</span>
                        </div>
                      )}

                      {onAssignProject && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAssignProject(t.id, '');
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Dissocier ce ticket du projet"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-3">
                <p>Aucun ticket associé à ce projet pour le moment.</p>
                {onAssignTicketsToProject && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTicketIds([]);
                      setTicketSearchQuery('');
                      setShowOnlyUnassigned(true);
                      setIsAssignModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    Assigner des tickets existants
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Create / Edit Project */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FolderKanban className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingProject ? 'Modifier le projet' : 'Créer un nouveau projet'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nom du projet <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (!formCode && !editingProject) {
                        setFormCode(e.target.value.substring(0, 3).toUpperCase());
                      }
                    }}
                    placeholder="Ex: Portail Client Web"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Code (Trigramme)
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="WEB"
                    className="w-full px-3 py-2 text-sm font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Décrivez les objectifs et le périmètre de ce projet..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Couleur d'identification
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setFormColor(col)}
                      className={`w-7 h-7 rounded-lg transition-transform ${
                        formColor === col ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Statut
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="active">Actif</option>
                  <option value="paused">En pause</option>
                  <option value="archived">Archivé</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
                >
                  {editingProject ? 'Enregistrer les modifications' : 'Créer le projet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assigner des tickets à ce projet */}
      {isAssignModalOpen && activeSelectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs font-bold"
                  style={{ backgroundColor: activeSelectedProject.color || '#1f108e' }}
                >
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Assigner des tickets au projet
                  </h3>
                  <p className="text-xs text-slate-500">
                    Projet cible : <strong className="text-slate-800">{activeSelectedProject.name}</strong> {activeSelectedProject.code ? `[${activeSelectedProject.code}]` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 border-b border-slate-100 bg-white space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={ticketSearchQuery}
                    onChange={(e) => setTicketSearchQuery(e.target.value)}
                    placeholder="Rechercher par ID, titre, demandeur..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowOnlyUnassigned(!showOnlyUnassigned)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors cursor-pointer ${
                      showOnlyUnassigned
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {showOnlyUnassigned ? 'Sans projet uniquement' : 'Tous les tickets disponibles'}
                  </button>
                </div>
              </div>

              {/* Select all helper */}
              {(() => {
                const candidates = tickets.filter((t) => {
                  if (t.projectId === activeSelectedProject.id) return false;
                  if (showOnlyUnassigned && t.projectId) return false;
                  if (!ticketSearchQuery.trim()) return true;
                  const q = ticketSearchQuery.toLowerCase();
                  return (
                    t.id.toLowerCase().includes(q) ||
                    t.title.toLowerCase().includes(q) ||
                    t.requestedBy.toLowerCase().includes(q) ||
                    (t.projectName && t.projectName.toLowerCase().includes(q))
                  );
                });

                const allSelected = candidates.length > 0 && candidates.every((c) => selectedTicketIds.includes(c.id));

                return (
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>{candidates.length} ticket(s) disponible(s)</span>
                    {candidates.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (allSelected) {
                            setSelectedTicketIds((prev) => prev.filter((id) => !candidates.some((c) => c.id === id)));
                          } else {
                            const newIds = Array.from(new Set([...selectedTicketIds, ...candidates.map((c) => c.id)]));
                            setSelectedTicketIds(newIds);
                          }
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                        <span>{allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}</span>
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Scrollable list of candidates */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
              {(() => {
                const candidates = tickets.filter((t) => {
                  if (t.projectId === activeSelectedProject.id) return false;
                  if (showOnlyUnassigned && t.projectId) return false;
                  if (!ticketSearchQuery.trim()) return true;
                  const q = ticketSearchQuery.toLowerCase();
                  return (
                    t.id.toLowerCase().includes(q) ||
                    t.title.toLowerCase().includes(q) ||
                    t.requestedBy.toLowerCase().includes(q) ||
                    (t.projectName && t.projectName.toLowerCase().includes(q))
                  );
                });

                if (candidates.length === 0) {
                  return (
                    <div className="py-12 text-center text-xs text-slate-400">
                      Aucun ticket disponible correspondant aux filtres.
                    </div>
                  );
                }

                return candidates.map((t) => {
                  const isChecked = selectedTicketIds.includes(t.id);
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTicketIds((prev) =>
                          isChecked ? prev.filter((id) => id !== t.id) : [...prev, t.id]
                        );
                      }}
                      className={`p-3 rounded-xl transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                        isChecked ? 'bg-indigo-50/70 border border-indigo-200' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`text-indigo-600 shrink-0 ${isChecked ? 'text-indigo-600' : 'text-slate-300'}`}>
                          {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-700">#{t.id}</span>
                            <span className="text-xs font-semibold text-slate-900 truncate">{t.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Demandé par {t.requestedBy} • {t.createdDate}
                            {t.projectName && (
                              <span className="ml-2 text-amber-700 font-medium">
                                (Déjà dans : {t.projectName})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                          {t.statusLabel || t.status}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                {selectedTicketIds.length} ticket{selectedTicketIds.length > 1 ? 's' : ''} sélectionné{selectedTicketIds.length > 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={selectedTicketIds.length === 0}
                  onClick={() => {
                    if (onAssignTicketsToProject && activeSelectedProject && selectedTicketIds.length > 0) {
                      onAssignTicketsToProject(activeSelectedProject.id, selectedTicketIds);
                      setIsAssignModalOpen(false);
                      setSelectedTicketIds([]);
                    }
                  }}
                  className={`px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                    selectedTicketIds.length === 0
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Assigner au projet ({selectedTicketIds.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
