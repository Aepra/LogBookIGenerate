import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import CreateLogbookForm from "@/components/forms/CreateLogbookForm";

export default async function CreateLogbookPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h1>
          <p className="text-gray-500 mb-6">Please sign in to create a logbook.</p>
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="mb-5">
        <h1 className="text-[28px] sm:text-[32px] font-bold text-[var(--text-primary)] tracking-tight">Create New Logbook</h1>
        <p className="text-[14px] text-[var(--text-secondary)] mt-0.5">
          Fill in the details below to create a new logbook.
        </p>
      </div>
      <CreateLogbookForm />
    </div>
  );
}
