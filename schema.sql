-- ============================================================
-- TicketFlow MySQL Database Schema for VPS Deployment
-- Compatible with MySQL 8.0+ and MariaDB 10.5+
-- ============================================================

CREATE DATABASE IF NOT EXISTS `ticketflow_db` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `ticketflow_db`;

-- ------------------------------------------------------------
-- Table: developers
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `developer_skills`;
DROP TABLE IF EXISTS `ticket_history`;
DROP TABLE IF EXISTS `ticket_attachments`;
DROP TABLE IF EXISTS `ticket_tags`;
DROP TABLE IF EXISTS `comments`;
DROP TABLE IF EXISTS `tickets`;
DROP TABLE IF EXISTS `developers`;

CREATE TABLE `developers` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `email` VARCHAR(191) UNIQUE NULL,
  `role` VARCHAR(128) NOT NULL,
  `avatar` VARCHAR(512) NOT NULL,
  `tag_color` VARCHAR(64) DEFAULT 'bg-indigo-100 text-indigo-800',
  `password` VARCHAR(255) DEFAULT 'Password123!',
  `active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: developer_skills
-- ------------------------------------------------------------
CREATE TABLE `developer_skills` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `developer_id` VARCHAR(64) NOT NULL,
  `skill` VARCHAR(64) NOT NULL,
  FOREIGN KEY (`developer_id`) REFERENCES `developers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: tickets
-- ------------------------------------------------------------
CREATE TABLE `tickets` (
  `id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `requested_by` VARCHAR(128) NOT NULL,
  `requested_by_avatar` VARCHAR(512) DEFAULT NULL,
  `assigned_to_id` VARCHAR(64) DEFAULT NULL,
  `status` ENUM('pending', 'in_progress', 'approved', 'rejected', 'completed') NOT NULL DEFAULT 'pending',
  `status_label` VARCHAR(64) NOT NULL DEFAULT 'En attente',
  `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  `platform` ENUM('web', 'mobile') NOT NULL DEFAULT 'web',
  `created_date` VARCHAR(64) NOT NULL,
  `sla_deadline` VARCHAR(64) DEFAULT NULL,
  `clarity` ENUM('clair', 'clarifier') DEFAULT 'clair',
  `closing_note` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`assigned_to_id`) REFERENCES `developers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: ticket_tags
-- ------------------------------------------------------------
CREATE TABLE `ticket_tags` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ticket_id` VARCHAR(64) NOT NULL,
  `tag` VARCHAR(64) NOT NULL,
  FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: ticket_attachments
