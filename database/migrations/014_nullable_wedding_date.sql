-- Migration 014: Make wedding_date and reception_at nullable for tentative/undetermined wedding schedules
ALTER TABLE wedding_configs MODIFY wedding_date DATETIME NULL;
ALTER TABLE invitations MODIFY reception_at DATETIME NULL;
