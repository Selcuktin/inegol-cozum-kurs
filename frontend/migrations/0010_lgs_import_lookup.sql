CREATE INDEX IF NOT EXISTS idx_lgs_exams_source ON lgs_exams(json_extract(document,'$.source_hash'));
