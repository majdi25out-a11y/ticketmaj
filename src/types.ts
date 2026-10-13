export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type Status = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'completed';
export type Platform = 'web' | 'mobile';

export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  color?: string;
  status?: 'active' | 'archived' | 'completed';
  createdAt?: string;
}

export interface Developer {
  id: string;
  name: string;
  email?: string;
  role: string;
  avatar: string;
  tagColor?: string;
  password?: string;
  active?: boolean;
  skills?: string[];
  createdAt?: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
  icon: string;
  url?: string;
  duration?: number;
}

export interface Comment {
  id: string;
  author: string;
  avatar: string;
  role: string;
  roleType: 'admin' | 'dev' | 'manager' | 'user';
  timestamp: string;
  content: string;
  isItalic?: boolean;
  audioUrl?: string;
  audioDuration?: number;
  attachments?: Attachment[];
}

export interface WorkflowEvent {
  id: string;
  title: string;
  author: string;
  timestamp: string;
  active?: boolean;
}

export interface UserProfile {
  name: string;
  role: string;
  avatar: string;
  email?: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  projectId?: string;
  projectName?: string;
  projectCode?: string;
  projectColor?: string;
  requestedBy: string;
  requestedByAvatar?: string;
  assignedTo?: Developer;
  status: Status;
  statusLabel: string;
  priority: Priority;
  platform: Platform;
  createdDate: string;
  slaDeadline?: string;
  tags: string[];
  attachments?: Attachment[];
  comments?: Comment[];
  history?: WorkflowEvent[];
  clarity?: 'clair' | 'clarifier';
  clarificationNote?: string;
  closingNote?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  ticketId: string;
  urgent?: boolean;
  targetUserEmail?: string;
  targetUserName?: string;
  read?: boolean;
  createdAt?: string;
}

export interface ProposedAvatar {
  id: string;
  name: string;
  category?: string;
  url: string;
  createdAt?: string;
}

export interface AppBrandingConfig {
  appName: string;
  appSubtitle: string;
  appLogoUrl: string;
  commentary?: string;
  proposedAvatars?: ProposedAvatar[];
  sessionTimeout?: string; // e.g. '15m', '30m', '1h', '4h', '8h', '24h', '7d', 'never'
}

export type ViewMode = 
  | 'dashboard' 
  | 'tickets' 
  | 'projects'
  | 'ticket_detail' 
  | 'create_ticket' 
  | 'dev_tasks' 
  | 'team' 
  | 'settings';
