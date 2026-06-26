import { supabaseAdmin } from "../lib/supabase-server";

type TableCheck = {
  name: string;
  expectedColumns: string[];
};

const tablesToCheck: TableCheck[] = [
  { name: "users", expectedColumns: ["id", "google_id", "name", "email", "avatar", "created_at", "drive_folder_id"] },
  { name: "logbooks", expectedColumns: ["id", "user_id", "title", "description", "type", "created_at"] },
  { name: "activities", expectedColumns: ["id", "logbook_id", "activity_date", "start_time", "end_time", "title", "description", "obstacle", "created_at"] },
  { name: "photos", expectedColumns: ["id", "activity_id", "google_file_id", "google_drive_url"] },
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

  // 2. Check columns
  const { data: columnsData, error: rpcError } = await supabaseAdmin.rpc('get_table_columns', { table_name: tableName });

  if (rpcError) {
    console.error(`❌ [FAIL] Error fetching columns for table "${tableName}":`, rpcError.message);
    return;
  }

  const actualColumns = columnsData.map((col: any) => col.column_name);
  const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
  const extraColumns = actualColumns.filter((col: string) => !expectedColumns.includes(col));

  if (missingColumns.length === 0) {
    console.log(`✅ [OK] All expected columns are present.`);
  } else {
    console.error(`❌ [FAIL] Missing columns: ${missingColumns.join(", ")}`);
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