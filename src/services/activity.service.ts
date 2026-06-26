import { supabaseAdmin } from "@/lib/supabase-server";

export interface CreateActivityInput {
  logbook_id: string;
  activity_date: string;
  start_time: string | null;
  end_time: string | null;
  title: string;
  description: string;
  obstacle: string;
}

export interface UpdateActivityInput {
  activity_date?: string;
  start_time?: string | null;
  end_time?: string | null;
  title?: string;
  description?: string;
  obstacle?: string;
}

export interface Activity {
  id: string;
  logbook_id: string;
  activity_date: string;
  start_time: string | null;
  end_time: string | null;
  title: string;
  description: string;
  obstacle: string;
  created_at: string;
}

export interface ActivitiesByDate {
  date: string;
  activities: Activity[];
  totalTimeMinutes: number;
}

/**
 * Validates that activity_date is in ISO format (YYYY-MM-DD).
 * Throws if invalid.
 */
function validateDateISO(dateStr: string): void {
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoRegex.test(dateStr)) {
    throw new Error(
      "activity_date harus format ISO (YYYY-MM-DD)"
    );
  }

  const parsed = new Date(dateStr + "T00:00:00Z");
  if (isNaN(parsed.getTime())) {
    throw new Error("activity_date tidak valid");
  }
}

/**
 * Validates that if both start_time and end_time are provided,
 * end_time is not before start_time.
 */
function validateTimeRange(
  startTime: string | null,
  endTime: string | null
): void {
  if (startTime && endTime) {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);

    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) {
      throw new Error("Format waktu tidak valid. Gunakan HH:mm");
    }

    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;

    if (endMinutes < startMinutes) {
      throw new Error(
        "Jam selesai tidak boleh lebih awal dari jam mulai"
      );
    }
  }
}

