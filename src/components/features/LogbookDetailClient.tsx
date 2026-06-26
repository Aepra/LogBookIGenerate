"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface LogbookWithStats {
  id: string;
  title: string;
  description: string;
  created_at: string;
  start_date: string | null;
  end_date: string | null;
  total_days: number;
  total_activities: number;
  total_photos: number;
  progress_percent: number;
  activity_count_by_date: Record<string, number>;
}

interface ActivityPhoto {
  id: string;
  file_name: string;
  file_url?: string;
  thumbnail_url?: string;
}

interface Activity {
  id: string;
  logbook_id: string;
  activity_date: string;
  start_time: string | null;
  end_time: string | null;
  title: string;
  description: string;
  obstacle: string;
  created_at: string;
  photos?: ActivityPhoto[];
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

export default function LogbookDetailClient({
  logbook,
  activities,
}: {
  logbook: LogbookWithStats;
  activities: Activity[];
}) {
  const [openDays, setOpenDays] = useState<Set<string>>(new Set());
  const [openActivities, setOpenActivities] = useState<Set<string>>(new Set());

  const toggleDay = (date: string) => {
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const toggleActivity = (id: string) => {
    setOpenActivities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const collapseAll = () => {
    setOpenDays(new Set());
    setOpenActivities(new Set());
  };

  const hasAnyOpen = openDays.size > 0 || openActivities.size > 0;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00Z");
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00Z");
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const groupedActivities: Record<string, Activity[]> = {};
  for (const activity of activities) {
    const key = activity.activity_date;
    if (!groupedActivities[key]) groupedActivities[key] = [];
    groupedActivities[key].push(activity);
  }

  const sortedDates = Object.entries(groupedActivities)
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());

  const pct = logbook.progress_percent;
  const progClass = getProgressClass(pct);
  const progColor = getProgressColor(pct);

  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-5 sm:py-8">
      {/* Back */}
      <Link
        href="/logbook"
        className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--accent-blue)] mb-5 hover:opacity-80 transition-all"
      >
        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      {/* ── Hero Card (compact) ── */}
      <div className="ios-card p-3.5 mb-5">
        {/* Row 1: Title (kiri) + Stats (kanan) */}
        <div className="flex items-start gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-[17px] font-bold text-[var(--text-primary)] tracking-tight truncate">{logbook.title}</h1>
            {logbook.description && (
              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 line-clamp-1">{logbook.description}</p>
            )}
          </div>
          {/* Stats inline (kanan) */}
          <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
            <span className="text-[11px] text-[var(--accent-yellow)] font-medium whitespace-nowrap">
              <svg className="w-3 h-3 inline mr-0.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {logbook.total_days}
            </span>
            <span className="text-[11px] text-[var(--accent-blue)] font-medium whitespace-nowrap">
              <svg className="w-3 h-3 inline mr-0.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              {logbook.total_activities}
            </span>
            <span className="text-[11px] text-[var(--accent-red)] font-medium whitespace-nowrap">
              <svg className="w-3 h-3 inline mr-0.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {logbook.total_photos}
            </span>
            <div className="w-px h-3 bg-[var(--card-border)]" />
            <span className={`text-[11px] font-semibold ${progColor}`}>{pct}%</span>
          </div>
        </div>

        {/* Date range */}
        {logbook.start_date && logbook.end_date && (
          <p className="text-[10px] text-[var(--text-tertiary)] mb-2">
            {formatDate(logbook.start_date)} — {formatDate(logbook.end_date)}
          </p>
        )}

        {/* Progress bar — thin */}
        <div>
          <div className="ios-progress h-1.5">
            <div className={`ios-progress-bar ${progClass}`} style={{ width: `${pct}%` }} />
          </div>
          {logbook.total_days > 0 && (
            <p className="text-[9px] text-[var(--text-tertiary)] mt-1">
              {Object.keys(groupedActivities).length} of {logbook.total_days} days filled
            </p>
          )}
        </div>
      </div>

