"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface PhotoUploaderProps {
  activityId?: string;
  existingPhotos?: Array<{
    id: string;
    file_name: string;
    file_url?: string;
    thumbnail_url?: string;
  }>;
  onUploadComplete?: (photos: string[]) => void;
  maxFiles?: number;
}

export default function PhotoUploader({
  activityId,
  existingPhotos = [],
  onUploadComplete,
  maxFiles = 5,
}: PhotoUploaderProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const total = existingPhotos.length + files.length + selected.length;

    if (total > maxFiles) {
      setError(`Kamu hanya bisa upload maksimal ${maxFiles} foto`);
      return;
    }

    setFiles((prev) => [...prev, ...selected]);
    setError(null);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("photos", file));
      if (activityId) formData.append("activity_id", activityId);

      const res = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload gagal");

      setFiles([]);
      onUploadComplete?.(data.photoIds || []);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload gagal");
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Hapus foto ini?")) return;
    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal hapus foto");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal hapus foto");
    }
  };

  return (
    <div className="space-y-3">
      {/* Existing Photos */}
      {existingPhotos.length > 0 && (
        <div>
          <p className="text-[13px] font-medium text-[var(--text-secondary)] mb-2">Existing Photos</p>
          <div className="grid grid-cols-3 gap-2">
            {existingPhotos.map((photo) => (
              <div key={photo.id} className="relative group">
                <div className="aspect-square rounded-xl overflow-hidden bg-[var(--fill-secondary)]">
                  {photo.thumbnail_url ? (
                    <img
                      src={photo.thumbnail_url}
                      alt={photo.file_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDeletePhoto(photo.id)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--accent-red)] text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Files Preview */}
      {files.length > 0 && (
        <div>
          <p className="text-[13px] font-medium text-[var(--text-secondary)] mb-2">New Photos ({files.length})</p>
          <div className="grid grid-cols-3 gap-2">
            {files.map((file, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-xl overflow-hidden bg-[var(--fill-secondary)]">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--accent-red)] text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="ios-card p-6 text-center cursor-pointer hover:shadow-md transition-all duration-200 active:scale-[0.99]"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleSelectFiles}
          className="hidden"
        />
        <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-[rgba(0,122,255,0.08)] flex items-center justify-center">
          <svg className="w-5 h-5 text-[var(--accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-[14px] font-medium text-[var(--text-primary)]">Tap to add photos</p>
        <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
          {existingPhotos.length + files.length}/{maxFiles} photos
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="ios-btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Uploading...
            </>
          ) : (
            `Upload ${files.length} Photo${files.length > 1 ? "s" : ""}`
          )}
        </button>
      )}
    </div>
  );
}
