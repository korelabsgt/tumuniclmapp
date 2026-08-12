"use client";

import { useQuery } from "@tanstack/react-query";
import { obtenerEstructuraCompleta } from "./actions";

const FIVE_MINUTES = 1000 * 60 * 5;

export const JEFES_ESTRUCTURA_KEY = ["admin-jefes-estructura"] as const;

export function useEstructuraJefes() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: JEFES_ESTRUCTURA_KEY,
    queryFn: obtenerEstructuraCompleta,
    staleTime: FIVE_MINUTES,
  });

  return {
    datos: data ?? { dependencias: [], usuarios: [] },
    initialLoading: isLoading,
    reloading: isFetching && !isLoading,
    refetch,
  };
}
