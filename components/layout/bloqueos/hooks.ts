"use client";

import { useQuery } from "@tanstack/react-query";
import { useDeferredReady } from "@/hooks/utility/useDeferredReady";
import { obtenerBloqueosPendientesGlobales } from "./actions";

export const BLOQUEOS_GLOBALES_KEY = ["bloqueos-globales"] as const;

const BLOQUEOS_STALE_MS = 60 * 1000;

export function useBloqueosGlobales(enabled = true) {
  const deferred = useDeferredReady(300);

  return useQuery({
    queryKey: BLOQUEOS_GLOBALES_KEY,
    queryFn: obtenerBloqueosPendientesGlobales,
    enabled: enabled && deferred,
    staleTime: BLOQUEOS_STALE_MS,
    gcTime: BLOQUEOS_STALE_MS * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
