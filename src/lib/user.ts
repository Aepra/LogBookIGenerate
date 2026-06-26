import { supabaseAdmin } from "@/lib/supabase-server";

export interface UserProfile {
  id: string;
  google_id: string;
  name: string;
  email: string;
  avatar: string | null;
  created_at: string;
  updated_at: string;
  drive_folder_id: string | null;
  deleted_at: string | null;
  nim: string | null;
  university: string | null;
  faculty: string | null;
  study_program: string | null;
  batch_year: number | null;
}

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

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  return user as UserProfile | null;
}

export async function getUserById(id: string): Promise<UserProfile | null> {
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  return user as UserProfile | null;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, "name" | "nim" | "university" | "faculty" | "study_program" | "batch_year">>
): Promise<UserProfile | null> {
  const updateData: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("users")
    .update(updateData)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw new Error(`Gagal update profil: ${error.message}`);
  return data as UserProfile;
}