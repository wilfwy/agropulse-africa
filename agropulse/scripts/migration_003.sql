-- AgroPulse Africa — Migration 003 : secret TOTP pour la 2FA admin.
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(64);
