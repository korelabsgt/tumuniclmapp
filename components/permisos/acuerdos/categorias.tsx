import {
  Heart,
  Umbrella,
  FileCheck,
  IdCard,
  type LucideIcon,
} from "lucide-react";
import { PermisoEmpleado } from "@/components/permisos/types";
import {
  IGSS_JUSTIFICACION_CLASS,
  IGSS_TEXT_CLASS,
  VACACIONES_DOT_CLASS,
  VACACIONES_JUSTIFICACION_CLASS,
  VACACIONES_TEXT_CLASS,
} from "@/components/permisos/categorias";

export type CategoriaAcuerdo =
  | "vacaciones"
  | "permiso_especial"
  | "licencia_goce"
  | "licencia_sin_goce"
  | "suspension_igss";

export const ACUERDO_JUSTIFICACION_CLASS =
  "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 border-purple-100 dark:border-purple-900/30";
export const ACUERDO_TEXT_CLASS = "text-purple-500 dark:text-purple-400";
export const ACUERDO_DOT_CLASS = "bg-purple-500";

export const getCategoriaAcuerdo = (a: PermisoEmpleado): CategoriaAcuerdo => {
  const t = a.tipo.toLowerCase();
  if (t.includes("vacaciones")) return "vacaciones";
  if (t.includes("permiso especial")) return "permiso_especial";
  if (t.includes("con goce")) return "licencia_goce";
  if (t.includes("sin goce")) return "licencia_sin_goce";
  if (t.includes("igss") || t.includes("suspensión")) return "suspension_igss";
  return "permiso_especial";
};

export const getCategoriaAcuerdoIcon = (
  cat: CategoriaAcuerdo,
): LucideIcon => {
  switch (cat) {
    case "vacaciones":
      return Umbrella;
    case "permiso_especial":
      return FileCheck;
    case "licencia_goce":
    case "licencia_sin_goce":
      return IdCard;
    case "suspension_igss":
      return Heart;
  }
};

export const getCategoriaAcuerdoLabel = (cat: CategoriaAcuerdo): string => {
  switch (cat) {
    case "vacaciones":
      return "Vacaciones";
    case "permiso_especial":
      return "Permiso especial";
    case "licencia_goce":
    case "licencia_sin_goce":
      return "Licencia";
    case "suspension_igss":
      return "IGSS";
  }
};

export const getCategoriaAcuerdoBorderClass = (
  cat: CategoriaAcuerdo,
): string => {
  if (cat === "suspension_igss") return "border-l-4 border-l-amber-500";
  if (cat === "vacaciones") return "border-l-4 border-l-sky-500";
  return "border-l-4 border-l-purple-500";
};

export const getCategoriaAcuerdoBadgeClass = (
  cat: CategoriaAcuerdo,
): string => {
  if (cat === "suspension_igss") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  }
  if (cat === "vacaciones") {
    return "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300";
  }
  return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400";
};

export const getCategoriaAcuerdoJustificacionClass = (
  cat: CategoriaAcuerdo,
): string => {
  if (cat === "suspension_igss") return IGSS_JUSTIFICACION_CLASS;
  if (cat === "vacaciones") return VACACIONES_JUSTIFICACION_CLASS;
  return ACUERDO_JUSTIFICACION_CLASS;
};

export const getCategoriaAcuerdoTextClass = (
  cat: CategoriaAcuerdo,
): string => {
  if (cat === "suspension_igss") return IGSS_TEXT_CLASS;
  if (cat === "vacaciones") return VACACIONES_TEXT_CLASS;
  return ACUERDO_TEXT_CLASS;
};

export const getCategoriaAcuerdoDotClass = (cat: CategoriaAcuerdo): string => {
  if (cat === "suspension_igss") return "bg-amber-500";
  if (cat === "vacaciones") return VACACIONES_DOT_CLASS;
  return ACUERDO_DOT_CLASS;
};
