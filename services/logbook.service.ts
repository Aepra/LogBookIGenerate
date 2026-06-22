import { supabaseAdmin } from "@/lib/supabase-server";
import { createLogbookFolder } from "@/services/google-drive.service";
import { createTraceContext } from "@/types/drive";

export type LogbookType = "pkl" | "kkn" | "other";

export interface CreateLogbookInput {
  title: string;
  description: string;
  type: LogbookType;
}

export interface UpdateLogbookInput {
  title?: string;
  description?: string;
  type?: LogbookType;
}

export interface Logbook {
  id: string;
  user_id: string;
  title: string;
  description: string;
  type: LogbookType;
  created_at: string;
  drive_folder_id: string | null;
}

/**
 * Creates a logbook in the database AND optionally creates
 * a corresponding Drive subfolder.
 *
 * Drive failure is NON-BLOCKING — logbook is created regardless.
 */
export async function createLogbook(
  userId: string,
  input: CreateLogbookInput,
  driveAccessToken?: string | null,
  userRootFolderId?: string | null
): Promise<Logbook> {
  // 1. Insert logbook into database first
  const { data, error } = await supabaseAdmin
    .from("logbooks")
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description,
      type: input.type,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Gagal membuat logbook: ${error.message}`);
  }

  const logbook = data as Logbook;

  // 2. Try to create Drive folder (non-blocking)
  if (driveAccessToken && userRootFolderId) {
    try {
      const trace = createTraceContext(`createLogbook_${userId.substring(0, 8)}`);
      const noopRefresh = async () => null; // fresh token from session
      const folderId = await createLogbookFolder(
        trace,
        driveAccessToken,
        noopRefresh,
        userRootFolderId,
        input.title
      );

      if (folderId) {
        // Update logbook with drive_folder_id
        const { error: updateError } = await supabaseAdmin
          .from("logbooks")
          .update({ drive_folder_id: folderId })
          .eq("id", logbook.id);

        if (updateError) {
          console.error(
            "[Logbook Service] Gagal update drive_folder_id:",
            updateError.message
          );
        } else {
          logbook.drive_folder_id = folderId;
        }
      }
    } catch (driveError) {
      // Non-blocking: Drive failure is logged but does NOT break the flow
      console.error(
        "[Logbook Service] Drive folder creation skipped (non-blocking):",
        driveError
      );
    }
  }

  return logbook;
}

export async function getUserLogbooks(userId: string): Promise<Logbook[]> {
  const { data, error } = await supabaseAdmin
    .from("logbooks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Gagal mengambil logbook: ${error.message}`);
  }

  return (data as Logbook[]) || [];
}

export async function getLogbookById(
  logbookId: string,
  userId: string
): Promise<Logbook | null> {
  const { data, error } = await supabaseAdmin
    .from("logbooks")
    .select("*")
    .eq("id", logbookId)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Gagal mengambil detail logbook: ${error.message}`);
  }

  return data as Logbook;
}

/**
 * Updates a logbook (title, description, type).
 * Only the owner can update.
 */
export async function updateLogbook(
  logbookId: string,
  userId: string,
  input: UpdateLogbookInput
): Promise<Logbook> {
  const updateData: Record<string, unknown> = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.type !== undefined) updateData.type = input.type;

  if (Object.keys(updateData).length === 0) {
    throw new Error("Tidak ada data yang diubah.");
  }

  const { data, error } = await supabaseAdmin
    .from("logbooks")
    .update(updateData)
    .eq("id", logbookId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Logbook tidak ditemukan.");
    }
    throw new Error(`Gagal mengupdate logbook: ${error.message}`);
  }

  return data as Logbook;
}