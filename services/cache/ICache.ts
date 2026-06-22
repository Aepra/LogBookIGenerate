/**
 * Pluggable cache interface for Drive folder ID caching.
 *
 * Drive folder IDs are immutable — once a folder is created, its ID never
 * changes. This makes them safe to cache indefinitely. The only reason a
 * cached value becomes stale is if a folder is manually deleted on Drive,
 * in which case any find-or-create operation will auto-recover.
 *
 * Implementations:
 *   MapCache       — in-memory, process-scoped (dev, single-instance)
 *   RedisCache     — external, shared across instances (production, multi-instance)
 */
export interface ICache {
  /** Returns the cached value, `undefined` if missing */
  get(key: string): string | null | undefined;

  /** Stores a value */
  set(key: string, value: string | null): void;

  /** Deletes a specific key */
  del(key: string): void;

  /** (Optional) Returns a human-readable description of the backend */
  describe(): string;
}

/**
 * Prefixes used for all cache keys in this system.
 * Kept in one place to avoid collisions and ease debugging.
 */
export const CACHE_PREFIX = {
  VERIFIED_ROOT: "drive:verifiedRoot:",
  IMAGE_ROOT: "drive:imageRoot:",
  LOGBOOK_FOLDER: "drive:logbookFolder:",
} as const;