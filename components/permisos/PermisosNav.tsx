"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FileText, ScrollText, Bell } from "lucide-react";

type TipoVista = "mis" | "jefe" | "rrhh";

interface Props {
  tipoVista: TipoVista;
  className?: string;
}

const RUTAS: Record<TipoVista, { permisos: string; acuerdos: string; lecturas: string }> = {
  mis: {
    permisos: "/sigem/permisos",
    acuerdos: "/sigem/permisos/acuerdos",
    lecturas: "/sigem/permisos/lecturas",
  },
  jefe: {
    permisos: "/sigem/permisos/jefe",
    acuerdos: "/sigem/permisos/acuerdos/jefe",
    lecturas: "/sigem/permisos/lecturas/jefe",
  },
  rrhh: {
    permisos: "/sigem/permisos/rrhh",
    acuerdos: "/sigem/permisos/acuerdos/rrhh",
    lecturas: "/sigem/permisos/lecturas/rrhh",
  },
};

export default function PermisosNav({ tipoVista, className }: Props) {
  const pathname = usePathname();
  const rutas = RUTAS[tipoVista];
  const esAcuerdos = pathname.includes("/acuerdos");
  const esLecturas = pathname.includes("/lecturas");

  return (
    <div
      className={cn(
        "flex items-center justify-center sm:justify-start gap-1 p-1 bg-gray-200/50 dark:bg-neutral-800 rounded-lg w-full sm:w-fit flex-wrap",
        className,
      )}
    >
      <Link
        href={rutas.permisos}
        className={cn(
          "flex flex-1 sm:flex-initial items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-[11px] sm:text-sm font-bold rounded-md transition-all min-w-0",
          !esAcuerdos && !esLecturas
            ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm"
            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
        )}
      >
        <FileText className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">Permisos</span>
      </Link>
      <Link
        href={rutas.acuerdos}
        className={cn(
          "flex flex-1 sm:flex-initial items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-[11px] sm:text-sm font-bold rounded-md transition-all min-w-0",
          esAcuerdos
            ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm"
            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
        )}
      >
        <ScrollText className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">Acuerdos</span>
      </Link>
      <Link
        href={rutas.lecturas}
        className={cn(
          "flex flex-1 sm:flex-initial items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-[11px] sm:text-sm font-bold rounded-md transition-all min-w-0",
          esLecturas
            ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm"
            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
        )}
      >
        <Bell className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">Notificaciones</span>
      </Link>
    </div>
  );
}
