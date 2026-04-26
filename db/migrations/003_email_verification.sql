-- Add email verification columns to gym_users
ALTER TABLE gym_users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP;

-- Existing users are considered verified so they aren't locked out
UPDATE gym_users SET email_verified = TRUE WHERE email_verified IS NULL OR email_verified = FALSE;
