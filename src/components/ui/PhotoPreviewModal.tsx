"use client";

interface PhotoRecord {
  id: string;
  google_file_id: string;
  google_drive_url: string;
}

export default function PhotoPreviewModal({
  photo,
  onClose,
}: {
  photo: PhotoRecord;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        aria-label="Close preview"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Image */}
      <div
        className="max-w-full max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={`/api/photos/proxy?fileId=${photo.google_file_id}`}
          alt="Photo preview"
          className="max-w-full max-h-[90vh] object-contain rounded-lg"
        />
      </div>
    </div>
  );
}
