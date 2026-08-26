CREATE TABLE IF NOT EXISTS visitor_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invitation_id BIGINT UNSIGNED NULL,
  slug VARCHAR(64) NULL,
  path VARCHAR(255) NOT NULL DEFAULT '/',
  visit_id CHAR(36) NOT NULL,
  referrer VARCHAR(512) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ve_created (created_at),
  INDEX idx_ve_slug_time (slug, created_at),
  INDEX idx_ve_visit (visit_id, created_at),
  CONSTRAINT fk_ve_invitation FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