      {/* ── Activities Section — Collapse + Add ── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">Activities</h2>
        <div className="flex items-center gap-2">
          {hasAnyOpen && (
            <button
              onClick={collapseAll}
              className="text-[11px] font-medium text-[var(--text-secondary)] px-2.5 py-1.5 rounded-lg hover:bg-[var(--fill-secondary)] transition-colors inline-flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Collapse
            </button>
          )}
          <Link
            href={`/logbook/${logbook.id}/activity/new`}
            className="ios-btn-primary inline-flex items-center gap-1 !py-1.5 !px-3 text-[12px]"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add
          </Link>
        </div>
      </div>

      {/* ── Activities List ── */}
      {activities.length === 0 ? (
        <div className="ios-card p-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-[var(--fill-secondary)] flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">No activities yet</p>
          <p className="text-[13px] text-[var(--text-secondary)] mb-4">Start logging your daily progress</p>
          <Link
            href={`/logbook/${logbook.id}/activity/new`}
            className="ios-btn-primary inline-flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add your first activity
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDates.map(([date, dayActivities]) => (
            <DayDisclosure
              key={date}
              formattedDate={formatShortDate(date)}
              activities={dayActivities}
              count={dayActivities.length}
              logbookId={logbook.id}
              isOpen={openDays.has(date)}
              onToggle={() => toggleDay(date)}
              openActivities={openActivities}
              onToggleActivity={toggleActivity}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   InlinePhotoUploader
   ═══════════════════════════════════════════ */
function InlinePhotoUploader({
  activityId,
  onClose,
  onUploadComplete,
}: {
  activityId: string;
  onClose: () => void;
  onUploadComplete: (photo: ActivityPhoto) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("file", file));
      formData.append("activity_id", activityId);
      const res = await fetch("/api/photos/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Upload failed");
      if (data.photo) {
        onUploadComplete({
          id: data.photo.id,
          file_name: data.photo.google_file_id || "photo",
          file_url: `/api/photos/proxy?fileId=${data.photo.google_file_id}`,
          thumbnail_url: `/api/photos/proxy?fileId=${data.photo.google_file_id}`,
        });
      }
      setSuccess(true);
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="ios-card !p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[13px] font-semibold text-[var(--text-primary)]">Add Photos</p>
        <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-[var(--card-border)] rounded-xl p-4 text-center cursor-pointer hover:border-[var(--accent-blue)] hover:bg-[var(--fill-secondary)] transition-all active:scale-[0.99]"
      >
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" disabled={uploading} />
        {success ? (
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-[var(--accent-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-[12px] font-medium text-[var(--accent-green)]">Uploaded!</p>
          </div>
        ) : uploading ? (
          <div className="flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-[var(--accent-blue)] animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-[11px] text-[var(--text-secondary)]">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-[var(--accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-[11px] text-[var(--text-secondary)]">Tap to select photos</p>
          </div>
        )}
      </div>

      {error && <p className="text-[11px] text-[var(--accent-red)] mt-2 text-center">{error}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   DayDisclosure
   ═══════════════════════════════════════════ */
function DayDisclosure({
  formattedDate,
  activities,
  count,
  logbookId,
  isOpen,
  onToggle,
  openActivities,
  onToggleActivity,
}: {
  formattedDate: string;
  activities: Activity[];
  count: number;
  logbookId: string;
  isOpen: boolean;
  onToggle: () => void;
  openActivities: Set<string>;
  onToggleActivity: (id: string) => void;
}) {
  return (
    <div className="ios-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--fill-secondary)] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="ios-icon bg-[rgba(37,99,235,0.1)]">
            <svg className="w-4 h-4 text-[var(--accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-[15px] font-semibold text-[var(--text-primary)]">{formattedDate}</p>
            <p className="text-[11px] text-[var(--text-tertiary)]">{count} activity{count > 1 ? "ies" : "y"}</p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && <div className="ios-separator mx-4" />}
      {isOpen && (
        <div className="px-4 pb-3 space-y-2 pt-2">
          {activities.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              logbookId={logbookId}
              isOpen={openActivities.has(activity.id)}
              onToggle={() => onToggleActivity(activity.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   ActivityItem
   ═══════════════════════════════════════════ */
function ActivityItem({
  activity,
  logbookId,
  isOpen,
  onToggle,
}: {
  activity: Activity;
  logbookId: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const formatTime = (time: string | null) => {
    if (!time) return "";
    const [h, m] = time.split(":");
    return `${h}:${m}`;
  };

  return (
    <div className="ios-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--fill-secondary)] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-[rgba(245,158,11,0.1)] flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-[var(--accent-yellow)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-[var(--text-primary)]">
              {activity.start_time && activity.end_time
                ? `${formatTime(activity.start_time)} — ${formatTime(activity.end_time)}`
                : activity.title}
            </p>
            {activity.start_time && activity.end_time && (
              <p className="text-[10px] text-[var(--text-secondary)]">{activity.title}</p>
            )}
          </div>
        </div>
        <svg
          className={`w-3 h-3 text-[var(--text-tertiary)] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-3 pb-2">
          <ActivityDetailCard activity={activity} logbookId={logbookId} />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   ActivityDetailCard
   ═══════════════════════════════════════════ */
function ActivityDetailCard({ activity, logbookId }: { activity: Activity; logbookId: string }) {
  const [deleting, setDeleting] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [localPhotos, setLocalPhotos] = useState<ActivityPhoto[]>(activity.photos || []);
  const router = useRouter();

  const formatTime = (time: string | null) => {
    if (!time) return "";
    const [h, m] = time.split(":");
    return `${h}:${m}`;
  };

  const handleDelete = async () => {
    if (!confirm("Yakin ingin menghapus aktivitas ini?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/activities/${activity.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      router.push(`/logbook/${logbookId}`);
      router.refresh();
    } catch {
      alert("Gagal menghapus");
      setDeleting(false);
    }
  };

  const hasPhotos = localPhotos.length > 0;

  const handleUploadComplete = useCallback((photo: ActivityPhoto) => {
    setLocalPhotos((prev) => [...prev, photo]);
  }, []);

  return (
    <div className="border border-[var(--card-border)] rounded-xl overflow-hidden bg-[var(--card-background)]">
      <div className="p-3">
        {/* Title + jam */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="text-[13px] font-bold text-[var(--text-primary)]">{activity.title}</h3>
          {activity.start_time && activity.end_time && (
            <span className="text-[10px] text-[var(--text-secondary)] whitespace-nowrap flex-shrink-0">{formatTime(activity.start_time)}–{formatTime(activity.end_time)}</span>
          )}
        </div>

        {/* Deskripsi */}
        {activity.description && (
          <div className="mb-1">
            <span className="text-[9px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.05em]">Deskripsi: </span>
            <p className="text-[12px] text-[var(--text-primary)] leading-relaxed">{activity.description}</p>
          </div>
        )}

        {/* Kendala */}
        {activity.obstacle && (
          <div className="mb-1.5">
            <span className="text-[9px] font-semibold text-[var(--accent-red)] uppercase tracking-[0.05em]">Kendala: </span>
            <p className="text-[12px] text-[var(--accent-red)] leading-relaxed">{activity.obstacle}</p>
          </div>
        )}

        {/* Foto */}
        {hasPhotos && (
          <div className="mb-1.5">
            <span className="text-[9px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.05em]">Foto: ({localPhotos.length})</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {localPhotos.map((photo) => (
                <div key={photo.id} className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--fill-secondary)] border border-[var(--card-border)] flex-shrink-0">
                  <img src={photo.thumbnail_url || photo.file_url || ""} alt={photo.file_name} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-[var(--card-border)]">
          <Link
            href={`/activity/${activity.id}/edit`}
            className="text-[10px] font-medium text-[var(--accent-blue)] px-2 py-1 rounded-lg hover:bg-[rgba(37,99,235,0.08)] transition-colors"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-[10px] font-medium text-[var(--accent-red)] px-2 py-1 rounded-lg hover:bg-[rgba(239,68,68,0.08)] transition-colors disabled:opacity-50"
          >
            {deleting ? "Menghapus..." : "Hapus"}
          </button>
          {!showUploader && (
            <button
              onClick={() => setShowUploader(true)}
              className="text-[10px] font-medium text-[var(--accent-blue)] px-2 py-1 rounded-lg hover:bg-[rgba(37,99,235,0.08)] transition-colors inline-flex items-center gap-1"
            >
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Foto
            </button>
          )}
        </div>
      </div>

      {showUploader && (
        <div className="px-3 pb-3">
          <InlinePhotoUploader activityId={activity.id} onClose={() => setShowUploader(false)} onUploadComplete={handleUploadComplete} />
        </div>
      )}
    </div>
  );
}
