ALTER TABLE invitations
  ADD COLUMN rejection_reason VARCHAR(1000) NULL AFTER verified_at;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invitation_id BIGINT UNSIGNED NOT NULL,
  provider VARCHAR(32) NOT NULL,
  provider_order_id VARCHAR(128) NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'IDR',
  status ENUM('created', 'pending', 'received', 'failed', 'cancelled') NOT NULL DEFAULT 'created',
  proof_url VARCHAR(2048) NULL,
  provider_status VARCHAR(64) NULL,
  provider_payload JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_invitation FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE,
  UNIQUE KEY uq_payments_provider_order (provider, provider_order_id),
  INDEX idx_payments_invitation_status (invitation_id, status, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS invitation_status_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invitation_id BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(32) NULL,
  to_status VARCHAR(32) NOT NULL,
  actor_type ENUM('system', 'user', 'admin') NOT NULL,
  actor_id BIGINT UNSIGNED NULL,
  reason VARCHAR(1000) NULL,
  payment_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_status_events_invitation FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE,
  CONSTRAINT fk_status_events_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
  INDEX idx_status_events_invitation_created (invitation_id, created_at)
) ENGINE=InnoDB;
