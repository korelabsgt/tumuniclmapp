"use client";

import { useCallback, useEffect, useState } from "react";

export function useAppChromeOffset() {
  const [topOffset, setTopOffset] = useState(80);
  const [bottomOffset, setBottomOffset] = useState(160);

  const measure = useCallback(() => {
    const nav = document.getElementById("app-main-nav");
    if (nav) {
      setTopOffset(nav.getBoundingClientRect().bottom);
    } else {
      const fallbackTop = window.matchMedia("(min-width: 640px)").matches ? 64 : 80;
      setTopOffset(fallbackTop);
    }

    const footer = document.getElementById("app-main-footer");
    if (footer) {
      setBottomOffset(footer.offsetHeight);
      return;
    }

    setBottomOffset(160);
  }, []);

  useEffect(() => {
    measure();

    const nav = document.getElementById("app-main-nav");
    const banner = document.getElementById("app-dev-banner");
    const footer = document.getElementById("app-main-footer");

    const observer = new ResizeObserver(measure);
    if (nav) observer.observe(nav);
    if (banner) observer.observe(banner);
    if (footer) observer.observe(footer);

    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  return { topOffset, bottomOffset, remeasure: measure };
}
