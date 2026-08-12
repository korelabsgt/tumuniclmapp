"use client";

import { useEffect, useRef, useState } from "react";
import AppFooter from "@/components/layout/AppFooter";

export default function ProtectedShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const footerRef = useRef<HTMLDivElement>(null);
  const [footerHeight, setFooterHeight] = useState(160);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const medir = () => setFooterHeight(footer.offsetHeight);
    medir();

    const observer = new ResizeObserver(medir);
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className="relative z-10 bg-background">
        <main className="mx-auto flex w-full flex-col gap-5 pb-10 pt-2 sm:pb-2">
          {children}
        </main>
      </div>

      <div
        aria-hidden
        className="shrink-0"
        style={{ height: footerHeight }}
      />

      <div
        ref={footerRef}
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-0"
      >
        <div className="pointer-events-auto">
          <AppFooter />
        </div>
      </div>
    </>
  );
}
