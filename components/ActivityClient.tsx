"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ActivitiesByDate } from "@/services/activity.service";
import type { PhotoRecord } from "@/services/photo.service";

interface Props {
  logbookId: string;
  initialGroupedActivities: ActivitiesByDate[];
  initialPhotosByActivity?: Record<string, PhotoRecord[]>;
}

export default function ActivityClient({ logbookId, initialGroupedActivities, initialPhotosByActivity = {} }: Props) {
  const router = useRouter();
  const [groupedActivities] = useState<ActivitiesByDate[]>(initialGroupedActivities);
  const [photosByActivity, setPhotosByActivity] = useState<Record<string, PhotoRecord[]>>(initialPhotosByActivity);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");
  const [exportStatus, setExportStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [uploadingActivityId, setUploadingActivityId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{ activityId: string; type: "success" | "error"; message: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    activity_date: new Date().toISOString().split("T")[0],
    start_time: "",
    end_time: "",
    title: "",
    description: "",
    obstacle: "",
  });

  console.log("[UI PHOTOS STATE] photosByActivity keys:", Object.keys(photosByActivity));
  console.log("[UI PHOTOS STATE] photosByActivity values count:", Object.values(photosByActivity).reduce((acc, arr) => {
    if (!Array.isArray(arr)) return acc;
    return acc + arr.length;
  }, 0));

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const handleExport = async () => {
    setExportStatus(null);
    setIsExporting(true);

    try {
      const res = await fetch("/api/export/logbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logbook_id: logbookId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setExportStatus({
          type: "error",
          message: data.error || "Gagal mengexport logbook",
        });
        return;
      }

      if (data.url) {
        window.open(data.url, "_blank");
      }

      setExportStatus({
        type: "success",
        message: data.message || "Logbook berhasil diexport!",
      });
    } catch {
      setExportStatus({
        type: "error",
        message: "Terjadi kesalahan jaringan saat export.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePhotoUpload = async (activityId: string, file: File) => {
    console.log("[UI UPLOAD] Starting upload for activity:", activityId, "file:", file.name);

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      console.error("[UI UPLOAD] Invalid file type:", file.type);
      setUploadStatus({
        activityId,
        type: "error",
        message: "Hanya JPEG, PNG, dan WebP yang diperbolehkan.",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.error("[UI UPLOAD] File too large:", file.size);
      setUploadStatus({
        activityId,
        type: "error",
        message: "Ukuran file maksimal 5MB.",
      });
      return;
    }

    setUploadingActivityId(activityId);
    setUploadStatus(null);

    try {
      console.log("[UI UPLOAD] Sending POST /api/photos/upload...");
      const formData = new FormData();
      formData.append("activity_id", activityId);
      formData.append("file", file);

      const res = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });

      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {
        console.error("[UI UPLOAD] Failed to parse response JSON");
        throw new Error("Invalid server response");
      }

      console.log("[UI UPLOAD RESPONSE]", { status: res.status, data });

      if (!res.ok) {
        const errorMsg = (data?.error as string) || (data?.detail as string) || "Upload failed";
        console.error("[UI UPLOAD] Server error:", errorMsg);
        setUploadStatus({
          activityId,
          type: "error",
          message: errorMsg,
        });
        return;
      }

      // Add new photo to local state
      if (data.photo) {
        console.log("[UI UPLOAD] Photo uploaded successfully, id:", (data.photo as PhotoRecord)?.id);
        setPhotosByActivity((prev) => {
          const existing = prev[activityId] || [];
          return {
            ...prev,
            [activityId]: [...existing, data.photo as PhotoRecord],
          };
        });
      } else {
        console.warn("[UI UPLOAD] No photo in response data");
      }

      setUploadStatus({
        activityId,
        type: "success",
        message: "Foto berhasil diupload!",
      });
    } catch (err) {
      console.error("[UI UPLOAD ERROR]", err);
      setUploadStatus({
        activityId,
        type: "error",
        message: err instanceof Error ? err.message : "Terjadi kesalahan jaringan saat upload.",
      });
    } finally {
      setUploadingActivityId(null);
    }
  };

  const handleFileSelect = (activityId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Upload each selected file
    for (let i = 0; i < files.length; i++) {
      handlePhotoUpload(activityId, files[i]);
    }

    // Reset input for re-selection
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, logbook_id: logbookId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal membuat aktivitas");
        return;
      }

      setForm({
        activity_date: new Date().toISOString().split("T")[0],
        start_time: "",
        end_time: "",
        title: "",
        description: "",
        obstacle: "",
      });
      setIsModalOpen(false);
      setExportStatus(null);

      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (time: string | null) => {
    if (!time) return "-";
    return time;
  };

  const formatDuration = (totalMinutes: number) => {
    if (totalMinutes <= 0) return "";
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `, ${hours}j ${mins}m`;
  };

  // Safe accessors for photos (guards against undefined/null/non-array)
  const getPhotosForActivity = (activityId: string): PhotoRecord[] => {
    const photos = photosByActivity[activityId];
    if (!photos) return [];
    if (!Array.isArray(photos)) {
      console.warn("[UI PHOTOS] photos is not an array for activity:", activityId, typeof photos);
      return [];
    }
    return photos;
  };

  const hasData = groupedActivities.length > 0;
  const allExpanded = expandedDates.size === groupedActivities.length && hasData;

  const expandAll = () => {
    setExpandedDates(new Set(groupedActivities.map((g) => g.date)));
  };

  const collapseAll = () => {
    setExpandedDates(new Set());
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Aktivitas</h2>
        <div className="flex items-center space-x-2">
          {hasData && (
            <button
              onClick={allExpanded ? collapseAll : expandAll}
              className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 px-2 py-1 rounded transition"
            >
              {allExpanded ? "Ciutkan Semua" : "Perluas Semua"}
            </button>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm font-medium"
          >
            + Tambah Aktivitas
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? "Mengexport..." : "Export ke Google Docs"}
          </button>
        </div>
      </div>

      {/* Export Status Toast */}
      {exportStatus && (
        <div
          className={`mb-4 px-4 py-2 rounded-md text-sm ${
            exportStatus.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {exportStatus.message}
        </div>
      )}

      {/* Empty State */}
      {!hasData && (
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 mx-auto text-gray-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="text-gray-500 italic">
            Belum ada aktivitas yang dicatat.
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Klik "+ Tambah Aktivitas" untuk mencatat kegiatan pertama.
          </p>
        </div>
      )}

      {/* Grouped Activities */}
      {hasData && (
        <div className="space-y-4">
          {groupedActivities.map((group) => {
            const isExpanded = expandedDates.has(group.date);

            return (
              <div key={group.date} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Date Header */}
                <button
                  onClick={() => toggleDate(group.date)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
                >
                  <div className="flex items-center space-x-3">
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <span className="font-medium text-gray-800">
                      {formatDateDisplay(group.date)}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({group.activities.length} aktivitas
                      {formatDuration(group.totalTimeMinutes)})
                    </span>
                  </div>
                </button>

                {/* Activities List */}
                {isExpanded && (
                  <div className="divide-y divide-gray-100">
                    {group.activities.map((activity) => {
                      // SAFETY: getPhotosForActivity always returns a valid array
                      const photos = getPhotosForActivity(activity.id);

                      return (
                        <div key={activity.id} className="px-4 py-3 pl-12">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {activity.title}
                              </h4>
                              {activity.description && (
                                <p className="text-gray-500 text-sm mt-1">
                                  {activity.description}
                                </p>
                              )}
                              {activity.obstacle && (
                                <div className="mt-2">
                                  <span className="text-xs font-medium text-amber-600">
                                    Kendala:
                                  </span>
                                  <p className="text-gray-400 text-sm">
                                    {activity.obstacle}
                                  </p>
                                </div>
                              )}

                              {/* Photo Gallery */}
                              {photos.length > 0 && (
                                <div className="mt-3">
                                  <div className="flex flex-wrap gap-2">
                                    {photos.map((photo) => (
                                      <button
                                        key={photo.id}
                                        onClick={() =>
                                          setPreviewUrl(photo.google_drive_url)
                                        }
                                        className="w-16 h-16 rounded-md overflow-hidden border border-gray-200 hover:border-blue-400 transition"
                                      >
                                        <img
                                          src={`/api/photos/proxy?fileId=${photo.google_file_id}`}
                                          alt="Activity photo"
                                          className="w-full h-full object-cover"
                                          loading="lazy"
                                        />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Upload Status Toast */}
                              {uploadStatus && uploadStatus.activityId === activity.id && (
                                <div
                                  className={`mt-2 text-xs px-2 py-1 rounded ${
                                    uploadStatus.type === "success"
                                      ? "bg-green-50 text-green-700"
                                      : "bg-red-50 text-red-700"
                                  }`}
                                >
                                  {uploadStatus.message}
                                </div>
                              )}
                            </div>
                            <div className="ml-4 text-right flex-shrink-0 flex flex-col items-end space-y-2">
                              <span className="text-xs text-gray-400 whitespace-nowrap">
                                {formatTime(activity.start_time)}
                                {activity.start_time && activity.end_time ? " - " : ""}
                                {formatTime(activity.end_time)}
                              </span>

                              {/* Upload Button */}
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  multiple
                                  className="hidden"
                                  onChange={(e) => handleFileSelect(activity.id, e)}
                                  disabled={uploadingActivityId === activity.id}
                                />
                                <span
                                  className={`inline-flex items-center text-xs px-2 py-1 rounded border transition ${
                                    uploadingActivityId === activity.id
                                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                      : "bg-gray-50 text-gray-500 border-gray-300 hover:bg-gray-100 hover:text-gray-700"
                                  }`}
                                >
                                  {uploadingActivityId === activity.id
                                    ? "Mengupload..."
                                    : `+ Foto (${photos.length})`}
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 cursor-pointer"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="max-w-2xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewUrl(null)}
              className="float-right mb-2 text-white text-xl hover:text-gray-300"
            >
              &times;
            </button>
            <img
              src={previewUrl ? `/api/photos/proxy?fileId=${previewUrl.split("/d/")[1]?.split("/")[0] || ""}` : ""}
              alt="Preview"
              className="max-w-full max-h-[85vh] rounded-lg shadow-xl"
            />
          </div>
        </div>
      )}

      {/* Create Activity Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Tambah Aktivitas</h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setError("");
                }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="activity_date"
                  value={form.activity_date}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jam Mulai
                  </label>
                  <input
                    type="time"
                    name="start_time"
                    value={form.start_time}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jam Selesai
                  </label>
                  <input
                    type="time"
                    name="end_time"
                    value={form.end_time}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Judul Aktivitas <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  placeholder="Contoh: Membuat halaman login"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deskripsi
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Deskripsi detail kegiatan"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kendala
                </label>
                <textarea
                  name="obstacle"
                  value={form.obstacle}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Kendala yang dihadapi (jika ada)"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setError("");
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}