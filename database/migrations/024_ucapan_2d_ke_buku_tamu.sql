-- Migration 024: ucapan undangan 2D masuk ke buku tamu yang sama dengan 3D (guestbook_entries),
-- supaya tampil di dashboard pasangan beserta kehadiran. request_id = idempoten per kiriman.
SET @dbname = DATABASE();

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'guestbook_entries' AND COLUMN_NAME = 'request_id') > 0,
  "SELECT 1",
  "ALTER TABLE guestbook_entries ADD COLUMN request_id VARCHAR(64) NULL DEFAULT NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'guestbook_entries' AND INDEX_NAME = 'uq_guestbook_request') > 0,
  "SELECT 1",
  "ALTER TABLE guestbook_entries ADD UNIQUE KEY uq_guestbook_request (invitation_id, request_id)"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Pindahkan ucapan 2D lama (tabel wedding_wishes tetap ada, tidak dihapus). Kehadiran dulu tidak ditanya
-- → 'Ragu-ragu'. Demo (faris-eliza) tidak punya undangan, jadi tidak ikut. Aman dijalankan ulang.
INSERT INTO guestbook_entries (id, invitation_id, name, attendance, message, status, created_at, request_id)
SELECT UUID(), i.id, w.name, 'Ragu-ragu', w.message, IF(w.hidden = 1, 'hidden', 'visible'),
       FROM_UNIXTIME(w.created_at / 1000), CONCAT('wish:', w.request_id)
FROM wedding_wishes w
JOIN invitations i ON i.slug = w.site AND i.deleted_at IS NULL
WHERE NOT EXISTS (
  SELECT 1 FROM guestbook_entries g WHERE g.invitation_id = i.id AND g.request_id = CONCAT('wish:', w.request_id)
);
