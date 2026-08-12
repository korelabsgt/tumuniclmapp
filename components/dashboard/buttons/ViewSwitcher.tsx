"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AnimatedIcon from "@/components/ui/AnimatedIcon";
export default function ViewSwitcher() {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="order-1 -mx-4 w-[calc(100%+2rem)] md:col-span-12 md:order-3 sm:mx-0 sm:flex sm:w-full sm:justify-center sm:px-2">
      <div className="w-full rounded-none border-x-0 border-y-2 border-zinc-300 shadow-sm dark:border-zinc-600 sm:w-fit sm:max-w-full sm:rounded-xl sm:border-2 sm:border-zinc-300 dark:sm:border-zinc-600">
        <div className="flex h-11 w-full divide-x-2 divide-zinc-300 dark:divide-zinc-600 sm:h-12">
          <button
            type="button"
            onClick={() => router.push("/protected/mis-asistencias")}
            onMouseEnter={() => setHovered("asistencia")}
            onMouseLeave={() => setHovered(null)}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 bg-green-50/90 px-2 text-sm font-bold text-green-700 transition-colors hover:bg-green-100/70 dark:bg-green-950/20 dark:text-green-400/90 dark:hover:bg-green-900/30 sm:flex-initial sm:shrink-0 sm:gap-2.5 sm:px-4 sm:text-lg"
          >
            <AnimatedIcon
              iconKey="sgtmgpft"
              className="h-7 w-7 shrink-0 sm:h-8 sm:w-8"
              trigger={hovered === "asistencia" ? "loop" : undefined}
            />
            <span className="whitespace-nowrap">Asistencia</span>
          </button>

          <button
            type="button"
            onClick={() => router.push("/protected/mis-comisiones")}
            onMouseEnter={() => setHovered("comisiones")}
            onMouseLeave={() => setHovered(null)}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 bg-purple-50/90 px-2 text-sm font-bold text-purple-700 transition-colors hover:bg-purple-100/70 dark:bg-purple-950/20 dark:text-purple-400/90 dark:hover:bg-purple-900/30 sm:flex-initial sm:shrink-0 sm:gap-2.5 sm:px-4 sm:text-lg"
          >
            <AnimatedIcon
              iconKey="vqkaxtlm"
              className="h-7 w-7 shrink-0 sm:h-8 sm:w-8"
              trigger={hovered === "comisiones" ? "loop" : undefined}
            />
            <span className="whitespace-nowrap">Comisiones</span>
          </button>
        </div>
      </div>
    </div>
  );
}
