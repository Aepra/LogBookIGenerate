"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@/lib/user";

interface ActivityPhoto {
  id: string;
  file_name: string;
  file_url: string;
  thumbnail_url: string;
  google_file_id?: string;
}

interface Activity {
  id: string;
  logbook_id: string;
  activity_date: string;
  title: string;
  description: string;
  created_at: string;
  photos: ActivityPhoto[];
}

interface LogbookDetail {
  id: string;
  user_id: string;
  title: string;
  description: string;
  type: string;
  status?: string;
  location?: string;
  institution_name?: string;
  supervisor_name?: string;
  created_at: string;
  start_date?: string;
  end_date?: string;
  total_days: number;
  total_activities: number;
  total_photos: number;
  progress_percent: number;
  filled_days: number;
  total_date_range_days: number;
  activity_count_by_date?: Record<string, number>;
}

function getProgressClass(pct: number): string {
  if (pct >= 100) return "success";
  if (pct >= 71) return "success";
  if (pct >= 31) return "warning";
  return "danger";
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function InfoIcon({ paths, className }: { paths: string; className?: string }) {
  return (
    <svg className={`w-3.5 h-3.5 text-[var(--text-tertiary)] mt-0.5 ${className || ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={paths} />
    </svg>
  );
}

export default function LogbookDetailPageClient({
  user,
  logbook,
  activities,
}: {
  user: UserProfile;
  logbook: LogbookDetail;
  activities: Activity[];
}) {
  const router = useRouter();
  const progressClass = getProgressClass(logbook.progress_percent);
  const totalPhotos = activities.reduce((s, a) => s + a.photos.length, 0);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);

  const handleExport = async (format: "pdf" | "docx") => {
    setExporting(format);
    try {
      const url = `/api/export/logbook/download?logbook_id=${logbook.id}&format=${format}`;
      // Trigger download by navigating
      window.open(url, "_blank");
    } catch {
      setMessage({ type: "error", text: "Gagal mengexport logbook." });
    } finally {
      setExporting(null);
      setShowExportModal(false);
    }
  };
  const [form, setForm] = useState({
    title: logbook.title || "",
    description: logbook.description || "",
    type: logbook.type || "pkl",
    status: logbook.status || "",
    location: logbook.location || "",
    institution_name: logbook.institution_name || "",
    supervisor_name: logbook.supervisor_name || "",
    mentor_name: (logbook as any).mentor_name || "",
    start_date: logbook.start_date || "",
    end_date: logbook.end_date || "",
  });

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/logbooks/${logbook.id}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      setMessage({ type: "success", text: "Logbook berhasil diperbarui!" });
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Gagal menyimpan" });
    } finally {
      setSaving(false);
    }
  };

  const activitiesByDate: Record<string, Activity[]> = {};
  for (const activity of activities) {
    const date = activity.activity_date;
    if (!activitiesByDate[date]) activitiesByDate[date] = [];
    activitiesByDate[date].push(activity);
  }

  const sortedDates = Object.keys(activitiesByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-5 sm:py-8">
      {/* Back link */}
      <Link
        href="/logbook"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--accent-blue)] mb-5 hover:opacity-80 transition-opacity"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Logbooks
      </Link>

      {/* Toast message */}
      {message && (
        <div className={`mb-4 p-3 rounded-xl text-[13px] font-medium ${message.type === "success" ? "bg-[rgba(34,197,94,0.1)] text-[var(--accent-green)]" : "bg-[rgba(239,68,68,0.1)] text-[var(--accent-red)]"}`}>
          {message.text}
        </div>
      )}

      {/* ── MAIN CARD: Header + User + Detail ── */}
      <div className="ios-card overflow-hidden mb-4">
        {/* ===== HEADER SECTION ===== */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-[var(--text-primary)] break-words">{logbook.title}</h1>
              {logbook.description && (
                <p className="text-[13px] text-[var(--text-secondary)] mt-1 leading-relaxed break-words">{logbook.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
              <button
                onClick={() => { setIsEditing(!isEditing); setMessage(null); }}
                className="ios-btn-primary !py-1.5 !px-2.5 text-[11px] inline-flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {isEditing ? "Cancel" : "Edit"}
              </button>
              <Link
                href={`/logbook/${logbook.id}/review`}
                className="ios-btn-primary !py-1.5 !px-2.5 text-[11px] inline-flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview
              </Link>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {logbook.start_date && logbook.end_date && (
              <span className="text-[10px] text-[var(--text-secondary)] bg-[var(--fill-secondary)] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatShortDate(logbook.start_date)} — {formatShortDate(logbook.end_date)}
              </span>
            )}
            <span className="text-[10px] font-medium text-[var(--accent-blue)] bg-[rgba(37,99,235,0.08)] px-2 py-0.5 rounded-full uppercase tracking-wider">{logbook.type}</span>
            {logbook.status && (
              <span className="text-[10px] font-medium text-[var(--accent-green)] bg-[rgba(34,197,94,0.08)] px-2 py-0.5 rounded-full capitalize">{logbook.status}</span>
            )}
          </div>
        </div>

        {/* ===== USER INFO SECTION ===== */}
        <div className="px-5 py-4 border-t border-[var(--card-border)]">
          <div className="flex items-center gap-3">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full ring-2 ring-[var(--card-border)] flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[rgba(37,99,235,0.1)] text-[var(--accent-blue)] flex items-center justify-center text-base font-medium ring-2 ring-[var(--card-border)] flex-shrink-0">
                {(user.name || "U")[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-[14px] font-semibold text-[var(--text-primary)] truncate">{user.name}</h2>
              <div className="flex flex-wrap gap-x-3 gap-y-0 mt-0.5">
                {user.nim && <span className="text-[11px] text-[var(--text-secondary)]">NIM: {user.nim}</span>}
                {user.university && <span className="text-[11px] text-[var(--text-secondary)] truncate">{user.university}</span>}
              </div>
            </div>
          </div>

          {/* Faculty / Program / Batch — horizontal if space permits */}
          {(user.faculty || user.study_program || user.batch_year) && (
            <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1">
              {user.faculty && (
                <div>
                  <span className="text-[8px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium">Faculty</span>
                  <p className="text-[12px] text-[var(--text-primary)] font-medium break-words">{user.faculty}</p>
                </div>
              )}
              {user.study_program && (
                <div>
                  <span className="text-[8px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium">Program</span>
                  <p className="text-[12px] text-[var(--text-primary)] font-medium break-words">{user.study_program}</p>
                </div>
              )}
              {user.batch_year && (
                <div>
                  <span className="text-[8px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium">Batch</span>
                  <p className="text-[12px] text-[var(--text-primary)] font-medium">{user.batch_year}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ===== DETAIL SECTION ===== */}
        {(logbook.institution_name || logbook.supervisor_name || (logbook as any).mentor_name || logbook.location || logbook.start_date || logbook.end_date) && (
          <div className="px-5 py-4 border-t border-[var(--card-border)]">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {logbook.institution_name && (
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[8px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium">Institution</span>
                  <p className="text-[12px] text-[var(--text-primary)] font-medium break-words">{logbook.institution_name}</p>
                </div>
              )}
              {logbook.supervisor_name && (
                <div>
                  <span className="text-[8px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium">Supervisor</span>
                  <p className="text-[12px] text-[var(--text-primary)] font-medium break-words">{logbook.supervisor_name}</p>
                </div>
              )}
              {(logbook as any).mentor_name && (
                <div>
                  <span className="text-[8px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium">Mentor</span>
                  <p className="text-[12px] text-[var(--text-primary)] font-medium break-words">{(logbook as any).mentor_name}</p>
                </div>
              )}
              {logbook.location && (
                <div>
                  <span className="text-[8px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium">Location</span>
                  <p className="text-[12px] text-[var(--text-primary)] font-medium break-words">{logbook.location}</p>
                </div>
              )}
              {logbook.start_date && (
                <div>
                  <span className="text-[8px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium">Start Date</span>
                  <p className="text-[12px] text-[var(--text-primary)] font-medium">{formatDate(logbook.start_date)}</p>
                </div>
              )}
              {logbook.end_date && (
                <div>
                  <span className="text-[8px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium">End Date</span>
                  <p className="text-[12px] text-[var(--text-primary)] font-medium">{formatDate(logbook.end_date)}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── STATS GRID ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <div className="ios-stat text-center py-3.5"><p className="text-lg font-bold text-[var(--accent-blue)]">{logbook.total_activities}</p><p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Activities</p></div>
        <div className="ios-stat text-center py-3.5"><p className="text-lg font-bold text-[var(--accent-yellow)]">{logbook.filled_days}</p><p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Filled Days</p></div>
        <div className="ios-stat text-center py-3.5"><p className="text-lg font-bold text-[var(--accent-red)]">{totalPhotos}</p><p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Photos</p></div>
        <div className="ios-stat text-center py-3.5">
          <p className={`text-lg font-bold ${logbook.progress_percent >= 100 ? "text-[var(--accent-green)]" : "text-[var(--accent-yellow)]"}`}>{logbook.progress_percent}%</p>
          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Progress</p>
        </div>
      </div>

      {/* ── PROGRESS OVERVIEW ── */}
      <div className="ios-card p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Progress Overview</h3>
          <span className="text-[11px] text-[var(--text-secondary)]">{logbook.filled_days}/{logbook.total_date_range_days} days</span>
        </div>
        <div className="ios-progress h-2">
          <div className={`ios-progress-bar ${progressClass}`} style={{ width: `${Math.max(2, logbook.progress_percent)}%` }} />
        </div>
      </div>

      {/* ── ACTIVITIES ── */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Activities ({activities.length})</h3>
        <Link href={`/logbook/${logbook.id}/activity/new`} className="ios-btn-primary !py-1.5 !px-3 text-[11px] inline-flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          Add Activity
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="ios-card p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-[var(--fill-secondary)] flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">No activities yet</p>
          <p className="text-[12px] text-[var(--text-secondary)]">Start logging your activities for this logbook.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDates.map((date) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-3 h-3 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[12px] font-semibold text-[var(--text-primary)]">{formatDate(date)}</span>
                <span className="text-[10px] text-[var(--text-tertiary)]">· {activitiesByDate[date].length} activities</span>
                <Link
                  href={`/logbook/${logbook.id}/activity/new?date=${date}`}
                  className="ml-auto w-5 h-5 rounded-full bg-[rgba(37,99,235,0.08)] hover:bg-[rgba(37,99,235,0.18)] flex items-center justify-center flex-shrink-0 transition-colors"
                  title="Add activity for this date"
                >
                  <svg className="w-3 h-3 text-[var(--accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </Link>
              </div>
              <div className="space-y-1">
                {activitiesByDate[date].map((activity) => {
                  const timeStr = activity.created_at
                    ? new Date(activity.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                    : "";
                  return (
                    <Link key={activity.id} href={`/activity/${activity.id}`} className="flex items-start gap-2.5 px-0 py-1.5 group">
                      {timeStr && (
                        <div className="min-w-[48px] pt-0.5 flex-shrink-0">
                          <span className="text-[10px] font-medium text-[var(--text-tertiary)] tabular-nums">{timeStr}</span>
                        </div>
                      )}
                      {timeStr && (
                        <div className="w-px self-stretch bg-[var(--card-border)] flex-shrink-0 min-h-[24px]" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors truncate">{activity.title}</p>
                        {activity.description && (
                          <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1 mt-0.5">{activity.description}</p>
                        )}
                        {activity.photos.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            {activity.photos.slice(0, 3).map((photo) => (
                              <div key={photo.id} className="w-5 h-5 rounded bg-[var(--fill-secondary)] overflow-hidden border border-[var(--card-border)] flex-shrink-0">
                                <img src={photo.thumbnail_url} alt={photo.file_name} className="w-full h-full object-cover" loading="lazy" />
                              </div>
                            ))}
                            {activity.photos.length > 3 && (
                              <span className="text-[9px] text-[var(--text-tertiary)] ml-0.5">{activity.photos.length - 3}+</span>
                            )}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── EXPORT MODAL ── */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowExportModal(false)} />
          <div className="relative ios-card !p-0 overflow-hidden max-w-[320px] w-full mx-4 animate-in zoom-in-95">
            <div className="px-5 pt-5 pb-2">
              <h3 className="text-[17px] font-bold text-[var(--text-primary)] text-center">Export Logbook</h3>
              <p className="text-[12px] text-[var(--text-secondary)] text-center mt-1">Pilih format file yang diinginkan</p>
            </div>
            <div className="px-5 pb-5 space-y-2.5">
              <button
                onClick={() => handleExport("pdf")}
                disabled={exporting !== null}
                className="w-full ios-btn-primary !py-3 flex items-center justify-center gap-2.5 text-[13px] disabled:opacity-60"
              >
                {exporting === "pdf" ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                )}
                {exporting === "pdf" ? "Menyiapkan PDF..." : "Export as PDF"}
              </button>
              <button
                onClick={() => handleExport("docx")}
                disabled={exporting !== null}
                className="w-full ios-btn-primary !py-3 flex items-center justify-center gap-2.5 text-[13px] disabled:opacity-60"
              >
                {exporting === "docx" ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                {exporting === "docx" ? "Menyiapkan DOCX..." : "Export as DOCX"}
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="w-full !py-2.5 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
