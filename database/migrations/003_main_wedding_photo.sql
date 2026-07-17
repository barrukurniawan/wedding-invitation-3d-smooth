ALTER TABLE wedding_config ADD COLUMN wedding_photo TEXT NOT NULL AFTER groom_parents;

UPDATE wedding_config
SET wedding_photo = COALESCE(NULLIF(bride_photo, ''), NULLIF(groom_photo, ''), '');

ALTER TABLE wedding_config DROP COLUMN bride_photo, DROP COLUMN groom_photo;
