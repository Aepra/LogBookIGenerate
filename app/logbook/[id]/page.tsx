import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserIdByEmail } from "@/lib/user";
import { getLogbookById } from "@/services/logbook.service";
import { getActivitiesGroupedByDate } from "@/services/activity.service";
import { getPhotosByActivityIds } from "@/services/photo.service";
import type { PhotoRecord } from "@/services/photo.service";
import Link from "next/link";
import { notFound } from "next/navigation";
import ActivityClient from "@/components/ActivityClient";

export default async function LogbookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-24">
        <h1 className="text-2xl font-bold mb-4">Silakan login terlebih dahulu</h1>
        <Link
          href="/api/auth/signin"
          className="bg-white text-black px-6 py-3 rounded-md font-semibold hover:bg-gray-200 transition"
        >
          Masuk dengan Google
        </Link>
      </main>
    );
  }

  const { id } = await params;

  const userId = session.user?.email
    ? await getUserIdByEmail(session.user.email)
    : null;

  if (!userId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-gray-900 p-10">
        <p className="text-red-500">User tidak ditemukan.</p>
        <Link href="/" className="text-blue-600 hover:underline mt-4">
          Kembali ke Dashboard
        </Link>
      </main>
    );
  }

  const logbook = await getLogbookById(id, userId);

  if (!logbook) {
    notFound();
  }

  // Fetch grouped activities from service layer (grouping done here, not in UI)
  const groupedActivities = await getActivitiesGroupedByDate(id);

  // Fetch photos for all activities (batch query)
  const allActivityIds = groupedActivities.flatMap((g) =>
    g.activities.map((a) => a.id)
  );
  const photosMap = await getPhotosByActivityIds(allActivityIds);
  const initialPhotosByActivity: Record<string, PhotoRecord[]> = {};
  for (const [activityId, photos] of photosMap.entries()) {
    initialPhotosByActivity[activityId] = photos;
  }

  const typeLabel = (type: string) => {
    switch (type) {
      case "pkl":
        return "PKL";
      case "kkn":
        return "KKN";
      default:
        return "Lainnya";
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-4 sm:p-10">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4 transition"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Kembali ke Dashboard
        </Link>

        {/* Logbook Detail Card */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{logbook.title}</h1>
              {logbook.description && (
                <p className="text-gray-500 mt-2">{logbook.description}</p>
              )}
              <p className="text-gray-400 text-sm mt-3">
                Dibuat {formatDate(logbook.created_at)}
              </p>
            </div>
            <span
              className={`ml-4 px-3 py-1 rounded-full text-sm font-medium ${
                logbook.type === "pkl"
                  ? "bg-blue-100 text-blue-800"
                  : logbook.type === "kkn"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {typeLabel(logbook.type)}
            </span>
          </div>
        </div>

        {/* Activities Section with Client Component */}
        <ActivityClient
          logbookId={id}
          initialGroupedActivities={groupedActivities}
          initialPhotosByActivity={initialPhotosByActivity}
        />
      </div>
    </main>
  );
}