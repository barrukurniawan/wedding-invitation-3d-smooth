# Implementation Plan: MySQL + Express API + Ubuntu VPS Deployment

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  VPS Ubuntu                                      │
│                                                  │
│  ┌──────────┐    ┌──────────┐    ┌───────────┐   │
│  │  Nginx   │───▶│ Express  │───▶│  MySQL    │   │
│  │  :80/:443│    │  :3001   │    │  :3306    │   │
│  └────┬─────┘    └──────────┘    └───────────┘   │
│       │                                          │
│       │ serve static                             │
│       ▼                                          │
│  /var/www/wedding-summer/build/                   │
└─────────────────────────────────────────────────┘

Local Dev:
  Frontend (Vite :5173) → localStorage (no backend needed)
  Atau Frontend → Express (:3001) → MySQL (local)
```

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | SvelteKit + adapter-static (existing) | Tidak berubah, tetap SPA |
| API Server | Express.js + mysql2 | Ringan, simple, Node.js |
| Database | MySQL 8.0 | VPS own, full control |
| Process Manager | PM2 | Auto-restart, logs, monitoring |
| Web Server | Nginx | Serve static + reverse proxy API |
| HTTPS | Let's Encrypt (certbot) | Free SSL |

---

## File Structure (baru)

```
wedding-summer/
├── server/                         # Express API server (BARU)
│   ├── index.js                    # Entry point
│   ├── db.js                       # MySQL connection pool
│   ├── routes/
│   │   ├── guestbook.js            # GET/POST/DELETE /api/guestbook
│   │   └── config.js               # GET/PUT /api/config
│   ├── .env.example                # Template env vars
│   └── package.json                # Server dependencies
├── database/
│   └── schema.sql                  # MySQL schema (BARU)
├── src/                            # Frontend (existing, minimal changes)
│   └── lib/
│       └── api-client.ts           # API client (BARU, ganti supabase.ts)
├── deploy/
│   ├── nginx.conf                  # Nginx config
│   ├── ecosystem.config.cjs        # PM2 config
│   └── deploy.sh                   # Deployment script
├── .env.example                    # Frontend env template
└── package.json                    # Frontend (existing)
```

---

## Step 1: MySQL Schema (`database/schema.sql`)

```sql
CREATE DATABASE IF NOT EXISTS wedding_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE wedding_db;

