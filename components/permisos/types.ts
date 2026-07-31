import { Usuario } from '@/lib/usuarios/esquemas';

export type UsuarioConJerarquia = Usuario & {
  puesto_nombre: string | null;
  oficina_nombre: string | null;
  oficina_path_orden: string | null;
  dependencia_id: string | null;
};

export const ETIQUETA_REMUNERADO = "Rem." as const;
export const ETIQUETA_NO_REMUNERADO = "No Rem." as const;

export function getEtiquetaRemunerado(remunerado: boolean): string {
  return remunerado ? ETIQUETA_REMUNERADO : ETIQUETA_NO_REMUNERADO;
}

export type EstadoPermiso = 'pendiente' | 'aprobado_jefe' | 'aprobado' | 'rechazado' | 'rechazado_jefe' | 'rechazado_rrhh';

export type PermisoEmpleado = {
  id: string
  user_id: string
  tipo: string
  inicio: string
  fin: string
  descripcion: string | null 
  estado: EstadoPermiso
  created_at: string
  remunerado: boolean | null 
  aprobado_jefe_nombre: string | null
  aprobado_jefe_at: string | null
  aprobado_rrhh_nombre: string | null
  aprobado_rrhh_at: string | null
  comprobante_url: string | null
  dias: unknown
  usuario?: UsuarioConJerarquia
}

export const TIPOS_ACUERDO = [
  "Acuerdo de vacaciones",
  "Permiso especial",
  "Licencia con goce de salario",
  "Licencia sin goce de salario",
  "Suspensión IGSS",
] as const;

export type TipoAcuerdo = (typeof TIPOS_ACUERDO)[number];

export const DIAS_SEMANA = [
  { valor: 0, etiqueta: "Dom" },
  { valor: 1, etiqueta: "Lun" },
  { valor: 2, etiqueta: "Mar" },
  { valor: 3, etiqueta: "Mié" },
  { valor: 4, etiqueta: "Jue" },
  { valor: 5, etiqueta: "Vie" },
  { valor: 6, etiqueta: "Sáb" },
] as const;

export function esTipoAcuerdo(tipo: string): boolean {
  return TIPOS_ACUERDO.some((t) => t.toLowerCase() === tipo.toLowerCase());
}

export type PermisosPorOficina = {
  oficina_nombre: string
  path_orden: string
  permisos: PermisoEmpleado[]
}

export type LecturaNotificacion = {
  id: string
  permiso_id: string
  user_id: string
  evento: string
  titulo: string
  mensaje: string
  created_at: string
  leido_at: string | null
  permiso_tipo: string | null
  permiso_empleado_user_id: string | null
}

export type LecturasPorOficina = {
  oficina_nombre: string
  path_orden: string
  lecturas: LecturaNotificacion[]
}