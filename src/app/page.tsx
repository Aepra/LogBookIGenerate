import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { getUserIdByEmail } from "@/lib/user";
import { getRecentLogbooks } from "@/services/logbook.service";
import { getRecentActivities } from "@/services/activity.service";
import { getDashboardStats } from "@/services/dashboard.service";
import StatCard from "@/components/ui/StatCard";
import RecentActivities from "@/components/features/RecentActivities";
import Link from "next/link";
import LoginButton from "@/components/features/LoginButton";

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
    <div className="min-h-[90vh] flex items-center justify-center px-4 overflow-hidden relative">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--accent-blue)] opacity-[0.08] blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--accent-primary)] opacity-[0.08] blur-[100px] pointer-events-none" />
      
      <div className="text-center max-w-lg relative z-10 w-full animate-fade-in-up">
        {/* Logo Icon */}
        <div className="mx-auto w-20 h-20 mb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent-blue)] to-[var(--accent-primary)] rounded-3xl opacity-20 blur-xl animate-pulse-slow"></div>
          <div className="relative w-full h-full bg-white rounded-3xl shadow-xl shadow-black/5 flex items-center justify-center border border-gray-100/50">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-[var(--accent-blue)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
            </svg>
          </div>
        </div>

        {/* Text Content */}
        <h1 className="text-[40px] sm:text-[48px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight mb-4 leading-tight">
          Riwaya'
        </h1>
        <p className="text-[16px] sm:text-[18px] text-[var(--text-secondary)] mb-10 leading-relaxed px-4">
          Kelola logbook harian Anda secara cerdas dengan integrasi langsung ke Google Drive. Simpan, susun, dan hasilkan laporan seketika.
        </p>

        {/* Action Button */}
        <LoginButton />

        {/* Footer Text */}
        <p className="mt-10 text-[12px] font-medium text-gray-400 flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" /></svg>
          Akses aman melalui akun Google Anda
        </p>
      </div>
    </div>
  );
}
