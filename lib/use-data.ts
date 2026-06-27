"use client";

import { useEffect, useState, useRef } from "react";

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const clientCache = new Map<string, CacheEntry<unknown>>();

export function useCachedFetch<T>(url: string, ttlMs = 30_000) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = `fetch:${url}`;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchData() {
    const cached = clientCache.get(key);
    if (cached && Date.now() < cached.expiry) {
      setData(cached.data as T);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      clientCache.set(key, { data: json, expiry: Date.now() + ttlMs });
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, ttlMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [url]);

  return { data, loading, error, refetch: fetchData };
}
