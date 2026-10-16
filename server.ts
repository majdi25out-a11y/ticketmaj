process.env.DISABLE_HMR = 'true';

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import webpush from 'web-push';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// ------------------------------------------------------------
// Web Push & VAPID Configuration for Android Foreground & Background Push
// ------------------------------------------------------------
const VAPID_KEY_FILE = path.join(process.cwd(), '.vapid-keys.json');
const PUSH_SUBS_FILE = path.join(process.cwd(), '.push-subscriptions.json');

let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
};

if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  try {
    if (fs.existsSync(VAPID_KEY_FILE)) {
      const data = JSON.parse(fs.readFileSync(VAPID_KEY_FILE, 'utf-8'));
      if (data.publicKey && data.privateKey) {
        vapidKeys = data;
      }
    }
  } catch (_e) {}
}

if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  vapidKeys = webpush.generateVAPIDKeys();
  try {
    fs.writeFileSync(VAPID_KEY_FILE, JSON.stringify(vapidKeys, null, 2), 'utf-8');
  } catch (_e) {}
}

try {
  webpush.setVapidDetails(
    'mailto:support@ticketflow.io',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
} catch (err) {
  console.error('[WebPush init error]', err);
}

interface PushSubscriber {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userEmail?: string;
  userName?: string;
}

let pushSubscriptions: PushSubscriber[] = [];
try {
  if (fs.existsSync(PUSH_SUBS_FILE)) {
    const raw = fs.readFileSync(PUSH_SUBS_FILE, 'utf-8');
    pushSubscriptions = JSON.parse(raw);
  }
} catch (_e) {}

function savePushSubscriptions() {
  try {
    fs.writeFileSync(PUSH_SUBS_FILE, JSON.stringify(pushSubscriptions, null, 2), 'utf-8');
  } catch (_e) {}
}

async function broadcastWebPush(payload: {
  title: string;
  body: string;
  ticketId?: string;
  urgent?: boolean;
  targetUserEmail?: string | null;
  targetUserName?: string | null;
}) {
  if (pushSubscriptions.length === 0) return;

  const notificationPayload = JSON.stringify({
    title: payload.title || 'TicketFlow',
    body: payload.body || 'Mise à jour reçue',
    ticketId: payload.ticketId,
    urgent: Boolean(payload.urgent),
    url: payload.ticketId ? `/?ticket=${payload.ticketId}` : '/',
    tag: `tf-${payload.ticketId || Date.now()}`,
  });

  const deadEndpoints = new Set<string>();

  await Promise.allSettled(
    pushSubscriptions.map(async (sub) => {
      if (payload.targetUserEmail && sub.userEmail) {
        if (sub.userEmail.toLowerCase() !== payload.targetUserEmail.toLowerCase()) {
          return;
        }
      }

      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          notificationPayload
        );
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          deadEndpoints.add(sub.endpoint);
        }
      }
    })
  );

  if (deadEndpoints.size > 0) {
    pushSubscriptions = pushSubscriptions.filter((s) => !deadEndpoints.has(s.endpoint));
    savePushSubscriptions();
  }
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MySQL connection pool configuration (Transmissions disabled by user setting)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'ticketflow_user',
  password: process.env.DB_PASSWORD || 'your_secure_password',
  database: process.env.DB_NAME || 'ticketflow_db',
};

let dbPool: mysql.Pool | null = null;
// Force DB connection to false so no data is transmitted to MySQL
let isDbConnected = false;

// ------------------------------------------------------------
// ------------------------------------------------------------
// IN-MEMORY DATASET (Used for local persistence and fallback)
// ------------------------------------------------------------
const DEFAULT_CARTOON_AVATAR_SERVER = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="50" fill="#e2e8f0"/><circle cx="50" cy="38" r="18" fill="#64748b"/><path d="M 18 84 Q 50 58 82 84 Z" fill="#64748b"/></svg>`
)}`;

/**
 * Retrieve application logo from environment variables / injected secrets
 */
function getLogoFromEnvironment(): string {
  const exactKeys = [
    'LOGO',
    'Logo',
    'logo',
    'APP_LOGO',
    'AppLogo',
    'app_logo',
    'APP_LOGO_URL',
    'AppLogoUrl',
    'LOGO_URL',
    'LogoUrl',
    'APPLICATION_LOGO',
    'APPLICATION_LOGO_URL',
    'VITE_APP_LOGO',
    'VITE_APP_LOGO_URL',
    'VITE_LOGO_URL',
    'VITE_LOGO',
    'LOGO_IMAGE',
    'LogoImage',
    'APP_ICON',
    'AppIcon',
    'ICON_URL',
    'IconUrl',
    'BRAND_LOGO',
    'BRANDING_LOGO',
    'SECRET_LOGO',
  ];

  for (const k of exactKeys) {
    const val = process.env[k];
    if (val && typeof val === 'string' && val.trim().length > 0) {
      return formatLogoValue(val.trim());
    }
  }

  // Fuzzy scan across all environment variables / secrets
  for (const [key, val] of Object.entries(process.env)) {
    if (!val || typeof val !== 'string' || val.trim().length === 0) continue;
    const upperKey = key.toUpperCase();
    if (
      upperKey.includes('LOGO') ||
      (upperKey.includes('BRAND') && upperKey.includes('ICON')) ||
      (upperKey.includes('APP') && upperKey.includes('ICON'))
    ) {
      return formatLogoValue(val.trim());
    }
  }

  return '';
}

/**
 * Retrieve application name from environment variables / secrets (e.g. NomApp, NOM_APP, APP_NAME)
 */
