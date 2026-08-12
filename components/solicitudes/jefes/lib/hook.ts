"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSolicitudesJefes,
  crearSolicitudJefe,
  actualizarEstadoSolicitudJefe,
  editarSolicitudJefe,
  eliminarSolicitudJefe,
  getJefesList,
  obtenerSolicitudPendienteJefe,
} from "./actions";
import { SolicitudJefe, CrearSolicitudJefeValues } from "./zod";

const KEYS = {
  solicitudes: ["solicitudes-jefes"],
  jefes: ["lista-jefes"],
  pendiente: ["bloqueo-solicitud-jefe"],
};

const FIVE_MINUTES = 1000 * 60 * 5;

export const useSolicitudesJefes = (initialData: SolicitudJefe[] = []) => {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: KEYS.solicitudes,
    queryFn: getSolicitudesJefes,
    initialData: initialData.length > 0 ? initialData : undefined,
    staleTime: FIVE_MINUTES,
  });

  const updateLocalSolicitud = (id: string, fields: Partial<SolicitudJefe>) => {
    queryClient.setQueryData<SolicitudJefe[]>(KEYS.solicitudes, (oldData) => {
      if (!oldData) return [];
      return oldData.map((sol) =>
        sol.id === id ? { ...sol, ...fields } : sol
      );
    });
  };

  return {
    solicitudes: data || [],
    loading: isLoading,
    refresh: refetch,
    updateLocalSolicitud,
  };
};

export const useJefes = () => {
  return useQuery({
    queryKey: KEYS.jefes,
    queryFn: getJefesList,
    staleTime: FIVE_MINUTES,
  });
};

export const useSolicitudJefeMutations = () => {
  const queryClient = useQueryClient();
  const invalidarLista = () => {
    queryClient.invalidateQueries({ queryKey: KEYS.solicitudes });
    queryClient.invalidateQueries({ queryKey: KEYS.pendiente });
  };

  const crear = useMutation({
    mutationFn: (payload: CrearSolicitudJefeValues) => crearSolicitudJefe(payload),
    onSuccess: invalidarLista,
  });

  const actualizarEstado = useMutation({
    mutationFn: ({ solicitudId, nuevoEstado, comentarios }: { solicitudId: string; nuevoEstado: 'completado' | 'rechazado'; comentarios?: string }) =>
      actualizarEstadoSolicitudJefe(solicitudId, nuevoEstado, comentarios),
    onSuccess: invalidarLista,
  });

  const editar = useMutation({
    mutationFn: ({ solicitudId, values }: { solicitudId: string; values: Partial<CrearSolicitudJefeValues> }) =>
      editarSolicitudJefe(solicitudId, values),
    onSuccess: invalidarLista,
  });

  const eliminar = useMutation({
    mutationFn: (solicitudId: string) => eliminarSolicitudJefe(solicitudId),
    onSuccess: invalidarLista,
  });

  return { crear, actualizarEstado, editar, eliminar };
};

export function useSolicitudPendienteJefe() {
  return useQuery({
    queryKey: KEYS.pendiente,
    queryFn: async () => {
      const result = await obtenerSolicitudPendienteJefe();
      if (result.success && result.data) {
        return result.data as unknown as SolicitudJefe;
      }
      return null;
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}
