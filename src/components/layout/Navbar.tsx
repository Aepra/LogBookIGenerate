"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavbarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  const linkClass = (path: string) =>
    `text-sm font-medium transition-all duration-200 ${
      isActive(path)
        ? "text-[var(--accent-blue)]"
        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
    }`;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[rgba(0,0,0,0.06)] hidden md:block">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-[52px]">
          {/* Left: Logo + Navigation */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-[17px] font-semibold text-[var(--text-primary)] tracking-tight"
            >
              LogBook.ID
            </Link>
            <div className="flex items-center gap-5">
              <Link href="/" className={linkClass("/")}>
                Home
              </Link>
              <Link href="/logbook" className={linkClass("/logbook")}>
                Logbook
              </Link>
              {user && (
                <Link href="/profile" className={linkClass("/profile")}>
                  Profile
                </Link>
              )}
            </div>
          </div>

          {/* Right: Actions + Avatar */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/logbook/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--accent-blue)] text-white text-sm font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Logbook
                </Link>
                <Link href="/profile" className="flex-shrink-0">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name || "Avatar"}
                      className="w-8 h-8 rounded-full ring-1.5 ring-[rgba(0,0,0,0.08)] hover:ring-[var(--accent-blue)] transition-all duration-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[rgba(0,122,255,0.1)] text-[var(--accent-blue)] flex items-center justify-center text-sm font-semibold ring-1.5 ring-[rgba(0,0,0,0.08)] hover:ring-[var(--accent-blue)] transition-all duration-200">
                      {(user.name || "U")[0]}
                    </div>
                  )}
                </Link>
              </>
            ) : (
              <Link
                href="/api/auth/signin"
                className="px-5 py-2 text-sm font-semibold text-white bg-[var(--accent-blue)] rounded-xl hover:opacity-90 active:scale-[0.98] transition-all duration-200"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}