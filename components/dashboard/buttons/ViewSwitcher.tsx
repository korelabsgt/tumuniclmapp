"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AnimatedIcon from "@/components/ui/AnimatedIcon";

type QuickNavCardProps = {
  titulo: string;
  iconKey: string;
  activo: boolean;
  cardClass: string;
  stripClass: string;
  textClass: string;
  onEnter: () => void;
  onLeave: () => void;
  onClick: () => void;
};

function QuickNavCard({
  titulo,
  iconKey,
  activo,
  cardClass,
  stripClass,
  textClass,
  onEnter,
  onLeave,
  onClick,
}: QuickNavCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={`group flex w-full cursor-pointer items-stretch overflow-hidden rounded-md border text-left shadow-sm transition-colors hover:brightness-[1.02] md:w-fit dark:shadow-none ${cardClass}`}
    >
      <div
        className={`flex w-12 shrink-0 items-center justify-center self-stretch rounded-l-md px-2 py-1 sm:w-[4.25rem] sm:px-3 ${stripClass}`}
      >
        <AnimatedIcon
          iconKey={iconKey}
          className="h-full w-full min-h-[2.75rem] sm:min-h-[3rem]"
          trigger={activo ? "loop" : undefined}
        />
      </div>

      <div className="flex min-w-0 flex-1 items-center py-2 pr-3 pl-2 sm:pr-4 sm:pl-3 md:flex-none">
        <span className={`truncate text-xs font-bold uppercase tracking-wide sm:text-sm md:whitespace-nowrap ${textClass}`}>
          {titulo}
        </span>
      </div>
    </button>
  );
}

export function AsistenciaQuickNav() {
  const router = useRouter();
  const [activo, setActivo] = useState(false);

  return (
    <QuickNavCard
      titulo="Asistencia"
      iconKey="sgtmgpft"
      activo={activo}
      cardClass="border-green-200/90 bg-green-50 dark:border-green-800/55 dark:bg-green-950/30"
      stripClass="bg-green-100/90 dark:bg-green-900/45"
      textClass="text-green-700 dark:text-green-400"
      onEnter={() => setActivo(true)}
      onLeave={() => setActivo(false)}
      onClick={() => router.push("/protected/mis-asistencias")}
    />
  );
}

export function ComisionesQuickNav() {
  const router = useRouter();
  const [activo, setActivo] = useState(false);

  return (
    <QuickNavCard
      titulo="Comisiones"
      iconKey="vqkaxtlm"
      activo={activo}
      cardClass="border-purple-200/90 bg-purple-50 dark:border-purple-800/55 dark:bg-purple-950/30"
      stripClass="bg-purple-100/90 dark:bg-purple-900/45"
      textClass="text-purple-700 dark:text-purple-400"
      onEnter={() => setActivo(true)}
      onLeave={() => setActivo(false)}
      onClick={() => router.push("/protected/mis-comisiones")}
    />
  );
}

export function QuickNavPair({ className = "" }: { className?: string }) {
  return (
    <div
      className={`grid w-full grid-cols-2 gap-2.5 md:mx-auto md:flex md:w-fit md:justify-center md:gap-3 ${className}`}
    >
      <AsistenciaQuickNav />
      <ComisionesQuickNav />
    </div>
  );
}
