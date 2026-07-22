"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSolicitudesMobiliario,
  crearSolicitudMobiliario,
  asignarOperario,
  actualizarEstadoSolicitudMobiliario,
  getOperarios,
  editarSolicitudMobiliario,
  eliminarSolicitudMobiliario,
  getComunidades,
} from "./actions";
import { SolicitudMobiliario, CrearSolicitudMobiliarioValues } from "./zod";

const KEYS = {
  solicitudes: ["solicitudes-mobiliario"],
  operarios: ["operarios-mobiliario-disponibles"],
  comunidades: ["comunidades-clm"],
};

const FIVE_MINUTES = 1000 * 60 * 5;

export const useSolicitudesMobiliario = (initialData: SolicitudMobiliario[] = []) => {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: KEYS.solicitudes,
    queryFn: getSolicitudesMobiliario,
    initialData: initialData.length > 0 ? initialData : undefined,
    staleTime: FIVE_MINUTES,
  });

  const updateLocalSolicitud = (id: string, fields: Partial<SolicitudMobiliario>) => {
    queryClient.setQueryData<SolicitudMobiliario[]>(KEYS.solicitudes, (oldData) => {
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

export const useOperarios = () => {
  return useQuery({
    queryKey: KEYS.operarios,
    queryFn: getOperarios,
    staleTime: FIVE_MINUTES,
  });
};

export const useComunidades = () => {
  return useQuery({
    queryKey: KEYS.comunidades,
    queryFn: getComunidades,
    staleTime: FIVE_MINUTES,
  });
};

export const useSolicitudMobiliarioMutations = () => {
  const queryClient = useQueryClient();
  const invalidarLista = () => queryClient.invalidateQueries({ queryKey: KEYS.solicitudes });

  const crear = useMutation({
    mutationFn: (payload: CrearSolicitudMobiliarioValues) => crearSolicitudMobiliario(payload),
    onSuccess: invalidarLista,
  });

  const asignar = useMutation({
    mutationFn: ({ solicitudId, operarioUid }: { solicitudId: string; operarioUid: string }) =>
      asignarOperario(solicitudId, operarioUid),
    onSuccess: invalidarLista,
  });

  const actualizarEstado = useMutation({
    mutationFn: ({ solicitudId, nuevoEstado, comentarios }: { solicitudId: string; nuevoEstado: 'completado' | 'en_revision'; comentarios?: string }) =>
      actualizarEstadoSolicitudMobiliario(solicitudId, nuevoEstado, comentarios),
    onSuccess: invalidarLista,
  });

  const editar = useMutation({
    mutationFn: ({ solicitudId, values }: { solicitudId: string; values: Partial<CrearSolicitudMobiliarioValues> }) =>
      editarSolicitudMobiliario(solicitudId, values),
    onSuccess: invalidarLista,
  });

  const eliminar = useMutation({
    mutationFn: (solicitudId: string) => eliminarSolicitudMobiliario(solicitudId),
    onSuccess: invalidarLista,
  });

  return { crear, asignar, actualizarEstado, editar, eliminar };
};
