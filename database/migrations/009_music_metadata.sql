SET @has_bgm_url = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wedding_configs' AND COLUMN_NAME = 'bgm_url'
);
SET @sql = IF(@has_bgm_url = 0,
  'ALTER TABLE wedding_configs ADD COLUMN bgm_url TEXT NULL',
  'SELECT 1'
);
PREPARE add_bgm_url FROM @sql;
EXECUTE add_bgm_url;
DEALLOCATE PREPARE add_bgm_url;

SET @has_bgm_title = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wedding_configs' AND COLUMN_NAME = 'bgm_title'
);
SET @sql = IF(@has_bgm_title = 0,
  'ALTER TABLE wedding_configs ADD COLUMN bgm_title VARCHAR(255) NULL',
  'SELECT 1'
);
PREPARE add_bgm_title FROM @sql;
EXECUTE add_bgm_title;
DEALLOCATE PREPARE add_bgm_title;
