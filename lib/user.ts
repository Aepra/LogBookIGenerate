import { supabaseAdmin } from "@/lib/supabase-server";

export async function getUserIdByEmail(
  email: string
): Promise<string | null> {
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  return user?.id || null;
}