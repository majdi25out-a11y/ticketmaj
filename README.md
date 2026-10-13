# 🎫 TicketFlow — Application de Gestion de Tickets & Développeurs

**TicketFlow** est une plateforme complète et moderne de gestion des demandes d'assistance technique, de tri de tickets et de gestion d'équipe de développeurs. Elle intègre un serveur full-stack Express / Node.js connecté à une base de données **MySQL** pour la persistance en production.

---

## 🛠️ Stack Technique

- **Frontend** : React 18, TypeScript, Vite, Tailwind CSS, Google Material Symbols
- **Backend API** : Node.js, Express, `mysql2`
- **Base de données** : MySQL 8.0+ / MariaDB 10.5+
- **Production & Déploiement** : Bundling `esbuild` (CommonJS), Docker, Nginx, PM2

---

## 📁 Structure Principale du Projet

```text
├── server.ts             # Serveur Express & API REST pour MySQL + Vite middleware
├── schema.sql            # Script d'initialisation de la BDD MySQL & données de démo
├── src/
│   ├── App.tsx           # Composant principal React & synchronisation API
│   ├── components/       # Interface utilisateur (Dashboard, Developpeurs, Tickets, etc.)
│   ├── data/             # Données de secours / Mock fallback
│   └── types.ts          # Interfaces TypeScript (Ticket, Developer, Comment, etc.)
├── .env.example          # Modèle de configuration des variables d'environnement
├── VPS_DEPLOYMENT.md     # Guide pas-à-pas détaillé pour le déploiement sur VPS
├── Dockerfile            # Multi-stage Docker build
└── docker-compose.yml    # Fichier d'orchestration Docker (MySQL + App Node.js)
```

---

## 🚀 1. Exécution en Mode Local (Développement)

Vous pouvez exécuter TicketFlow localement sur votre machine en quelques commandes.

### Prérequis
- **Node.js** v18+ ou v20+ et **npm**
- *(Optionnel)* Un serveur MySQL local (ou WampServer / XAMPP / Docker MySQL)

### Étape 1 : Cloner le projet & installer les dépendances
```bash
git clone <URL_DU_DEPOT>
cd ticketflow
npm install
```

### Étape 2 : Configurer les variables d'environnement
Copiez le fichier exemple `.env.example` vers un fichier `.env` :
```bash
cp .env.example .env
```

Si vous possédez MySQL en local, renseignez vos accès dans `.env` :
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=ticketflow_db
```

> 💡 **Note sur le mode Fallback :** Si MySQL n'est pas encore installé ou actif localement, le serveur Express fonctionnera automatiquement en **mode mémoire/fallback** sans planter. Dès qu'un serveur MySQL est joignable, la connexion BDD s'active automatiquement.

### Étape 3 : Initialiser la BDD localement (si MySQL est installé)
Importez le fichier `schema.sql` dans votre serveur MySQL local :
```bash
mysql -u root -p < schema.sql
```

### Étape 4 : Démarrer l'application
```bash
npm run dev
```
Ouvrez votre navigateur sur **`http://localhost:3000`**.

---

## 🌐 2. Déploiement sur un VPS (Production avec MySQL)

Deux méthodes sont disponibles pour déployer TicketFlow sur votre serveur VPS (Ubuntu / Debian) :

---

### 🔹 Méthode A : Déploiement Standard (Node.js + PM2 + MySQL + Nginx)

#### 1. Préparer le serveur VPS
Connectez-vous à votre VPS en SSH et installez les prérequis :
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install mysql-server nginx certbot python3-certbot-nginx -y
```

Installez Node.js 20 LTS :
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

#### 2. Configurer la base de données MySQL
Connectez-vous à MySQL :
```bash
sudo mysql -u root -p
```
Créez la base de données et l'utilisateur :
```sql
CREATE DATABASE ticketflow_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ticketflow_user'@'localhost' IDENTIFIED BY 'votre_mot_de_passe_securise';
GRANT ALL PRIVILEGES ON ticketflow_db.* TO 'ticketflow_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Importez la structure et les données depuis `schema.sql` :
```bash
mysql -u ticketflow_user -p ticketflow_db < schema.sql
```

#### 3. Cloner et builder le projet
```bash
git clone <URL_DU_DEPOT> /var/www/ticketflow
cd /var/www/ticketflow
npm install
```

Créez le fichier `.env` sur le VPS :
```env
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=ticketflow_user
DB_PASSWORD=votre_mot_de_passe_securise
DB_NAME=ticketflow_db
```

Générez le bundle de production :
```bash
npm run build
```

#### 4. Lancer l'application avec PM2
```bash
sudo npm install -g pm2
pm2 start dist/server.cjs --name ticketflow
pm2 save
pm2 startup
```

#### 5. Configurer Nginx en Reverse Proxy
Créez un fichier de site Nginx :
```bash
sudo nano /etc/nginx/sites-available/ticketflow
```

Ajoutez la configuration :
```nginx
server {
    listen 80;
    server_name votre-domaine.com; # Ou votre IP publique

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Activez le site et relancez Nginx :
```bash
sudo ln -s /etc/nginx/sites-available/ticketflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

*(Optionnel - HTTPS Let's Encrypt)* :
```bash
sudo certbot --nginx -d votre-domaine.com
```

---

### 🐳 Méthode B : Déploiement Rapide avec Docker Compose

Si Docker et Docker Compose sont installés sur votre VPS, vous pouvez démarrer l'ensemble de la stack (MySQL + Application Express) en une seule ligne :

```bash
docker-compose up -d --build
```

Cette commande va :
1. Télécharger l'image MySQL 8.0.
2. Exécuter le script `schema.sql` à la première initialisation.
3. Builder le conteneur Node.js de production.
4. Lier l'application à la base de données de manière sécurisée.

---

## 📡 Endpoints API REST de la plateforme

- `GET /api/health` : État de santé du serveur
- `GET /api/db-status` : Statut de la connexion MySQL et métriques
- `GET /api/developers` : Obtenir la liste des développeurs et compétences
- `POST /api/developers` : Ajouter un nouveau développeur
- `PUT /api/developers/:id` : Modifier un développeur ou réinitialiser son mot de passe
- `DELETE /api/developers/:id` : Supprimer un développeur avec réassignation des tickets
- `GET /api/tickets` : Obtenir la liste complète des tickets avec historique et commentaires

---

## 📄 Licence
Apache-2.0