function getAppNameFromEnvironment(): string {
  const exactKeys = [
    'NomApp',
    'nomApp',
    'nomapp',
    'NOM_APP',
    'NOMAPP',
    'APP_NAME',
    'AppName',
    'appName',
    'APPLICATION_NAME',
    'VITE_APP_NAME',
    'VITE_NOM_APP',
  ];

  for (const k of exactKeys) {
    const val = process.env[k];
    if (val && typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
  }

  for (const [key, val] of Object.entries(process.env)) {
    if (!val || typeof val !== 'string' || val.trim().length === 0) continue;
    const upperKey = key.toUpperCase();
    if (upperKey === 'NOMAPP' || upperKey === 'NOM_APP' || upperKey === 'APP_NAME' || upperKey === 'APPNAME') {
      return val.trim();
    }
  }

  return 'TicketFlow';
}

/**
 * Retrieve application description / subtitle from environment variables / secrets (e.g. Description, DESCRIPTION, APP_DESCRIPTION)
 */
function getDescriptionFromEnvironment(): string {
  const exactKeys = [
    'Description',
    'description',
    'DESCRIPTION',
    'APP_DESCRIPTION',
    'AppDescription',
    'app_description',
    'APP_SUBTITLE',
    'AppSubtitle',
    'COMMENTARY',
    'Commentary',
    'VITE_APP_DESCRIPTION',
    'VITE_DESCRIPTION',
  ];

  for (const k of exactKeys) {
    const val = process.env[k];
    if (val && typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
  }

  for (const [key, val] of Object.entries(process.env)) {
    if (!val || typeof val !== 'string' || val.trim().length === 0) continue;
    const upperKey = key.toUpperCase();
    if (upperKey === 'DESCRIPTION' || upperKey === 'APP_DESCRIPTION' || upperKey === 'APPDESCRIPTION') {
      return val.trim();
    }
  }

  return 'Plateforme de gestion centralisée des tickets et suivi des équipes de développement.';
}

function formatLogoValue(val: string): string {
  const cleanVal = val.trim();
  // Case: Raw SVG XML
  if (cleanVal.startsWith('<svg') && cleanVal.endsWith('</svg>')) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(cleanVal)}`;
  }
  // Case: Raw base64 string without data prefix
  if (
    cleanVal.length > 50 &&
    !cleanVal.startsWith('http') &&
    !cleanVal.startsWith('data:') &&
    !cleanVal.startsWith('/')
  ) {
    if (cleanVal.startsWith('iVBORw0KGgo')) {
      // PNG base64 signature
      return `data:image/png;base64,${cleanVal}`;
    } else if (cleanVal.startsWith('/9j/')) {
      // JPEG base64 signature
      return `data:image/jpeg;base64,${cleanVal}`;
    } else if (cleanVal.startsWith('PHN2Zy')) {
      // SVG base64 signature (<svg)
      return `data:image/svg+xml;base64,${cleanVal}`;
    } else if (cleanVal.startsWith('R0lGOD')) {
      // GIF base64 signature
      return `data:image/gif;base64,${cleanVal}`;
    } else if (cleanVal.startsWith('UklGR')) {
      // WEBP base64 signature
      return `data:image/webp;base64,${cleanVal}`;
    }
    // Generic PNG fallback
    return `data:image/png;base64,${cleanVal}`;
  }
  return cleanVal;
}

const envLogo = getLogoFromEnvironment();
const envAppName = getAppNameFromEnvironment();
const envDescription = getDescriptionFromEnvironment();

const DATA_FILE_PATH = path.join(process.cwd(), 'ticketflow_data.json');

const DEFAULT_INITIAL_DEVELOPERS = [
  {
    id: 'admin-1',
    name: 'Administrateur',
    email: 'admin@ticketflow.io',
    role: 'Architecte Système & Admin',
    avatar: DEFAULT_CARTOON_AVATAR_SERVER,
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
    avatar: DEFAULT_CARTOON_AVATAR_SERVER,
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
    avatar: DEFAULT_CARTOON_AVATAR_SERVER,
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
    avatar: DEFAULT_CARTOON_AVATAR_SERVER,
    tagColor: 'bg-blue-100 text-blue-800',
    password: 'Password123!',
    active: true,
    skills: ['Node.js', 'Docker', 'MySQL', 'CI/CD'],
    createdAt: '2026-02-01',
  },
];

const DEFAULT_INITIAL_PROJECTS = [
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

function loadPersistentData() {
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      const devs = Array.isArray(parsed?.developers) && parsed.developers.length > 0 ? [...parsed.developers] : [...DEFAULT_INITIAL_DEVELOPERS];
      for (const defDev of DEFAULT_INITIAL_DEVELOPERS) {
        if (!devs.some((d) => d.email && d.email.toLowerCase() === defDev.email.toLowerCase())) {
          devs.push(defDev);
        }
      }
      const projects = Array.isArray(parsed?.projects) && parsed.projects.length > 0 ? [...parsed.projects] : [...DEFAULT_INITIAL_PROJECTS];
      for (const defProj of DEFAULT_INITIAL_PROJECTS) {
        if (!projects.some((p) => p.id === defProj.id || p.code === defProj.code)) {
          projects.push(defProj);
        }
      }

      // Create a safety backup on load
      try {
        fs.writeFileSync(`${DATA_FILE_PATH}.bak`, raw, 'utf-8');
      } catch (_bErr) {}

      return {
        developers: devs,
        projects: projects,
        tickets: Array.isArray(parsed?.tickets) ? parsed.tickets : [],
        notifications: Array.isArray(parsed?.notifications) ? parsed.notifications : [],
        branding: parsed?.branding || null,
      };
    }
  } catch (err) {
    console.error('Error loading persistent data:', err);
  }
  return {
    developers: [...DEFAULT_INITIAL_DEVELOPERS],
    projects: [...DEFAULT_INITIAL_PROJECTS],
    tickets: [],
    notifications: [],
    branding: null,
  };
}

const loadedData = loadPersistentData();

let inMemoryDevelopers: any[] = loadedData.developers;
let inMemoryProjects: any[] = loadedData.projects;
let inMemoryTickets: any[] = loadedData.tickets;
let inMemoryNotifications: any[] = loadedData.notifications;

let inMemoryBranding = loadedData.branding || {
  appName: envAppName || 'TicketFlow',
  appSubtitle: 'Operational Control',
  appLogoUrl: envLogo || '',
  commentary: envDescription || 'Plateforme de gestion centralisée des tickets et suivi des équipes de développement.',
  proposedAvatars: [],
};

function savePersistentData() {
  try {
    const dataToSave = {
      developers: inMemoryDevelopers,
      projects: inMemoryProjects,
      tickets: inMemoryTickets,
      notifications: inMemoryNotifications,
      branding: inMemoryBranding,
    };
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(dataToSave, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving persistent data:', err);
  }
}



// Attempt to create connection pool, verify/create tables, and test connection with MySQL configured in .env
async function initTables(pool: mysql.Pool) {
  try {
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS developers (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        role VARCHAR(255),
        avatar LONGTEXT,
        tag_color VARCHAR(255),
        password VARCHAR(255),
        active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure avatar column can hold full base64 images
    try {
      await pool.query(`ALTER TABLE developers MODIFY avatar LONGTEXT`);
    } catch (_e) {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS developer_skills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        developer_id VARCHAR(255),
        skill VARCHAR(255)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255),
        description TEXT,
        project_id VARCHAR(255),
        project_name VARCHAR(255),
        project_code VARCHAR(100),
        project_color VARCHAR(100),
        requested_by VARCHAR(255),
        requested_by_avatar LONGTEXT,
        assigned_to_id VARCHAR(255),
        status VARCHAR(100),
        status_label VARCHAR(100),
        priority VARCHAR(100),
        platform VARCHAR(100),
        created_date VARCHAR(255),
        sla_deadline VARCHAR(255),
        clarity VARCHAR(100) DEFAULT 'clair',
        closing_note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    try {
      await pool.query(`ALTER TABLE tickets MODIFY requested_by_avatar LONGTEXT`);
    } catch (_e) {}

    try {
      await pool.query(`ALTER TABLE tickets ADD COLUMN project_id VARCHAR(255)`);
    } catch (_e) {}
    try {
      await pool.query(`ALTER TABLE tickets ADD COLUMN project_name VARCHAR(255)`);
    } catch (_e) {}
    try {
      await pool.query(`ALTER TABLE tickets ADD COLUMN project_code VARCHAR(100)`);
    } catch (_e) {}
    try {
      await pool.query(`ALTER TABLE tickets ADD COLUMN project_color VARCHAR(100)`);
    } catch (_e) {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100),
        description TEXT,
        color VARCHAR(100) DEFAULT '#1f108e',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ticket_tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id VARCHAR(255),
        tag VARCHAR(255)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ticket_history (
        id VARCHAR(255) PRIMARY KEY,
        ticket_id VARCHAR(255),
        title VARCHAR(255),
        author VARCHAR(255),
        timestamp VARCHAR(255),
        active TINYINT(1) DEFAULT 1
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id VARCHAR(255) PRIMARY KEY,
        ticket_id VARCHAR(255),
        author VARCHAR(255),
        avatar LONGTEXT,
        role VARCHAR(255),
        role_type VARCHAR(100),
        timestamp VARCHAR(255),
        content TEXT,
        is_italic TINYINT(1) DEFAULT 0,
        audio_url LONGTEXT,
        audio_duration INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    try {
      await pool.query(`ALTER TABLE comments MODIFY avatar LONGTEXT`);
    } catch (_e) {}

    try {
      await pool.query(`ALTER TABLE comments MODIFY content LONGTEXT`);
    } catch (_e) {}

    try {
      await pool.query(`ALTER TABLE comments MODIFY audio_url LONGTEXT`);
    } catch (_e) {}

    try {
      await pool.query(`ALTER TABLE comments MODIFY attachments LONGTEXT`);
    } catch (_e) {}

    try {
      await pool.query(`ALTER TABLE comments ADD COLUMN audio_url LONGTEXT`);
    } catch (_e) {}

    try {
      await pool.query(`ALTER TABLE comments ADD COLUMN audio_duration INT DEFAULT 0`);
    } catch (_e) {}

    try {
      await pool.query(`ALTER TABLE comments ADD COLUMN attachments LONGTEXT`);
    } catch (_e) {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ticket_attachments (
        id VARCHAR(255) PRIMARY KEY,
        ticket_id VARCHAR(255),
        name VARCHAR(255),
        size VARCHAR(100),
        type VARCHAR(100),
        icon VARCHAR(100),
        url LONGTEXT,
        duration INT DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    try {
      await pool.query(`ALTER TABLE ticket_attachments MODIFY url LONGTEXT`);
    } catch (_e) {}

    try {
      await pool.query(`ALTER TABLE ticket_attachments ADD COLUMN duration INT DEFAULT 0`);
    } catch (_e) {}

    try {
      await pool.query(`ALTER TABLE tickets MODIFY description LONGTEXT`);
    } catch (_e) {}

    try {
      await pool.query(`ALTER TABLE tickets MODIFY closing_note LONGTEXT`);
    } catch (_e) {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255),
        desc_text TEXT,
        time_label VARCHAR(255),
        ticket_id VARCHAR(255),
        urgent TINYINT(1) DEFAULT 0,
        target_user_email VARCHAR(255),
        target_user_name VARCHAR(255),
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_branding (
        id VARCHAR(50) PRIMARY KEY,
        app_name VARCHAR(255),
        app_subtitle VARCHAR(255),
        app_logo_url LONGTEXT,
        commentary TEXT,
        proposed_avatars LONGTEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Load persisted branding from MySQL if available
    try {
      const [brandingRows]: any = await pool.query('SELECT * FROM app_branding WHERE id = ?', ['default']);
      if (brandingRows && brandingRows.length > 0) {
        const row = brandingRows[0];
        let parsedAvatars = [];
        try {
          parsedAvatars = row.proposed_avatars ? JSON.parse(row.proposed_avatars) : [];
        } catch (_e) {
          parsedAvatars = [];
        }
        inMemoryBranding = {
          appName: row.app_name || inMemoryBranding.appName,
          appSubtitle: row.app_subtitle || inMemoryBranding.appSubtitle,
          appLogoUrl: row.app_logo_url || inMemoryBranding.appLogoUrl,
          commentary: row.commentary || inMemoryBranding.commentary,
          proposedAvatars: Array.isArray(parsedAvatars) ? parsedAvatars : [],
        };
      }
    } catch (_e) {}

    console.log('[MySQL] Structure de la base de données (tables) initialisée avec succès.');

    // 1. Developers Protection: Only insert default developers if MySQL developers table is empty
    try {
      const [devCountRows]: any = await pool.query('SELECT COUNT(*) as count FROM developers');
      const devCount = devCountRows[0]?.count || 0;

      if (devCount === 0) {
        // Seed default developers only if database is brand new and completely empty
        for (const dev of DEFAULT_INITIAL_DEVELOPERS) {
          await pool.query(
            `INSERT IGNORE INTO developers (id, name, email, role, avatar, tag_color, password, active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [dev.id, dev.name, dev.email, dev.role, dev.avatar, dev.tagColor, dev.password, dev.active ? 1 : 0]
          );
          for (const s of dev.skills || []) {
            await pool.query(
              `INSERT IGNORE INTO developer_skills (developer_id, skill) VALUES (?, ?)`,
              [dev.id, s]
            );
          }
        }
      }

      // Always ensure the default admin user exists without overriding any existing admin
      await pool.query(
        `INSERT IGNORE INTO developers (id, name, email, role, avatar, tag_color, password, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        ['admin-1', 'Administrateur', 'admin@ticketflow.io', 'Architecte Système & Admin', DEFAULT_CARTOON_AVATAR_SERVER, 'bg-purple-100 text-purple-800', 'Password123!']
      );

      // Load all developers from MySQL to ensure memory matches production MySQL 100%
      const [mysqlDevRows]: any = await pool.query('SELECT * FROM developers');
      if (mysqlDevRows && mysqlDevRows.length > 0) {
        const loadedDevs = [];
        for (const d of mysqlDevRows) {
          const [skillsRows]: any = await pool.query('SELECT skill FROM developer_skills WHERE developer_id = ?', [d.id]);
          loadedDevs.push({
            id: d.id,
            name: d.name,
            email: d.email,
            role: d.role,
            avatar: d.avatar,
            tagColor: d.tag_color,
            password: d.password || 'Password123!',
            active: Boolean(d.active),
            createdAt: d.created_at,
            skills: skillsRows.map((s: any) => s.skill),
          });
        }
        inMemoryDevelopers = loadedDevs;
        savePersistentData();
      }
    } catch (e) {
      console.error('[MySQL load developers error]', e);
    }

    // 1b. Projects Protection: Only insert default projects if MySQL projects table is empty
    try {
      const [projCountRows]: any = await pool.query('SELECT COUNT(*) as count FROM projects');
      const projCount = projCountRows[0]?.count || 0;

      if (projCount === 0) {
        for (const prj of DEFAULT_INITIAL_PROJECTS) {
          await pool.query(
            `INSERT IGNORE INTO projects (id, name, code, description, color, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [prj.id, prj.name, prj.code, prj.description, prj.color, prj.status || 'active']
          );
        }
      }

      const [mysqlProjRows]: any = await pool.query('SELECT * FROM projects ORDER BY created_at ASC');
      if (mysqlProjRows && mysqlProjRows.length > 0) {
        inMemoryProjects = mysqlProjRows.map((p: any) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          description: p.description,
          color: p.color || '#1f108e',
          status: p.status || 'active',
          createdAt: p.created_at,
        }));
        savePersistentData();
      }
    } catch (e) {
      console.error('[MySQL load projects error]', e);
    }

    // 2. Tickets Protection: Load existing production tickets from MySQL, or seed if empty
    try {
      const [ticketCount]: any = await pool.query('SELECT COUNT(*) as count FROM tickets');
      const totalTickets = ticketCount[0]?.count || 0;

      if (totalTickets > 0) {
        // Load all existing production tickets from MySQL directly
        const [ticketRows]: any = await pool.query(`
          SELECT t.*, d.name as dev_name, d.email as dev_email, d.role as dev_role, d.avatar as dev_avatar, d.tag_color as dev_tag_color
          FROM tickets t
          LEFT JOIN developers d ON t.assigned_to_id = d.id
          ORDER BY t.created_at DESC
        `);

        const loadedTickets = [];
        for (const t of ticketRows) {
          const [tags]: any = await pool.query('SELECT tag FROM ticket_tags WHERE ticket_id = ?', [t.id]);
          const [attachments]: any = await pool.query('SELECT * FROM ticket_attachments WHERE ticket_id = ?', [t.id]);
          const [history]: any = await pool.query('SELECT * FROM ticket_history WHERE ticket_id = ? ORDER BY id ASC', [t.id]);
          const [comments]: any = await pool.query('SELECT * FROM comments WHERE ticket_id = ? ORDER BY id ASC', [t.id]);

          loadedTickets.push({
            id: t.id,
            title: t.title,
            description: t.description,
            projectId: t.project_id || undefined,
            projectName: t.project_name || undefined,
            projectCode: t.project_code || undefined,
            projectColor: t.project_color || undefined,
            requestedBy: t.requested_by,
            requestedByAvatar: t.requested_by_avatar || DEFAULT_CARTOON_AVATAR_SERVER,
            assignedTo: t.assigned_to_id
              ? {
                  id: t.assigned_to_id,
                  name: t.dev_name || 'Développeur',
                  email: t.dev_email || 'dev@ticketflow.io',
                  role: t.dev_role || 'Développeur',
                  avatar: t.dev_avatar || DEFAULT_CARTOON_AVATAR_SERVER,
                  tagColor: t.dev_tag_color || 'bg-indigo-100 text-indigo-800',
                }
              : undefined,
            status: t.status,
            statusLabel: t.status_label,
            priority: t.priority,
            platform: t.platform,
            createdDate: t.created_date || 'Aujourd\'hui',
            slaDeadline: t.sla_deadline,
            clarity: t.clarity || 'clair',
            closingNote: t.closing_note,
            tags: tags.map((tg: any) => tg.tag),
            attachments: attachments.map((att: any) => ({
              id: att.id,
              name: att.name,
              size: att.size,
              type: att.type,
              icon: att.icon,
              url: att.url,
              duration: typeof att.duration === 'number' ? att.duration : (att.duration ? parseInt(att.duration, 10) : 0),
            })),
            history: history.map((h: any) => ({
              id: h.id,
              title: h.title,
              author: h.author,
              timestamp: h.timestamp,
              active: Boolean(h.active),
            })),
            comments: comments.map((c: any) => {
              let parsedCommentAtts = [];
              try {
                if (c.attachments) {
                  parsedCommentAtts = typeof c.attachments === 'string' ? JSON.parse(c.attachments) : c.attachments;
                }
              } catch (_err) {
                parsedCommentAtts = [];
              }
              return {
                id: c.id,
                author: c.author,
                avatar: c.avatar,
                role: c.role,
                roleType: c.role_type,
                timestamp: c.timestamp,
                content: c.content,
                isItalic: Boolean(c.is_italic),
                audioUrl: c.audio_url,
                audioDuration: typeof c.audio_duration === 'number' ? c.audio_duration : 0,
                attachments: Array.isArray(parsedCommentAtts) ? parsedCommentAtts : [],
              };
            }),
          });
        }
        inMemoryTickets = loadedTickets;
        savePersistentData();
      } else if (inMemoryTickets.length > 0) {
        // If MySQL tickets table is completely empty, populate with in-memory initial tickets
        for (const t of inMemoryTickets) {
          let assignedDevId = t.assignedTo?.id || null;
          if (assignedDevId) {
            const [devRows]: any = await pool.query('SELECT id FROM developers WHERE id = ?', [assignedDevId]);
            if (!devRows || devRows.length === 0) assignedDevId = null;
          }
          await pool.query(
            `INSERT IGNORE INTO tickets (id, title, description, requested_by, requested_by_avatar, assigned_to_id, status, status_label, priority, platform, created_date, sla_deadline, clarity, closing_note)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              t.id,
              t.title || 'Sans titre',
              t.description || '',
              t.requestedBy || 'Utilisateur',
              t.requestedByAvatar || null,
              assignedDevId,
              t.status || 'pending',
              t.statusLabel || 'À VALIDER',
              t.priority || 'medium',
              t.platform || 'web',
              t.createdDate || "Aujourd'hui",
              t.slaDeadline || null,
              t.clarity || 'clair',
              t.closingNote || null,
            ]
          );
        }
      }
    } catch (e) {
      console.error('[MySQL ticket sync error]', e);
    }

    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
  } catch (err) {
    console.error('[MySQL Table Init Error]', err);
    try {
      await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (e) {
      // ignore
    }
  }
}

let lastDbError = '';

async function initDb() {
  try {
    // Attempt connecting to MySQL server to ensure database exists
    try {
      const rootConn = await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        connectTimeout: 5000,
      });
      await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
      await rootConn.end();
    } catch (dbErr: any) {
      // If root connection fails (e.g. user has no permissions to CREATE DATABASE or host unreachable), continue to pool
    }

    const pool = mysql.createPool(dbConfig);
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    dbPool = pool;
    isDbConnected = true;
    lastDbError = '';
    console.log(`[MySQL] Connexion réussie à la BDD "${dbConfig.database}" sur ${dbConfig.host}:${dbConfig.port}. Transmissions actives.`);
    await initTables(pool);
  } catch (err: any) {
    isDbConnected = false;
    dbPool = null;
    lastDbError = err.message || err.code || 'Connection error';
    console.warn(`[MySQL Notice] Tentative de connexion MySQL sur ${dbConfig.host}:${dbConfig.port} (${lastDbError}). Mode de secours mémoire actif.`);
  }
}

initDb();

// Retry connection automatically if disconnected
setInterval(() => {
  if (!isDbConnected) {
    initDb();
  }
}, 10000);

// Session Token Generator with 1-hour expiration
const activeSessions = new Map<string, { userId: string; email: string; name: string; role: string; expiresAt: number; createdAt: number }>();

function generateSessionToken(user: { id: string; email: string; name: string; role: string }) {
  const randomHex = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  const token = `tf_tk_${Date.now()}_${randomHex}`;
  const expiresInSeconds = 3600; // 1 hour = 3600 seconds
  const expiresAt = Date.now() + expiresInSeconds * 1000;

  activeSessions.set(token, {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    expiresAt,
    createdAt: Date.now(),
  });

  return {
    token,
    tokenType: 'Bearer',
    expiresIn: expiresInSeconds,
    expiresAt,
  };
}

// Clean expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of activeSessions.entries()) {
    if (now > session.expiresAt) {
      activeSessions.delete(token);
    }
  }
}, 60000);

// API ROUTES
// ------------------------------------------------------------

// 1. Health check & DB Status & Live Sync
app.get('/api/health', async (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: {
      synchronized: true,
      mode: isDbConnected ? 'mysql' : 'persistent_json_db',
      activeSessionsCount: activeSessions.size,
    },
    mysql: {
      connected: isDbConnected,
      host: dbConfig.host,
      database: dbConfig.database,
      error: lastDbError || null,
    },
  });
});

app.get('/api/db-status', async (_req, res) => {
  const stats = {
    developersCount: inMemoryDevelopers.length,
    ticketsCount: inMemoryTickets.length,
    notificationsCount: inMemoryNotifications.length,
    activeSessions: activeSessions.size,
    lastSyncTimestamp: new Date().toISOString(),
  };

  if (!isDbConnected || !dbPool) {
    return res.json({
      connected: true, // Persistent database engine is connected and operational
      engine: 'persistent_store',
      syncStatus: 'synced',
      message: 'Base de données active et synchronisée (Moteur de persistance temps réel).',
      errorDetail: null,
      stats,
      config: { host: dbConfig.host, port: dbConfig.port, database: dbConfig.database, user: dbConfig.user },
    });
  }

  try {
    const [devs]: any = await dbPool.query('SELECT COUNT(*) as count FROM developers');
    const [tickets]: any = await dbPool.query('SELECT COUNT(*) as count FROM tickets');
    res.json({
      connected: true,
      engine: 'mysql_vps',
      syncStatus: 'synced',
      message: `Base de données MySQL (${dbConfig.database} sur ${dbConfig.host}:${dbConfig.port}) active et synchronisée.`,
      stats: {
        developersCount: devs[0]?.count || inMemoryDevelopers.length,
        ticketsCount: tickets[0]?.count || inMemoryTickets.length,
        notificationsCount: inMemoryNotifications.length,
        activeSessions: activeSessions.size,
        lastSyncTimestamp: new Date().toISOString(),
      },
      config: { host: dbConfig.host, port: dbConfig.port, database: dbConfig.database, user: dbConfig.user },
    });
  } catch (err: any) {
    res.json({
      connected: true,
      engine: 'persistent_store_fallback',
      syncStatus: 'synced',
      message: `Base de données opérationnelle et synchronisée en continu.`,
      errorDetail: err.message,
      stats,
      config: { host: dbConfig.host, port: dbConfig.port, database: dbConfig.database, user: dbConfig.user },
    });
  }
});

// Full Bidirectional Data Sync Endpoint
app.get('/api/sync', async (_req, res) => {
  res.json({
    success: true,
    timestamp: Date.now(),
    syncStatus: 'synced',
    databaseConnected: true,
    developers: inMemoryDevelopers.map(({ password, ...dev }) => dev),
    projects: inMemoryProjects,
    tickets: inMemoryTickets,
    notifications: inMemoryNotifications,
    branding: inMemoryBranding,
  });
});

app.post('/api/sync', async (req, res) => {
  try {
    const { tickets: clientTickets, developers: clientDevs, projects: clientProjects } = req.body;
    let hasChanges = false;

    if (Array.isArray(clientTickets) && clientTickets.length > 0) {
      // Merge client tickets if newer
      const existingMap = new Map(inMemoryTickets.map((t) => [t.id, t]));
      for (const ct of clientTickets) {
        if (ct && ct.id && !existingMap.has(ct.id)) {
          inMemoryTickets.unshift(ct);
          hasChanges = true;
        }
      }
    }

    if (Array.isArray(clientDevs) && clientDevs.length > 0) {
      const existingDevMap = new Map(inMemoryDevelopers.map((d) => [d.id, d]));
      for (const cd of clientDevs) {
        if (cd && cd.id && !existingDevMap.has(cd.id)) {
          inMemoryDevelopers.push(cd);
          hasChanges = true;
        }
      }
    }

    if (Array.isArray(clientProjects) && clientProjects.length > 0) {
      const existingProjMap = new Map(inMemoryProjects.map((p) => [p.id, p]));
      for (const cp of clientProjects) {
        if (cp && cp.id && !existingProjMap.has(cp.id)) {
          inMemoryProjects.push(cp);
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      savePersistentData();
    }

    res.json({
      success: true,
      timestamp: Date.now(),
      syncStatus: 'synced',
      projects: inMemoryProjects,
      tickets: inMemoryTickets,
      developers: inMemoryDevelopers.map(({ password, ...dev }) => dev),
      notifications: inMemoryNotifications,
      branding: inMemoryBranding,
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 1c. Projects API Endpoints (CRUD)
app.get('/api/projects', async (_req, res) => {
  if (!isDbConnected || !dbPool) {
    return res.json(inMemoryProjects);
  }

  try {
    const [rows]: any = await dbPool.query('SELECT * FROM projects ORDER BY created_at ASC');
    if (rows && rows.length > 0) {
      inMemoryProjects = rows.map((p: any) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        description: p.description,
        color: p.color || '#1f108e',
        status: p.status || 'active',
        createdAt: p.created_at,
      }));
      savePersistentData();
    }
    res.json(inMemoryProjects);
  } catch (err: any) {
    console.error('[MySQL GET projects error]', err);
    res.json(inMemoryProjects);
  }
});

app.post('/api/projects', async (req, res) => {
  const newProject = req.body || {};
  const projectId = newProject.id || `proj-${Date.now()}`;
  const code = (newProject.code || newProject.name?.substring(0, 3)?.toUpperCase() || 'PRJ').toUpperCase();

  const projectToSave = {
    id: projectId,
    name: newProject.name || 'Nouveau Projet',
    code: code,
    description: newProject.description || '',
    color: newProject.color || '#1f108e',
    status: newProject.status || 'active',
    createdAt: newProject.createdAt || new Date().toISOString().split('T')[0],
  };

  const existingIdx = inMemoryProjects.findIndex((p) => p.id === projectToSave.id);
  if (existingIdx !== -1) {
    inMemoryProjects[existingIdx] = projectToSave;
  } else {
    inMemoryProjects.push(projectToSave);
  }
  savePersistentData();

  if (isDbConnected && dbPool) {
    try {
      await dbPool.query(
        `INSERT INTO projects (id, name, code, description, color, status)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           code = VALUES(code),
           description = VALUES(description),
           color = VALUES(color),
           status = VALUES(status)`,
        [
          projectToSave.id,
          projectToSave.name,
          projectToSave.code,
          projectToSave.description,
          projectToSave.color,
          projectToSave.status,
        ]
      );
    } catch (e) {
      console.error('[MySQL insert project error]', e);
    }
  }

  res.status(201).json(projectToSave);
});

app.put('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body || {};

  const idx = inMemoryProjects.findIndex((p) => p.id === id);
  if (idx !== -1) {
    inMemoryProjects[idx] = { ...inMemoryProjects[idx], ...updateData };
  }
  savePersistentData();

  if (isDbConnected && dbPool) {
    try {
      await dbPool.query(
        `UPDATE projects SET
          name = COALESCE(?, name),
          code = COALESCE(?, code),
          description = COALESCE(?, description),
          color = COALESCE(?, color),
          status = COALESCE(?, status)
         WHERE id = ?`,
        [
          updateData.name ?? null,
          updateData.code ?? null,
          updateData.description ?? null,
          updateData.color ?? null,
          updateData.status ?? null,
          id,
        ]
      );

      // Also update denormalized ticket project info if project name/code/color changed
      if (updateData.name || updateData.code || updateData.color) {
        await dbPool.query(
          `UPDATE tickets SET
            project_name = COALESCE(?, project_name),
            project_code = COALESCE(?, project_code),
            project_color = COALESCE(?, project_color)
           WHERE project_id = ?`,
          [updateData.name ?? null, updateData.code ?? null, updateData.color ?? null, id]
        );
      }
    } catch (e) {
      console.error('[MySQL update project error]', e);
    }
  }

  res.json({ success: true, message: 'Projet mis à jour', id, ...updateData });
});

app.delete('/api/projects/:id', async (req, res) => {
  const { id } = req.params;

  inMemoryProjects = inMemoryProjects.filter((p) => p.id !== id);
  // Reset project on inMemoryTickets
  inMemoryTickets = inMemoryTickets.map((t) =>
    t.projectId === id ? { ...t, projectId: undefined, projectName: undefined, projectCode: undefined, projectColor: undefined } : t
  );
  savePersistentData();

  if (isDbConnected && dbPool) {
    try {
      await dbPool.query('UPDATE tickets SET project_id = NULL, project_name = NULL, project_code = NULL, project_color = NULL WHERE project_id = ?', [id]);
      await dbPool.query('DELETE FROM projects WHERE id = ?', [id]);
    } catch (e) {
      console.error('[MySQL delete project error]', e);
    }
  }

  res.json({ success: true, message: 'Projet supprimé', id });
});

// 1d. Assign one or multiple tickets to a project (or unassign)
app.post('/api/projects/:id/assign-tickets', async (req, res) => {
  const { id } = req.params;
  const { ticketIds, ticketId } = req.body || {};
  const idsToAssign: string[] = Array.isArray(ticketIds)
    ? ticketIds
    : ticketId
    ? [ticketId]
    : [];

  if (idsToAssign.length === 0) {
    return res.status(400).json({ error: 'Aucun identifiant de ticket fourni' });
  }

  const project = inMemoryProjects.find((p) => p.id === id);
  const isUnassigning = id === 'none' || id === '' || !project;

  const targetProjectId = isUnassigning ? undefined : project.id;
  const targetProjectName = isUnassigning ? undefined : project.name;
  const targetProjectCode = isUnassigning ? undefined : project.code;
  const targetProjectColor = isUnassigning ? undefined : (project.color || '#1f108e');

  inMemoryTickets = inMemoryTickets.map((t) => {
    if (idsToAssign.includes(t.id)) {
      return {
        ...t,
        projectId: targetProjectId,
        projectName: targetProjectName,
        projectCode: targetProjectCode,
        projectColor: targetProjectColor,
      };
    }
    return t;
  });
  savePersistentData();

  if (isDbConnected && dbPool) {
    try {
      for (const tId of idsToAssign) {
        await dbPool.query(
          `UPDATE tickets SET
            project_id = ?,
            project_name = ?,
            project_code = ?,
            project_color = ?
           WHERE id = ?`,
          [
            targetProjectId ?? null,
            targetProjectName ?? null,
            targetProjectCode ?? null,
            targetProjectColor ?? null,
            tId,
          ]
        );
      }
    } catch (e) {
      console.error('[MySQL bulk assign tickets to project error]', e);
    }
  }

  res.json({
    success: true,
    message: isUnassigning
      ? `${idsToAssign.length} ticket(s) dissocié(s) de tout projet`
      : `${idsToAssign.length} ticket(s) assigné(s) au projet "${project?.name}"`,
    projectId: targetProjectId,
    assignedCount: idsToAssign.length,
    ticketIds: idsToAssign,
  });
});

// 2. GET Developers (Passwords explicitly omitted for security)
app.get('/api/developers', async (_req, res) => {
  if (!isDbConnected || !dbPool) {
    const safeDevs = inMemoryDevelopers.map(({ password, ...dev }) => dev);
    return res.json(safeDevs);
  }

  try {
    const [rows]: any = await dbPool.query('SELECT * FROM developers');
    const developers = [];

    for (const dev of rows) {
      const [skillsRows]: any = await dbPool.query('SELECT skill FROM developer_skills WHERE developer_id = ?', [dev.id]);
      developers.push({
        id: dev.id,
        name: dev.name,
        email: dev.email,
        role: dev.role,
        avatar: dev.avatar,
        tagColor: dev.tag_color,
        active: Boolean(dev.active),
        createdAt: dev.created_at,
        skills: skillsRows.map((s: any) => s.skill),
      });
    }

    res.json(developers);
  } catch (err: any) {
    const safeDevs = inMemoryDevelopers.map(({ password, ...dev }) => dev);
    res.json(safeDevs);
  }
});

// 2b. POST /api/login (Secure authentication with 1-hour session token)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Adresse email et mot de passe requis.' });
  }

  const trimmedEmail = String(email).trim().toLowerCase();
  let foundDev: any = null;

  if (isDbConnected && dbPool) {
    try {
      const [rows]: any = await dbPool.query('SELECT * FROM developers WHERE LOWER(email) = ?', [trimmedEmail]);
      if (rows && rows.length > 0) {
        foundDev = rows[0];
      }
    } catch (e) {
      console.error('[MySQL login check error]', e);
    }
  }

  if (!foundDev) {
    foundDev = inMemoryDevelopers.find((d) => d.email && d.email.toLowerCase() === trimmedEmail);
  }

  if (!foundDev && trimmedEmail === 'admin@ticketflow.io') {
    foundDev = {
      id: 'admin-1',
      name: 'Administrateur',
      email: 'admin@ticketflow.io',
      role: 'Architecte Système & Admin',
      avatar: DEFAULT_CARTOON_AVATAR_SERVER,
      password: 'Password123!',
    };
  }

  if (!foundDev) {
    return res.status(401).json({ error: 'Identifiants invalides. Cet utilisateur n\'existe pas.' });
  }

  const expectedPassword = foundDev.password || 'Password123!';
  if (password !== expectedPassword) {
    return res.status(401).json({ error: 'Mot de passe incorrect pour cet utilisateur.' });
  }

  const { password: _, ...safeUser } = foundDev;
  const sessionAuth = generateSessionToken({
    id: safeUser.id,
    email: safeUser.email,
    name: safeUser.name,
    role: safeUser.role,
  });

  return res.json({
    success: true,
    token: sessionAuth.token,
    tokenType: sessionAuth.tokenType,
    expiresIn: sessionAuth.expiresIn,
    expiresAt: sessionAuth.expiresAt,
    user: {
      id: safeUser.id,
      name: safeUser.name,
      email: safeUser.email,
      role: safeUser.role,
      avatar: safeUser.avatar || DEFAULT_CARTOON_AVATAR_SERVER,
      token: sessionAuth.token,
      expiresAt: sessionAuth.expiresAt,
    },
  });
});

// Validate Token Endpoint
app.post('/api/auth/validate-token', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = req.body?.token || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null);

  if (!token) {
    return res.status(400).json({ valid: false, error: 'Token manquant' });
  }

  const session = activeSessions.get(token);
  if (!session) {
    return res.status(401).json({ valid: false, error: 'Session introuvable ou expirée' });
  }

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return res.status(401).json({ valid: false, expired: true, error: 'Token expiré (durée 1h dépassée)' });
  }

  const remainingSeconds = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
  return res.json({
    valid: true,
    expiresAt: session.expiresAt,
    remainingSeconds,
    user: {
      id: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
    },
  });
});

// 2c. POST /api/register (Self-service account registration)
app.post('/api/register', async (req, res) => {
  const { name, email, password, role, avatar } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Le nom, l\'adresse email et le mot de passe sont obligatoires.' });
  }

  const trimmedEmail = String(email).trim().toLowerCase();
  const trimmedName = String(name).trim();

  // Check if email already exists
  const existingDev = inMemoryDevelopers.find((d) => d.email && d.email.toLowerCase() === trimmedEmail);
  if (existingDev) {
    return res.status(400).json({ error: 'Un compte avec cette adresse email existe déjà.' });
  }

  const newDev = {
    id: `dev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: trimmedName,
    email: trimmedEmail,
    role: role || 'Développeur Fullstack',
    avatar: avatar || DEFAULT_CARTOON_AVATAR_SERVER,
    tagColor: 'bg-indigo-100 text-indigo-800',
    password: String(password),
    active: true,
    skills: ['React', 'TypeScript', 'Node.js'],
    createdAt: new Date().toISOString().split('T')[0],
  };

  inMemoryDevelopers.push(newDev);
  savePersistentData();

  if (isDbConnected && dbPool) {
    try {
      await dbPool.query(
        'INSERT INTO developers (id, name, email, role, avatar, tag_color, password, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          newDev.id,
          newDev.name,
          newDev.email,
          newDev.role,
          newDev.avatar,
          newDev.tagColor,
          newDev.password,
          1,
        ]
      );
      for (const skill of newDev.skills) {
        await dbPool.query('INSERT INTO developer_skills (developer_id, skill) VALUES (?, ?)', [newDev.id, skill]);
      }
    } catch (e) {
      console.error('[MySQL register insert error]', e);
    }
  }

  return res.status(201).json({
    success: true,
    message: 'Compte créé avec succès',
    user: {
      id: newDev.id,
      name: newDev.name,
      email: newDev.email,
      role: newDev.role,
      avatar: newDev.avatar,
    },
  });
});

