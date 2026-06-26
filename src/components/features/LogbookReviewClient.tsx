"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  start_time: string | null;
  end_time: string | null;
  title: string;
  description: string;
  obstacle: string;
  created_at: string;
  photos: ActivityPhoto[];
}

interface LogbookReviewData {
  id: string;
  title: string;
  description: string;
  total_activities: number;
  total_photos: number;
  progress_percent: number;
  filled_days: number;
  total_date_range_days: number;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function getProgressClass(pct: number): string {
  if (pct >= 100) return "success";
  if (pct >= 71) return "success";
  if (pct >= 31) return "warning";
  return "danger";
}

export default function LogbookReviewClient({
  logbook,
  activities,
}: {
  logbook: LogbookReviewData;
  activities: Activity[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  // Simulated progress bar for iframe loading

  useEffect(() => {
    if (iframeLoading) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((p) => {
          if (p < 40) return p + Math.floor(Math.random() * 15) + 5;
          if (p < 75) return p + Math.floor(Math.random() * 10) + 2;
          if (p < 95) return p + Math.floor(Math.random() * 3) + 1;
          return p;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setProgress(100);
    }
  }, [iframeLoading]);

  // Group activities by date for stats display
  const groupedActivities: Record<string, Activity[]> = {};
  for (const activity of activities) {
    const key = activity.activity_date;
    if (!groupedActivities[key]) groupedActivities[key] = [];
    groupedActivities[key].push(activity);
  }

  const sortedDates = Object.keys(groupedActivities).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const previewUrl = `/api/export/logbook/preview?logbook_id=${logbook.id}`;

  const [exportProgress, setExportProgress] = useState(0);
  const [exportPhase, setExportPhase] = useState("");

  const handleExport = async (format: "pdf" | "docx") => {
    setExporting(format);
    setError(null);
    setExportProgress(0);
    setExportPhase("Menghubungkan...");
    try {
      const url = `/api/export/logbook/download?logbook_id=${logbook.id}&format=${format}`;
      
      // Start simulated progress for the generation phase
      let progressInterval: ReturnType<typeof setInterval> | null = null;
      progressInterval = setInterval(() => {
        setExportProgress((p) => {
          if (p < 30) return p + Math.floor(Math.random() * 10) + 3;
          if (p < 60) return p + Math.floor(Math.random() * 5) + 1;
          if (p < 85) return p + 1;
          return p;
        });
      }, 500);

      setExportPhase("Memproses dokumen...");
      setExportProgress(5);

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("Gagal mengunduh logbook.");
      }

      // Check if it was a cache hit (instant)
      const cacheStatus = response.headers.get("X-Cache");
      if (cacheStatus === "HIT") {
        setExportProgress(90);
        setExportPhase("Mengunduh file...");
      } else {
        setExportProgress(75);
        setExportPhase("Mengunduh file...");
      }

      if (progressInterval) clearInterval(progressInterval);
      
      let filename = `LogBook_${logbook.title.replace(/[^a-zA-Z0-9]/g, "_")}.${format}`;
      const disposition = response.headers.get("Content-Disposition");
      if (disposition && disposition.indexOf("filename=") !== -1) {
        const matches = /filename="([^"]+)"/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1];
        }
      }

      const blob = await response.blob();
      setExportProgress(95);
      setExportPhase("Menyimpan...");

      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      setExportProgress(100);
      setExportPhase("Selesai!");

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(objectUrl);
      }, 100);

