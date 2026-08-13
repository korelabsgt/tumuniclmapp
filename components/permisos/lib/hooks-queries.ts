"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  obtenerPermisosPorFecha,
  obtenerPermisosPorRango,
  obtenerTodosPendientes,
  obtenerPerfilUsuario,
} from "@/components/permisos/acciones";
import {
  obtenerLecturasNotificaciones,
  type TipoVistaLecturas,
} from "@/components/permisos/lib/mensajes";
import { PERMISOS_QUERY_ROOT, permisosQueryKeys } from "./query-keys";
import type { PermisoEmpleado } from "@/components/permisos/types";
import { useBloqueosGlobales } from "@/components/layout/bloqueos/hooks";

export type ModoFiltroPermisos = "dia" | "semana" | "rango" | "pendientes";

export const EMPTY_PERMISOS: PermisoEmpleado[] = [];

const STALE_MS = 1000 * 60 * 2;

export type FiltroRegistrosParams = {
  modoFiltro: ModoFiltroPermisos;
  fechaSeleccionada: string;
  fechaInicio: string;
  fechaFin: string;
};

export function getRegistrosQueryKey(params: FiltroRegistrosParams) {
  if (params.modoFiltro === "pendientes") {
    return permisosQueryKeys.pendientes();
  }
  if (params.modoFiltro === "rango" || params.modoFiltro === "semana") {
    return permisosQueryKeys.porRango(params.fechaInicio, params.fechaFin);
  }
  return permisosQueryKeys.porFecha(params.fechaSeleccionada);
}

async function fetchRegistros(
  params: FiltroRegistrosParams,
): Promise<PermisoEmpleado[]> {
  if (params.modoFiltro === "pendientes") {
    return obtenerTodosPendientes();
  }
  if (params.modoFiltro === "rango" || params.modoFiltro === "semana") {
    return obtenerPermisosPorRango(params.fechaInicio, params.fechaFin);
  }
  return obtenerPermisosPorFecha(params.fechaSeleccionada);
}

export function usePerfilPermisos() {
  return useQuery({
    queryKey: permisosQueryKeys.perfil(),
    queryFn: obtenerPerfilUsuario,
    staleTime: STALE_MS * 2,
  });
}

export function usePendientesPermisos(enabled = true) {
  return useQuery({
    queryKey: permisosQueryKeys.pendientes(),
    queryFn: obtenerTodosPendientes,
    staleTime: STALE_MS,
    enabled,
  });
}

export function useRegistrosPermisos(params: FiltroRegistrosParams) {
  return useQuery({
    queryKey: getRegistrosQueryKey(params),
    queryFn: () => fetchRegistros(params),
    staleTime: STALE_MS,
  });
}

export function useInvalidarPermisos() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: PERMISOS_QUERY_ROOT });
  };
}

export function useLecturasNotificaciones(tipoVista: TipoVistaLecturas) {
  return useQuery({
    queryKey: permisosQueryKeys.lecturas(tipoVista),
    queryFn: () => obtenerLecturasNotificaciones(tipoVista),
    staleTime: STALE_MS,
  });
}

export const MENSAJE_PERMISO_PENDIENTE_KEY = ["bloqueo-permiso-mensaje"] as const;

export function useMensajePendientePermiso() {
  const { data, isLoading, refetch } = useBloqueosGlobales();

  return {
    data: data?.mensajePermiso ?? null,
    isLoading,
    refetch,
  };
}
