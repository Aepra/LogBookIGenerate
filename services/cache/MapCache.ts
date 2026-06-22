import { ICache } from "./ICache";

/**
 * In-memory Map-based cache implementation.
 *
 * Good for:
 *   - Development / single-instance deployments
 *   - Testing
 *
 * NOT suitable for:
 *   - Multi-instance (serverless, load-balanced) deployments
 *   - Persistent caching across server restarts
 *
 * Drive folder IDs are immutable — a cached ID never changes unless the folder
 * is manually deleted on Drive. If deleted, find-or-create auto-recovers.
 * This makes in-memory cache safe even if imperfect.
 */
export class MapCache implements ICache {
  private store = new Map<string, string | null>();

  get(key: string): string | null | undefined {
    return this.store.has(key) ? this.store.get(key) : undefined;
  }

  set(key: string, value: string | null): void {
    this.store.set(key, value);
  }

  del(key: string): void {
    this.store.delete(key);
  }

  describe(): string {
    return `MapCache(size=${this.store.size})`;
  }
}

/**
 * Singleton default cache instance.
 * Swap this out when moving to Redis/production cache.
 */
export const defaultCache: ICache = new MapCache();