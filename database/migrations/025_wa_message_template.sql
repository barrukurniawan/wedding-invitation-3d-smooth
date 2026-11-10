-- Migration 025: template pesan "Kirim Undangan" (WhatsApp) disimpan per undangan + teks {mempelai}.
-- NULL = bawaan (template standar; {mempelai} = "Nama Wanita & Nama Pria").
SET @dbname = DATABASE();

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'wedding_configs' AND COLUMN_NAME = 'wa_template') > 0,
  "SELECT 1",
  "ALTER TABLE wedding_configs ADD COLUMN wa_template TEXT NULL DEFAULT NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'wedding_configs' AND COLUMN_NAME = 'wa_couple_label') > 0,
  "SELECT 1",
  "ALTER TABLE wedding_configs ADD COLUMN wa_couple_label VARCHAR(255) NULL DEFAULT NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
