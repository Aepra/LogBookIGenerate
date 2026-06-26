import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserIdByEmail, getUserByEmail } from "@/lib/user";
import { getLogbookDetail } from "@/services/logbook.service";
import { getActivitiesByLogbookId } from "@/services/activity.service";
import { getPhotosByActivityIds, type PhotoRecord } from "@/services/photo.service";
import LogbookDetailPageClient from "@/components/features/LogbookDetailPageClient";

export default async function LogbookDetailPage({
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
          <p className="text-gray-500 mb-6">Please sign in to view this logbook.</p>
          <a
            href="/api/auth/signin"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            Masuk dengan Google
          </a>
        </div>
      </div>
    );
  }

  const userId = await getUserIdByEmail(session.user.email);
  const userProfile = await getUserByEmail(session.user.email);
  if (!userId || !userProfile) {
    return <NotFound />;
  }

  const { id } = await params;
  const logbook = await getLogbookDetail(id, userId);

  if (!logbook) {
    return <NotFound />;
  }

  // Get all activities for this logbook
  const activities = await getActivitiesByLogbookId(id);

  // Fetch photos for all activities (batch query)
  const activityIds = activities.map((a) => a.id);
  const photoMap = await getPhotosByActivityIds(activityIds);

  // Attach photos to each activity
  const activitiesWithPhotos = activities.map((activity) => {
    const photos = photoMap.get(activity.id) || [];
    return {
      ...activity,
      photos: photos.map((p: PhotoRecord) => ({
        id: p.id,
        file_name: p.google_file_id || "photo",
        file_url: `/api/photos/proxy?fileId=${p.google_file_id}`,
        thumbnail_url: `/api/photos/proxy?fileId=${p.google_file_id}`,
      })),
    };
  });

  return (
    <LogbookDetailPageClient
      user={userProfile}
      logbook={logbook as any}
      activities={activitiesWithPhotos as any}
    />
  );
}

function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Logbook Tidak Ditemukan</h1>
        <p className="text-gray-500 mb-6">
          Buku log yang Anda cari tidak ada atau telah dihapus.
        </p>
        <a
          href="/logbook"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          Kembali ke Logbook
        </a>
      </div>
    </div>
  );
}