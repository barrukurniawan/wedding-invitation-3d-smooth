-- Migration 015: Add venue column to wedding_configs (3D world location, e.g. garden/beach)
SET @dbname = DATABASE();
SET @tablename = "wedding_configs";
SET @columnname = "venue";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE wedding_configs ADD COLUMN venue VARCHAR(32) NOT NULL DEFAULT 'garden'"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
