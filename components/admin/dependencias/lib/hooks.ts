"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";

export type AsignacionPuesto = {
  user_id: string;
  dependencia_id: string;
};

const FIVE_MINUTES = 1000 * 60 * 5;

export function useAsignacionesPuestos(dependenciaIds: string[]) {
  const idsKey = [...dependenciaIds].sort().join(",");
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["asignaciones-puestos", idsKey],
    queryFn: async (): Promise<AsignacionPuesto[]> => {
      if (dependenciaIds.length === 0) return [];
      const supabase = createClient();
      const resultado: AsignacionPuesto[] = [];
      const vistos = new Set<string>();
      const TAMANO = 200;
      for (let i = 0; i < dependenciaIds.length; i += TAMANO) {
        const lote = dependenciaIds.slice(i, i + TAMANO);
        const { data, error } = await supabase
          .from("contrato")
          .select("user_id, dependencia_id")
          .in("dependencia_id", lote)
          .order("created_at", { ascending: false });
        if (error || !data) continue;
        for (const fila of data) {
          if (!fila.user_id || !fila.dependencia_id) continue;
          if (vistos.has(fila.dependencia_id)) continue;
          vistos.add(fila.dependencia_id);
          resultado.push({
            user_id: fila.user_id,
            dependencia_id: fila.dependencia_id,
          });
        }
      }
      return resultado;
    },
    staleTime: FIVE_MINUTES,
    enabled: dependenciaIds.length > 0,
  });

  return {
    asignaciones: data ?? [],
    loading: isLoading,
    mutate: refetch,
  };
}
