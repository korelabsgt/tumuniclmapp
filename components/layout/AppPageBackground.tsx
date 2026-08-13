"use client";

import { DotPattern } from "@/components/ui/dot-pattern";

export default function AppPageBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[1]">
      <DotPattern
        width={20}
        height={20}
        cx={1}
        cy={1}
        cr={0.9}
        className="h-full w-full text-gray-400/45 dark:text-zinc-600/45"
      />
    </div>
  );
}