CREATE TABLE IF NOT EXISTS wedding_config (
  id INT PRIMARY KEY DEFAULT 1,
  bride_name VARCHAR(255) NOT NULL DEFAULT 'Kia Anindya',
  groom_name VARCHAR(255) NOT NULL DEFAULT 'Toni Pratama',
  bride_parents VARCHAR(255) NOT NULL DEFAULT 'Bpk. ... & Ibu. ...',
  groom_parents VARCHAR(255) NOT NULL DEFAULT 'Bpk. ... & Ibu. ...',
  bride_photo TEXT NOT NULL DEFAULT '',
  groom_photo TEXT NOT NULL DEFAULT '',
  wedding_date DATETIME NOT NULL DEFAULT '2026-07-15 08:00:00',
  akad_date VARCHAR(255) NOT NULL DEFAULT 'Rabu, 15 Juli 2026',
  akad_time VARCHAR(255) NOT NULL DEFAULT '08:00 — 10:00 WIB',
  akad_location VARCHAR(255) NOT NULL DEFAULT 'Kediaman Mempelai Wanita',
  resepsi_date VARCHAR(255) NOT NULL DEFAULT 'Rabu, 15 Juli 2026',
  resepsi_time VARCHAR(255) NOT NULL DEFAULT '11:00 — 14:00 WIB',
  resepsi_location VARCHAR(255) NOT NULL DEFAULT 'Gedung Serbaguna',
  qris_image TEXT NOT NULL DEFAULT '',
  bank_name VARCHAR(100) NOT NULL DEFAULT 'BCA',
  bank_account VARCHAR(100) NOT NULL DEFAULT '1234567890',
  bank_holder VARCHAR(255) NOT NULL DEFAULT 'Toni Pratama',
  maps_url TEXT NOT NULL DEFAULT '',
  venue_address TEXT NOT NULL DEFAULT '',
  gallery_photos JSON NOT NULL DEFAULT (JSON_ARRAY()),
  quote TEXT DEFAULT '',
  admin_password VARCHAR(255) NOT NULL DEFAULT 'admin123',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO wedding_config (id) VALUES (1)
  ON DUPLICATE KEY UPDATE id = 1;

CREATE TABLE IF NOT EXISTS guestbook (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  attendance ENUM('Hadir','Ragu-ragu','Tidak Hadir') NOT NULL DEFAULT 'Hadir',
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_guestbook_created_at ON guestbook (created_at DESC);
```

## Step 2: Express API Server (`server/`)

### `server/package.json`
Dependencies: express, mysql2, cors, dotenv, uuid

### `server/index.js`
- Express app, CORS, JSON body parser
- Mount routes: `/api/guestbook`, `/api/config`
- Health check: `GET /api/health`
- Listen on `PORT` (default 3001)

### `server/db.js`
- MySQL connection pool (mysql2/promise)
- Config from env: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

### `server/routes/config.js`
- `GET /api/config` → fetch row id=1, parse gallery_photos JSON
- `PUT /api/config` → update row id=1, stringify gallery_photos
- Simple password check via `X-Admin-Password` header

### `server/routes/guestbook.js`
- `GET /api/guestbook` → list all, order by created_at DESC
- `POST /api/guestbook` → insert new entry (generate UUID)
- `DELETE /api/guestbook/:id` → delete by id (admin password)

## Step 3: Frontend Changes

### `src/lib/api-client.ts` (ganti `supabase.ts`)
- Deteksi `API_URL` dari env var `VITE_API_URL`
- Jika kosong → pakai localStorage (local dev, no backend)
- Jika ada → pakai fetch() ke Express API

### `src/lib/services/config.ts` (update)
- `getConfig()` → if API_URL: `GET /api/config`, else localStorage
- `updateConfig()` → if API_URL: `PUT /api/config`, else localStorage

### `src/lib/services/api.ts` (update)
- `submitGuestbook()` → if API_URL: `POST /api/guestbook`, else localStorage
- `getGuestbookEntries()` → if API_URL: `GET /api/guestbook`, else localStorage
- `deleteGuestbookEntry()` → if API_URL: `DELETE /api/guestbook/:id`, else localStorage

### Remove Supabase
- Hapus `src/lib/supabase.ts`
- Hapus dependency `@supabase/supabase-js` dari package.json
- Update semua import dari `supabase` ke `api-client`

## Step 4: Deployment Config

### `deploy/nginx.conf`
- Serve static dari `/var/www/wedding-summer/build`
- Reverse proxy `/api/*` → `http://localhost:3001`
- gzip, cache headers, SPA fallback

### `deploy/ecosystem.config.cjs`
- PM2 config untuk Express server
- Auto-restart, max memory, logs

### `deploy/deploy.sh`
```bash
#!/bin/bash
# 1. Build frontend
# 2. Copy build/ ke VPS
# 3. Copy server/ ke VPS
# 4. npm install di server/
# 5. pm2 restart
# 6. nginx reload
```

## Step 5: VPS Setup Guide

### Prerequisites di VPS:
```bash
sudo apt update
sudo apt install -y mysql-server nginx nodejs npm
sudo npm install -g pm2
```

### MySQL setup:
```bash
sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'YOUR_PASSWORD';"
sudo mysql -e "CREATE DATABASE wedding_db;"
sudo mysql -e "CREATE USER 'wedding'@'localhost' IDENTIFIED BY 'wedding_pass_2024';"
sudo mysql -e "GRANT ALL ON wedding_db.* TO 'wedding'@'localhost';"
sudo mysql wedding_db < database/schema.sql
```

### Deploy:
```bash
# Di VPS
git clone <repo> /var/www/wedding-summer
cd /var/www/wedding-summer

# Frontend
npm install && npm run build

# API server
cd server && npm install
cp .env.example .env  # edit config
pm2 start ../deploy/ecosystem.config.cjs
pm2 save && pm2 startup

# Nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/wedding
sudo ln -s /etc/nginx/sites-available/wedding /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL
sudo certbot --nginx -d undangan.domain.com
```

## Step 6: Environment Variables

### Frontend (`.env`)
```
VITE_API_URL=http://localhost:3001
```
- Kosong = localStorage mode (local dev)
- Isi = API mode (production)

### Server (`server/.env`)
```
PORT=3001
DB_HOST=localhost
DB_USER=wedding
DB_PASSWORD=wedding_pass_2024
DB_NAME=wedding_db
ADMIN_PASSWORD=admin123
```

---

## Execution Order

1. Buat `database/schema.sql`
2. Buat `server/` (Express API)
3. Buat `src/lib/api-client.ts` (ganti supabase.ts)
4. Update `config.ts` + `api.ts` → pakai api-client
5. Update admin page imports
6. Hapus supabase dependency
7. Buat `deploy/` configs
8. Test: `npm run check` + `npm run dev`
9. Test API: `cd server && npm install && npm run dev`
