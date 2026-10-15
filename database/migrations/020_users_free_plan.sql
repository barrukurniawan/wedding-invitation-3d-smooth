-- Migration 020: users.free_plan. Akun yang mendaftar saat paket masih gratis tidak pernah dikenai biaya.
-- Semua akun yang ada saat migrasi ini jalan mendaftar di masa gratis -> free_plan = 1.
-- Akun baru diberi free_plan = 1 oleh aplikasi hanya bila INVITATION_PRICE_IDR = 0 saat mendaftar.
SET @dbname = DATABASE();
SET @tablename = "users";
SET @columnname = "free_plan";
SET @columnExists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname
);
SET @preparedStatement = (SELECT IF(
  @columnExists > 0,
  "SELECT 1",
  "ALTER TABLE users ADD COLUMN free_plan TINYINT(1) NOT NULL DEFAULT 0"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Hanya saat kolom baru dibuat (bukan saat migrasi diulang), tandai seluruh akun yang sudah ada.
SET @backfill = (SELECT IF(@columnExists > 0, "SELECT 1", "UPDATE users SET free_plan = 1"));
PREPARE backfillUsers FROM @backfill;
EXECUTE backfillUsers;
DEALLOCATE PREPARE backfillUsers;
