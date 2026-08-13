"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AnimatedIcon from "@/components/ui/AnimatedIcon";

interface ViewSwitcherProps {
  showMensajes?: boolean;
}

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
      className={`group flex w-auto max-w-full cursor-pointer items-stretch overflow-hidden rounded-md border text-left shadow-sm transition-colors hover:brightness-[1.02] dark:shadow-none ${cardClass}`}
    >
      <div
        className={`flex w-[4.25rem] shrink-0 items-center justify-center self-stretch rounded-l-md px-3 py-1 ${stripClass}`}
      >
        <AnimatedIcon
          iconKey={iconKey}
          className="h-full w-full min-h-[3rem]"
          trigger={activo ? "loop" : undefined}
        />
      </div>

      <div className="flex items-center py-2 pr-4 pl-3">
        <span className={`whitespace-nowrap text-sm font-bold uppercase tracking-wide ${textClass}`}>
          {titulo}
        </span>
      </div>
    </button>
  );
}

export default function ViewSwitcher({ showMensajes = false }: ViewSwitcherProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="order-1 flex w-full justify-center md:col-span-12 md:order-3">
      <div
        className={`grid w-full max-w-lg justify-items-center gap-2.5 ${showMensajes ? "grid-cols-3" : "grid-cols-2"} sm:flex sm:w-auto sm:max-w-none sm:justify-center sm:gap-3`}
      >
        {showMensajes && (
          <QuickNavCard
            titulo="Difusión"
            iconKey="bsmkjadb"
            activo={hovered === "mensajes"}
            cardClass="border-orange-200/90 bg-orange-50 dark:border-orange-800/55 dark:bg-orange-950/30"
            stripClass="bg-orange-100/90 dark:bg-orange-900/45"
            textClass="text-orange-700 dark:text-orange-400"
            onEnter={() => setHovered("mensajes")}
            onLeave={() => setHovered(null)}
            onClick={() => router.push("/protected/dev")}
          />
        )}

        <QuickNavCard
          titulo="Asistencia"
          iconKey="sgtmgpft"
          activo={hovered === "asistencia"}
          cardClass="border-green-200/90 bg-green-50 dark:border-green-800/55 dark:bg-green-950/30"
          stripClass="bg-green-100/90 dark:bg-green-900/45"
          textClass="text-green-700 dark:text-green-400"
          onEnter={() => setHovered("asistencia")}
          onLeave={() => setHovered(null)}
          onClick={() => router.push("/protected/mis-asistencias")}
        />

        <QuickNavCard
          titulo="Comisiones"
          iconKey="vqkaxtlm"
          activo={hovered === "comisiones"}
          cardClass="border-purple-200/90 bg-purple-50 dark:border-purple-800/55 dark:bg-purple-950/30"
          stripClass="bg-purple-100/90 dark:bg-purple-900/45"
          textClass="text-purple-700 dark:text-purple-400"
          onEnter={() => setHovered("comisiones")}
          onLeave={() => setHovered(null)}
          onClick={() => router.push("/protected/mis-comisiones")}
        />
      </div>
    </div>
  );
}
