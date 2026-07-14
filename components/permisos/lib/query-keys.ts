export const PERMISOS_QUERY_ROOT = ["permisos-modulo"] as const;

export const permisosQueryKeys = {
  perfil: () => [...PERMISOS_QUERY_ROOT, "perfil"] as const,
  pendientes: () => [...PERMISOS_QUERY_ROOT, "pendientes"] as const,
  porFecha: (fecha: string) =>
    [...PERMISOS_QUERY_ROOT, "fecha", fecha] as const,
  porRango: (inicio: string, fin: string) =>
    [...PERMISOS_QUERY_ROOT, "rango", inicio, fin] as const,
};
