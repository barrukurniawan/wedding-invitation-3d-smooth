ALTER TABLE invitations
  ADD COLUMN payment_proof_url VARCHAR(2048) NULL AFTER status,
  ADD COLUMN payment_submitted_at DATETIME NULL AFTER payment_proof_url,
  ADD COLUMN verified_by BIGINT UNSIGNED NULL AFTER payment_submitted_at,
  ADD COLUMN verified_at DATETIME NULL AFTER verified_by;
