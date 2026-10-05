-- Migration 013: Add multiplayer support for 2D RPG garden preset
CREATE TABLE IF NOT EXISTS garden_players (
  id VARCHAR(36) PRIMARY KEY,
  token VARCHAR(36) NOT NULL,
  site VARCHAR(64) NOT NULL DEFAULT 'faris-eliza',
  name VARCHAR(64) NOT NULL,
  character_type VARCHAR(16) NOT NULL DEFAULT 'men',
  state JSON NOT NULL,
  message VARCHAR(255) NULL,
  message_at BIGINT NULL,
  seen BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_site_seen (site, seen)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS wedding_wishes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  request_id VARCHAR(36) NOT NULL UNIQUE,
  site VARCHAR(64) NOT NULL DEFAULT 'faris-eliza',
  name VARCHAR(64) NOT NULL,
  message VARCHAR(255) NOT NULL,
  hidden TINYINT(1) NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  INDEX idx_site_wishes (site, hidden, id DESC)
) ENGINE=InnoDB;
