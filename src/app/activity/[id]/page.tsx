import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserIdByEmail } from "@/lib/user";
import { supabaseAdmin } from "@/lib/supabase-server";
import ActivityClient from "@/components/features/ActivityClient";

export default async function ActivityDetailPage({
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
          <p className="text-gray-500 mb-6">Please sign in to view this activity.</p>
          <a href="/api/auth/signin" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors">
            Sign in with Google
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

  // Fetch activity with photos
  const { data: activity, error: activityError } = await supabaseAdmin
    .from("activities")
    .select("*")
    .eq("id", id)
    .single();

  if (activityError || !activity) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Activity Not Found</h1>
          <p className="text-gray-500 mb-6">The activity you are looking for does not exist.</p>
          <a href="/logbook" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors">
            Back to Logbooks
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
          <p className="text-gray-500 mb-6">You don't have permission to view this activity.</p>
          <a href="/logbook" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors">
            Back to Logbooks
          </a>
        </div>
      </div>
    );
  }

  // Fetch photos for this activity
  const { data: photos } = await supabaseAdmin
    .from("photos")
    .select("id, file_name, file_url, thumbnail_url")
    .eq("activity_id", id);

  const activityWithPhotos = {
    ...activity,
    photos: photos || [],
  };

  return (
    <ActivityClient
      activity={activityWithPhotos}
      logbookTitle={logbook.title}
    />
  );
}