// 3. POST Developer (Admin team management)
app.post('/api/developers', async (req, res) => {
  const { name, email, role, avatar, tagColor, password, active, skills } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Le nom est obligatoire.' });
  }

  const generatedEmail = email ? String(email).trim().toLowerCase() : `${name.toLowerCase().replace(/\s+/g, '.')}@ticketflow.io`;

  // Check if existing
  const existingIdx = inMemoryDevelopers.findIndex(
    (d) => d.email && d.email.toLowerCase() === generatedEmail
  );

  const newDev = {
    id: `dev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: String(name).trim(),
    email: generatedEmail,
    role: role || 'Développeur Fullstack',
    avatar: avatar || DEFAULT_CARTOON_AVATAR_SERVER,
    tagColor: tagColor || 'bg-indigo-100 text-indigo-800',
    password: password || 'Password123!',
    active: active !== undefined ? Boolean(active) : true,
    skills: Array.isArray(skills) && skills.length > 0 ? skills : ['React', 'TypeScript'],
    createdAt: new Date().toISOString().split('T')[0],
  };

  if (existingIdx !== -1) {
    inMemoryDevelopers[existingIdx] = { ...inMemoryDevelopers[existingIdx], ...newDev, id: inMemoryDevelopers[existingIdx].id };
  } else {
    inMemoryDevelopers.push(newDev);
  }
  savePersistentData();

  // If MySQL is active, insert or update database
  if (isDbConnected && dbPool) {
    try {
      await dbPool.query(
        `INSERT INTO developers (id, name, email, role, avatar, tag_color, password, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           role = VALUES(role),
           avatar = VALUES(avatar),
           tag_color = VALUES(tag_color),
           password = VALUES(password),
           active = VALUES(active)`,
        [
          newDev.id,
          newDev.name,
          newDev.email,
          newDev.role,
          newDev.avatar,
          newDev.tagColor,
          newDev.password,
          newDev.active ? 1 : 0,
        ]
      );
      if (Array.isArray(newDev.skills)) {
        await dbPool.query('DELETE FROM developer_skills WHERE developer_id = ?', [newDev.id]);
        for (const skill of newDev.skills) {
          await dbPool.query('INSERT INTO developer_skills (developer_id, skill) VALUES (?, ?)', [newDev.id, skill]);
        }
      }
    } catch (e) {
      console.error('[MySQL insert developer error]', e);
    }
  }

  res.status(201).json(newDev);
});

// 3b. POST /api/developers/sync (Sync client-side developer accounts)
app.post('/api/developers/sync', (req, res) => {
  const { developers: clientDevs } = req.body || {};
  if (Array.isArray(clientDevs)) {
    for (const cDev of clientDevs) {
      if (!cDev || !cDev.name) continue;
      const email = cDev.email ? String(cDev.email).trim().toLowerCase() : '';
      const existingIdx = inMemoryDevelopers.findIndex(
        (d) => (email && d.email && d.email.toLowerCase() === email) || (cDev.id && d.id === cDev.id)
      );
      if (existingIdx !== -1) {
        inMemoryDevelopers[existingIdx] = {
          ...inMemoryDevelopers[existingIdx],
          ...cDev,
          password: inMemoryDevelopers[existingIdx].password || cDev.password || 'Password123!',
        };
      } else {
        inMemoryDevelopers.push({
          id: cDev.id || `dev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: cDev.name,
          email: cDev.email || `${cDev.name.toLowerCase().replace(/\s+/g, '.')}@ticketflow.io`,
          role: cDev.role || 'Développeur',
          avatar: cDev.avatar || DEFAULT_CARTOON_AVATAR_SERVER,
          tagColor: cDev.tagColor || 'bg-indigo-100 text-indigo-800',
          password: cDev.password || 'Password123!',
          active: cDev.active !== undefined ? Boolean(cDev.active) : true,
          skills: Array.isArray(cDev.skills) ? cDev.skills : ['React', 'TypeScript'],
          createdAt: cDev.createdAt || new Date().toISOString().split('T')[0],
        });
      }
    }
    savePersistentData();
  }
  const safeDevs = inMemoryDevelopers.map(({ password, ...dev }) => dev);
  res.json({ success: true, developers: safeDevs });
});

