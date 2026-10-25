import { describe, expect, it, vi } from "vitest";
import { FlightCache } from "./flightCache";

describe("FlightCache", () => {
  it("stores and retrieves cached values", () => {
    const cache = new FlightCache<string>(10);
    cache.set("su1531", "Flight data", 60);

    expect(cache.get("SU1531")).toBe("Flight data");
    expect(cache.get("su1531")).toBe("Flight data");
  });

  it("returns undefined for expired entries", () => {
    vi.useFakeTimers();
    try {
      const cache = new FlightCache<string>(10);
      cache.set("SU1531", "Flight data", 5); // 5 second TTL

      expect(cache.get("SU1531")).toBe("Flight data");

      // Advance clock past TTL
      vi.advanceTimersByTime(6000);

      expect(cache.get("SU1531")).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("bounds cache size and evicts oldest entries when reaching maxEntries", () => {
    const cache = new FlightCache<number>(3); // Max 3 entries

    cache.set("F1", 1, 60);
    cache.set("F2", 2, 60);
    cache.set("F3", 3, 60);

    expect(cache.size()).toBe(3);
    expect(cache.get("F1")).toBe(1);

    // Adding F4 should evict the oldest entry.
    // Since F1 was accessed, F2 is now the oldest entry.
    cache.set("F4", 4, 60);

    expect(cache.size()).toBe(3);
    expect(cache.get("F2")).toBeUndefined(); // F2 was evicted
    expect(cache.get("F1")).toBe(1);
    expect(cache.get("F3")).toBe(3);
    expect(cache.get("F4")).toBe(4);
  });

  it("deletes entries explicitly", () => {
    const cache = new FlightCache<string>(10);
    cache.set("SU1531", "Flight data", 60);

    expect(cache.delete("SU1531")).toBe(true);
    expect(cache.get("SU1531")).toBeUndefined();
  });

  it("clears all entries", () => {
    const cache = new FlightCache<string>(10);
    cache.set("F1", "1", 60);
    cache.set("F2", "2", 60);

    cache.clear();

    expect(cache.size()).toBe(0);
    expect(cache.get("F1")).toBeUndefined();
  });
});
