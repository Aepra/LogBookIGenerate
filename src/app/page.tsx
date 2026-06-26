import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { getUserIdByEmail } from "@/lib/user";
import { getRecentLogbooks } from "@/services/logbook.service";
import { getRecentActivities } from "@/services/activity.service";
import { getDashboardStats } from "@/services/dashboard.service";
import StatCard from "@/components/ui/StatCard";
import RecentActivities from "@/components/features/RecentActivities";
import Link from "next/link";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return <Unauthenticated />;
  }

  const userId = await getUserIdByEmail(session.user.email);
  if (!userId) {
    return <Unauthenticated />;
  }

  // OPTIMIZED: getDashboardStats does in 3 queries what used to take 8 queries
  const [stats, recentLogbooks, recentActivities] = await Promise.all([
    getDashboardStats(userId),
    getRecentLogbooks(userId, 5),
    getRecentActivities(userId, 10),
  ]);

  const { totalLogbooks, totalHari, totalActivities, totalPhotos } = stats;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* Page Title */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-[28px] sm:text-[32px] font-bold text-[var(--text-primary)] tracking-tight">Dashboard</h1>
        <p className="text-[14px] text-[var(--text-secondary)] mt-0.5">Ikhtisar dari semua logbook dan aktivitas Anda.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-6 sm:mb-7">
        <StatCard
          label="Logbook"
          value={totalLogbooks}
          color="primary"
          icon={
            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          label="Hari"
          value={totalHari}
          color="yellow"
          icon={
            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          label="Aktivitas"
          value={totalActivities}
          color="green"
          icon={
            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        />
        <StatCard
          label="Foto"
          value={totalPhotos}
          color="red"
          icon={
            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Recent Logbooks */}
        <section>
          <div className="flex items-center justify-between mb-3 px-0.5">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
              Logbook Terkini
            </h2>
            <Link
              href="/logbook"
              className="text-[13px] text-[var(--accent-primary)] font-medium hover:opacity-80 transition-opacity"
            >
              Lihat Semua
            </Link>
          </div>
          <div className="space-y-2">
            {recentLogbooks.length === 0 ? (
              <div className="ios-card p-8 text-center">
                <p className="text-[14px] text-[var(--text-secondary)]">Belum ada logbook.</p>
                <Link
                  href="/logbook/new"
                  className="inline-block mt-2 text-[13px] text-[var(--accent-primary)] font-medium hover:underline"
                >
                  Buat logbook pertama Anda
                </Link>
              </div>
            ) : (
              recentLogbooks.map((logbook) => (
                <Link
                  key={logbook.id}
                  href={`/logbook/${logbook.id}`}
                  className="block ios-card p-3.5 sm:p-4 hover:shadow-md transition-all duration-200 active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium text-[var(--text-primary)] truncate">
                        {logbook.title}
                      </p>
                      <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                        {new Date(logbook.created_at).toLocaleDateString("id-ID", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <svg
                      className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Recent Activities */}
        <RecentActivities activities={recentActivities} />
      </div>
    </div>
  );
}

function Unauthenticated() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Riwaya'</h1>
        <p className="text-gray-500 mb-6">
          Kelola logbook Anda dengan integrasi Google Drive. Masuk untuk memulai.
        </p>
        <a
          href="/api/auth/signin"
          className="ios-btn-primary inline-flex items-center gap-2 px-8 py-3.5 text-[15px]"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Masuk dengan Google
        </a>
      </div>
    </div>
  );
}
