"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";

interface CreateActivityFormProps {
  logbookId: string;
  defaultDate?: string;
}

export default function CreateActivityForm({ logbookId, defaultDate }: CreateActivityFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [obstacle, setObstacle] = useState("");
  const [activityDate, setActivityDate] = useState(defaultDate || "");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Judul wajib diisi");
      return;
    }

    if (!activityDate) {
      setError("Tanggal wajib diisi");
      return;
    }

    if (startTime && endTime && startTime >= endTime) {
      setError("Waktu selesai harus setelah waktu mulai");
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create activity
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logbook_id: logbookId,
          activity_date: activityDate,
          start_time: startTime || null,
          end_time: endTime || null,
          title: title.trim(),
          description: description.trim(),
          obstacle: obstacle.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat aktivitas");

      // Step 2: Upload photos if any
      if (photoFiles.length > 0 && data.activity?.id) {
        setUploadingPhotos(true);
        
        const compressionOptions = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
        };

        // Compress all photos in parallel
        const compressedFiles = await Promise.all(
          photoFiles.map(async (file) => {
            try {
              return await imageCompression(file, compressionOptions);
            } catch (error) {
              console.error("Image compression failed:", error);
              return file; // fallback to original
            }
          })
        );

        // Upload all compressed photos in parallel
        await Promise.all(
          compressedFiles.map(async (file) => {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("activity_id", data.activity.id);

            try {
              const photoRes = await fetch("/api/photos/upload", {
                method: "POST",
                body: formData,
              });
              if (!photoRes.ok) {
                const photoData = await photoRes.json();
                console.error("Photo upload failed:", photoData.error);
              }
            } catch (err) {
              console.error("Failed to fetch photo upload API:", err);
            }
          })
        );
      }

      router.push(`/logbook/${logbookId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
      setUploadingPhotos(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg mx-auto">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-[14px] font-medium text-[var(--text-primary)] mb-1.5">
          Title <span className="text-[var(--accent-red)]">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Site inspection with supervisor"
          className="ios-input"
          disabled={loading}
          required
        />
      </div>

      {/* Date */}
      <div>
        <label htmlFor="date" className="block text-[14px] font-medium text-[var(--text-primary)] mb-1.5">
          Date <span className="text-[var(--accent-red)]">*</span>
        </label>
        <input
          id="date"
          type="date"
          value={activityDate}
          onChange={(e) => setActivityDate(e.target.value)}
          className="ios-input"
          disabled={loading}
          required
        />
      </div>

      {/* Time Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startTime" className="block text-[14px] font-medium text-[var(--text-primary)] mb-1.5">
            Waktu Mulai <span className="text-[var(--text-tertiary)]">(optional)</span>
          </label>
          <input
            id="startTime"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="ios-input"
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="endTime" className="block text-[14px] font-medium text-[var(--text-primary)] mb-1.5">
            Waktu Selesai <span className="text-[var(--text-tertiary)]">(optional)</span>
          </label>
          <input
            id="endTime"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="ios-input"
            disabled={loading}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-[14px] font-medium text-[var(--text-primary)] mb-1.5">
          Description <span className="text-[var(--text-tertiary)]">(optional)</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What did you do?"
          rows={3}
          className="ios-input resize-none"
          disabled={loading}
        />
      </div>

      {/* Obstacle */}
      <div>
        <label htmlFor="obstacle" className="block text-[14px] font-medium text-[var(--text-primary)] mb-1.5">
          Obstacle <span className="text-[var(--text-tertiary)]">(optional)</span>
        </label>
        <textarea
          id="obstacle"
          value={obstacle}
          onChange={(e) => setObstacle(e.target.value)}
          placeholder="Any challenges or obstacles?"
          rows={2}
          className="ios-input resize-none"
          disabled={loading}
        />
      </div>

      {/* Photos */}
      <div>
        <label className="block text-[14px] font-medium text-[var(--text-primary)] mb-1.5">
          Photos <span className="text-[var(--text-tertiary)]">(optional)</span>
        </label>

        {/* Photo Previews */}
        {photoFiles.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-2">
            {photoFiles.map((file, index) => (
              <div key={index} className="relative group aspect-square rounded-xl overflow-hidden bg-[var(--fill-secondary)]">
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotoFiles((prev) => prev.filter((_, i) => i !== index))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--accent-red)] text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="ios-card p-4 text-center cursor-pointer hover:shadow-md transition-all duration-200 active:scale-[0.99]"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const selected = Array.from(e.target.files || []);
              setPhotoFiles((prev) => [...prev, ...selected]);
            }}
            className="hidden"
            disabled={loading}
          />
          <div className="w-8 h-8 mx-auto mb-1.5 rounded-xl bg-[rgba(37,99,235,0.08)] flex items-center justify-center">
            <svg className="w-4 h-4 text-[var(--accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-[13px] font-medium text-[var(--text-primary)]">Tap to add photos</p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            {photoFiles.length > 0 ? `${photoFiles.length} file(s) selected` : "Upload up to 5 photos"}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="ios-btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Membuat...
          </>
        ) : (
          "Create Activity"
        )}
      </button>
    </form>
  );
}
