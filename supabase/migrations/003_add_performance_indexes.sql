-- Optimasi Performa: Menambahkan Index untuk Query yang Sering Dipanggil
-- Migration: 003_add_performance_indexes
-- Tujuan: Mengurangi full table scan pada query logbook, activities, dan photos

-- 1. Index untuk logbooks: filter by user_id (sering dipanggil)
CREATE INDEX IF NOT EXISTS idx_logbooks_user_id ON logbooks (user_id);
CREATE INDEX IF NOT EXISTS idx_logbooks_user_id_created ON logbooks (user_id, created_at DESC);

-- 2. Index untuk activities: filter by logbook_id (sering dipanggil)
CREATE INDEX IF NOT EXISTS idx_activities_logbook_id ON activities (logbook_id);
CREATE INDEX IF NOT EXISTS idx_activities_logbook_id_date ON activities (logbook_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_activities_logbook_id_date_time ON activities (logbook_id, activity_date DESC, start_time ASC);

-- 3. Index untuk activities: filter by activity_date (untuk count distinct dates)
CREATE INDEX IF NOT EXISTS idx_activities_activity_date ON activities (activity_date);

-- 4. Index untuk photos: filter by activity_id (sering dipanggil)
CREATE INDEX IF NOT EXISTS idx_photos_activity_id ON photos (activity_id);

-- 5. Index untuk photos: ambil google_file_id (untuk Drive cleanup)
CREATE INDEX IF NOT EXISTS idx_photos_activity_id_file_id ON photos (activity_id, google_file_id) WHERE google_file_id IS NOT NULL;

-- 6. Index untuk users: lookup by email (sering dipanggil setiap request)
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

COMMENT ON INDEX idx_logbooks_user_id IS 'Mempercepat filter logbook berdasarkan user';
COMMENT ON INDEX idx_logbooks_user_id_created IS 'Mempercepat sort logbook berdasarkan created_at per user';
COMMENT ON INDEX idx_activities_logbook_id IS 'Mempercepat filter aktivitas berdasarkan logbook';
COMMENT ON INDEX idx_activities_logbook_id_date IS 'Mempercepat filter + sort aktivitas per logbook';
COMMENT ON INDEX idx_photos_activity_id IS 'Mempercepat filter foto berdasarkan aktivitas';
COMMENT ON INDEX idx_users_email IS 'Mempercepat lookup user berdasarkan email (session check)';