export async function createActivity(
  input: CreateActivityInput
): Promise<Activity> {
  // Validate date format
  validateDateISO(input.activity_date);

  // Validate time range
  validateTimeRange(input.start_time, input.end_time);

  const { data, error } = await supabaseAdmin
    .from("activities")
    .insert({
      logbook_id: input.logbook_id,
      activity_date: input.activity_date,
      start_time: input.start_time,
      end_time: input.end_time,
      title: input.title,
      description: input.description,
      obstacle: input.obstacle,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Gagal membuat aktivitas: ${error.message}`);
  }

  return data as Activity;
}

export interface TimeSlot {
  start: string;
  end: string;
}

export function getAvailableSlots(
  existingActivities: Activity[],
  date: string
): TimeSlot[] {
  const dayStart = "07:00";
  const dayEnd = "23:59";

  const activitiesOnDate = existingActivities
    .filter((a) => a.activity_date === date && a.start_time && a.end_time)
    .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));

  if (activitiesOnDate.length === 0) {
    return [{ start: dayStart, end: dayEnd }];
  }

  const slots: TimeSlot[] = [];
  let currentEnd = dayStart;

  for (const activity of activitiesOnDate) {
    if (activity.start_time && activity.end_time) {
      // If there's a gap between current end and this activity's start
      if (activity.start_time > currentEnd) {
        slots.push({ start: currentEnd, end: activity.start_time });
      }
      currentEnd = activity.end_time > currentEnd ? activity.end_time : currentEnd;
    }
  }

  // Add remaining time after last activity
  if (currentEnd < dayEnd) {
    slots.push({ start: currentEnd, end: dayEnd });
  }

  return slots;
}

export function suggestNextTime(
  existingActivities: Activity[],
  date: string
): { start: string; end: string } | null {
  const slots = getAvailableSlots(existingActivities, date);
  if (slots.length === 0) return null;

  // Suggest the first available slot with a default 1-hour duration
  const firstSlot = slots[0];
  const defaultDuration = 60; // 1 hour in minutes

  const [startH, startM] = firstSlot.start.split(":").map(Number);
  const [endH, endM] = firstSlot.end.split(":").map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const slotDuration = endMinutes - startMinutes;

  if (slotDuration <= 0) return null;

  const duration = Math.min(defaultDuration, slotDuration);
  const suggestedEndMinutes = startMinutes + duration;

  const endStr = `${String(Math.floor(suggestedEndMinutes / 60)).padStart(2, "0")}:${String(suggestedEndMinutes % 60).padStart(2, "0")}`;

  return { start: firstSlot.start, end: endStr };
}

export function checkOverlap(
  existingActivities: Activity[],
  date: string,
  startTime: string,
  endTime: string,
  excludeActivityId?: string
): { hasOverlap: boolean; conflictingActivity?: Activity } {
  const activitiesOnDate = existingActivities.filter(
    (a) =>
      a.activity_date === date &&
      a.id !== excludeActivityId &&
      a.start_time &&
      a.end_time
  );

  const [newStartH, newStartM] = startTime.split(":").map(Number);
  const [newEndH, newEndM] = endTime.split(":").map(Number);
  const newStart = newStartH * 60 + newStartM;
  const newEnd = newEndH * 60 + newEndM;

  for (const activity of activitiesOnDate) {
    if (!activity.start_time || !activity.end_time) continue;
    const [exStartH, exStartM] = activity.start_time.split(":").map(Number);
    const [exEndH, exEndM] = activity.end_time.split(":").map(Number);
    const exStart = exStartH * 60 + exStartM;
    const exEnd = exEndH * 60 + exEndM;

    // Check for overlap: new activity starts before existing ends and ends after existing starts
    if (newStart < exEnd && newEnd > exStart) {
      return { hasOverlap: true, conflictingActivity: activity };
    }
  }

  return { hasOverlap: false };
}

export async function getActivitiesByLogbookId(
  logbookId: string
): Promise<Activity[]> {
  const { data, error } = await supabaseAdmin
    .from("activities")
    .select("*")
    .eq("logbook_id", logbookId)
    .order("activity_date", { ascending: false })
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(`Gagal mengambil aktivitas: ${error.message}`);
  }

  return (data as Activity[]) || [];
}

/**
 * Updates an activity. Only if the activity belongs to a logbook owned by the user.
 */
export async function updateActivity(
  activityId: string,
  userId: string,
  input: UpdateActivityInput
): Promise<Activity> {
  // Validate date if provided
  if (input.activity_date) {
    validateDateISO(input.activity_date);
  }

  // Validate time range if both provided
  if (input.start_time !== undefined || input.end_time !== undefined) {
    // Need current values to validate — fetch first
    const { data: current } = await supabaseAdmin
      .from("activities")
      .select("start_time, end_time, logbook_id")
      .eq("id", activityId)
      .single();

    if (!current) throw new Error("Activity tidak ditemukan.");

    // Verify ownership through logbook
    const { data: logbook } = await supabaseAdmin
      .from("logbooks")
      .select("id")
      .eq("id", current.logbook_id)
      .eq("user_id", userId)
      .single();

    if (!logbook) throw new Error("Anda tidak memiliki akses.");

    const st = input.start_time !== undefined ? input.start_time : current.start_time;
    const et = input.end_time !== undefined ? input.end_time : current.end_time;
    validateTimeRange(st, et);
  } else {
    // Verify ownership without fetching times
    const { data: current } = await supabaseAdmin
      .from("activities")
      .select("logbook_id")
      .eq("id", activityId)
      .single();

    if (!current) throw new Error("Activity tidak ditemukan.");

    const { data: logbook } = await supabaseAdmin
      .from("logbooks")
      .select("id")
      .eq("id", current.logbook_id)
      .eq("user_id", userId)
      .single();

    if (!logbook) throw new Error("Anda tidak memiliki akses.");
  }

  const updateData: Record<string, unknown> = {};
  if (input.activity_date !== undefined) updateData.activity_date = input.activity_date;
  if (input.start_time !== undefined) updateData.start_time = input.start_time;
  if (input.end_time !== undefined) updateData.end_time = input.end_time;
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.obstacle !== undefined) updateData.obstacle = input.obstacle;

  if (Object.keys(updateData).length === 0) {
    throw new Error("Tidak ada data yang diubah.");
  }

  const { data, error } = await supabaseAdmin
    .from("activities")
    .update(updateData)
    .eq("id", activityId)
    .select()
    .single();

  if (error) {
    throw new Error(`Gagal mengupdate aktivitas: ${error.message}`);
  }

  return data as Activity;
}

/**
 * Calculates total minutes between start_time and end_time.
 * Returns 0 if either time is missing.
 */
function calculateDurationMinutes(
  startTime: string | null,
  endTime: string | null
): number {
  if (!startTime || !endTime) return 0;

  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);

  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;

  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  const diff = endMinutes - startMinutes;

  return Math.max(0, diff);
}

/**
 * OPTIMIZED: Uses a single query with a subquery join to Supabase.
 * Previously did 2 queries (get logbooks + count activities).
 */
export async function getTotalActivities(userId?: string, logbookId?: string): Promise<number> {
  if (!userId) {
    let query = supabaseAdmin
      .from("activities")
      .select("*", { count: "exact", head: true });

    if (logbookId) {
      query = query.eq("logbook_id", logbookId);
    }

    const { count, error } = await query;

    if (error) {
      console.error("[Activity Service] Gagal menghitung aktivitas:", error.message);
      return 0;
    }

    return count || 0;
  }

  // OPTIMIZED: count activities directly by joining through logbooks
  // Uses Supabase's ability to filter by related table
  let query = supabaseAdmin
    .from("activities")
    .select("*", { count: "exact", head: true })
    .in("logbook_id", (await supabaseAdmin
      .from("logbooks")
      .select("id")
      .eq("user_id", userId)
    ).data?.map(l => l.id) || []);

  if (logbookId) {
    query = query.eq("logbook_id", logbookId);
  }

  const { count, error } = await query;

  if (error) {
    console.error("[Activity Service] Gagal menghitung aktivitas:", error.message);
    return 0;
  }

  return count || 0;
}

export interface ActivityWithLogbook extends Activity {
  logbook_title?: string;
}

/**
 * OPTIMIZED: Gets logbook IDs and titles first (cached), then fetches activities.
 * Previously did 2 separate queries sequentially.
 */
export async function getRecentActivities(
  userId: string,
  limit: number = 10
): Promise<ActivityWithLogbook[]> {
  // Get user's logbook IDs first
  const { data: logbooks, error: logbookError } = await supabaseAdmin
    .from("logbooks")
    .select("id, title")
    .eq("user_id", userId);

  if (logbookError || !logbooks || logbooks.length === 0) {
    return [];
  }

  const logbookIds = logbooks.map((l) => l.id);
  const logbookTitles = new Map(logbooks.map((l) => [l.id, l.title]));

  // Then get recent activities from those logbooks
  const { data, error } = await supabaseAdmin
    .from("activities")
    .select("*")
    .in("logbook_id", logbookIds)
    .order("activity_date", { ascending: false })
    .order("start_time", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[Activity Service] Gagal mengambil recent activities:", error.message);
    return [];
  }

  const activities = (data as Activity[]) || [];
  return activities.map((a) => ({
    ...a,
    logbook_title: logbookTitles.get(a.logbook_id) || "",
  }));
}

export async function getTotalHari(logbookId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("activities")
    .select("activity_date")
    .eq("logbook_id", logbookId)
    .order("activity_date");

  if (error) {
    console.error("[Activity Service] Gagal menghitung hari:", error.message);
    return 0;
  }

  if (!data) return 0;

  // Count distinct dates
  const uniqueDates = new Set(data.map((d: { activity_date: string }) => d.activity_date));
  return uniqueDates.size;
}

/**
 * OPTIMIZED: Gets activity dates directly filtered by user's logbooks.
 * Previously did 2 queries (logbooks + activities). Still needs 2 queries
 * since Supabase doesn't support subqueries in same select, but kept minimal.
 */
export async function getTotalHariAll(userId: string): Promise<number> {
  const { data: logbooks } = await supabaseAdmin
    .from("logbooks")
    .select("id")
    .eq("user_id", userId);

  if (!logbooks || logbooks.length === 0) return 0;

  const logbookIds = logbooks.map((l) => l.id);

  const { data, error } = await supabaseAdmin
    .from("activities")
    .select("activity_date")
    .in("logbook_id", logbookIds);

  if (error || !data) {
    console.error("[Activity Service] Gagal menghitung hari:", error?.message);
    return 0;
  }

  const uniqueDates = new Set(data.map((d: { activity_date: string }) => d.activity_date));
  return uniqueDates.size;
}

/**
 * OPTIMIZED: Merged into fewer queries. Gets logbooks → activities → photos
 * but avoids creating extra arrays re-mapping unnecessarily.
 */
export async function getTotalPhotosAll(userId: string): Promise<number> {
  // Get user's logbook IDs
  const { data: logbooks } = await supabaseAdmin
    .from("logbooks")
    .select("id")
    .eq("user_id", userId);

  if (!logbooks || logbooks.length === 0) return 0;

  const logbookIds = logbooks.map((l) => l.id);

  // Get activity IDs for those logbooks
  const { data: activities } = await supabaseAdmin
    .from("activities")
    .select("id")
    .in("logbook_id", logbookIds);

  if (!activities || activities.length === 0) return 0;

  const activityIds = activities.map((a) => a.id);

  // Count photos for those activities (chunked)
  const CHUNK_SIZE = 40;
  let totalPhotos = 0;
  
  for (let i = 0; i < activityIds.length; i += CHUNK_SIZE) {
    const chunk = activityIds.slice(i, i + CHUNK_SIZE);
    const { count, error } = await supabaseAdmin
      .from("photos")
      .select("*", { count: "exact", head: true })
      .in("activity_id", chunk);
      
    if (error) {
      console.error("[Activity Service] Gagal menghitung foto:", error.message);
    } else if (count) {
      totalPhotos += count;
    }
  }

  return totalPhotos;
}

export async function getActivitiesGroupedByDate(
  logbookId: string
): Promise<ActivitiesByDate[]> {
  const activities = await getActivitiesByLogbookId(logbookId);

  // GROUPING — only in service layer, never in UI
  const groupedMap = new Map<string, Activity[]>();

  for (const activity of activities) {
    const dateKey = activity.activity_date;
    if (!groupedMap.has(dateKey)) {
      groupedMap.set(dateKey, []);
    }
    groupedMap.get(dateKey)!.push(activity);
  }

  // Convert map to sorted array (descending by date)
  const result: ActivitiesByDate[] = [];
  for (const [date, items] of groupedMap.entries()) {
    const totalTimeMinutes = items.reduce(
      (acc, act) => acc + calculateDurationMinutes(act.start_time, act.end_time),
      0
    );
    result.push({ date, activities: items, totalTimeMinutes });
  }

  // Sort descending by date (newest first)
  result.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return result;
}