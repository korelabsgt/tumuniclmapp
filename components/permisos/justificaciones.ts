import { PermisoEmpleado } from "./types";
import { permisoAplicaEnDia } from "./utilidades";

export function obtenerJustificacionParaDia(
  permisos: PermisoEmpleado[],
  diaString: string,
): PermisoEmpleado | null {
  return permisos.find((p) => permisoAplicaEnDia(p, diaString)) ?? null;
}
