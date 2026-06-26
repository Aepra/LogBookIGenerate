import { generateLogbookDocx } from "../src/services/export-docx.service";

async function run() {
  try {
     // We just need dummy data that satisfies the type signature
     const logbook = { location: "Test", mentor_name: "Test", supervisor_name: "Test" } as any;
     const activities = [
        {
           id: "1",
           logbook_id: "L1",
           activity_date: "2026-06-03T00:00:00Z",
           start_time: "08:00",
           end_time: "10:00",
           title: "Kegiatan A",
           obstacle: "-",
           created_at: "",
           updated_at: ""
        }
     ] as any[];
     const user = { name: "Test User", nim: "123", study_program: "SI" } as any;
     
     console.log("Calling generateLogbookDocx...");
     await generateLogbookDocx({ logbook, activities, user, accessToken: "fake", refreshToken: "fake" });
     console.log("Success!");
  } catch (e) {
     console.error("Crash:", e);
  }
}
run();
