"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Logbook, LogbookType } from "@/services/logbook.service";

interface Props {
  logbooks: Logbook[];
}

export default function DashboardClient({ logbooks }: Props) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "other" as LogbookType,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/logbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal membuat logbook");
        return;
      }

      // Reset form & close modal
      setForm({ title: "", description: "", type: "other" });
      setIsModalOpen(false);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const typeBadgeClass = (type: string) => {
    switch (type) {
      case "pkl":
        return "bg-blue-100 text-blue-800";
      case "kkn":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case "pkl":
        return "PKL";
      case "kkn":
        return "KKN";
      default:
        return "Lainnya";
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Logbook Aktif</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="ios-btn-primary"
        >
          + Buat Logbook
        </button>
      </div>

      {/* Logbook List */}
      {logbooks.length === 0 ? (
        <p className="text-gray-500 italic">
          Belum ada logbook yang dibuat. Mari mulai mencatat aktivitasmu.
        </p>
      ) : (
        <div className="space-y-3">
          {logbooks.map((logbook) => (
            <Link
              key={logbook.id}
              href={`/logbook/${logbook.id}`}
              prefetch={true}
              className="ios-card block p-5 border border-transparent hover:border-[var(--accent-primary)] hover:shadow-md transition-all duration-200"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-[var(--text-primary)] truncate sm:whitespace-normal sm:line-clamp-2">{logbook.title}</h3>
                  {logbook.description && (
                    <p className="text-[var(--text-secondary)] text-sm mt-1.5 line-clamp-2">
                      {logbook.description}
                    </p>
                  )}
                  <p className="text-[var(--text-tertiary)] text-xs mt-3 font-medium">
                    Dibuat {formatDate(logbook.created_at)}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase ${typeBadgeClass(logbook.type)}`}
                  >
                    {typeLabel(logbook.type)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Logbook Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Buat Logbook Baru</h3>
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
                  Judul Logbook <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  placeholder="Contoh: PKL di PT Maju Jaya"
                  className="ios-input"
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
                  placeholder="Deskripsi singkat tentang logbook ini"
                  className="ios-input resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipe <span className="text-red-500">*</span>
                </label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  className="ios-select"
                >
                  <option value="pkl">PKL</option>
                  <option value="kkn">KKN</option>
                  <option value="other">Lainnya</option>
                </select>
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
                  className="ios-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
