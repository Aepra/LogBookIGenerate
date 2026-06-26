/**
 * Export Result Cache
 * ====================
 * In-memory cache for generated export buffers (PDF & DOCX).
 *
 * Purpose:
 *   - When user previews a logbook (generates PDF), the result is cached.
 *   - If user then clicks "Download PDF", the cached buffer is returned instantly
 *     instead of re-generating from scratch (~15s → <1s).
 *   - Similarly, re-opening preview within TTL is instant.
 *
 * Design:
 *   - TTL-based expiration (default 5 minutes)
 *   - Max entries cap with LRU eviction to prevent memory bloat
 *   - Key format: `export:{logbook_id}:{format}` where format is "pdf" or "docx"
 *   - Thread-safe for single-process Node.js (no mutex needed)
 *
 * Limitations:
 *   - Process-scoped: cache is lost on server restart
 *   - Not shared across serverless instances (same as MapCache)
 *   - For production multi-instance: consider Redis or S3 temp storage
 */

interface CacheEntry {
  buffer: Buffer;
  createdAt: number;
  accessedAt: number;
  sizeBytes: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 20;
const MAX_TOTAL_BYTES = 200 * 1024 * 1024; // 200MB max total cache size

class ExportResultCache {
  private store = new Map<string, CacheEntry>();
  private ttlMs: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  /**
   * Build a cache key from logbook ID and format.
   */
  static key(logbookId: string, format: "pdf" | "docx"): string {
    return `export:${logbookId}:${format}`;
  }

  /**
   * Get a cached buffer. Returns null if not found or expired.
   */
  get(key: string): Buffer | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.store.delete(key);
      return null;
    }

    // Update access time for LRU
    entry.accessedAt = Date.now();
    return entry.buffer;
  }

  /**
   * Store a buffer in cache.
   */
  set(key: string, buffer: Buffer): void {
    // Evict expired entries first
    this.evictExpired();

    // If at capacity, evict least recently accessed
    while (this.store.size >= MAX_ENTRIES) {
      this.evictLRU();
    }

    // Check total size and evict if needed
    let totalSize = this.getTotalSize();
    while (totalSize + buffer.length > MAX_TOTAL_BYTES && this.store.size > 0) {
      this.evictLRU();
      totalSize = this.getTotalSize();
    }

    this.store.set(key, {
      buffer,
      createdAt: Date.now(),
      accessedAt: Date.now(),
      sizeBytes: buffer.length,
    });
  }

  /**
   * Invalidate all cache entries for a specific logbook.
   * Called when activities are created/updated/deleted.
   */
  invalidateLogbook(logbookId: string): void {
    const prefix = `export:${logbookId}:`;
    const keysToDelete: string[] = [];
    this.store.forEach((_, key) => {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.store.delete(key));
  }

  /**
   * Clear entire cache.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get cache stats for debugging.
   */
  stats(): { entries: number; totalSizeMB: string; keys: string[] } {
    this.evictExpired();
    return {
      entries: this.store.size,
      totalSizeMB: (this.getTotalSize() / (1024 * 1024)).toFixed(2),
      keys: Array.from(this.store.keys()),
    };
  }

  // ── Internal helpers ──

  private getTotalSize(): number {
    let total = 0;
    this.store.forEach((entry) => {
      total += entry.sizeBytes;
    });
    return total;
  }

  private evictExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    this.store.forEach((entry, key) => {
      if (now - entry.createdAt > this.ttlMs) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.store.delete(key));
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    this.store.forEach((entry, key) => {
      if (entry.accessedAt < oldestTime) {
        oldestTime = entry.accessedAt;
        oldestKey = key;
      }
    });
    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }
}

/**
 * Singleton export cache instance.
 */
export const exportCache = new ExportResultCache();