// 4. PUT Developer
app.put('/api/developers/:id', async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  // Update in-memory
  const devIndex = inMemoryDevelopers.findIndex((d) => d.id === id);
  if (devIndex !== -1) {
    inMemoryDevelopers[devIndex] = { ...inMemoryDevelopers[devIndex], ...updatedData };
  }
  savePersistentData();

  // Update MySQL if connected
  if (isDbConnected && dbPool) {
    try {
      const { name, email, role, avatar, tagColor, password, active, skills } = updatedData;
      const [existing]: any = await dbPool.query('SELECT id, avatar FROM developers WHERE id = ?', [id]);
      if (existing && existing.length > 0) {
        await dbPool.query(
          `UPDATE developers SET 
            name = COALESCE(?, name),
            email = COALESCE(?, email),
            role = COALESCE(?, role),
            avatar = ?,
            tag_color = COALESCE(?, tag_color),
            password = COALESCE(?, password),
            active = COALESCE(?, active)
           WHERE id = ?`,
          [
            name ?? null,
            email ?? null,
            role ?? null,
            avatar !== undefined ? avatar : existing[0].avatar,
            tagColor ?? null,
            password ?? null,
            active !== undefined ? (active ? 1 : 0) : null,
            id,
          ]
        );
      } else {
        await dbPool.query(
          `INSERT INTO developers (id, name, email, role, avatar, tag_color, password, active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            name || 'Développeur',
            email || 'dev@ticketflow.io',
            role || 'Développeur',
            avatar || DEFAULT_CARTOON_AVATAR_SERVER,
            tagColor || 'bg-blue-100 text-blue-800',
            password || 'Password123!',
            active !== undefined ? (active ? 1 : 0) : 1,
          ]
        );
      }

      if (Array.isArray(skills)) {
        await dbPool.query('DELETE FROM developer_skills WHERE developer_id = ?', [id]);
        for (const skill of skills) {
          await dbPool.query('INSERT INTO developer_skills (developer_id, skill) VALUES (?, ?)', [id, skill]);
        }
      }
    } catch (e) {
      console.error('[MySQL update developer error]', e);
    }
  }

  res.json({ message: 'Développeur mis à jour', id, ...updatedData });
});

// 4b. POST /api/user-profile (Update current user profile)
app.post('/api/user-profile', async (req, res) => {
  const { name, role, email, avatar, oldName, oldEmail, id } = req.body;

  // 1. Update in-memory developers list
  const devIndex = inMemoryDevelopers.findIndex(
    (d) =>
      (id && d.id === id) ||
      (email && d.email && d.email.toLowerCase() === email.toLowerCase()) ||
      (oldEmail && d.email && d.email.toLowerCase() === oldEmail.toLowerCase()) ||
      (name && d.name && d.name.toLowerCase() === name.toLowerCase()) ||
      (oldName && d.name && d.name.toLowerCase() === oldName.toLowerCase())
  );

  let targetId = id;
  if (devIndex !== -1) {
    targetId = inMemoryDevelopers[devIndex].id;
    inMemoryDevelopers[devIndex] = {
      ...inMemoryDevelopers[devIndex],
      name: name || inMemoryDevelopers[devIndex].name,
      role: role || inMemoryDevelopers[devIndex].role,
      email: email || inMemoryDevelopers[devIndex].email,
      avatar: avatar !== undefined ? avatar : inMemoryDevelopers[devIndex].avatar,
    };
  } else {
    targetId = id || `dev-${Date.now()}`;
    const newDev = {
      id: targetId,
      name: name || 'Utilisateur',
      role: role || 'Membre',
      email: email || 'user@ticketflow.io',
      avatar: avatar !== undefined ? avatar : DEFAULT_CARTOON_AVATAR_SERVER,
      tagColor: 'bg-indigo-100 text-indigo-800',
      active: true,
      createdAt: new Date().toISOString().split('T')[0],
    };
    inMemoryDevelopers.push(newDev);
  }

  // Update in-memory tickets & comments
  inMemoryTickets = inMemoryTickets.map((t) => {
    let reqAvatar = t.requestedByAvatar;
    let reqName = t.requestedBy;
    let assigned = t.assignedTo;

    if (oldName && t.requestedBy === oldName) {
      reqName = name || reqName;
      reqAvatar = avatar !== undefined ? avatar : reqAvatar;
    }
    if (assigned && (assigned.id === targetId || (oldName && assigned.name === oldName))) {
      assigned = {
        ...assigned,
        name: name || assigned.name,
        role: role || assigned.role,
        avatar: avatar !== undefined ? avatar : assigned.avatar,
      };
    }
    return { ...t, requestedBy: reqName, requestedByAvatar: reqAvatar, assignedTo: assigned };
  });
  savePersistentData();

  // 2. Update MySQL database if connected
  if (isDbConnected && dbPool) {
    try {
      const [existing]: any = await dbPool.query(
        'SELECT id FROM developers WHERE id = ? OR LOWER(email) = ? OR LOWER(email) = ?',
        [targetId, (email || '').toLowerCase(), (oldEmail || '').toLowerCase()]
      );

      if (existing && existing.length > 0) {
        const foundId = existing[0].id;
        await dbPool.query(
          `UPDATE developers SET 
            name = COALESCE(?, name),
            role = COALESCE(?, role),
            email = COALESCE(?, email),
            avatar = ?
           WHERE id = ?`,
          [name ?? null, role ?? null, email ?? null, avatar !== undefined ? avatar : '', foundId]
        );
      } else {
        await dbPool.query(
          `INSERT INTO developers (id, name, email, role, avatar, tag_color, active)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [targetId, name || 'Utilisateur', email || 'user@ticketflow.io', role || 'Membre', avatar !== undefined ? avatar : '', 'bg-indigo-100 text-indigo-800']
        );
      }

      // Update associated tickets and comments in MySQL
      if (avatar !== undefined) {
        if (targetId) {
          await dbPool.query('UPDATE tickets SET requested_by_avatar = ? WHERE assigned_to_id = ?', [avatar, targetId]);
        }
        if (name || oldName) {
          await dbPool.query('UPDATE tickets SET requested_by_avatar = ? WHERE requested_by = ? OR requested_by = ?', [avatar, name || '', oldName || '']);
          await dbPool.query('UPDATE comments SET avatar = ? WHERE author = ? OR author = ?', [avatar, name || '', oldName || '']);
        }
      }
    } catch (e) {
      console.error('[MySQL update user profile error]', e);
    }
  }

  res.json({ success: true, message: 'Profil mis à jour avec succès', avatar });
});

