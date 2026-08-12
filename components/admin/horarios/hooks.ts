"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchHorarios, fetchUsuariosConHorario } from "./actions";

const FIVE_MINUTES = 1000 * 60 * 5;

export const HORARIOS_KEYS = {
  lista: ["admin-horarios"] as const,
  usuarios: ["admin-horarios-usuarios"] as const,
};

export function useHorarios() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: HORARIOS_KEYS.lista,
    queryFn: fetchHorarios,
    staleTime: FIVE_MINUTES,
  });

  return {
    horarios: data ?? [],
    loading: isLoading,
    refetch,
  };
}

export function useUsuariosConHorario(enabled: boolean) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: HORARIOS_KEYS.usuarios,
    queryFn: fetchUsuariosConHorario,
    enabled,
    staleTime: FIVE_MINUTES,
  });

  return {
    usuarios: data ?? [],
    loading: isLoading,
    refetch,
  };
}