      // Keep the success state visible briefly
      await new Promise(r => setTimeout(r, 800));
      
    } catch (err) {
      setError("Gagal mengexport logbook. Silakan coba lagi.");
    } finally {
      setExporting(null);
      setShowExportModal(false);
      setExportProgress(0);
      setExportPhase("");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background-secondary)]">
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-20 bg-[var(--background-secondary)]/80 backdrop-blur-lg border-b border-[var(--card-border)]">
        <div className="max-w-7xl md:px-8 mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/logbook/${logbook.id}/detail`}
              className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--fill-secondary)] flex items-center justify-center hover:bg-[var(--fill-tertiary)] transition-colors"
            >
              <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="min-w-0">
              <h1 className="text-[15px] font-bold text-[var(--text-primary)] truncate">
                Review: {logbook.title}
              </h1>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                {activities.length} activities · {logbook.total_photos} photos · {logbook.progress_percent}% complete
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExportModal(true)}
              disabled={exporting !== null}
              className="ios-btn-primary !py-1.5 !px-3 text-[12px] inline-flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
          </div>
        </div>
      </div>

      {/* ── Preview Content ── */}
      <div className="max-w-7xl md:px-8 mx-auto px-4 sm:px-6 py-4">
        {error && (
          <div className="mb-4 p-3 rounded-xl text-[13px] font-medium bg-[rgba(239,68,68,0.1)] text-[var(--accent-red)]">
            {error}
          </div>
        )}

        {/* Stats summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
          <div className="ios-stat text-center py-3">
            <p className="text-lg font-bold text-[var(--accent-blue)]">{logbook.total_activities}</p>
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Aktivitas</p>
          </div>
          <div className="ios-stat text-center py-3">
            <p className="text-lg font-bold text-[var(--accent-yellow)]">{logbook.filled_days}</p>
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Filled Hari</p>
          </div>
          <div className="ios-stat text-center py-3">
            <p className="text-lg font-bold text-[var(--accent-red)]">{logbook.total_photos}</p>
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Photos</p>
          </div>
          <div className="ios-stat text-center py-3">
            <p className={`text-lg font-bold ${logbook.progress_percent >= 100 ? "text-[var(--accent-green)]" : "text-[var(--accent-yellow)]"}`}>
              {logbook.progress_percent}%
            </p>
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Progress</p>
          </div>
        </div>

        {/* Preview iframe */}
        <div className="ios-card overflow-hidden mb-4">
          <div className="px-4 py-2.5 border-b border-[var(--card-border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[var(--accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-[13px] font-semibold text-[var(--text-primary)]">Document Preview</span>
            </div>
            <span className="text-[10px] text-[var(--text-tertiary)]">Rendered from DOCX template</span>
          </div>
          <div className="relative bg-[#f5f5f5] rounded-xl overflow-hidden shadow-inner" style={{ minHeight: "70vh" }}>
            {iframeLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
                 <div className="w-16 h-16 border-4 border-[#b3000020] border-t-[var(--accent-primary)] rounded-full animate-spin mb-4"></div>
                 <span className="text-[14px] font-bold text-[var(--text-primary)] mb-2">Menyiapkan Preview...</span>
                 
                 {/* Progress Bar Container */}
                 <div className="w-64 h-2.5 bg-[#f1f5f9] rounded-full overflow-hidden mb-2 relative">
                   <div 
                     className="absolute top-0 left-0 h-full bg-[var(--accent-primary)] transition-all duration-300 ease-out"
                     style={{ width: `${progress}%` }}
                   />
                 </div>
                 
                 <div className="flex items-center gap-2">
                   <span className="text-[12px] font-medium text-[var(--accent-primary)] tabular-nums">{progress}%</span>
                   <span className="text-[11px] text-[var(--text-tertiary)]">Memproses dokumen & mengunduh foto</span>
                 </div>
              </div>
            )}
            <iframe
              src={previewUrl}
              className={`w-full border-0 transition-opacity duration-300 ${iframeLoading ? 'opacity-0' : 'opacity-100'}`}
              style={{ minHeight: "70vh" }}
              title="Logbook Preview"
              onLoad={(e) => {
                setIframeLoading(false);
                // Adjust iframe height to content
                try {
                  const iframe = e.target as HTMLIFrameElement;
                  const doc = iframe.contentDocument || iframe.contentWindow?.document;
                  if (doc) {
                    const height = doc.documentElement.scrollHeight;
                    iframe.style.height = height + "px";
                  }
                } catch {
                  // Cross-origin restrictions may apply, ignore
                }
              }}
            />
          </div>
        </div>

        {/* Activity summary */}
        <div className="ios-card p-4 mb-4">
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3">
            Activities Overview ({activities.length})
          </h3>
          <div className="space-y-2">
            {sortedDates.map((date) => (
              <div key={date} className="flex items-center justify-between py-1.5 border-b border-[var(--card-border)] last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                    {formatShortDate(date)}
                  </span>
                </div>
                <span className="text-[11px] text-[var(--text-secondary)] whitespace-nowrap ml-2">
                  {groupedActivities[date].length} activity{groupedActivities[date].length > 1 ? "ies" : "y"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── EXPORT MODAL ── */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !exporting && setShowExportModal(false)} />
          <div className="relative ios-card !p-0 overflow-hidden max-w-[320px] w-full mx-4 animate-in zoom-in-95">
            <div className="px-5 pt-5 pb-2">
              <h3 className="text-[17px] font-bold text-[var(--text-primary)] text-center">Export Logbook</h3>
              <p className="text-[12px] text-[var(--text-secondary)] text-center mt-1">
                {exporting ? exportPhase : "Pilih format file yang diinginkan"}
              </p>
            </div>

            {/* Export Progress Bar */}
            {exporting && (
              <div className="px-5 pb-2">
                <div className="w-full h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--accent-primary)] transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-[var(--text-tertiary)]">{exportPhase}</span>
                  <span className="text-[10px] font-medium text-[var(--accent-primary)] tabular-nums">{exportProgress}%</span>
                </div>
              </div>
            )}

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
                {exporting === "pdf" ? `${exportPhase} ${exportProgress}%` : "Export as PDF"}
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
                {exporting === "docx" ? `${exportPhase} ${exportProgress}%` : "Export as DOCX"}
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                disabled={exporting !== null}
                className="w-full !py-2.5 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-center disabled:opacity-40"
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
