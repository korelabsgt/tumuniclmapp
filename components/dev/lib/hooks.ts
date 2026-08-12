"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMensajesActivosDev, getMensajesDev } from "../actions/mensajes";

const TWO_MINUTES = 1000 * 60 * 2;
const FIVE_MINUTES = 1000 * 60 * 5;

export const DEV_MENSAJES_KEYS = {
  todos: ["dev-mensajes"] as const,
  activos: ["dev-mensajes-activos"] as const,
};

export function useInvalidarMensajesDev() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: DEV_MENSAJES_KEYS.todos });
    void queryClient.invalidateQueries({ queryKey: DEV_MENSAJES_KEYS.activos });
  };
}

export function useMensajesActivosDev() {
  return useQuery({
    queryKey: DEV_MENSAJES_KEYS.activos,
    queryFn: getMensajesActivosDev,
    staleTime: TWO_MINUTES,
  });
}

export function useMensajesDev() {
  return useQuery({
    queryKey: DEV_MENSAJES_KEYS.todos,
    queryFn: getMensajesDev,
    staleTime: FIVE_MINUTES,
  });
}
