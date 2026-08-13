"use client";

import { useEffect, useState } from "react";

export function useDeferredReady(delayMs = 250) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  return ready;
}
