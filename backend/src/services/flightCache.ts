import type { FlightResponse } from "../types/flight";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  cachedAt: number;
}

export class FlightCache<T = FlightResponse | null> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = Math.max(1, maxEntries);
  }

  get(key: string): T | undefined {
    const normalizedKey = key.trim().toUpperCase();
    const entry = this.cache.get(normalizedKey);

    if (!entry) {
      return undefined;
    }

    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(normalizedKey);
      return undefined;
    }

    // Refresh insertion order on access for LRU behavior
    this.cache.delete(normalizedKey);
    this.cache.set(normalizedKey, entry);

    return entry.data;
  }

  set(key: string, data: T, ttlSeconds: number): void {
    const normalizedKey = key.trim().toUpperCase();

    if (ttlSeconds <= 0) {
      return;
    }

    // If key already exists, delete it first to update position
    this.cache.delete(normalizedKey);

    // Evict oldest entry if at capacity
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    const now = Date.now();
    this.cache.set(normalizedKey, {
      data,
      expiresAt: now + ttlSeconds * 1000,
      cachedAt: now,
    });
  }

  delete(key: string): boolean {
    const normalizedKey = key.trim().toUpperCase();
    return this.cache.delete(normalizedKey);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance for route handlers
export const flightCache = new FlightCache<FlightResponse | null>(500);
