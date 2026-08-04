"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AnimatedIcon from "@/components/ui/AnimatedIcon";

interface ViewSwitcherProps {
  isSuper: boolean;
}

export default function ViewSwitcher({ isSuper }: ViewSwitcherProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div
      className={`flex gap-2 h-14 order-1 md:order-3 ${isSuper ? "md:col-span-5" : "md:col-span-8"}`}
    >
      <button
        type="button"
        onClick={() => router.push("/sigem/mis-asistencias")}
        onMouseEnter={() => setHovered("asistencia")}
        onMouseLeave={() => setHovered(null)}
        className="flex-1 flex items-center justify-center gap-2 h-full rounded-md bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 shadow-sm border border-green-200 dark:border-green-800 text-base md:text-lg font-bold transition-colors duration-200"
      >
        <AnimatedIcon
          iconKey="sgtmgpft"
          className="w-8 h-8"
          trigger={hovered === "asistencia" ? "loop" : undefined}
        />
        <span className="truncate">Asistencia</span>
      </button>

      <button
        type="button"
        onClick={() => router.push("/sigem/mis-comisiones")}
        onMouseEnter={() => setHovered("comisiones")}
        onMouseLeave={() => setHovered(null)}
        className="flex-1 flex items-center justify-center gap-2 h-full rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 shadow-sm border border-purple-200 dark:border-purple-800 text-base md:text-lg font-bold transition-colors duration-200"
      >
        <AnimatedIcon
          iconKey="vqkaxtlm"
          className="w-8 h-8"
          trigger={hovered === "comisiones" ? "loop" : undefined}
        />
        <span className="truncate">Comisiones</span>
      </button>
    </div>
  );
}
