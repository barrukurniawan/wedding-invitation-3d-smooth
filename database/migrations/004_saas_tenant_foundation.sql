CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(128) PRIMARY KEY,
  checksum CHAR(64) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  google_subject VARCHAR(255) NULL UNIQUE,
  email VARCHAR(320) NULL,
  display_name VARCHAR(255) NOT NULL,
  avatar_url TEXT NULL,
  status ENUM('active', 'suspended', 'deleted') NOT NULL DEFAULT 'active',
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS invitations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  owner_user_id BIGINT UNSIGNED NULL,
  slug VARCHAR(63) NOT NULL UNIQUE,
  status ENUM('draft', 'awaiting_payment', 'pending_verification', 'active', 'expired', 'suspended', 'deleted') NOT NULL DEFAULT 'draft',
  reception_at DATETIME NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Jakarta',
  activated_at DATETIME NULL,
  expires_at DATETIME NOT NULL,
  retention_until DATETIME NOT NULL,
  deleted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_invitations_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_invitations_owner (owner_user_id),
  INDEX idx_invitations_public (slug, status, expires_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS invitation_memberships (
  invitation_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  role ENUM('owner', 'editor', 'viewer') NOT NULL DEFAULT 'owner',
  status ENUM('active', 'revoked') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (invitation_id, user_id),
  CONSTRAINT fk_memberships_invitation FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE,
  CONSTRAINT fk_memberships_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS wedding_configs (
  invitation_id BIGINT UNSIGNED PRIMARY KEY,
  bride_name VARCHAR(255) NOT NULL,
  groom_name VARCHAR(255) NOT NULL,
  bride_parents VARCHAR(255) NOT NULL,
  groom_parents VARCHAR(255) NOT NULL,
  wedding_photo TEXT NOT NULL,
  wedding_date DATETIME NOT NULL,
  akad_date VARCHAR(255) NOT NULL,
  akad_time VARCHAR(255) NOT NULL,
  akad_location VARCHAR(255) NOT NULL,
  resepsi_date VARCHAR(255) NOT NULL,
  resepsi_time VARCHAR(255) NOT NULL,
  resepsi_location VARCHAR(255) NOT NULL,
  qris_image TEXT NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  bank_account VARCHAR(100) NOT NULL,
  bank_holder VARCHAR(255) NOT NULL,
  maps_url TEXT NOT NULL,
  venue_address TEXT NOT NULL,
  gallery_photos JSON NOT NULL,
  quote TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_wedding_configs_invitation FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS guestbook_entries (
  id CHAR(36) PRIMARY KEY,
  invitation_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  attendance ENUM('Hadir', 'Ragu-ragu', 'Tidak Hadir') NOT NULL DEFAULT 'Hadir',
  message TEXT NOT NULL,
  status ENUM('visible', 'pending', 'hidden', 'deleted') NOT NULL DEFAULT 'visible',
  moderated_by INT UNSIGNED NULL,
  moderated_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_guestbook_invitation FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE,
  CONSTRAINT fk_guestbook_moderator FOREIGN KEY (moderated_by) REFERENCES admin_users(id) ON DELETE SET NULL,
  INDEX idx_guestbook_invitation_created (invitation_id, status, created_at DESC)
) ENGINE=InnoDB;

INSERT INTO invitations (
  id, owner_user_id, slug, status, reception_at, timezone,
  activated_at, expires_at, retention_until
)
SELECT
  1, NULL, 'kia-toni', 'active', wedding_date, 'Asia/Jakarta',
  UTC_TIMESTAMP(), DATE_ADD(wedding_date, INTERVAL 7 DAY), DATE_ADD(wedding_date, INTERVAL 37 DAY)
FROM wedding_config
WHERE id = 1
ON DUPLICATE KEY UPDATE slug = VALUES(slug);

INSERT INTO wedding_configs (
  invitation_id, bride_name, groom_name, bride_parents, groom_parents,
  wedding_photo, wedding_date, akad_date, akad_time, akad_location,
  resepsi_date, resepsi_time, resepsi_location, qris_image, bank_name,
  bank_account, bank_holder, maps_url, venue_address, gallery_photos, quote
)
SELECT
  1, bride_name, groom_name, bride_parents, groom_parents,
  wedding_photo, wedding_date, akad_date, akad_time, akad_location,
  resepsi_date, resepsi_time, resepsi_location, qris_image, bank_name,
  bank_account, bank_holder, maps_url, venue_address,
  COALESCE(NULLIF(gallery_photos, ''), '[]'), quote
FROM wedding_config
WHERE id = 1
ON DUPLICATE KEY UPDATE invitation_id = invitation_id;

INSERT IGNORE INTO guestbook_entries (
  id, invitation_id, name, attendance, message, status, created_at
)
SELECT id, 1, name, attendance, message, 'visible', created_at
FROM guestbook;
