-- Migration 021: uji coba 3 hari + bayar sekali aktif selamanya (PLAN_TRIAL_3_HARI.md).
-- trial_ends_at: akhir uji coba (UTC), NULL = bukan uji coba. paid_at: pembayaran berhasil (aktif selamanya).
-- offer_price/offer_expires_at: harga khusus dari email pengingat (sekali per akun). Undangan lama: semua NULL.
SET @dbname = DATABASE();

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'invitations' AND COLUMN_NAME = 'trial_ends_at') > 0,
  "SELECT 1",
  "ALTER TABLE invitations ADD COLUMN trial_ends_at DATETIME NULL DEFAULT NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'invitations' AND COLUMN_NAME = 'paid_at') > 0,
  "SELECT 1",
  "ALTER TABLE invitations ADD COLUMN paid_at DATETIME NULL DEFAULT NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'invitations' AND COLUMN_NAME = 'offer_price') > 0,
  "SELECT 1",
  "ALTER TABLE invitations ADD COLUMN offer_price INT UNSIGNED NULL DEFAULT NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'invitations' AND COLUMN_NAME = 'offer_expires_at') > 0,
  "SELECT 1",
  "ALTER TABLE invitations ADD COLUMN offer_expires_at DATETIME NULL DEFAULT NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'invitations' AND COLUMN_NAME = 'trial_reminder_sent_at') > 0,
  "SELECT 1",
  "ALTER TABLE invitations ADD COLUMN trial_reminder_sent_at DATETIME NULL DEFAULT NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
