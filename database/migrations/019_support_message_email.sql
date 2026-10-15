-- Migration 019: support_messages.emailed_at (pesan admin yang juga dikirim ke email pemilik)
SET @dbname = DATABASE();
SET @tablename = "support_messages";
SET @columnname = "emailed_at";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE support_messages ADD COLUMN emailed_at TIMESTAMP NULL DEFAULT NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

