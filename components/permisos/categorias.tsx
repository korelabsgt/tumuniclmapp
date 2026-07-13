import { Heart, Umbrella, GraduationCap, FileCheck, Clock, type LucideIcon } from "lucide-react";
import { PermisoEmpleado } from "./types";

export type CategoriaPermiso =
  | "igss"
  | "vacaciones"
  | "academicas"
  | "extras"
  | "permisos";

export const CATEGORIA_ORDEN: Record<CategoriaPermiso, number> = {
  extras: 0,
  igss: 1,
  academicas: 2,
  vacaciones: 3,
  permisos: 4,
};

const incluyeAlguna = (texto: string, claves: string[]) =>
  claves.some((k) => texto.includes(k));

export const getCategoriaFromTexto = (
  tipo: string,
  descripcion: string,
): CategoriaPermiso => {
  const t = tipo.toLowerCase();
  const d = descripcion.toLowerCase();
  if (t.includes("igss") || d.includes("igss")) return "igss";
  if (t.includes("vacaciones") || d.includes("vacaciones")) return "vacaciones";
  if (
    t.includes("académ") ||
    t.includes("academ") ||
    d.includes("académ") ||
    d.includes("academ")
  )
    return "academicas";
  if (
    incluyeAlguna(t, ["reposicion", "reposición", "horas", "extra"]) ||
    incluyeAlguna(d, ["reposicion", "reposición", "horas", "extra"])
  )
    return "extras";
  return "permisos";
};

export const getCategoriaPermiso = (p: PermisoEmpleado): CategoriaPermiso =>
  getCategoriaFromTexto(p.tipo, p.descripcion || "");

export const getCategoriaIcon = (cat: CategoriaPermiso): LucideIcon => {
  switch (cat) {
    case "igss":
      return Heart;
    case "vacaciones":
      return Umbrella;
    case "academicas":
      return GraduationCap;
    case "extras":
      return Clock;
    default:
      return FileCheck;
  }
};

export const getCategoriaLabel = (cat: CategoriaPermiso): string => {
  switch (cat) {
    case "igss":
      return "IGSS";
    case "vacaciones":
      return "Vacaciones";
    case "academicas":
      return "Académicas";
    case "extras":
      return "Extras";
    default:
      return "Permiso";
  }
};

/**
 * Colores para botón/badge con fondo suave (estilo Justificación del calendario).
 * Devuelve clases combinadas para el contenedor.
 */
export const getCategoriaJustificacionClass = (cat: CategoriaPermiso): string => {
  switch (cat) {
    case "igss":
      return "bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/40 border-pink-200 dark:border-pink-900/40";
    case "vacaciones":
      return "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 border-purple-100 dark:border-purple-900/30";
    case "academicas":
      return "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 border-green-200 dark:border-green-900/40";
    case "extras":
      return "bg-slate-50 dark:bg-slate-900/20 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/40 border-slate-200 dark:border-slate-800";
    default:
      return "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 border-blue-100 dark:border-blue-900/30";
  }
};

/**
 * Solo color de texto (para mostrar --:-- cuando hay permiso/vacaciones/etc).
 */
/** Texto formal cuando la inasistencia está justificada (permiso o asueto). */
export const MENSAJE_JUSTIFICACION_INASISTENCIA = "Justificación";

// Comisión — siempre azul (igual que el default de "permisos")
export const COMISION_TEXT_CLASS = "text-blue-500 dark:text-blue-400";
export const COMISION_DOT_CLASS = "bg-blue-500";
export const COMISION_BADGE_CLASS =
  "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 border-blue-100 dark:border-blue-900/30";

export const getMensajeSinMarcaje = (opts: {
  permiso?: PermisoEmpleado | null;
  asueto?: boolean;
  comision?: boolean;
}): { texto: string; className: string } => {
  if (opts.asueto) {
    return {
      texto: MENSAJE_JUSTIFICACION_INASISTENCIA,
      className: "text-amber-600 dark:text-amber-400",
    };
  }
  if (opts.permiso) {
    return {
      texto: MENSAJE_JUSTIFICACION_INASISTENCIA,
      className: getCategoriaTextClass(getCategoriaPermiso(opts.permiso)),
    };
  }
  if (opts.comision) {
    return {
      texto: MENSAJE_JUSTIFICACION_INASISTENCIA,
      className: COMISION_TEXT_CLASS,
    };
  }
  return {
    texto: "Sin registros de asistencia",
    className: "text-red-500 dark:text-red-400",
  };
};

export const getCategoriaTextClass = (cat: CategoriaPermiso): string => {
  switch (cat) {
    case "igss":
      return "text-pink-500 dark:text-pink-400";
    case "vacaciones":
      return "text-purple-500 dark:text-purple-400";
    case "academicas":
      return "text-green-600 dark:text-green-400";
    case "extras":
      return "text-slate-600 dark:text-slate-400";
    default:
      return "text-blue-500 dark:text-blue-400";
  }
};
