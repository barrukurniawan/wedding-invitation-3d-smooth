-- Migration 022: undangan privat (PLAN_UNDANGAN_PRIVAT.md).
-- privacy_mode: public (default, perilaku lama) | hide_details | private.
-- privacy_general_code: kode link umum (NULL = belum dibuat). privacy_device_limit: maks perangkat per link tamu (NULL = tanpa batas).
-- invitation_contacts: kode akses per tamu + statistik buka. Kode diisi server (crypto), bukan SQL.
SET @dbname = DATABASE();

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'wedding_configs' AND COLUMN_NAME = 'privacy_mode') > 0,
  "SELECT 1",
  "ALTER TABLE wedding_configs ADD COLUMN privacy_mode ENUM('public','hide_details','private') NOT NULL DEFAULT 'public'"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'wedding_configs' AND COLUMN_NAME = 'privacy_general_code') > 0,
  "SELECT 1",
  "ALTER TABLE wedding_configs ADD COLUMN privacy_general_code VARCHAR(16) NULL DEFAULT NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'wedding_configs' AND COLUMN_NAME = 'privacy_device_limit') > 0,
  "SELECT 1",
  "ALTER TABLE wedding_configs ADD COLUMN privacy_device_limit TINYINT UNSIGNED NULL DEFAULT 2"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'invitation_contacts' AND COLUMN_NAME = 'access_code') > 0,
  "SELECT 1",
  "ALTER TABLE invitation_contacts ADD COLUMN access_code VARCHAR(16) NULL DEFAULT NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'invitation_contacts' AND COLUMN_NAME = 'revoked_at') > 0,
  "SELECT 1",
  "ALTER TABLE invitation_contacts ADD COLUMN revoked_at TIMESTAMP NULL DEFAULT NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'invitation_contacts' AND COLUMN_NAME = 'first_opened_at') > 0,
  "SELECT 1",
  "ALTER TABLE invitation_contacts ADD COLUMN first_opened_at TIMESTAMP NULL DEFAULT NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'invitation_contacts' AND COLUMN_NAME = 'last_opened_at') > 0,
  "SELECT 1",
  "ALTER TABLE invitation_contacts ADD COLUMN last_opened_at TIMESTAMP NULL DEFAULT NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'invitation_contacts' AND COLUMN_NAME = 'open_count') > 0,
  "SELECT 1",
  "ALTER TABLE invitation_contacts ADD COLUMN open_count INT UNSIGNED NOT NULL DEFAULT 0"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'invitation_contacts' AND COLUMN_NAME = 'denied_count') > 0,
  "SELECT 1",
  "ALTER TABLE invitation_contacts ADD COLUMN denied_count INT UNSIGNED NOT NULL DEFAULT 0"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'invitation_contacts' AND INDEX_NAME = 'uq_invitation_contacts_code') > 0,
  "SELECT 1",
  "ALTER TABLE invitation_contacts ADD UNIQUE KEY uq_invitation_contacts_code (invitation_id, access_code)"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Perangkat yang sudah membuka link tamu (batas perangkat). ip_hash: sha256 terpotong, bukan IP mentah.
CREATE TABLE IF NOT EXISTS invitation_contact_devices (
  contact_id CHAR(36) NOT NULL,
  device_id VARCHAR(64) NOT NULL,
  ip_hash CHAR(16) NOT NULL,
  -- 0 = dianggap perangkat yang sama dengan perangkat lain (IP sama, ≤24 jam), tidak memakai jatah.
  counts_slot TINYINT(1) NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (contact_id, device_id),
  INDEX idx_contact_devices_ip (contact_id, ip_hash, first_seen_at),
  CONSTRAINT fk_contact_devices_contact FOREIGN KEY (contact_id) REFERENCES invitation_contacts(id) ON DELETE CASCADE
) ENGINE=InnoDB;
