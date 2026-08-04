CREATE TABLE IF NOT EXISTS invitation_contacts (
  id CHAR(36) PRIMARY KEY,
  invitation_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_invitation_contacts_invitation FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE,
  UNIQUE KEY uq_invitation_contacts_phone (invitation_id, phone),
  INDEX idx_invitation_contacts_created (invitation_id, created_at, id)
) ENGINE=InnoDB;
