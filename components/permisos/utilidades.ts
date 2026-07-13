import { PermisoEmpleado } from "./types";
import {
  parseDiasAcuerdo,
  acuerdoAplicaEnFecha,
} from "./acuerdos/dias-acuerdo";

export function permisoAplicaEnDia(
  permiso: PermisoEmpleado,
  diaString: string,
): boolean {
  if (permiso.estado !== "aprobado") return false;

  const dias = parseDiasAcuerdo(permiso.dias);
  return acuerdoAplicaEnFecha(dias, permiso.inicio, permiso.fin, diaString);
}

export function obtenerPermisoParaDia(
  permisos: PermisoEmpleado[],
  diaString: string,
): PermisoEmpleado | null {
  return permisos.find((p) => permisoAplicaEnDia(p, diaString)) ?? null;
}

export {
  formatearDiasAcuerdo as formatearDiasSemana,
  formatearDiasAcuerdo,
} from "./acuerdos/dias-acuerdo";
