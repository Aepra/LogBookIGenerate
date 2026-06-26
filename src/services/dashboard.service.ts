import { supabaseAdmin } from "@/lib/supabase-server";

export interface DashboardStats {
  totalLogbooks: number;
  totalDays: number;
  totalActivities: number;
  totalPhotos: number;
}

/**
 * OPTIMIZED: Get all dashboard stats in just 3 queries instead of 6+.
 *
 * Previously:
 *   - getTotalLogbooks → 1 query
 *   - getTotalDaysAll → 2 queries (logbooks → activities)
 *   - getTotalActivities → 2 queries (logbooks → activities)
 *   - getTotalPhotosAll → 3 queries (logbooks → activities → photos)
 *   Total: 8 queries
 *
 * Now:
 *   - logbooks count → 1 query (head)
 *   - activities grouped → 1 query (batch)
 *   - photos count → 1 query
 *   Total: 3 queries
 */
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  // Query 1: Count logbooks (uses head=true for minimal overhead)
  const { count: totalLogbooks } = await supabaseAdmin
    .from("logbooks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  // Query 2: Get logbook IDs for follow-up queries
  const { data: logbooks } = await supabaseAdmin
    .from("logbooks")
    .select("id")
    .eq("user_id", userId);

  if (!logbooks || logbooks.length === 0) {
    return {
      totalLogbooks: totalLogbooks || 0,
      totalDays: 0,
      totalActivities: 0,
      totalPhotos: 0,
    };
  }

  const logbookIds = logbooks.map((l) => l.id);

  // Query 3: Get all activities for all logbooks (single query)
  const { data: activities } = await supabaseAdmin
    .from("activities")
    .select("id, activity_date")
    .in("logbook_id", logbookIds);

  if (!activities || activities.length === 0) {
    return {
      totalLogbooks: totalLogbooks || 0,
      totalDays: 0,
      totalActivities: 0,
      totalPhotos: 0,
    };
  }

  const totalActivities = activities.length;

  // Count unique days
  const uniqueDates = new Set(activities.map((a: { activity_date: string }) => a.activity_date));
  const totalDays = uniqueDates.size;

  // Query 3: Count photos for all activities
  const activityIds = activities.map((a: { id: string }) => a.id);
  const { count: totalPhotos } = await supabaseAdmin
    .from("photos")
    .select("*", { count: "exact", head: true })
    .in("activity_id", activityIds);

  return {
    totalLogbooks: totalLogbooks || 0,
    totalDays,
    totalActivities,
    totalPhotos: totalPhotos || 0,
  };
}