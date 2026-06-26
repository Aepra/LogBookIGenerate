import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserIdByEmail } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase-server";
import EditActivityForm from "@/components/forms/EditActivityForm";

export default async function EditActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h1>
          <p className="text-gray-500 mb-6">Please sign in to edit this activity.</p>
          <a href="/api/auth/signin" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors">
            Masuk dengan Google
          </a>
        </div>
      </div>
    );
  }

  const { id } = await params;
  const userId = await getUserIdByEmail(session.user.email);
  if (!userId) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <p className="text-gray-500">User not found.</p>
      </div>
    );
  }

  // Fetch activity
  const { data: activity } = await supabaseAdmin
    .from("activities")
    .select("*")
    .eq("id", id)
    .single();

  if (!activity) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Aktivitas Tidak Ditemukan</h1>
          <p className="text-gray-500 mb-6">The activity you are looking for does not exist.</p>
          <a href="/logbook" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors">
            Kembali ke Logbook
          </a>
        </div>
      </div>
    );
  }

  // Verify ownership
  const { data: logbook } = await supabaseAdmin
    .from("logbooks")
    .select("id, title")
    .eq("id", activity.logbook_id)
    .eq("user_id", userId)
    .single();

  if (!logbook) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Forbidden</h1>
          <p className="text-gray-500 mb-6">You don't have permission to edit this activity.</p>
          <a href="/logbook" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors">
            Kembali ke Logbook
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl md:px-8 mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="mb-5">
        <a
          href={`/logbook/${logbook.id}`}
          className="inline-flex items-center gap-1 text-[13px] text-[var(--accent-blue)] font-medium mb-3 hover:opacity-80 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke {logbook.title}
        </a>
        <h1 className="text-[28px] sm:text-[32px] font-bold text-[var(--text-primary)] tracking-tight">Edit Aktivitas</h1>
        <p className="text-[14px] text-[var(--text-secondary)] mt-0.5">
          Update the activity details below.
        </p>
      </div>
      <EditActivityForm activity={activity} />
    </div>
  );
}