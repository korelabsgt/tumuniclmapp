"use client";

import { useCallback, useEffect, useState } from "react";

export function useAppChromeOffset() {
  const [topOffset, setTopOffset] = useState(80);

  const measure = useCallback(() => {
    const nav = document.getElementById("app-main-nav");
    if (nav) {
      setTopOffset(nav.getBoundingClientRect().bottom);
      return;
    }

    const fallback = window.matchMedia("(min-width: 640px)").matches ? 64 : 80;
    setTopOffset(fallback);
  }, []);

  useEffect(() => {
    measure();

    const nav = document.getElementById("app-main-nav");
    const banner = document.getElementById("app-dev-banner");

    const observer = new ResizeObserver(measure);
    if (nav) observer.observe(nav);
    if (banner) observer.observe(banner);

    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  return { topOffset, remeasure: measure };
}
