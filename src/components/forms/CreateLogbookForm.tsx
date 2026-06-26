"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateLogbookForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!startDate || !endDate) {
      setError("Start date and end date are required");
      return;
    }

    if (startDate > endDate) {
      setError("End date must be after start date");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/logbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          type: "other",
          start_date: startDate,
          end_date: endDate,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create logbook");
      }

      router.push(`/logbook/${data.logbook.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
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
          placeholder="KKN Desa Bontoa"
          className="ios-input"
          disabled={loading}
        />
      </div>

      {/* Start & End Date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className="block text-[14px] font-medium text-[var(--text-primary)] mb-1.5">
            Start Date <span className="text-[var(--accent-red)]">*</span>
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="ios-input"
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-[14px] font-medium text-[var(--text-primary)] mb-1.5">
            End Date <span className="text-[var(--accent-red)]">*</span>
          </label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
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
          placeholder="Brief description of the logbook..."
          rows={3}
          className="ios-input resize-none"
          disabled={loading}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Example card */}
      <div className="ios-card p-4">
        <p className="text-[11px] font-semibold text-[var(--accent-blue)] uppercase tracking-[0.06em] mb-1.5">Example</p>
        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
          KKN Desa Bontoa<br />
          01 July 2026 - 31 August 2026
        </p>
      </div>

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
            Creating...
          </>
        ) : (
          "Create Logbook"
        )}
      </button>
    </form>
  );
}