import {
  PermisoEmpleado,
  PermisosPorOficina,
  TIPOS_ACUERDO,
  DIAS_SEMANA,
  esTipoAcuerdo,
  type TipoAcuerdo,
  type EstadoPermiso,
} from "@/components/permisos/types";

export type AcuerdoEmpleado = PermisoEmpleado;
export type EstadoAcuerdo = EstadoPermiso;

export type AcuerdosPorOficina = {
  oficina_nombre: string;
  path_orden: string;
  acuerdos: AcuerdoEmpleado[];
};

export { TIPOS_ACUERDO, DIAS_SEMANA, esTipoAcuerdo, type TipoAcuerdo };
