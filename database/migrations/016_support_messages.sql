-- Migration 016: Chat bantuan sederhana antara pemilik akun dan admin (satu percakapan per akun).
CREATE TABLE IF NOT EXISTS support_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  sender ENUM('user', 'admin') NOT NULL,
  body TEXT NOT NULL,
  context VARCHAR(255) NULL,
  read_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_support_user_id (user_id, id),
  INDEX idx_support_unread (sender, read_at),
  CONSTRAINT fk_support_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
