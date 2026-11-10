-- Migration 023: nama acara bisa diubah (mis. 'Pemberkatan') dan acara kedua bisa dimatikan.
-- akad_title/resepsi_title NULL = nama bawaan ('Akad Nikah' / 'Resepsi'). resepsi_enabled 0 = hanya satu acara.
SET @dbname = DATABASE();

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'wedding_configs' AND COLUMN_NAME = 'akad_title') > 0,
  "SELECT 1",
  "ALTER TABLE wedding_configs ADD COLUMN akad_title VARCHAR(60) NULL DEFAULT NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'wedding_configs' AND COLUMN_NAME = 'resepsi_title') > 0,
  "SELECT 1",
  "ALTER TABLE wedding_configs ADD COLUMN resepsi_title VARCHAR(60) NULL DEFAULT NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'wedding_configs' AND COLUMN_NAME = 'resepsi_enabled') > 0,
  "SELECT 1",
  "ALTER TABLE wedding_configs ADD COLUMN resepsi_enabled TINYINT(1) NOT NULL DEFAULT 1"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
