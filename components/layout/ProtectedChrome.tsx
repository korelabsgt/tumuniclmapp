"use client";

import AppFooter from "@/components/layout/AppFooter";
import { DotPattern } from "@/components/ui/dot-pattern";
import { useAppChromeOffset } from "@/components/layout/useAppChromeOffset";
import { PAGE_BG_CLASS } from "@/components/layout/chrome";

export default function ProtectedChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const { bottomOffset } = useAppChromeOffset();
  const footerSpace = bottomOffset > 0 ? bottomOffset : 160;

  return (
    <>
      <footer id="app-main-footer" className="fixed inset-x-0 bottom-0 z-0">
        <AppFooter />
      </footer>

      <div
        className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain"
        style={{ paddingBottom: footerSpace }}
      >
        <div className={`relative ${PAGE_BG_CLASS}`}>
          <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
            <DotPattern
              width={20}
              height={20}
              cx={1}
              cy={1}
              cr={0.9}
              center
              className="h-full w-full text-gray-400/45 dark:text-zinc-600/45"
            />
          </div>

          <main className="relative z-10 mx-auto flex w-full flex-col gap-5 pt-2">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
