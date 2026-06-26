import { supabaseAdmin } from "../src/lib/supabase-server";

type TableCheck = {
  name: string;
  expectedColumns: string[];
};

const tablesToCheck: TableCheck[] = [
  {
    name: "users",
    expectedColumns: [
      "id", "google_id", "name", "email", "avatar", "created_at",
      "updated_at", "drive_folder_id", "deleted_at",
      "nim", "university", "faculty", "study_program", "batch_year",
    ],
  },
  {
    name: "logbooks",
    expectedColumns: [
      "id", "user_id", "title", "description", "type", "created_at",
      "start_date", "end_date", "status", "updated_at", "deleted_at",
      "location", "institution_name", "supervisor_name", "mentor_name",
    ],
  },
  {
    name: "activities",
    expectedColumns: [
      "id", "logbook_id", "activity_date", "start_time", "end_time",
      "title", "description", "obstacle", "created_at", "status",
      "duration_minutes", "position", "updated_at", "deleted_at",
    ],
  },
  {
    name: "photos",
    expectedColumns: [
      "id", "activity_id", "google_file_id", "google_drive_url", "created_at",
      "caption", "position", "is_primary", "mime_type", "file_size",
      "updated_at", "deleted_at",
    ],
  },
];

async function checkTable(tableName: string, expectedColumns: string[]) {
  console.log(`\n=== CHECKING TABLE: ${tableName.toUpperCase()} ===`);

  // 1. Check if table is readable
  const { data: sampleData, error: selectError } = await supabaseAdmin
    .from(tableName)
    .select("*")
    .limit(1);

  if (selectError) {
    console.error(`❌ [FAIL] Error selecting from table "${tableName}":`, selectError.message);
    return;
  }
  console.log(`✅ [OK] Table "${tableName}" is readable.`);
  if (sampleData.length > 0) {
    console.log("Sample Data:", JSON.stringify(sampleData[0], null, 2));
  } else {
    console.log("Sample Data: (Table is empty)");
  }

  const actualColumns = sampleData.length > 0 ? Object.keys(sampleData[0]) : [];
  console.log(`Actual columns in Supabase:`, actualColumns);

  const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
  const extraColumns = actualColumns.filter((col: string) => !expectedColumns.includes(col));

  if (missingColumns.length === 0) {
    console.log(`✅ [OK] All expected columns are present.`);
  } else {
    console.error(`❌ [FAIL] Missing columns in spec: ${missingColumns.join(", ")}`);
  }

  if (extraColumns.length > 0) {
    console.warn(`⚠️ [WARN] Found extra columns not in spec: ${extraColumns.join(", ")}`);
  }
}

async function main() {
  console.log("Starting Supabase schema check...");
  for (const table of tablesToCheck) {
    await checkTable(table.name, table.expectedColumns);
  }
  console.log("\nSchema check complete.");
}

main().catch(console.error);
