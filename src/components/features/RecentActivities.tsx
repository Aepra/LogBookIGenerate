"use client";

import Link from "next/link";
import type { Activity as BaseActivity } from "@/services/activity.service";

interface Activity extends BaseActivity {
  logbook_title?: string;
}

function getGroupKey(dateStr: string): "today" | "yesterday" | "earlier" {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr + "T00:00:00Z");
  const diff = today.getTime() - date.getTime();
  const dayMs = 86400000;

  if (diff < dayMs) return "today";
  if (diff < 2 * dayMs) return "yesterday";
  return "earlier";
}

function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  return `${h}:${m}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00Z");
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function RecentActivities({
  activities,
}: {
  activities: Activity[];
}) {
  const grouped: Record<string, Activity[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  };

  for (const activity of activities) {
    const key = getGroupKey(activity.activity_date);
    grouped[key].push(activity);
  }

  const groupLabels: Record<string, string> = {
    today: "Hari Ini",
    yesterday: "Kemarin",
    earlier: "Sebelumnya",
  };

  const hasActivities = activities.length > 0;

  return (
    <section>
      <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-3 px-0.5">
        Aktivitas Terkini
      </h2>
      {!hasActivities ? (
        <div className="ios-card p-8 text-center">
          <p className="text-[14px] text-[var(--text-secondary)]">Belum ada aktivitas.</p>
          <Link
            href="/logbook"
            className="inline-block mt-2 text-[13px] text-[var(--accent-blue)] font-medium"
          >
            Buka Logbook
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(Object.keys(groupLabels) as Array<keyof typeof groupLabels>).map((groupKey) => {
            const items = grouped[groupKey];
            if (items.length === 0) return null;

            return (
              <div key={groupKey}>
                <h3 className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.06em] mb-1.5 px-0.5">
                  {groupLabels[groupKey]}
                </h3>
                <div className="space-y-1.5">
                  {items.map((activity) => (
                    <Link
                      key={activity.id}
                      href={`/logbook/${activity.logbook_id}`}
                      className="block ios-card p-3 sm:p-3.5 hover:shadow-md transition-all duration-200 active:scale-[0.99]"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-medium text-[var(--text-primary)] truncate">
                            {activity.title}
                          </p>
                          <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                            {formatDate(activity.activity_date)}
                          </p>
                          {activity.logbook_title && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="inline-block w-1 h-1 rounded-full bg-[var(--text-tertiary)]" />
                              <p className="text-[11px] text-[var(--text-tertiary)]">
                                {activity.logbook_title}
                              </p>
                            </div>
                          )}
                        </div>
                        {activity.start_time && activity.end_time && (
                          <div className="flex-shrink-0 mt-0.5">
                            <span className="inline-block text-[11px] font-medium text-[var(--text-secondary)] bg-[var(--fill-secondary)] rounded-full px-2.5 py-1">
                              {formatTime(activity.start_time)} - {formatTime(activity.end_time)}
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
