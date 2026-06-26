"use client";

import { useState } from "react";
import type { UserProfile } from "@/lib/user";

function formatDate(dateStr: string) {
  return new Date(dateStr + "Z").toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProfileClient({ user }: { user: UserProfile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user.name || "",
    nim: user.nim || "",
    university: user.university || "",
    faculty: user.faculty || "",
    study_program: user.study_program || "",
    batch_year: user.batch_year?.toString() || "",
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          batch_year: form.batch_year ? parseInt(form.batch_year) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      setMessage({ type: "success", text: "Profil berhasil diperbarui!" });
      setIsEditing(false);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Gagal menyimpan" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-5 sm:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-bold text-[var(--text-primary)] tracking-tight">Profile</h1>
          <p className="text-[14px] text-[var(--text-secondary)] mt-0.5">Your account and academic information</p>
        </div>
        <button
          onClick={() => {
            setIsEditing(!isEditing);
            setMessage(null);
          }}
          className="ios-btn-primary !py-2 !px-4 text-[13px] inline-flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          {isEditing ? "Cancel" : "Edit"}
        </button>
      </div>

      {/* Success/Error Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-xl text-[13px] font-medium ${
          message.type === "success" 
            ? "bg-[rgba(34,197,94,0.1)] text-[var(--accent-green)]" 
            : "bg-[rgba(239,68,68,0.1)] text-[var(--accent-red)]"
        }`}>
          {message.text}
        </div>
      )}

      {/* Avatar + Basic Info Card */}
      <div className="ios-card p-5 mb-4">
        <div className="flex items-center gap-4">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full ring-2 ring-[var(--card-border)]" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[rgba(37,99,235,0.1)] text-[var(--accent-blue)] flex items-center justify-center text-2xl font-medium ring-2 ring-[var(--card-border)]">
              {(user.name || "U")[0]}
            </div>
          )}
          <div>
            <h2 className="text-[18px] font-bold text-[var(--text-primary)]">{user.name}</h2>
            <p className="text-[13px] text-[var(--text-secondary)]">{user.email}</p>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
              Member since {formatDate(user.created_at)}
            </p>
          </div>
        </div>

        {/* Google Drive Status */}
        <div className="mt-4 pt-3 border-t border-[var(--card-border)] flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${user.drive_folder_id ? "bg-[var(--accent-green)]" : "bg-[var(--text-tertiary)]"}`} />
          <span className="text-[12px] text-[var(--text-secondary)]">
            {user.drive_folder_id ? "Google Drive connected" : "Google Drive not connected"}
          </span>
        </div>
      </div>

      {/* Academic Information */}
      <div className="ios-card p-5">
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">Academic Information</h3>

        {isEditing ? (
          <div className="space-y-3.5">
            {/* Name */}
            <div>
              <label className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1.5 block">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="ios-input"
                placeholder="Your full name"
              />
            </div>

            {/* NIM */}
            <div>
              <label className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1.5 block">NIM (Student ID)</label>
              <input
                type="text"
                value={form.nim}
                onChange={(e) => setForm({ ...form, nim: e.target.value })}
                className="ios-input"
                placeholder="e.g. D121201234"
              />
            </div>

            {/* University */}
            <div>
              <label className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1.5 block">University</label>
              <input
                type="text"
                value={form.university}
                onChange={(e) => setForm({ ...form, university: e.target.value })}
                className="ios-input"
                placeholder="e.g. Hasanuddin University"
              />
            </div>

            {/* Faculty + Study Program row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1.5 block">Faculty</label>
                <input
                  type="text"
                  value={form.faculty}
                  onChange={(e) => setForm({ ...form, faculty: e.target.value })}
                  className="ios-input"
                  placeholder="e.g. Engineering"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1.5 block">Study Program</label>
                <input
                  type="text"
                  value={form.study_program}
                  onChange={(e) => setForm({ ...form, study_program: e.target.value })}
                  className="ios-input"
                  placeholder="e.g. Informatics"
                />
              </div>
            </div>

            {/* Batch Year */}
            <div>
              <label className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1.5 block">Batch Year</label>
              <input
                type="number"
                value={form.batch_year}
                onChange={(e) => setForm({ ...form, batch_year: e.target.value })}
                className="ios-input"
                placeholder="e.g. 2022"
                min="2000"
                max="2030"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="ios-btn-primary w-full !py-3 text-[14px] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        ) : (
          /* Read-only view */
          <div className="space-y-3.5">
            {/* Name */}
            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 text-[var(--text-tertiary)] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <div>
                <p className="text-[11px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide">Full Name</p>
                <p className="text-[14px] text-[var(--text-primary)] font-medium">{user.name || "-"}</p>
              </div>
            </div>

            {/* NIM */}
            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 text-[var(--text-tertiary)] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
              <div>
                <p className="text-[11px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide">NIM</p>
                <p className="text-[14px] text-[var(--text-primary)] font-medium">{user.nim || "-"}</p>
              </div>
            </div>

            {/* University */}
            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 text-[var(--text-tertiary)] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <div>
                <p className="text-[11px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide">University</p>
                <p className="text-[14px] text-[var(--text-primary)] font-medium">{user.university || "-"}</p>
              </div>
            </div>

            {/* Faculty */}
            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 text-[var(--text-tertiary)] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <div>
                <p className="text-[11px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide">Faculty</p>
                <p className="text-[14px] text-[var(--text-primary)] font-medium">{user.faculty || "-"}</p>
              </div>
            </div>

            {/* Study Program */}
            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 text-[var(--text-tertiary)] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <div>
                <p className="text-[11px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide">Study Program</p>
                <p className="text-[14px] text-[var(--text-primary)] font-medium">{user.study_program || "-"}</p>
              </div>
            </div>

            {/* Batch Year */}
            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 text-[var(--text-tertiary)] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="text-[11px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide">Batch Year</p>
                <p className="text-[14px] text-[var(--text-primary)] font-medium">{user.batch_year || "-"}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sign Out */}
      <div className="mt-6">
        <a
          href="/api/auth/signout"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-[rgba(239,68,68,0.3)] text-[var(--accent-red)] text-[14px] font-medium hover:bg-[rgba(239,68,68,0.05)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </a>
      </div>
    </div>
  );
}