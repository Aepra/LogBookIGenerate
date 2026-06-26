"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface LogbookWithStats {
  id: string;
  title: string;
  description: string;
  type: string;
  status?: string;
  location?: string;
  institution_name?: string;
  supervisor_name?: string;
  mentor_name?: string;
  created_at: string;
  total_days: number;
  total_activities: number;
  total_photos: number;
  progress_percent: number;
  remaining_days: number;
  start_date?: string;
  end_date?: string;
}

function getProgressClass(pct: number): string {
  if (pct >= 100) return "success";
  if (pct >= 71) return "success";
  if (pct >= 31) return "warning";
  return "danger";
}

function getProgressColor(pct: number): string {
  if (pct >= 100) return "text-[var(--accent-green)]";
  if (pct >= 71) return "text-[var(--accent-green)]";
  if (pct >= 31) return "text-[var(--accent-yellow)]";
  return "text-[var(--accent-red)]";
}

function formatDateRange(start?: string, end?: string) {
  if (!start || !end) return "";
  const s = new Date(start + "T00:00:00Z");
  const e = new Date(end + "T00:00:00Z");
  return `${s.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} — ${e.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;
}

export default function LogbookListClient({
  logbooks,
}: {
  logbooks: LogbookWithStats[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "title-asc" | "title-desc" | "progress-high" | "progress-low">("newest");

  const sorted = useMemo(() => [...logbooks].sort((a, b) => {
    switch (sort) {
      case "newest": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "oldest": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "title-asc": return a.title.localeCompare(b.title);
      case "title-desc": return b.title.localeCompare(a.title);
      case "progress-high": return b.progress_percent - a.progress_percent;
      case "progress-low": return a.progress_percent - b.progress_percent;
      default: return 0;
    }
  }), [logbooks, sort]);

  const filtered = useMemo(() => sorted.filter((l) => {
    const matchesSearch = !search || l.title.toLowerCase().includes(search.toLowerCase());
    if (filter === "active") return matchesSearch && l.progress_percent < 100;
    if (filter === "completed") return matchesSearch && l.progress_percent >= 100 && l.total_days > 0;
    return matchesSearch;
  }), [sorted, search, filter]);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this logbook?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/logbooks/${id}/delete`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.refresh();
    } catch {
      alert("Failed to delete.");
    } finally {
      setDeletingId(null);
    }
  };

  const totalActivities = logbooks.reduce((s, l) => s + l.total_activities, 0);
  const totalDays = logbooks.reduce((s, l) => s + l.total_days, 0);
  const totalPhotos = logbooks.reduce((s, l) => s + l.total_photos, 0);

  return (
    <div>
      {/* ─── Stats Ringkas dalam 1 Card ─── */}
      <div className="ios-card p-3.5 mb-5">
        <div className="flex items-center justify-around gap-2 text-center">
          <div>
            <p className="text-[18px] font-bold text-[var(--accent-blue)]">{logbooks.length}</p>
            <p className="text-[9px] text-[var(--text-secondary)] mt-0.5">Logbooks</p>
          </div>
          <div className="w-px h-8 bg-[var(--card-border)]" />
          <div>
            <p className="text-[18px] font-bold text-[var(--accent-green)]">{totalActivities}</p>
            <p className="text-[9px] text-[var(--text-secondary)] mt-0.5">Activities</p>
          </div>
          <div className="w-px h-8 bg-[var(--card-border)]" />
          <div>
            <p className="text-[18px] font-bold text-[var(--accent-yellow)]">{totalDays}</p>
            <p className="text-[9px] text-[var(--text-secondary)] mt-0.5">Days</p>
          </div>
          <div className="w-px h-8 bg-[var(--card-border)]" />
          <div>
            <p className="text-[18px] font-bold text-[var(--accent-red)]">{totalPhotos}</p>
            <p className="text-[9px] text-[var(--text-secondary)] mt-0.5">Photos</p>
          </div>
        </div>
      </div>

      {/* ─── Search ─── */}
      <div className="relative mb-2.5">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search logbooks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ios-search !pl-9"
        />
      </div>

      {/* ─── Filter + New Button ─── */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {(["all", "active", "completed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`ios-pill ${filter === f ? "active" : ""}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <Link
          href="/logbook/new"
          className="ios-pill !px-2 !py-1 text-[11px] font-semibold text-[var(--accent-blue)] bg-[rgba(37,99,235,0.08)] hover:bg-[rgba(37,99,235,0.15)] transition-colors inline-flex items-center gap-0.5 ml-auto"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          +New
        </Link>
      </div>

      {/* ─── Card List ─── */}
      {filtered.length === 0 ? (
        <div className="ios-card p-8 text-center">
          <div className="w-10 h-10 rounded-xl bg-[var(--fill-secondary)] flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">
            {search || filter !== "all" ? "No results found" : "No logbooks yet"}
          </p>
          <p className="text-[12px] text-[var(--text-secondary)]">
            {search || filter !== "all" ? "Try a different search or filter." : "Create your first logbook to get started."}
          </p>
          {!search && filter === "all" && (
            <Link href="/logbook/new" className="ios-btn-primary inline-flex items-center gap-1.5 mt-3">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Create Logbook
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((logbook) => {
            const pct = logbook.progress_percent;
            const progClass = getProgressClass(pct);

            return (
              <div key={logbook.id} className="ios-card">
                <Link href={`/logbook/${logbook.id}`} className="block p-3.5">
                  {/* Header: title + type/status badges + actions */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[14px] font-bold text-[var(--text-primary)] truncate">{logbook.title}</h3>
                        <span className="text-[9px] font-medium text-[var(--accent-blue)] bg-[rgba(37,99,235,0.06)] px-1.5 py-0.5 rounded uppercase leading-none">{logbook.type}</span>
                        {logbook.status && (
                          <span className={`text-[9px] font-medium capitalize px-1.5 py-0.5 rounded leading-none ${
                            logbook.status === "completed" ? "text-[var(--accent-green)] bg-[rgba(34,197,94,0.06)]" :
                            logbook.status === "active" ? "text-[var(--accent-blue)] bg-[rgba(37,99,235,0.06)]" :
                            "text-[var(--accent-yellow)] bg-[rgba(245,158,11,0.06)]"
                          }`}>{logbook.status}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          router.push(`/logbook/${logbook.id}/detail`);
                        }}
                        className="text-[9px] font-medium text-[var(--accent-blue)] bg-[rgba(37,99,235,0.06)] px-1.5 py-0.5 rounded hover:bg-[rgba(37,99,235,0.12)] transition-colors leading-none"
                      >
                        Details
                      </button>
                      <button
                        onClick={(e) => handleDelete(logbook.id, e)}
                        disabled={deletingId === logbook.id}
                        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 hover:bg-red-100 transition-colors disabled:opacity-30"
                        title="Delete"
                      >
                        <svg className="w-3 h-3 text-[var(--text-tertiary)] hover:text-[var(--accent-red)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {logbook.description && (
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed line-clamp-1 mb-2.5">
                      {logbook.description}
                    </p>
                  )}

                  {/* Grid: stats row + details row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    {/* Left: stats */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                      <span><strong className="text-[var(--accent-yellow)]">{logbook.total_days}</strong> days</span>
                      <span className="text-[var(--text-tertiary)]">·</span>
                      <span><strong className="text-[var(--accent-blue)]">{logbook.total_activities}</strong> activities</span>
                      <span className="text-[var(--text-tertiary)]">·</span>
                      <span><strong className="text-[var(--accent-red)]">{logbook.total_photos}</strong> photos</span>
                      <span className="text-[var(--text-tertiary)]">·</span>
                      <span><strong className={pct >= 100 ? "text-[var(--accent-green)]" : "text-[var(--accent-yellow)]"}>{logbook.remaining_days}</strong> remaining</span>
                    </div>

                    {/* Right: date range + institution/location/supervisor/mentor (inline) */}
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-[var(--text-secondary)]">
                      {logbook.start_date && logbook.end_date && (
                        <span className="inline-flex items-center gap-1 truncate">
                          <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDateRange(logbook.start_date, logbook.end_date)}
                        </span>
                      )}
                      {logbook.institution_name && (
                        <span className="truncate max-w-[120px]">{logbook.institution_name}</span>
                      )}
                      {logbook.supervisor_name && (
                        <span className="truncate max-w-[100px]">Sup: {logbook.supervisor_name}</span>
                      )}
                      {logbook.mentor_name && (
                        <span className="truncate max-w-[100px]">Mnt: {logbook.mentor_name}</span>
                      )}
                      {logbook.location && (
                        <span className="truncate max-w-[80px]">{logbook.location}</span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wide font-medium">Progress</span>
                      <span className={`text-[9px] font-semibold ${getProgressColor(pct)}`}>{pct}%</span>
                    </div>
                    <div className="ios-progress h-1.5">
                      <div
                        className={`ios-progress-bar ${progClass}`}
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                  </div>
                </Link>

                {/* Bottom: created date only */}
                <div className="px-3.5 pb-2.5 flex items-center justify-end">
                  <span className="text-[9px] text-[var(--text-tertiary)]">
                    {new Date(logbook.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
