"use client";

import { useEffect, useRef } from "react";

export function useAbortController() {
  const ref = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (ref.current) ref.current.abort();
    };
  }, []);

  function getSignal() {
    if (ref.current) ref.current.abort();
    ref.current = new AbortController();
    return ref.current.signal;
  }

  return getSignal;
}