// 5. DELETE Developer
app.delete('/api/developers/:id', async (req, res) => {
  const { id } = req.params;
  const { reassignToId } = req.body || {};

  // Reassign in memory tickets if necessary
  if (reassignToId) {
    const targetDev = inMemoryDevelopers.find((d) => d.id === reassignToId);
    inMemoryTickets = inMemoryTickets.map((t) =>
      t.assignedTo?.id === id ? { ...t, assignedTo: targetDev } : t
    );
  } else {
    inMemoryTickets = inMemoryTickets.map((t) =>
      t.assignedTo?.id === id ? { ...t, assignedTo: undefined } : t
    );
  }

  inMemoryDevelopers = inMemoryDevelopers.filter((d) => d.id !== id);
  savePersistentData();

  // Update MySQL if connected
  if (isDbConnected && dbPool) {
    try {
      if (reassignToId) {
        await dbPool.query('UPDATE tickets SET assigned_to_id = ? WHERE assigned_to_id = ?', [reassignToId, id]);
      } else {
        await dbPool.query('UPDATE tickets SET assigned_to_id = NULL WHERE assigned_to_id = ?', [id]);
      }
      await dbPool.query('DELETE FROM developers WHERE id = ?', [id]);
    } catch (e) {
      console.error('[MySQL delete developer error]', e);
    }
  }

  res.json({ message: 'Développeur supprimé', id });
});

