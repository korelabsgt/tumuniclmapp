import {
  Heart,
  Umbrella,
  FileCheck,
  IdCard,
  type LucideIcon,
} from "lucide-react";
import { PermisoEmpleado } from "@/components/permisos/types";

export type CategoriaAcuerdo =
  | "vacaciones"
  | "permiso_especial"
  | "licencia_goce"
  | "licencia_sin_goce"
  | "suspension_igss";

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
  switch (cat) {
    case "vacaciones":
      return "border-l-4 border-l-purple-500";
    case "permiso_especial":
      return "border-l-4 border-l-blue-500";
    case "licencia_goce":
      return "border-l-4 border-l-emerald-500";
    case "licencia_sin_goce":
      return "border-l-4 border-l-slate-500";
    case "suspension_igss":
      return "border-l-4 border-l-pink-500";
  }
};

export const getCategoriaAcuerdoBadgeClass = (
  cat: CategoriaAcuerdo,
): string => {
  switch (cat) {
    case "vacaciones":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400";
    case "permiso_especial":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400";
    case "licencia_goce":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400";
    case "licencia_sin_goce":
      return "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400";
    case "suspension_igss":
      return "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400";
  }
};

export const getCategoriaAcuerdoJustificacionClass = (
  cat: CategoriaAcuerdo,
): string => {
  switch (cat) {
    case "vacaciones":
      return "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 border-purple-100 dark:border-purple-900/30";
    case "permiso_especial":
      return "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 border-blue-100 dark:border-blue-900/30";
    case "licencia_goce":
      return "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border-emerald-200 dark:border-emerald-900/40";
    case "licencia_sin_goce":
      return "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border-emerald-200 dark:border-emerald-900/40";
    case "suspension_igss":
      return "bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/40 border-pink-200 dark:border-pink-900/40";
  }
};

export const getCategoriaAcuerdoTextClass = (
  cat: CategoriaAcuerdo,
): string => {
  switch (cat) {
    case "vacaciones":
      return "text-purple-500 dark:text-purple-400";
    case "permiso_especial":
      return "text-blue-500 dark:text-blue-400";
    case "licencia_goce":
    case "licencia_sin_goce":
      return "text-emerald-600 dark:text-emerald-400";
    case "suspension_igss":
      return "text-pink-500 dark:text-pink-400";
  }
};
