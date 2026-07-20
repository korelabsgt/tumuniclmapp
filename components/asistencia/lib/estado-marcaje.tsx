import {
  parseISO,
  isToday,
  isAfter,
  isBefore,
  startOfToday,
  addMinutes,
  format,
} from "date-fns";
import {
  Clock,
  XCircle,
  CheckCircle2,
  LogOut,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { PermisoEmpleado } from "@/components/permisos/types";
import { obtenerHorarioAsistenciaEnFecha } from "@/components/permisos/utilidades";

/** Minutos de gracia tras la hora de entrada (ej. 8:00 → hasta 8:15). */
export const MINUTOS_GRACIA_ENTRADA = 15;
/** Primera hora que cuenta como entrada tarde (ej. 8:00 → desde 8:16). */
export const MINUTOS_INICIO_ENTRADA_TARDE = MINUTOS_GRACIA_ENTRADA + 1;

export type EstadoMarcaje =
  | "esperando"
  | "sin_permiso"
  | "sin_marcaje_salida"
  | "sin_registro_entrada"
  | "entrada_tarde"
  | "correcto";

export const ENTRADA_TARDE_TIME_CLASS =
  "text-red-600 dark:text-red-400 font-normal";

export const MARCaje_FILA_CLASS =
  "text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap";
export const MARCaje_ETIQUETA_CLASS =
  "font-bold text-gray-700 dark:text-gray-300";
export const MARCaje_HORA_CLASS =
  "font-normal text-gray-800 dark:text-gray-200";

export function resolverHorarioEntradaDia(
  diaString: string,
  horarioEmpleadoEntrada?: string | null,
  horarioEmpleadoSalida?: string | null,
  justificacion?: PermisoEmpleado | null,
): string {
  const defecto = horarioEmpleadoEntrada || "08:00:00";
  if (!justificacion) return defecto;
  const horario = obtenerHorarioAsistenciaEnFecha(justificacion, diaString, {
    entrada: horarioEmpleadoEntrada,
    salida: horarioEmpleadoSalida,
  });
  return horario?.entrada || defecto;
}

function limiteEntradaTarde(diaString: string, horarioEntrada: string): Date {
  const [h, m, s] = horarioEntrada.split(":").map(Number);
  const base = parseISO(`${diaString}T00:00:00`);
  const programada = new Date(base);
  programada.setHours(h || 0, m || 0, s || 0, 0);
  return addMinutes(programada, MINUTOS_INICIO_ENTRADA_TARDE);
}

export function esMarcaEntradaTardeEnHorario(
  marca: Date,
  diaString: string,
  horarioEntrada: string,
): boolean {
  return !isBefore(marca, limiteEntradaTarde(diaString, horarioEntrada));
}

export function esEntradaTardeMarcaje(params: {
  marcaEntradaAt?: string | null;
  horarioEntrada?: string | null;
  diaString?: string | null;
  notas?: string | null;
}): boolean {
  const { marcaEntradaAt, horarioEntrada, diaString, notas } = params;
  if (marcaEntradaAt) {
    const marca = new Date(marcaEntradaAt);
    const dia = diaString || format(marca, "yyyy-MM-dd");
    return esMarcaEntradaTardeEnHorario(
      marca,
      dia,
      horarioEntrada || "08:00:00",
    );
  }
  return (notas ?? "").toLowerCase().includes("entrada tarde");
}

export function resolverEstadoMarcaje(params: {
  fechaStr: string;
  tieneEntrada: boolean;
  tieneSalida: boolean;
  notasEntrada?: string | null;
  notasSalida?: string | null;
  marcaEntradaAt?: string | null;
  horarioEntrada?: string | null;
  cantidadMarcajes?: number | null;
}): EstadoMarcaje | null {
  const {
    fechaStr,
    tieneEntrada,
    tieneSalida,
    notasEntrada,
    marcaEntradaAt,
    horarioEntrada,
    cantidadMarcajes,
  } = params;
  const fechaDia = parseISO(`${fechaStr}T00:00:00`);
  const esHoyOFuturo = isToday(fechaDia) || isAfter(fechaDia, startOfToday());

  if (cantidadMarcajes != null && cantidadMarcajes > 0) {
    if (cantidadMarcajes % 2 !== 0) {
      if (esHoyOFuturo) return "esperando";
      return "sin_permiso";
    }
    return "correcto";
  }

  if (!tieneEntrada && !tieneSalida) {
    if (esHoyOFuturo) return null;
    return "sin_permiso";
  }

  if (tieneEntrada && !tieneSalida) {
    if (esHoyOFuturo) return "esperando";
    return "sin_marcaje_salida";
  }

  if (!tieneEntrada && tieneSalida) {
    if (esHoyOFuturo) return "esperando";
    return "sin_registro_entrada";
  }

  if (
    esEntradaTardeMarcaje({
      marcaEntradaAt,
      horarioEntrada,
      diaString: fechaStr,
      notas: notasEntrada,
    })
  ) {
    return "entrada_tarde";
  }

  return "correcto";
}

export function getEstadoMarcajeMeta(estado: EstadoMarcaje): {
  label: string;
  className: string;
  icon: LucideIcon;
} {
  switch (estado) {
    case "esperando":
      return {
        label: "Esperando",
        className:
          "bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-neutral-700",
        icon: Clock,
      };
    case "sin_permiso":
      return {
        label: "Sin Permiso",
        className:
          "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30",
        icon: XCircle,
      };
    case "sin_marcaje_salida":
      return {
        label: "Sin marcaje de salida",
        className:
          "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30",
        icon: LogOut,
      };
    case "sin_registro_entrada":
      return {
        label: "Sin Registro de Entrada",
        className:
          "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30",
        icon: LogOut,
      };
    case "entrada_tarde":
      return {
        label: "Entrada Tarde",
        className:
          "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30",
        icon: AlertTriangle,
      };
    case "correcto":
      return {
        label: "Correcto",
        className:
          "bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/30",
        icon: CheckCircle2,
      };
  }
}
