import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserIdByEmail, getUserByEmail } from "@/lib/user";
import ProfileClient from "@/components/features/ProfileClient";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h1>
          <p className="text-gray-500 mb-6">Please sign in to view your profile.</p>
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

  const userProfile = await getUserByEmail(session.user.email);
  if (!userProfile) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <p className="text-gray-500">User not found.</p>
      </div>
    );
  }

  return <ProfileClient user={userProfile} />;
}
