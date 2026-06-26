/**
 * Export Cache Invalidation Helper
 * =================================
 * Provides a simple function to invalidate export cache entries
 * when logbook activities are modified.
 *
 * Usage:
 *   import { invalidateExportCache } from "@/lib/invalidateExportCache";
 *   await invalidateExportCache(logbookId);
 */

import { exportCache } from "@/services/cache/ExportCache";

/**
 * Invalidates all cached export results for a specific logbook.
 * Call this whenever activities are created, updated, or deleted.
 *
 * @param logbookId - The logbook ID whose cache should be cleared
 */
export function invalidateExportCache(logbookId: string): void {
  exportCache.invalidateLogbook(logbookId);
  console.log(`[ExportCache] Invalidated cache for logbook ${logbookId.substring(0, 8)}...`);
}
