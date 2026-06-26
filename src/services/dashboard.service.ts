import { supabaseAdmin } from "@/lib/supabase-server";

export interface DashboardStats {
  totalLogbooks: number;
  totalHari: number;
  totalActivities: number;
  totalPhotos: number;
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const { data, error } = await supabaseAdmin.rpc("get_user_dashboard_stats", {
    p_user_id: userId,
  });

  if (error || !data) {
    console.error("RPC Error (get_user_dashboard_stats):", error);
    return {
      totalLogbooks: 0,
      totalHari: 0,
      totalActivities: 0,
      totalPhotos: 0,
    };
  }

  return {
    totalLogbooks: data.totalLogbooks || 0,
    totalHari: data.totalHari || 0,
    totalActivities: data.totalActivities || 0,
    totalPhotos: data.totalPhotos || 0,
  };
}