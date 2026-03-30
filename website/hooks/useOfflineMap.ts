"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseOfflineMapReturn {
  /** Whether city data is currently cached */
  isDownloaded: boolean;
  /** Whether a download is in progress */
  isDownloading: boolean;
  /** Download progress 0-100 */
  downloadProgress: number;
  /** Trigger download of city data for offline use */
  downloadCity: () => Promise<void>;
  /** Remove cached data for this city */
  removeCity: () => Promise<void>;
  /** When the city data was last cached */
  lastSynced: Date | null;
  /** Whether the browser is currently offline */
  isOffline: boolean;
  /** Whether there might be an update available (data older than 1 day) */
  updateAvailable: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CITY_DATA_CACHE = "paper-maps-city-data-v2";
const API_BASE =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api/v1"
    : "";

// Consider data stale after 24 hours
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// localStorage key prefix for sync timestamps
const SYNC_TS_PREFIX = "papermaps_sync_";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOfflineMap(citySlug: string): UseOfflineMapReturn {
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Abort controller for cancellation
  const abortRef = useRef<AbortController | null>(null);

  // -------------------------------------------------------------------------
  // Check online/offline status
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Check cache status on mount & when citySlug changes
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (typeof window === "undefined" || !("caches" in window)) return;

    checkCacheStatus();
  }, [citySlug]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkCacheStatus = useCallback(async () => {
    if (!("caches" in window)) {
      setIsDownloaded(false);
      setLastSynced(null);
      setUpdateAvailable(false);
      return;
    }

    try {
      const cache = await caches.open(CITY_DATA_CACHE);
      const keys = await cache.keys();
      const cityKey = keys.find((req) =>
        req.url.includes("/cities/" + citySlug + "/sync")
      );

      if (cityKey) {
        setIsDownloaded(true);

        // Try to read the syncedAt timestamp
        const response = await cache.match(cityKey);
        if (response) {
          try {
            const data = await response.clone().json();
            const syncedAt = data?.data?.syncedAt;
            if (syncedAt) {
              const syncDate = new Date(syncedAt);
              setLastSynced(syncDate);
              // Check if data is stale
              const age = Date.now() - syncDate.getTime();
              setUpdateAvailable(age > STALE_THRESHOLD_MS);
            } else {
              // Fall back to localStorage timestamp
              const stored = localStorage.getItem(SYNC_TS_PREFIX + citySlug);
              if (stored) {
                const syncDate = new Date(stored);
                setLastSynced(syncDate);
                const age = Date.now() - syncDate.getTime();
                setUpdateAvailable(age > STALE_THRESHOLD_MS);
              }
            }
          } catch {
            // Could not parse response — still cached
            setLastSynced(null);
          }
        }
      } else {
        setIsDownloaded(false);
        setLastSynced(null);
        setUpdateAvailable(false);
      }
    } catch {
      setIsDownloaded(false);
      setLastSynced(null);
      setUpdateAvailable(false);
    }
  }, [citySlug]);

  // -------------------------------------------------------------------------
  // Listen for service worker messages
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data || {};
      if (payload?.citySlug !== citySlug) return;

      if (type === "CITY_CACHE_INVALIDATED") {
        setIsDownloaded(false);
        setLastSynced(null);
        setUpdateAvailable(false);
      }

      if (type === "CITY_CACHE_REMOVED") {
        setIsDownloaded(false);
        setLastSynced(null);
        setUpdateAvailable(false);
      }
    };

    navigator.serviceWorker?.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
  }, [citySlug]);

  // -------------------------------------------------------------------------
  // Download city data
  // -------------------------------------------------------------------------

  const downloadCity = useCallback(async () => {
    if (!("caches" in window)) return;
    if (isDownloading) return;

    setIsDownloading(true);
    setDownloadProgress(0);

    abortRef.current = new AbortController();

    try {
      // Phase 1: Fetch city sync data (0-80%)
      setDownloadProgress(5);

      const syncUrl = `${API_BASE}/cities/${citySlug}/sync`;
      const response = await fetch(syncUrl, {
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch city data: ${response.status}`);
      }

      setDownloadProgress(20);

      // Read the response body to track progress
      const contentLength = response.headers.get("content-length");
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      let body: Uint8Array;

      if (total && response.body) {
        // Stream the response to track progress
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          // Map network progress to 20-70% range
          const networkProgress = Math.min((received / total) * 100, 100);
          setDownloadProgress(20 + Math.round(networkProgress * 0.5));
        }

        // Combine chunks
        body = new Uint8Array(received);
        let offset = 0;
        for (const chunk of chunks) {
          body.set(chunk, offset);
          offset += chunk.length;
        }
      } else {
        // No content-length — just read the whole thing
        const arrayBuffer = await response.arrayBuffer();
        body = new Uint8Array(arrayBuffer);
        setDownloadProgress(70);
      }

      // Phase 2: Store in cache (70-90%)
      setDownloadProgress(75);

      const cache = await caches.open(CITY_DATA_CACHE);
      const cacheResponse = new Response(body.buffer as ArrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Cached-At": new Date().toISOString(),
        },
      });

      await cache.put(new Request(syncUrl), cacheResponse);

      setDownloadProgress(90);

      // Phase 3: Store sync timestamp (90-100%)
      const now = new Date();
      try {
        localStorage.setItem(SYNC_TS_PREFIX + citySlug, now.toISOString());
      } catch {
        // localStorage may be full
      }

      setDownloadProgress(100);
      setIsDownloaded(true);
      setLastSynced(now);
      setUpdateAvailable(false);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        // Download was cancelled
        setDownloadProgress(0);
      } else {
        console.error("[useOfflineMap] Download failed:", err);
        setDownloadProgress(0);
      }
    } finally {
      setIsDownloading(false);
      abortRef.current = null;
    }
  }, [citySlug, isDownloading]);

  // -------------------------------------------------------------------------
  // Remove city data from cache
  // -------------------------------------------------------------------------

  const removeCity = useCallback(async () => {
    if (!("caches" in window)) return;

    try {
      // Remove from Cache API
      const cache = await caches.open(CITY_DATA_CACHE);
      const keys = await cache.keys();
      const cityKeys = keys.filter((req) =>
        req.url.includes("/cities/" + citySlug + "/sync")
      );
      await Promise.all(cityKeys.map((key) => cache.delete(key)));

      // Remove localStorage timestamp
      try {
        localStorage.removeItem(SYNC_TS_PREFIX + citySlug);
      } catch {
        // ignore
      }

      // Also tell service worker
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "REMOVE_CITY_CACHE",
          payload: { citySlug },
        });
      }

      setIsDownloaded(false);
      setLastSynced(null);
      setDownloadProgress(0);
      setUpdateAvailable(false);
    } catch (err) {
      console.error("[useOfflineMap] Remove failed:", err);
    }
  }, [citySlug]);

  return {
    isDownloaded,
    isDownloading,
    downloadProgress,
    downloadCity,
    removeCity,
    lastSynced,
    isOffline,
    updateAvailable,
  };
}
