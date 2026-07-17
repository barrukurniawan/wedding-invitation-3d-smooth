CREATE DATABASE IF NOT EXISTS wedding_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE wedding_db;

CREATE TABLE IF NOT EXISTS wedding_config (
  id INT PRIMARY KEY DEFAULT 1,
  bride_name VARCHAR(255) NOT NULL DEFAULT 'Kia Anindya',
  groom_name VARCHAR(255) NOT NULL DEFAULT 'Toni Pratama',
  bride_parents VARCHAR(255) NOT NULL DEFAULT 'Bpk. ... & Ibu. ...',
  groom_parents VARCHAR(255) NOT NULL DEFAULT 'Bpk. ... & Ibu. ...',
  bride_photo TEXT NOT NULL,
  groom_photo TEXT NOT NULL,
  wedding_date DATETIME NOT NULL DEFAULT '2026-07-15 08:00:00',
  akad_date VARCHAR(255) NOT NULL DEFAULT 'Rabu, 15 Juli 2026',
  akad_time VARCHAR(255) NOT NULL DEFAULT '08:00 - 10:00 WIB',
  akad_location VARCHAR(255) NOT NULL DEFAULT 'Kediaman Mempelai Wanita',
  resepsi_date VARCHAR(255) NOT NULL DEFAULT 'Rabu, 15 Juli 2026',
  resepsi_time VARCHAR(255) NOT NULL DEFAULT '11:00 - 14:00 WIB',
  resepsi_location VARCHAR(255) NOT NULL DEFAULT 'Gedung Serbaguna',
  qris_image TEXT NOT NULL,
  bank_name VARCHAR(100) NOT NULL DEFAULT 'BCA',
  bank_account VARCHAR(100) NOT NULL DEFAULT '1234567890',
  bank_holder VARCHAR(255) NOT NULL DEFAULT 'Toni Pratama',
  maps_url TEXT NOT NULL,
  venue_address TEXT NOT NULL,
  gallery_photos TEXT NOT NULL,
  quote TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO wedding_config (
  id, bride_photo, groom_photo, qris_image, maps_url, venue_address, gallery_photos, quote
) VALUES (
  1, '', '', '', '', '', '[]', ''
) ON DUPLICATE KEY UPDATE id = id;

CREATE TABLE IF NOT EXISTS guestbook (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  attendance ENUM('Hadir','Ragu-ragu','Tidak Hadir') NOT NULL DEFAULT 'Hadir',
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_guestbook_created_at ON guestbook (created_at DESC);

CREATE TABLE IF NOT EXISTS admin_users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id CHAR(36) PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_sessions_user FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
  INDEX idx_admin_sessions_expiry (expires_at)
) ENGINE=InnoDB;
