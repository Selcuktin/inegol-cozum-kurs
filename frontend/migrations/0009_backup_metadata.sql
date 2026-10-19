ALTER TABLE system_backups ADD COLUMN size_bytes INTEGER;
ALTER TABLE system_backups ADD COLUMN sha256 TEXT;
ALTER TABLE system_backups ADD COLUMN storage TEXT;
CREATE INDEX IF NOT EXISTS idx_system_backups_recent ON system_backups(created_at DESC,id DESC);