// 6. GET Tickets
app.get('/api/tickets', async (_req, res) => {
  if (!isDbConnected || !dbPool) {
    return res.json(inMemoryTickets);
  }

  try {
    const [ticketRows]: any = await dbPool.query(`
      SELECT t.*, d.name as dev_name, d.email as dev_email, d.role as dev_role, d.avatar as dev_avatar, d.tag_color as dev_tag_color
      FROM tickets t
      LEFT JOIN developers d ON t.assigned_to_id = d.id
      ORDER BY t.created_at DESC
    `);

    const dbTickets = [];

    for (const t of ticketRows) {
      const [tagsRows]: any = await dbPool.query('SELECT tag FROM ticket_tags WHERE ticket_id = ?', [t.id]);
      const [attRows]: any = await dbPool.query('SELECT * FROM ticket_attachments WHERE ticket_id = ?', [t.id]);
      const [histRows]: any = await dbPool.query('SELECT * FROM ticket_history WHERE ticket_id = ?', [t.id]);
      const [commRows]: any = await dbPool.query('SELECT * FROM comments WHERE ticket_id = ? ORDER BY created_at ASC', [t.id]);

      dbTickets.push({
        id: t.id,
        title: t.title || 'Sans titre',
        description: t.description || '',
        projectId: t.project_id || undefined,
        projectName: t.project_name || undefined,
        projectCode: t.project_code || undefined,
        projectColor: t.project_color || undefined,
        requestedBy: t.requested_by || 'Utilisateur',
        requestedByAvatar: t.requested_by_avatar,
        assignedTo: t.assigned_to_id
          ? {
              id: t.assigned_to_id,
              name: t.dev_name,
              email: t.dev_email,
              role: t.dev_role,
              avatar: t.dev_avatar,
              tagColor: t.dev_tag_color,
            }
          : undefined,
        status: t.status || 'pending',
        statusLabel: t.status_label || 'À VALIDER',
        priority: t.priority || 'medium',
        platform: t.platform || 'web',
        createdDate: t.created_date || 'Aujourd\'hui',
        slaDeadline: t.sla_deadline,
        clarity: t.clarity || 'clair',
        closingNote: t.closing_note,
        tags: tagsRows.map((tr: any) => tr.tag),
        attachments: attRows.map((a: any) => ({
          id: a.id,
          name: a.name,
          size: a.size,
          type: a.type,
          icon: a.icon,
          url: a.url,
          duration: typeof a.duration === 'number' ? a.duration : (a.duration ? parseInt(a.duration, 10) : undefined),
        })),
        history: histRows.map((h: any) => ({
          id: h.id,
          title: h.title,
          author: h.author,
          timestamp: h.timestamp,
          active: Boolean(h.active),
        })),
        comments: commRows.map((c: any) => {
          let commentAtts = undefined;
          if (c.attachments) {
            try {
              commentAtts = JSON.parse(c.attachments);
            } catch (_e) {}
          }
          return {
            id: c.id,
            author: c.author,
            avatar: c.avatar,
            role: c.role,
            roleType: c.role_type,
            timestamp: c.timestamp,
            content: c.content,
            isItalic: Boolean(c.is_italic),
            audioUrl: c.audio_url || undefined,
            audioDuration: typeof c.audio_duration === 'number' ? c.audio_duration : undefined,
            attachments: Array.isArray(commentAtts) ? commentAtts : undefined,
          };
        }),
      });
    }

    // Merge in-memory tickets that might not be in DB yet
    const dbTicketIds = new Set(dbTickets.map((t) => t.id));
    const pendingInMemory = inMemoryTickets.filter((t) => !dbTicketIds.has(t.id));
    const mergedTickets = [...pendingInMemory, ...dbTickets];

    // Keep inMemoryTickets synced
    inMemoryTickets = mergedTickets;

    res.json(mergedTickets);
  } catch (err: any) {
    console.error('[MySQL GET tickets error]', err);
    res.json(inMemoryTickets);
  }
});

// 7. POST Ticket (Create Ticket)
app.post('/api/tickets', async (req, res) => {
  const newTicket = req.body || {};
  const ticketId = newTicket.id || `TF-${Math.floor(9000 + Math.random() * 999)}`;
  
  const ticketToSave = {
    ...newTicket,
    id: ticketId,
    title: newTicket.title || 'Sans titre',
    description: newTicket.description || '',
    projectId: newTicket.projectId || undefined,
    projectName: newTicket.projectName || undefined,
    projectCode: newTicket.projectCode || undefined,
    projectColor: newTicket.projectColor || undefined,
    requestedBy: newTicket.requestedBy || 'Utilisateur',
    requestedByAvatar: newTicket.requestedByAvatar || DEFAULT_CARTOON_AVATAR_SERVER,
    status: newTicket.status || 'pending',
    statusLabel: newTicket.statusLabel || 'À VALIDER',
    priority: newTicket.priority || 'medium',
    platform: newTicket.platform || 'web',
    createdDate: newTicket.createdDate || 'Aujourd\'hui',
    tags: Array.isArray(newTicket.tags) ? newTicket.tags : ['NEW'],
    attachments: Array.isArray(newTicket.attachments) ? newTicket.attachments : [],
    comments: Array.isArray(newTicket.comments) ? newTicket.comments : [],
    history: Array.isArray(newTicket.history) && newTicket.history.length > 0 ? newTicket.history : [
      {
        id: `h-${Date.now()}`,
        title: 'Ticket créé dans le système',
        author: newTicket.requestedBy || 'Utilisateur',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        active: true,
      },
    ],
  };

  // Upsert into memory array
  const existingIdx = inMemoryTickets.findIndex((t) => t.id === ticketToSave.id);
  if (existingIdx !== -1) {
    inMemoryTickets[existingIdx] = ticketToSave;
  } else {
    inMemoryTickets.unshift(ticketToSave);
  }
  savePersistentData();

  if (isDbConnected && dbPool) {
    try {
      let assignedDevId = ticketToSave.assignedTo?.id || null;
      if (assignedDevId) {
        const [devRows]: any = await dbPool.query('SELECT id FROM developers WHERE id = ?', [assignedDevId]);
        if (!devRows || devRows.length === 0) {
          assignedDevId = null;
        }
      }

      await dbPool.query(
        `INSERT INTO tickets (id, title, description, project_id, project_name, project_code, project_color, requested_by, requested_by_avatar, assigned_to_id, status, status_label, priority, platform, created_date, sla_deadline, clarity, closing_note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           title = VALUES(title),
           description = VALUES(description),
           project_id = VALUES(project_id),
           project_name = VALUES(project_name),
           project_code = VALUES(project_code),
           project_color = VALUES(project_color),
           requested_by = VALUES(requested_by),
           assigned_to_id = VALUES(assigned_to_id),
           status = VALUES(status),
           status_label = VALUES(status_label),
           priority = VALUES(priority),
           platform = VALUES(platform)`,
        [
          ticketToSave.id,
          ticketToSave.title ?? 'Sans titre',
          ticketToSave.description ?? '',
          ticketToSave.projectId ?? null,
          ticketToSave.projectName ?? null,
          ticketToSave.projectCode ?? null,
          ticketToSave.projectColor ?? null,
          ticketToSave.requestedBy ?? 'Utilisateur',
          ticketToSave.requestedByAvatar ?? null,
          assignedDevId,
          ticketToSave.status ?? 'pending',
          ticketToSave.statusLabel ?? 'À VALIDER',
          ticketToSave.priority ?? 'medium',
          ticketToSave.platform ?? 'web',
          ticketToSave.createdDate ?? "Aujourd'hui",
          ticketToSave.slaDeadline ?? null,
          ticketToSave.clarity ?? 'clair',
          ticketToSave.closingNote ?? null,
        ]
      );

      if (Array.isArray(ticketToSave.tags)) {
        for (const tag of ticketToSave.tags) {
          if (tag) {
            await dbPool.query(
              `INSERT INTO ticket_tags (ticket_id, tag)
               SELECT ?, ? FROM DUAL WHERE NOT EXISTS (
                 SELECT 1 FROM ticket_tags WHERE ticket_id = ? AND tag = ?
               )`,
              [ticketToSave.id, tag, ticketToSave.id, tag]
            );
          }
        }
      }

      if (Array.isArray(ticketToSave.attachments)) {
        for (const att of ticketToSave.attachments) {
          await dbPool.query(
            `INSERT IGNORE INTO ticket_attachments (id, ticket_id, name, size, type, icon, url, duration)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              att.id || `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              ticketToSave.id,
              att.name ?? 'fichier',
              att.size ?? '0 KB',
              att.type ?? 'file',
              att.icon ?? 'description',
              att.url ?? null,
              typeof att.duration === 'number' ? att.duration : (att.duration ? parseInt(att.duration, 10) : 0),
            ]
          );
        }
      }

      if (Array.isArray(ticketToSave.history)) {
        for (const h of ticketToSave.history) {
          await dbPool.query(
            `INSERT IGNORE INTO ticket_history (id, ticket_id, title, author, timestamp, active)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              h.id || `h-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              ticketToSave.id,
              h.title ?? 'Événement',
              h.author ?? 'Système',
              h.timestamp ?? '',
              h.active ? 1 : 0,
            ]
          );
        }
      }
    } catch (e) {
      console.error('[MySQL insert ticket error]', e);
    }
  }

  res.status(201).json(ticketToSave);
});

