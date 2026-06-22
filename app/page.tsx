import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { getUserIdByEmail } from "@/lib/user";
import { getUserLogbooks } from "@/services/logbook.service";
import Link from "next/link";
import DashboardClient from "@/components/DashboardClient";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-24">
        <h1 className="text-4xl font-bold mb-6">LogBook.ID</h1>
        <p className="mb-8 text-gray-400">
          Platform manajemen logbook terintegrasi Google Drive.
        </p>
        <Link
          href="/api/auth/signin"
          className="bg-white text-black px-6 py-3 rounded-md font-semibold hover:bg-gray-200 transition"
        >
          Masuk dengan Google
        </Link>
      </main>
    );
  }

  const userId = session.user?.email
    ? await getUserIdByEmail(session.user.email)
    : null;

  const logbooks = userId ? await getUserLogbooks(userId) : [];

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-4 sm:p-10">
      <div className="max-w-4xl mx-auto">
        {/* Profile Card */}
        <div className="bg-white p-8 rounded-lg shadow-md mb-6">
          <div className="flex items-center space-x-4 border-b pb-6">
            {session.user?.image && (
              <img
                src={session.user.image}
                alt="Profile"
                className="w-16 h-16 rounded-full"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold">
                Selamat datang, {session.user?.name}!
              </h1>
              <p className="text-gray-500">{session.user?.email}</p>
            </div>
          </div>
        </div>

        {/* Logbook Section */}
        <DashboardClient logbooks={logbooks} />
      </div>
    </main>
  );
}