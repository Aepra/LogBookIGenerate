"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface EditActivityFormProps {
  activity: {
    id: string;
    logbook_id: string;
    activity_date: string;
    start_time: string | null;
    end_time: string | null;
    title: string;
    description: string;
    obstacle: string;
  };
}

export default function EditActivityForm({ activity }: EditActivityFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(activity.title);
  const [description, setDescription] = useState(activity.description);
  const [obstacle, setObstacle] = useState(activity.obstacle);
  const [activityDate, setActivityDate] = useState(activity.activity_date);
  const [startTime, setStartTime] = useState(activity.start_time || "");
  const [endTime, setEndTime] = useState(activity.end_time || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!activityDate) {
      setError("Date is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/activities/${activity.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_date: activityDate,
          start_time: startTime || null,
          end_time: endTime || null,
          title: title.trim(),
          description: description.trim(),
          obstacle: obstacle.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update activity");

      router.push(`/logbook/${activity.logbook_id}`);
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
            Start Time <span className="text-[var(--text-tertiary)]">(optional)</span>
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
            End Time <span className="text-[var(--text-tertiary)]">(optional)</span>
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
          rows={2}
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

      {/* Submit */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="ios-btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={loading}
          className="px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] bg-[var(--fill-secondary)] rounded-xl hover:opacity-80 transition-all disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}