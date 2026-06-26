import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserIdByEmail } from "@/lib/user";
import { getLogbookDetail } from "@/services/logbook.service";
import { getActivitiesByLogbookId } from "@/services/activity.service";
import { supabaseAdmin } from "@/lib/supabase-server";
import CreateActivityForm from "@/components/forms/CreateActivityForm";

function getFirstEmptyDay(
  startDate: string,
  endDate: string,
  existingDates: Set<string>
): string {
  const start = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");
  const current = new Date(start);

  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0];
    if (!existingDates.has(dateStr)) {
      return dateStr;
    }
    current.setDate(current.getDate() + 1);
  }

  // If all days filled, return the last day
  return end.toISOString().split("T")[0];
}

export default async function CreateActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ date?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h1>
          <p className="text-gray-500 mb-6">Please sign in to create an activity.</p>
          <a
            href="/api/auth/signin"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            Sign in with Google
          </a>
        </div>
      </div>
    );
  }

  const { id } = await params;
  const queryDate = (await searchParams)?.date;

  const userId = await getUserIdByEmail(session.user.email);
  if (!userId) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <p className="text-gray-500">User not found.</p>
      </div>
    );
  }

  const logbook = await getLogbookDetail(id, userId);
  if (!logbook) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Logbook Not Found</h1>
          <p className="text-gray-500 mb-6">The logbook you are looking for does not exist.</p>
          <a
            href="/logbook"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            Back to Logbooks
          </a>
        </div>
      </div>
    );
  }

  // Compute default date
  let defaultDate = "";

  // Priority 1: query param date
  if (queryDate && queryDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    defaultDate = queryDate;
  } else if (logbook.start_date && logbook.end_date) {
    // Priority 2: first empty day, Priority 3: last day (fallback)
    const existingActivities = await getActivitiesByLogbookId(id);
    const existingDates = new Set(existingActivities.map((a) => a.activity_date));
    defaultDate = getFirstEmptyDay(logbook.start_date, logbook.end_date, existingDates);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6">
        <a
          href={`/logbook/${id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to {logbook.title}
        </a>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Create Activity</h1>
        <p className="text-sm text-gray-500 mt-1">
          Fill in the details below to add a new activity to your logbook.
        </p>
      </div>
      <CreateActivityForm logbookId={id} defaultDate={defaultDate} />
    </div>
  );
}