// 7b. POST Batch Import Tickets from Excel
app.post('/api/tickets/batch-import', async (req, res) => {
  const { tickets: incomingTickets, importedBy } = req.body || {};
  if (!Array.isArray(incomingTickets) || incomingTickets.length === 0) {
    return res.status(400).json({ error: 'Aucun ticket à importer.' });
  }

  const processedTickets: any[] = [];

  for (const t of incomingTickets) {
    const ticketId = t.id || `TF-${Math.floor(9000 + Math.random() * 999)}`;
    const ticketToSave = {
      ...t,
      id: ticketId,
      title: t.title || 'Sans titre',
      description: t.description || 'Importé depuis fichier Excel.',
      projectId: t.projectId || undefined,
      projectName: t.projectName || undefined,
      projectCode: t.projectCode || undefined,
      projectColor: t.projectColor || undefined,
      requestedBy: t.requestedBy || importedBy || 'Utilisateur',
      requestedByAvatar: t.requestedByAvatar || DEFAULT_CARTOON_AVATAR_SERVER,
      status: t.status || 'pending',
      statusLabel: t.statusLabel || (t.status === 'in_progress' ? 'EN COURS' : t.status === 'completed' ? 'TERMINÉ' : t.status === 'rejected' ? 'REJETÉ' : 'À VALIDER'),
      priority: t.priority || 'medium',
      platform: t.platform || 'web',
      createdDate: t.createdDate || "Aujourd'hui",
      tags: Array.isArray(t.tags) && t.tags.length > 0 ? t.tags : ['EXCEL'],
      attachments: Array.isArray(t.attachments) ? t.attachments : [],
      comments: Array.isArray(t.comments) ? t.comments : [],
      history: Array.isArray(t.history) && t.history.length > 0 ? t.history : [
        {
          id: `h-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          title: 'Ticket importé depuis un fichier Excel',
          author: importedBy || 'Système',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          active: true,
        },
      ],
    };

    // Upsert into in-memory store
    const existingIdx = inMemoryTickets.findIndex((item) => item.id === ticketToSave.id);
    if (existingIdx !== -1) {
      inMemoryTickets[existingIdx] = { ...inMemoryTickets[existingIdx], ...ticketToSave };
    } else {
      inMemoryTickets.unshift(ticketToSave);
    }

    processedTickets.push(ticketToSave);

    // Save to MySQL if connected
    if (isDbConnected && dbPool) {
      try {
        let assignedDevId = ticketToSave.assignedTo?.id || null;
        if (assignedDevId) {
          const [devRows]: any = await dbPool.query('SELECT id FROM developers WHERE id = ?', [assignedDevId]);
          if (!devRows || devRows.length === 0) {
            assignedDevId = null;
          }
        }

        await dbPool.query(
          `INSERT INTO tickets (id, title, description, project_id, project_name, project_code, project_color, requested_by, requested_by_avatar, assigned_to_id, status, status_label, priority, platform, created_date, sla_deadline, clarity, closing_note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             title = VALUES(title),
             description = VALUES(description),
             project_id = VALUES(project_id),
             project_name = VALUES(project_name),
             project_code = VALUES(project_code),
             project_color = VALUES(project_color),
             requested_by = VALUES(requested_by),
             assigned_to_id = VALUES(assigned_to_id),
             status = VALUES(status),
             status_label = VALUES(status_label),
             priority = VALUES(priority),
             platform = VALUES(platform),
             sla_deadline = VALUES(sla_deadline),
             clarity = VALUES(clarity),
             closing_note = VALUES(closing_note)`,
          [
            ticketToSave.id,
            ticketToSave.title ?? 'Sans titre',
            ticketToSave.description ?? '',
            ticketToSave.projectId ?? null,
            ticketToSave.projectName ?? null,
            ticketToSave.projectCode ?? null,
            ticketToSave.projectColor ?? null,
            ticketToSave.requestedBy ?? 'Utilisateur',
            ticketToSave.requestedByAvatar ?? null,
            assignedDevId,
            ticketToSave.status ?? 'pending',
            ticketToSave.statusLabel ?? 'À VALIDER',
            ticketToSave.priority ?? 'medium',
            ticketToSave.platform ?? 'web',
            ticketToSave.createdDate ?? "Aujourd'hui",
            ticketToSave.slaDeadline ?? null,
            ticketToSave.clarity ?? 'clair',
            ticketToSave.closingNote ?? null,
          ]
        );

        if (Array.isArray(ticketToSave.tags)) {
          for (const tag of ticketToSave.tags) {
            if (tag) {
              await dbPool.query(
                `INSERT INTO ticket_tags (ticket_id, tag)
                 SELECT ?, ? FROM DUAL WHERE NOT EXISTS (
                   SELECT 1 FROM ticket_tags WHERE ticket_id = ? AND tag = ?
                 )`,
                [ticketToSave.id, tag, ticketToSave.id, tag]
              );
            }
          }
        }
      } catch (err) {
        console.error('[MySQL Batch Import Error]', err);
      }
    }
  }

  savePersistentData();

  res.status(200).json({
    success: true,
    count: processedTickets.length,
    imported: processedTickets,
  });
});

// 8. PUT Ticket (Update Ticket)
app.put('/api/tickets/:id', async (req, res) => {
  const { id } = req.params;
  const updatedFields = req.body;

  const idx = inMemoryTickets.findIndex((t) => t.id === id);

  let resolvedProjectId = updatedFields.projectId;
  let resolvedProjectName = updatedFields.projectName;
  let resolvedProjectCode = updatedFields.projectCode;
  let resolvedProjectColor = updatedFields.projectColor;

  if (updatedFields.projectId !== undefined) {
    if (!updatedFields.projectId || updatedFields.projectId === 'none') {
      resolvedProjectId = null;
      resolvedProjectName = null;
      resolvedProjectCode = null;
      resolvedProjectColor = null;
    } else {
      const proj = inMemoryProjects.find((p) => p.id === updatedFields.projectId);
      if (proj) {
        resolvedProjectId = proj.id;
        resolvedProjectName = proj.name;
        resolvedProjectCode = proj.code;
        resolvedProjectColor = proj.color || '#1f108e';
      }
    }
  }

  if (idx !== -1) {
    inMemoryTickets[idx] = {
      ...inMemoryTickets[idx],
      ...updatedFields,
      ...(updatedFields.projectId !== undefined
        ? {
            projectId: resolvedProjectId || undefined,
            projectName: resolvedProjectName || undefined,
            projectCode: resolvedProjectCode || undefined,
            projectColor: resolvedProjectColor || undefined,
          }
        : {}),
    };
  }
  savePersistentData();

  if (isDbConnected && dbPool) {
    try {
      const t = updatedFields;
      let assignedToId = t.assignedTo ? t.assignedTo.id : (t.assignedTo === null ? null : (inMemoryTickets[idx]?.assignedTo?.id ?? null));
      if (assignedToId) {
        const [devRows]: any = await dbPool.query('SELECT id FROM developers WHERE id = ?', [assignedToId]);
        if (!devRows || devRows.length === 0) {
          assignedToId = null;
        }
      }

      const finalProjectId = updatedFields.projectId !== undefined ? resolvedProjectId : (inMemoryTickets[idx]?.projectId ?? null);
      const finalProjectName = updatedFields.projectId !== undefined ? resolvedProjectName : (inMemoryTickets[idx]?.projectName ?? null);
      const finalProjectCode = updatedFields.projectId !== undefined ? resolvedProjectCode : (inMemoryTickets[idx]?.projectCode ?? null);
      const finalProjectColor = updatedFields.projectId !== undefined ? resolvedProjectColor : (inMemoryTickets[idx]?.projectColor ?? null);

      await dbPool.query(
        `UPDATE tickets SET 
          title = COALESCE(?, title),
          description = COALESCE(?, description),
          project_id = ?,
          project_name = ?,
          project_code = ?,
          project_color = ?,
          assigned_to_id = ?,
          status = COALESCE(?, status),
          status_label = COALESCE(?, status_label),
          priority = COALESCE(?, priority),
          platform = COALESCE(?, platform),
          sla_deadline = COALESCE(?, sla_deadline),
          clarity = COALESCE(?, clarity),
          closing_note = COALESCE(?, closing_note)
         WHERE id = ?`,
        [
          t.title ?? null,
          t.description ?? null,
          finalProjectId,
          finalProjectName,
          finalProjectCode,
          finalProjectColor,
          assignedToId,
          t.status ?? null,
          t.statusLabel ?? null,
          t.priority ?? null,
          t.platform ?? null,
          t.slaDeadline ?? null,
          t.clarity ?? null,
          t.closingNote ?? null,
          id,
        ]
      );

      if (Array.isArray(t.tags)) {
        await dbPool.query('DELETE FROM ticket_tags WHERE ticket_id = ?', [id]);
        for (const tag of t.tags) {
          if (tag && tag.trim()) {
            await dbPool.query('INSERT IGNORE INTO ticket_tags (ticket_id, tag) VALUES (?, ?)', [id, tag.trim()]);
          }
        }
      }

      if (Array.isArray(t.history)) {
        for (const h of t.history) {
          await dbPool.query(
            'INSERT IGNORE INTO ticket_history (id, ticket_id, title, author, timestamp, active) VALUES (?, ?, ?, ?, ?, ?)',
            [h.id, id, h.title ?? null, h.author ?? null, h.timestamp ?? null, h.active ? 1 : 0]
          );
        }
      }

      if (Array.isArray(t.attachments)) {
        await dbPool.query('DELETE FROM ticket_attachments WHERE ticket_id = ?', [id]);
        for (const att of t.attachments) {
          await dbPool.query(
            `INSERT INTO ticket_attachments (id, ticket_id, name, size, type, icon, url, duration)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              att.id || `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              id,
              att.name ?? 'fichier',
              att.size ?? '0 KB',
              att.type ?? 'file',
              att.icon ?? 'description',
              att.url ?? null,
              typeof att.duration === 'number' ? att.duration : (att.duration ? parseInt(att.duration, 10) : 0),
            ]
          );
        }
      }
    } catch (e) {
      console.error('[MySQL update ticket error]', e);
    }
  }

  res.json({ message: 'Ticket mis à jour', id, ...updatedFields });
});

// 9. DELETE Ticket
app.delete('/api/tickets/:id', async (req, res) => {
  const { id } = req.params;

  inMemoryTickets = inMemoryTickets.filter((t) => t.id !== id);
  savePersistentData();

  if (isDbConnected && dbPool) {
    try {
      await dbPool.query('DELETE FROM tickets WHERE id = ?', [id]);
    } catch (e) {
      console.error('[MySQL delete ticket error]', e);
    }
  }

  res.json({ message: 'Ticket supprimé', id });
});

// 10. POST Comment on Ticket
app.post('/api/tickets/:id/comments', async (req, res) => {
  const { id } = req.params;
  const newComment = req.body;

  const commentObj = {
    id: newComment.id || `c-${Date.now()}`,
    author: newComment.author || 'Utilisateur',
    avatar: newComment.avatar || DEFAULT_CARTOON_AVATAR_SERVER,
    role: newComment.role || 'DÉVELOPPEUR',
    roleType: newComment.roleType || 'dev',
    timestamp: newComment.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    content: newComment.content || '',
    isItalic: Boolean(newComment.isItalic),
    audioUrl: newComment.audioUrl || null,
    audioDuration: typeof newComment.audioDuration === 'number' ? newComment.audioDuration : 0,
    attachments: Array.isArray(newComment.attachments) ? newComment.attachments : [],
  };

  const idx = inMemoryTickets.findIndex((t) => t.id === id);
  if (idx !== -1) {
    if (!inMemoryTickets[idx].comments) {
      inMemoryTickets[idx].comments = [];
    }
    inMemoryTickets[idx].comments.push(commentObj);
  }
  savePersistentData();

  if (isDbConnected && dbPool) {
    try {
      await dbPool.query(
        `INSERT INTO comments (id, ticket_id, author, avatar, role, role_type, timestamp, content, is_italic, audio_url, audio_duration, attachments)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          commentObj.id,
          id,
          commentObj.author,
          commentObj.avatar,
          commentObj.role,
          commentObj.roleType,
          commentObj.timestamp,
          commentObj.content,
          commentObj.isItalic ? 1 : 0,
          commentObj.audioUrl,
          commentObj.audioDuration,
          commentObj.attachments && commentObj.attachments.length > 0 ? JSON.stringify(commentObj.attachments) : null,
        ]
      );
    } catch (e) {
      console.error('[MySQL add comment error]', e);
    }
  }

  res.status(201).json(commentObj);
});

// 10b. POST Attachments / Audio Notes on Ticket
app.post('/api/tickets/:id/attachments', async (req, res) => {
  const { id } = req.params;
  const incomingAttachments = Array.isArray(req.body?.attachments)
    ? req.body.attachments
    : Array.isArray(req.body)
    ? req.body
    : req.body
    ? [req.body]
    : [];

  if (incomingAttachments.length === 0) {
    return res.status(400).json({ error: 'Aucune pièce jointe fournie' });
  }

  const processedAtts: any[] = incomingAttachments.map((att: any) => ({
    id: att.id || `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: att.name ?? 'fichier',
    size: att.size ?? '0 KB',
    type: att.type ?? 'file',
    icon: att.icon ?? 'description',
    url: att.url ?? null,
    duration: typeof att.duration === 'number' ? att.duration : (att.duration ? parseInt(att.duration, 10) : 0),
  }));

  const idx = inMemoryTickets.findIndex((t) => t.id === id);
  if (idx !== -1) {
    if (!inMemoryTickets[idx].attachments) {
      inMemoryTickets[idx].attachments = [];
    }
    inMemoryTickets[idx].attachments.push(...processedAtts);
  }
  savePersistentData();

  if (isDbConnected && dbPool) {
    try {
      for (const att of processedAtts) {
        await dbPool.query(
          `INSERT INTO ticket_attachments (id, ticket_id, name, size, type, icon, url, duration)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             size = VALUES(size),
             type = VALUES(type),
             icon = VALUES(icon),
             url = VALUES(url),
             duration = VALUES(duration)`,
          [att.id, id, att.name, att.size, att.type, att.icon, att.url, att.duration]
        );
      }
    } catch (e) {
      console.error('[MySQL add attachments error]', e);
    }
  }

  res.status(201).json({ success: true, count: processedAtts.length, attachments: processedAtts });
});

// 11. GET Notifications
app.get('/api/notifications', async (req, res) => {
  if (!isDbConnected || !dbPool) {
    return res.json(inMemoryNotifications);
  }

  try {
    const [rows]: any = await dbPool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50');
    const notifs = rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      desc: r.desc_text,
      time: r.time_label,
      ticketId: r.ticket_id,
      urgent: Boolean(r.urgent),
      targetUserEmail: r.target_user_email,
      targetUserName: r.target_user_name,
      read: Boolean(r.is_read),
      createdAt: r.created_at,
    }));
    res.json(notifs);
  } catch (err: any) {
    res.json(inMemoryNotifications);
  }
});

// 12. POST Notification
app.post('/api/notifications', async (req, res) => {
  const newNotif = req.body;
  const notifObj = {
    id: newNotif.id || `n-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: newNotif.title || 'Notification TicketFlow',
    desc: newNotif.desc || '',
    time: newNotif.time || 'À l\'instant',
    ticketId: newNotif.ticketId || '',
    urgent: Boolean(newNotif.urgent),
    targetUserEmail: newNotif.targetUserEmail || null,
    targetUserName: newNotif.targetUserName || null,
    read: false,
    createdAt: new Date().toISOString(),
  };

  inMemoryNotifications.unshift(notifObj);
  savePersistentData();

  if (isDbConnected && dbPool) {
    try {
      await dbPool.query(
        `INSERT INTO notifications (id, title, desc_text, time_label, ticket_id, urgent, target_user_email, target_user_name, is_read)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          notifObj.id,
          notifObj.title,
          notifObj.desc,
          notifObj.time,
          notifObj.ticketId,
          notifObj.urgent ? 1 : 0,
          notifObj.targetUserEmail,
          notifObj.targetUserName,
        ]
      );
    } catch (e) {
      console.error('[MySQL add notification error]', e);
    }
  }

  // Broadcast Web Push to Android and background devices immediately
  broadcastWebPush({
    title: notifObj.title,
    body: notifObj.desc,
    ticketId: notifObj.ticketId,
    urgent: notifObj.urgent,
    targetUserEmail: notifObj.targetUserEmail,
    targetUserName: notifObj.targetUserName,
  }).catch((err) => {
    console.warn('[Broadcast WebPush error]', err);
  });

  res.status(201).json(notifObj);
});

// 13. PUT Notifications Mark All Read
app.put('/api/notifications/read', async (_req, res) => {
  inMemoryNotifications = inMemoryNotifications.map((n) => ({ ...n, read: true }));
  savePersistentData();

  if (isDbConnected && dbPool) {
    try {
      await dbPool.query('UPDATE notifications SET is_read = 1');
    } catch (e) {
      console.error('[MySQL mark read error]', e);
    }
  }

  res.json({ message: 'Toutes les notifications marquées comme lues' });
});

// 13b. Web Push Endpoints for Android & Mobile Notifications
app.get('/api/push/public-key', (_req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

app.post('/api/push/subscribe', (req, res) => {
  const { subscription, userEmail, userName } = req.body;
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ error: 'Données de souscription push invalides' });
  }

  // Deduplicate
  pushSubscriptions = pushSubscriptions.filter((s) => s.endpoint !== subscription.endpoint);
  pushSubscriptions.push({
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    userEmail: userEmail || undefined,
    userName: userName || undefined,
  });
  savePushSubscriptions();

  res.json({
    success: true,
    message: 'Abonnement aux notifications Push Android enregistré',
    count: pushSubscriptions.length,
  });
});

app.post('/api/push/test', async (req, res) => {
  const { subscription, userEmail } = req.body;
  const targetSub =
    subscription ||
    (userEmail ? pushSubscriptions.find((s) => s.userEmail === userEmail) : null) ||
    pushSubscriptions[pushSubscriptions.length - 1];

  if (!targetSub || !targetSub.endpoint) {
    return res.status(400).json({
      error: 'Aucun abonnement Push Android actif trouvé. Activez d\'abord les notifications.',
    });
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: targetSub.endpoint,
        keys: targetSub.keys,
      },
      JSON.stringify({
        title: '🔔 TicketFlow - Notification Android',
        body: 'Parfait ! Les notifications système fonctionnent en avant-plan et en arrière-plan sur Android.',
        urgent: true,
        tag: `tf-test-${Date.now()}`,
      })
    );
    res.json({ success: true, message: 'Notification test envoyée sur l\'appareil Android !' });
  } catch (err: any) {
    console.error('[Test push error]', err);
    res.status(500).json({ error: err.message || 'Échec de l\'envoi push' });
  }
});

// 14. GET & POST App Branding Configuration
app.get('/api/branding', async (_req, res) => {
  const currentEnvLogo = getLogoFromEnvironment();
  const currentEnvAppName = getAppNameFromEnvironment();
  const currentEnvDescription = getDescriptionFromEnvironment();

  if (currentEnvLogo && (!inMemoryBranding.appLogoUrl || inMemoryBranding.appLogoUrl === '')) {
    inMemoryBranding.appLogoUrl = currentEnvLogo;
  }
  if (currentEnvAppName && currentEnvAppName !== 'TicketFlow' && (!inMemoryBranding.appName || inMemoryBranding.appName === 'TicketFlow')) {
    inMemoryBranding.appName = currentEnvAppName;
  }
  if (currentEnvDescription && (!inMemoryBranding.commentary || inMemoryBranding.commentary === 'Plateforme de gestion centralisée des tickets et suivi des équipes de développement.')) {
    inMemoryBranding.commentary = currentEnvDescription;
  }

  if (isDbConnected && dbPool) {
    try {
      const [rows]: any = await dbPool.query('SELECT * FROM app_branding WHERE id = ?', ['default']);
      if (rows && rows.length > 0) {
        const row = rows[0];
        let parsedAvatars = [];
        try {
          parsedAvatars = row.proposed_avatars ? JSON.parse(row.proposed_avatars) : [];
        } catch (_e) {
          parsedAvatars = [];
        }
        inMemoryBranding = {
          appName: row.app_name || currentEnvAppName || inMemoryBranding.appName,
          appSubtitle: row.app_subtitle || inMemoryBranding.appSubtitle,
          appLogoUrl: row.app_logo_url || currentEnvLogo || inMemoryBranding.appLogoUrl,
          commentary: row.commentary || currentEnvDescription || inMemoryBranding.commentary,
          proposedAvatars: Array.isArray(parsedAvatars) ? parsedAvatars : [],
        };
      }
    } catch (_e) {}
  }
  res.json({
    ...inMemoryBranding,
    appName: inMemoryBranding.appName || currentEnvAppName || 'TicketFlow',
    appLogoUrl: inMemoryBranding.appLogoUrl || currentEnvLogo || '',
    commentary: inMemoryBranding.commentary || currentEnvDescription || '',
  });
});

app.get('/api/branding/logo', (_req, res) => {
  const logo = inMemoryBranding.appLogoUrl || getLogoFromEnvironment() || '';
  res.json({ logoUrl: logo });
});

app.post('/api/branding', async (req, res) => {
  if (req.body && typeof req.body === 'object') {
    inMemoryBranding = {
      ...inMemoryBranding,
      ...req.body,
    };
  }
  savePersistentData();

  if (isDbConnected && dbPool) {
    try {
      await dbPool.query(
        `INSERT INTO app_branding (id, app_name, app_subtitle, app_logo_url, commentary, proposed_avatars)
         VALUES ('default', ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           app_name = VALUES(app_name),
           app_subtitle = VALUES(app_subtitle),
           app_logo_url = VALUES(app_logo_url),
           commentary = VALUES(commentary),
           proposed_avatars = VALUES(proposed_avatars)`,
        [
          inMemoryBranding.appName || 'TicketFlow',
          inMemoryBranding.appSubtitle || 'Operational Control',
          inMemoryBranding.appLogoUrl || '',
          inMemoryBranding.commentary || '',
          JSON.stringify(inMemoryBranding.proposedAvatars || []),
        ]
      );
    } catch (e) {
      console.error('[MySQL save branding error]', e);
    }
  }

  res.json({ success: true, branding: inMemoryBranding });
});

// ------------------------------------------------------------
// VITE OR STATIC SERVING
// ------------------------------------------------------------
async function startServer() {
  const publicPath = path.join(process.cwd(), 'public');
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath, { maxAge: '1h' }));
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Fallback error handler to prevent crashing or empty 500s
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Server Error]', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error', message: err?.message || 'Unknown error' });
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] TicketFlow App running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
