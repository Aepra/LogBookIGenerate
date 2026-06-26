"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

export default function ActivityClient({
  activity,
  logbookTitle,
}: {
  activity: Activity;
  logbookTitle: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00Z");
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

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
      if (!res.ok) throw new Error("Failed to delete");
      router.push(`/logbook/${activity.logbook_id}`);
      router.refresh();
    } catch (err) {
      alert("Gagal menghapus aktivitas");
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-2 sm:py-3">
      {/* Back */}
      <Link
        href={`/logbook/${activity.logbook_id}`}
        className="inline-flex items-center gap-1 text-[12px] text-[var(--accent-blue)] font-medium mb-3 hover:opacity-80 transition-opacity"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Kembali ke {logbookTitle}
      </Link>

      {/* Activity Card */}
      <div className="ios-card p-3.5 mb-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] font-bold text-[var(--text-primary)] tracking-tight mb-0.5">
              {activity.title}
            </h1>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {formatDate(activity.activity_date)}
            </p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-1">
            <Link
              href={`/activity/${activity.id}/edit`}
              className="text-[11px] text-[var(--accent-blue)] font-medium px-2 py-1 rounded-lg hover:bg-[rgba(37,99,235,0.08)] transition-colors"
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-[11px] text-[var(--accent-red)] font-medium px-2 py-1 rounded-lg hover:bg-[rgba(239,68,68,0.08)] transition-colors disabled:opacity-50"
            >
              {deleting ? "Menghapus..." : "Hapus"}
            </button>
          </div>
        </div>

        {/* Time Range */}
        {activity.start_time && activity.end_time && (
          <div className="flex items-center gap-1 mb-2">
            <svg className="w-3 h-3 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[11px] text-[var(--text-secondary)]">
              {formatTime(activity.start_time)} - {formatTime(activity.end_time)}
            </span>
          </div>
        )}

        {/* Description */}
        {activity.description && (
          <div className="mb-2">
            <h3 className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.06em] mb-0.5">Deskripsi:</h3>
            <p className="text-[13px] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{activity.description}</p>
          </div>
        )}

        {/* Obstacle */}
        {activity.obstacle && (
          <div>
            <h3 className="text-[10px] font-semibold text-[var(--accent-red)] uppercase tracking-[0.06em] mb-0.5">Kendala:</h3>
            <p className="text-[13px] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{activity.obstacle}</p>
          </div>
        )}
      </div>

      {/* Photos */}
      {activity.photos && activity.photos.length > 0 && (
        <div className="ios-card p-3.5">
          <h3 className="text-[12px] font-semibold text-[var(--text-primary)] mb-2">
            Foto: ({activity.photos.length})
          </h3>
          <div className="grid grid-cols-4 gap-1.5">
            {activity.photos.map((photo) => (
              <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-[var(--fill-secondary)]">
                {photo.thumbnail_url ? (
                  <img
                    src={photo.thumbnail_url}
                    alt={photo.file_name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
