"use client";

import Link from "next/link";
import Image from "next/image";
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
        ? "text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)] pb-[13px] pt-[15px]"
        : "text-[var(--text-secondary)] hover:text-[var(--accent-primary)] pb-[15px] pt-[15px]"
    }`;

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[rgba(0,0,0,0.08)] hidden md:block shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between h-[60px]">
          {/* Left: Logo + Navigation */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-[19px] font-bold text-[var(--accent-primary)] tracking-tight flex items-center gap-2"
            >
              Riwaya'
            </Link>
            <div className="flex items-center gap-5">
              <Link href="/" className={linkClass("/")}>
                Beranda
              </Link>
              <Link href="/logbook" className={linkClass("/logbook")}>
                Logbook
              </Link>
              {user && (
                <Link href="/profile" className={linkClass("/profile")}>
                  Profil
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
                  className="ios-btn-primary flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Buat Logbook
                </Link>
                <Link href="/profile" className="flex-shrink-0">
                  {user.image ? (
                    <div className="relative w-9 h-9 rounded-full ring-2 ring-[var(--card-border)] hover:ring-[var(--accent-primary)] transition-all duration-200 overflow-hidden">
                      <Image
                        src={user.image}
                        alt={user.name || "Avatar"}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#f1f5f9] text-[var(--accent-primary)] flex items-center justify-center text-sm font-semibold ring-2 ring-[var(--card-border)] hover:ring-[var(--accent-primary)] transition-all duration-200">
                      {(user.name || "U")[0].toUpperCase()}
                    </div>
                  )}
                </Link>
              </>
            ) : (
              <Link
                href="/api/auth/signin"
                className="ios-btn-primary"
              >
                Masuk
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
