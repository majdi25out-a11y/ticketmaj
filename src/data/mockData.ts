import { Developer, Ticket, Project } from '../types';
import { DEFAULT_ADMIN_AVATAR } from './avatars';

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Portail Client Web',
    code: 'WEB',
    description: 'Interface web client, authentification et tableau de bord de suivi opérationnel.',
    color: '#1f108e',
    status: 'active',
    createdAt: '2026-01-10',
  },
  {
    id: 'proj-2',
    name: 'Application Mobile iOS & Android',
    code: 'MOB',
    description: 'Application mobile native et hybride pour les techniciens et utilisateurs finaux.',
    color: '#059669',
    status: 'active',
    createdAt: '2026-01-15',
  },
  {
    id: 'proj-3',
    name: 'API & Microservices Backend',
    code: 'API',
    description: 'Services backend, passerelles de paiement, intégration webhooks et synchronisation BDD.',
    color: '#d97706',
    status: 'active',
    createdAt: '2026-01-20',
  },
  {
    id: 'proj-4',
    name: 'Infrastructure & Sécurité Cloud',
    code: 'OPS',
    description: 'Pipelines CI/CD, conteneurs Docker, monitoring et audits de sécurité.',
    color: '#7c3aed',
    status: 'active',
    createdAt: '2026-02-01',
  },
];

export const INITIAL_DEVELOPERS: Developer[] = [
  {
    id: 'admin-1',
    name: 'Administrateur',
    email: 'admin@ticketflow.io',
    role: 'Architecte Système & Admin',
    avatar: DEFAULT_ADMIN_AVATAR,
    tagColor: 'bg-indigo-100 text-indigo-800',
    password: 'Password123!',
    active: true,
    skills: ['Architecture', 'DevOps', 'Security', 'Node.js'],
    createdAt: '2026-01-10',
  },
  {
    id: 'dev-1',
    name: 'Alexandre Dubois',
    email: 'alexandre.dubois@ticketflow.io',
    role: 'Lead Developer & Architecte',
    avatar: DEFAULT_ADMIN_AVATAR,
    tagColor: 'bg-emerald-100 text-emerald-800',
    password: 'Password123!',
    active: true,
    skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    createdAt: '2026-01-15',
  },
  {
    id: 'dev-2',
    name: 'Sarah Connor',
    email: 'sarah.connor@ticketflow.io',
    role: 'Développeuse Frontend Senior',
    avatar: DEFAULT_ADMIN_AVATAR,
    tagColor: 'bg-purple-100 text-purple-800',
    password: 'Password123!',
    active: true,
    skills: ['React', 'TailwindCSS', 'UI/UX', 'Jest'],
    createdAt: '2026-01-20',
  },
  {
    id: 'dev-3',
    name: 'Maxime Laurent',
    email: 'maxime.laurent@ticketflow.io',
    role: 'Développeur Backend & DevOps',
    avatar: DEFAULT_ADMIN_AVATAR,
    tagColor: 'bg-blue-100 text-blue-800',
    password: 'Password123!',
    active: true,
    skills: ['Node.js', 'Docker', 'MySQL', 'CI/CD'],
    createdAt: '2026-02-01',
  },
];

export const INITIAL_TICKETS: Ticket[] = [];

