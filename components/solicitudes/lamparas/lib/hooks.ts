"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSolicitudesLamparas,
  crearSolicitudLampara,
  asignarElectricista,
  actualizarEstadoSolicitud,
  getElectricistas,
  editarSolicitudLampara,
  eliminarSolicitudLampara,
  getComunidades,
  obtenerFlagsModulosDependencia,
} from "./actions";
import { SolicitudLampara, CrearSolicitudLamparaValues } from "./zod";

const KEYS = {
  solicitudes: ["solicitudes-lamparas"],
  electricistas: ["electricistas-disponibles"],
  comunidades: ["comunidades-clm"],
  flagsDependencia: (dependenciaId: string) =>
    ["flags-modulos-dependencia", dependenciaId] as const,
};

const FIVE_MINUTES = 1000 * 60 * 5;

export const useSolicitudesLamparas = (initialData: SolicitudLampara[] = []) => {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: KEYS.solicitudes,
    queryFn: getSolicitudesLamparas,
    initialData: initialData.length > 0 ? initialData : undefined,
    staleTime: FIVE_MINUTES,
  });

  const updateLocalSolicitud = (id: string, fields: Partial<SolicitudLampara>) => {
    queryClient.setQueryData<SolicitudLampara[]>(KEYS.solicitudes, (oldData) => {
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

export const useElectricistas = () => {
  return useQuery({
    queryKey: KEYS.electricistas,
    queryFn: getElectricistas,
    staleTime: FIVE_MINUTES,
  });
};

export const useSolicitudMutations = () => {
  const queryClient = useQueryClient();
  const invalidarLista = () => queryClient.invalidateQueries({ queryKey: KEYS.solicitudes });

  const crear = useMutation({
    mutationFn: (payload: CrearSolicitudLamparaValues) => crearSolicitudLampara(payload),
    onSuccess: invalidarLista,
  });

  const asignar = useMutation({
    mutationFn: ({ solicitudId, electricistaUid }: { solicitudId: string; electricistaUid: string }) =>
      asignarElectricista(solicitudId, electricistaUid),
    onSuccess: invalidarLista,
  });

  const actualizarEstado = useMutation({
    mutationFn: ({ solicitudId, nuevoEstado, comentarios }: { solicitudId: string; nuevoEstado: 'completado' | 'en_revision'; comentarios?: string }) =>
      actualizarEstadoSolicitud(solicitudId, nuevoEstado, comentarios),
    onSuccess: invalidarLista,
  });

  const editar = useMutation({
    mutationFn: ({ solicitudId, values }: { solicitudId: string; values: Partial<CrearSolicitudLamparaValues> }) =>
      editarSolicitudLampara(solicitudId, values),
    onSuccess: invalidarLista,
  });

  const eliminar = useMutation({
    mutationFn: (solicitudId: string) => eliminarSolicitudLampara(solicitudId),
    onSuccess: invalidarLista,
  });

  return { crear, asignar, actualizarEstado, editar, eliminar };
};

export const useComunidades = () => {
  return useQuery({
    queryKey: KEYS.comunidades,
    queryFn: getComunidades,
    staleTime: FIVE_MINUTES,
  });
};

const FLAGS_VACIOS = {
  esAtencionVecino: false,
  esElectricista: false,
  esDirectorSP: false,
};

export function useFlagsModulosDependencia(dependenciaId: string | null) {
  const { data } = useQuery({
    queryKey: KEYS.flagsDependencia(dependenciaId ?? ""),
    queryFn: () => obtenerFlagsModulosDependencia(dependenciaId),
    enabled: Boolean(dependenciaId),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return data ?? FLAGS_VACIOS;
}
