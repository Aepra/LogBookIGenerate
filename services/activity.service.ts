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