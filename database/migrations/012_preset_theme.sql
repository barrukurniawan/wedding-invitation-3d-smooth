-- Migration 012: Add preset column to wedding_configs table
SET @dbname = DATABASE();
SET @tablename = "wedding_configs";
SET @columnname = "preset";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE wedding_configs ADD COLUMN preset VARCHAR(32) NOT NULL DEFAULT '3d_summer'"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