-- ------------------------------------------------------------
CREATE TABLE `ticket_attachments` (
  `id` VARCHAR(64) NOT NULL,
  `ticket_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `size` VARCHAR(32) NOT NULL,
  `type` VARCHAR(64) NOT NULL,
  `icon` VARCHAR(64) NOT NULL,
  `url` VARCHAR(512) DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: ticket_history
-- ------------------------------------------------------------
CREATE TABLE `ticket_history` (
  `id` VARCHAR(64) NOT NULL,
  `ticket_id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `author` VARCHAR(128) NOT NULL,
  `timestamp` VARCHAR(64) NOT NULL,
  `active` TINYINT(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: comments
-- ------------------------------------------------------------
CREATE TABLE `comments` (
  `id` VARCHAR(64) NOT NULL,
  `ticket_id` VARCHAR(64) NOT NULL,
  `author` VARCHAR(128) NOT NULL,
  `avatar` VARCHAR(512) NOT NULL,
  `role` VARCHAR(128) NOT NULL,
  `role_type` ENUM('admin', 'dev', 'manager', 'user') NOT NULL DEFAULT 'dev',
  `timestamp` VARCHAR(64) NOT NULL,
  `content` TEXT NOT NULL,
  `is_italic` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- SEED INITIAL DATA
-- ============================================================

INSERT INTO `developers` (`id`, `name`, `email`, `role`, `avatar`, `tag_color`, `password`, `active`) VALUES
('dev-1', 'Sarah Connor', 'sarah.connor@ticketflow.io', 'Lead Dev iOS & Frontend', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200', 'bg-emerald-100 text-emerald-800', 'Password123!', 1),
('dev-2', 'Alex Rivera', 'alex.rivera@ticketflow.io', 'Senior Fullstack Dev', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', 'bg-indigo-100 text-indigo-800', 'Password123!', 1),
('dev-3', 'Alexandre Dubois', 'alexandre.dubois@ticketflow.io', 'System Architect & Admin', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', 'bg-purple-100 text-purple-800', 'Password123!', 1),
('dev-4', 'Tom Baker', 'tom.baker@ticketflow.io', 'DevOps Specialist', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200', 'bg-blue-100 text-blue-800', 'Password123!', 1);

INSERT INTO `developer_skills` (`developer_id`, `skill`) VALUES
('dev-1', 'React'), ('dev-1', 'Swift'), ('dev-1', 'TypeScript'), ('dev-1', 'Tailwind'),
('dev-2', 'Node.js'), ('dev-2', 'React'), ('dev-2', 'GraphQL'), ('dev-2', 'PostgreSQL'),
('dev-3', 'Architecture'), ('dev-3', 'Security'), ('dev-3', 'Kubernetes'), ('dev-3', 'AWS'),
('dev-4', 'Docker'), ('dev-4', 'CI/CD'), ('dev-4', 'Terraform'), ('dev-4', 'Monitoring');

INSERT INTO `tickets` (`id`, `title`, `description`, `requested_by`, `requested_by_avatar`, `assigned_to_id`, `status`, `status_label`, `priority`, `platform`, `created_date`, `sla_deadline`, `clarity`) VALUES
('TK-8842', 'Bug Affichage Mode Sombre - Module Facturation', 'Les polices de caractères deviennent illisibles en arrière-plan sombre sur l\'écran d\'exportation PDF des factures. Il y a un problème de contraste WCAG.', 'Marc Dupont', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200', 'dev-1', 'in_progress', 'En cours', 'high', 'web', 'Aujourd\'hui, 14:32', '24h (Demain 14:30)', 'clair'),
('TK-8843', 'Crash Application Mobile lors du Scan QR', 'L\'application se ferme brusquement lorsque l\'utilisateur tente de scanner un badge d\'accès sans autorisation caméra au préalable.', 'Sophie Martin', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200', 'dev-1', 'pending', 'En attente', 'urgent', 'mobile', 'Aujourd\'hui, 11:15', '4h (Aujourd\'hui 15:15)', 'clarifier'),
('TK-8840', 'Lenteur API Synchronisation Contacts', 'Le temps de réponse dépasse 3.5s lors du chargement initial pour les comptes ayant plus de 5000 contacts enregistrés.', 'Thomas Bernard', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200', 'dev-2', 'completed', 'Clôturé', 'medium', 'web', 'Hier, 09:45', 'Terminé', 'clair'),
('TK-8839', 'Demande d\'export CSV Personnalisé', 'Ajouter une option pour exporter les métriques d\'activité hebdomadaires au format CSV encodé UTF-8.', 'Élodie Roux', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', 'dev-3', 'approved', 'Validé', 'low', 'web', '02/08/2026', '72h', 'clair');

INSERT INTO `ticket_tags` (`ticket_id`, `tag`) VALUES
('TK-8842', 'UI/UX'), ('TK-8842', 'Facturation'), ('TK-8842', 'Dark Mode'),
('TK-8843', 'Mobile'), ('TK-8843', 'iOS'), ('TK-8843', 'Crash'),
('TK-8840', 'API'), ('TK-8840', 'Performance'), ('TK-8840', 'Database'),
('TK-8839', 'Feature'), ('TK-8839', 'Export');

INSERT INTO `comments` (`id`, `ticket_id`, `author`, `avatar`, `role`, `role_type`, `timestamp`, `content`, `is_italic`) VALUES
('c-1', 'TK-8842', 'Alexandre Dubois', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', 'System Architect', 'admin', 'Hier, 16:45', 'Ticket assigné automatiquement au pôle Frontend. Sarah Connor a été notifiée.', 1),
('c-2', 'TK-8842', 'Sarah Connor', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200', 'Lead Dev Frontend', 'dev', 'Aujourd\'hui, 09:12', 'J\'ai reproduit l\'erreur sur Firefox et Chrome. Il s\'agit d\'une surcharge CSS non scopée dans le composant InvoiceExportModal.tsx.', 0),
('c-3', 'TK-8842', 'Marc Dupont', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200', 'Responsable Support', 'manager', 'Aujourd\'hui, 10:30', 'Merci Sarah ! On a 3 clients majeurs impactés par ce bug ce matin.', 0);

INSERT INTO `ticket_attachments` (`id`, `ticket_id`, `name`, `size`, `type`, `icon`, `url`) VALUES
('att-1', 'TK-8842', 'capture_ecran_bug.png', '1.2 MB', 'PNG', 'image', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=600'),
('att-2', 'TK-8842', 'console_logs_export.txt', '14 KB', 'TXT', 'description', '#');

INSERT INTO `ticket_history` (`id`, `ticket_id`, `title`, `author`, `timestamp`, `active`) VALUES
('h-1', 'TK-8842', 'Ticket créé par Marc Dupont', 'Marc Dupont', 'Aujourd\'hui, 14:32', 1),
('h-2', 'TK-8842', 'Assigné à Sarah Connor', 'Alexandre Dubois', 'Aujourd\'hui, 14:35', 1),
('h-3', 'TK-8842', 'Statut changé à "En cours"', 'Sarah Connor', 'Aujourd\'hui, 15:00', 1);
