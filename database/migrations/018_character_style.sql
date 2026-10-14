-- Migration 018: Add character_style to wedding_configs (2D preset outfit: hijab/umum)
SET @dbname = DATABASE();
SET @tablename = "wedding_configs";
SET @columnname = "character_style";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE wedding_configs ADD COLUMN character_style VARCHAR(16) NOT NULL DEFAULT 'hijab'"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Baris yang sudah ada tetap 'hijab' (tampilan lama tidak berubah); undangan BARU default 'umum'.
ALTER TABLE wedding_configs ALTER COLUMN character_style SET DEFAULT 'umum';
