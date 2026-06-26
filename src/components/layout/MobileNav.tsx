"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function MobileNav() {
  const pathname = usePathname();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [logbooks, setLogbooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (showAddMenu && logbooks.length === 0) {
      setLoading(true);
      fetch("/api/logbooks")
        .then((res) => res.json())
        .then((data) => {
          setLogbooks(data.logbooks || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [showAddMenu]);

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  const navItems = [
    {
      href: "/",
      label: "Home",
      icon: (active: boolean) =>
        active ? (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3L4 9v12h5v-7h6v7h5V9z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
    },
    {
      href: "/logbook",
      label: "Logbook",
      icon: (active: boolean) =>
        active ? (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        ),
    },
    {
      href: "/logbook/new",
      label: "New",
      icon: () => (
        <div className="w-10 h-10 rounded-full bg-[var(--accent-primary)] flex items-center justify-center shadow-md shadow-red-900/20">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </div>
      ),
    },
    {
      href: "/profile",
      label: "Profile",
      icon: (active: boolean) =>
        active ? (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-xl border-t border-[rgba(0,0,0,0.05)] md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-[56px] pb-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const isCreateBtn = item.href === "/logbook/new";
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => {
                if (isCreateBtn) {
                  e.preventDefault();
                  setShowAddMenu(true);
                }
              }}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] pt-1 ${
                isCreateBtn ? "-mt-1.5" : ""
              }`}
            >
              <div className={`transition-all duration-200 ${
                active && !isCreateBtn ? "text-[var(--accent-primary)] scale-110" : "text-[var(--text-tertiary)]"
              }`}>
                {item.icon(active)}
              </div>
              {!isCreateBtn && (
                <span className={`text-[9px] font-medium transition-all duration-200 ${
                  active ? "text-[var(--accent-primary)] font-bold" : "text-[var(--text-tertiary)]"
                }`}>
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Add Menu Action Sheet */}
      {showAddMenu && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => setShowAddMenu(false)}>
          <div className="bg-white rounded-t-2xl p-5 w-full max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-[17px] font-bold text-[var(--text-primary)]">Buka Logbook</h2>
              <button onClick={() => setShowAddMenu(false)} className="p-2 -mr-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              <p className="text-[12px] font-medium text-[var(--text-secondary)] mb-3">Pilih Logbook:</p>
              {loading ? (
                <div className="py-6 flex flex-col items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[12px] text-[var(--text-secondary)]">Memuat logbook...</span>
                </div>
              ) : logbooks.length > 0 ? (
                <div className="space-y-2 pb-2">
                  {logbooks.map((lb) => (
                    <Link
                      key={lb.id}
                      href={`/logbook/${lb.id}`}
                      onClick={() => setShowAddMenu(false)}
                      className="block p-3.5 border border-[var(--card-border)] rounded-xl hover:border-[var(--accent-primary)] hover:bg-[#b3000008] transition-all"
                    >
                      <h3 className="text-[14px] font-semibold text-[var(--text-primary)] truncate mb-0.5">{lb.title}</h3>
                      <p className="text-[11px] text-[var(--text-tertiary)] truncate">
                        {lb.institution_name} {lb.status === 'active' && '· Aktif'}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-[13px] text-[var(--text-tertiary)] bg-[var(--fill-secondary)] rounded-xl border border-dashed border-[var(--card-border)]">
                  Belum ada logbook
                </div>
              )}
            </div>
            
            <div className="flex-shrink-0">
              <div className="relative flex py-4 items-center">
                  <div className="flex-grow border-t border-[var(--card-border)]"></div>
                  <span className="flex-shrink-0 mx-4 text-[var(--text-tertiary)] text-[11px] font-medium">Atau</span>
                  <div className="flex-grow border-t border-[var(--card-border)]"></div>
              </div>

              <Link
                href="/logbook/new"
                onClick={() => setShowAddMenu(false)}
                className="flex items-center justify-center gap-2 w-full p-3.5 bg-[var(--accent-primary)] text-white rounded-xl font-medium text-[14px] hover:bg-[#8a0000] shadow-md shadow-red-900/20 active:scale-[0.98] transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                Buat Logbook Baru
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
