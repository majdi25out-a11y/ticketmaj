# Guide d'Hébergement TicketFlow sur VPS avec MySQL

Ce document explique pas à pas comment déployer l'application TicketFlow avec sa base de données **MySQL** sur votre propre serveur VPS (Ubuntu, Debian, etc.).

---

## 🛠️ Prérequis sur le VPS

1. Un VPS sous Ubuntu 22.04 / 24.04 LTS (ou Debian/CentOS)
2. **Node.js** (v18+ ou v20+) et **npm**
3. **MySQL Server** (v8.0+) ou **MariaDB**
4. **PM2** (Gestionnaire de processus Node.js)
5. **Nginx** (Reverse Proxy HTTP/HTTPS)

---

## 1. Installation de MySQL et création de la base de données

Sur votre VPS, installez MySQL :

```bash
sudo apt update
sudo apt install mysql-server -y
sudo mysql_secure_installation
```

Connectez-vous à MySQL en administrateur :

```bash
sudo mysql -u root -p
```

Exécutez les commandes suivantes pour créer l'utilisateur et la base de données :

```sql
CREATE DATABASE ticketflow_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ticketflow_user'@'localhost' IDENTIFIED BY 'votre_mot_de_passe_securise';
GRANT ALL PRIVILEGES ON ticketflow_db.* TO 'ticketflow_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 2. Importation du Schéma SQL (`schema.sql`)

Transférez le fichier `schema.sql` présent à la racine du projet sur votre VPS, puis importez-le :

```bash
mysql -u ticketflow_user -p ticketflow_db < schema.sql
```

Vous pouvez vérifier que les tables et les données initiales sont bien créées :

```bash
mysql -u ticketflow_user -p -e "USE ticketflow_db; SHOW TABLES; SELECT * FROM developers;"
```

---

## 3. Configuration des Variables d'Environnement (`.env`)

À la racine du projet sur votre VPS, créez un fichier `.env` :

```bash
nano .env
```

Renseignez les accès MySQL :

```env
NODE_ENV=production
PORT=3000

# Configuration MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=ticketflow_user
DB_PASSWORD=votre_mot_de_passe_securise
DB_NAME=ticketflow_db
```

---

## 4. Compilation et Démarrage du Serveur

Installez les dépendances et lancez le build de production :

```bash
npm install
npm run build
```

Lancez l'application avec **PM2** pour qu'elle tourne en arrière-plan et redémarre automatiquement en cas de reboot du serveur :

```bash
sudo npm install -g pm2
pm2 start dist/server.cjs --name ticketflow
pm2 save
pm2 startup
```

---

## 5. Configuration Nginx (Reverse Proxy & Domaine/SSL)

Installez Nginx :

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

Créez le fichier de configuration Nginx :

```bash
sudo nano /etc/nginx/sites-available/ticketflow
```

Collez la configuration suivante (remplacez `votre-domaine.com` par votre IP ou votre nom de domaine) :

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

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

Activez le site et redémarrez Nginx :

```bash
sudo ln -s /etc/nginx/sites-available/ticketflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

*(Optionnel) Activer le SSL gratuit avec Let's Encrypt :*

```bash
sudo certbot --nginx -d votre-domaine.com
```

---

## 🐳 Option Alternative : Déploiement via Docker Compose

Un fichier `docker-compose.yml` est également fourni à la racine de l'application si vous préférez utiliser Docker.

Pour lancer toute la stack (MySQL + Application Express) en une seule commande :

```bash
docker-compose up -d --build
```

---

## ✅ Test & Vérification

Rendez-vous sur `http://votre-domaine.com/api/db-status` pour vérifier le statut du raccordement MySQL :

```json
{
  "connected": true,
  "message": "Base de données MySQL active et opérationnelle.",
  "stats": {
    "developersCount": 4,
    "ticketsCount": 4
  }
}
```
