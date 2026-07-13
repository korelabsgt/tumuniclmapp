"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FileText, ScrollText } from "lucide-react";

type TipoVista = "mis" | "jefe" | "rrhh";

interface Props {
  tipoVista: TipoVista;
}

const RUTAS: Record<TipoVista, { permisos: string; acuerdos: string }> = {
  mis: {
    permisos: "/protected/permisos",
    acuerdos: "/protected/permisos/acuerdos",
  },
  jefe: {
    permisos: "/protected/permisos/jefe",
    acuerdos: "/protected/permisos/acuerdos/jefe",
  },
  rrhh: {
    permisos: "/protected/permisos/rrhh",
    acuerdos: "/protected/permisos/acuerdos/rrhh",
  },
};

export default function PermisosNav({ tipoVista }: Props) {
  const pathname = usePathname();
  const rutas = RUTAS[tipoVista];
  const esAcuerdos = pathname.includes("/acuerdos");

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-200/50 dark:bg-neutral-800 rounded-lg w-fit mb-3">
      <Link
        href={rutas.permisos}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all",
          !esAcuerdos
            ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm"
            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
        )}
      >
        <FileText className="w-3.5 h-3.5" />
        Permisos
      </Link>
      <Link
        href={rutas.acuerdos}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all",
          esAcuerdos
            ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm"
            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
        )}
      >
        <ScrollText className="w-3.5 h-3.5" />
        Acuerdos
      </Link>
    </div>
  );
}
