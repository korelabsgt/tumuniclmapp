"use client";

import { useQuery } from "@tanstack/react-query";
import { getListaUsuariosAction, getDetalleUsuarioAction } from "./actions";
// Re-exportamos los tipos para usarlos en los componentes
export type { InfoUsuarioData, InfoUsuario } from "./actions";

export function useInfoUsuarios() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["infoUsuarios"],
    queryFn: getListaUsuariosAction,
    staleTime: 1000 * 60 * 5,
  });

  return {
    infoUsuarios: data ?? [],
    loading: isLoading,
    mutate: refetch,
  };
}

export function useInfoUsuario(userId: string | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["infoUsuario", userId],
    queryFn: () => getDetalleUsuarioAction(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
  });

  return {
    usuario: data ?? null,
    cargando: isLoading,
    error: error ? "Error al cargar datos" : null,
    fetchUsuario: refetch,
  };
}
