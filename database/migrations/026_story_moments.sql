-- Migration 026: "Cerita Kami" undangan 2D bisa diisi pasangan (maks 5 momen, foto opsional).
-- story_moments: JSON array [{time,title,description,photo}] sebagai teks; NULL/[] = bawaan (1 momen "Hari bahagia").
SET @dbname = DATABASE();

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'wedding_configs' AND COLUMN_NAME = 'story_moments') > 0,
  "SELECT 1",
  "ALTER TABLE wedding_configs ADD COLUMN story_moments TEXT NULL DEFAULT NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
