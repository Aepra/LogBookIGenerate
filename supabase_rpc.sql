-- Jalankan script SQL ini di SQL Editor Supabase Anda
-- (Masuk ke dashboard Supabase -> SQL Editor -> New Query -> Paste script ini -> Run)

CREATE OR REPLACE FUNCTION get_user_dashboard_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_logbooks_count INT;
  v_unique_days INT;
  v_activities_count INT;
  v_photos_count INT;
BEGIN
  -- 1. Hitung total logbook
  SELECT count(*) INTO v_logbooks_count
  FROM logbooks
  WHERE user_id = p_user_id;

  -- 2. Hitung total aktivitas & jumlah hari yang unik
  SELECT count(*), count(DISTINCT activity_date)
  INTO v_activities_count, v_unique_days
  FROM activities a
  JOIN logbooks l ON a.logbook_id = l.id
  WHERE l.user_id = p_user_id;

  -- 3. Hitung total foto
  SELECT count(*) INTO v_photos_count
  FROM photos p
  JOIN activities a ON p.activity_id = a.id
  JOIN logbooks l ON a.logbook_id = l.id
  WHERE l.user_id = p_user_id;

  -- Kembalikan hasil dalam format JSON
  RETURN json_build_object(
    'totalLogbooks', COALESCE(v_logbooks_count, 0),
    'totalHari', COALESCE(v_unique_days, 0),
    'totalActivities', COALESCE(v_activities_count, 0),
    'totalPhotos', COALESCE(v_photos_count, 0)
  );
END;
$$ LANGUAGE plpgsql;
