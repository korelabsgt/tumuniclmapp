"use client";

import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  cargarBeneficiariosPorAnio,
  obtenerAniosDisponibles,
  obtenerConfiguracionFertilizante,
} from "../actions";

const FIVE_MINUTES = 1000 * 60 * 5;

export const FERTILIZANTE_KEYS = {
  beneficiarios: ["beneficiarios-fertilizante"] as const,
  porAnio: (anio: string) => ["beneficiarios-fertilizante", anio] as const,
  anios: ["fertilizante-anios"] as const,
  config: (anio: string) => ["fertilizante-config", anio] as const,
};

export function useAniosFertilizante() {
  return useQuery({
    queryKey: FERTILIZANTE_KEYS.anios,
    queryFn: obtenerAniosDisponibles,
    staleTime: FIVE_MINUTES,
  });
}

export function useBeneficiariosPorAnio(anio: string) {
  return useQuery({
    queryKey: FERTILIZANTE_KEYS.porAnio(anio),
    queryFn: () => cargarBeneficiariosPorAnio(anio),
    enabled: Boolean(anio),
    staleTime: FIVE_MINUTES,
    placeholderData: keepPreviousData,
  });
}

export function useConfigFertilizante(anio: string) {
  return useQuery({
    queryKey: FERTILIZANTE_KEYS.config(anio),
    queryFn: () => obtenerConfiguracionFertilizante(anio),
    enabled: Boolean(anio),
    staleTime: FIVE_MINUTES,
  });
}

export function useInvalidarFertilizante() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: FERTILIZANTE_KEYS.beneficiarios,
    });
    void queryClient.invalidateQueries({ queryKey: FERTILIZANTE_KEYS.anios });
    void queryClient.invalidateQueries({ queryKey: ["fertilizante-config"] });
  };
}
