import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserIdByEmail } from "@/lib/user";
import { getUserLogbooksWithStats } from "@/services/logbook.service";
import LogbookListClient from "@/components/features/LogbookListClient";
import Link from "next/link";

export default async function LogbookListPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h1>
          <p className="text-gray-500 mb-6">Please sign in to view your logbooks.</p>
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

  const userId = await getUserIdByEmail(session.user.email);
  if (!userId) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <p className="text-gray-500">User not found.</p>
      </div>
    );
  }

  const logbooks = await getUserLogbooksWithStats(userId);

  return (
    <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-[24px] sm:text-[28px] font-bold text-[var(--text-primary)] tracking-tight">Logbooks</h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
          Manage all your logbooks in one place.
        </p>
      </div>

      {/* Client component with search and filter */}
      <LogbookListClient logbooks={logbooks} />
    </div>
  );
}
