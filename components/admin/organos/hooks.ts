"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";

const FIVE_MINUTES = 1000 * 60 * 5;

type Organo = { id: number; nombre: string; No: number };
type Politica = { id: number; nombre: string; No: number };
type Asignacion = {
  organo_id: number;
  politica_id: number;
  anio: number;
  politicas: { nombre: string | null };
};

export const ORGANOS_QUERY_KEY = ["admin-organos"] as const;

export function useOrganosPoliticas() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ORGANOS_QUERY_KEY,
    queryFn: async () => {
      const supabase = createClient();
      const [organosRes, politicasRes, asignacionesRes] = await Promise.all([
        supabase
          .from("organos")
          .select('id, nombre, "No"')
          .order("No", { ascending: true }),
        supabase.from("politicas").select('id, nombre, "No"'),
        supabase.from("organos_politicas").select("*, politicas(nombre)"),
      ]);

      if (organosRes.error || politicasRes.error || asignacionesRes.error) {
        throw new Error("Error al cargar datos.");
      }

      return {
        organos: (organosRes.data as Organo[]) || [],
        politicas: (politicasRes.data as Politica[]) || [],
        asignaciones: (asignacionesRes.data as Asignacion[]) || [],
      };
    },
    staleTime: FIVE_MINUTES,
  });

  return {
    organos: data?.organos ?? [],
    politicas: data?.politicas ?? [],
    asignaciones: data?.asignaciones ?? [],
    loading: isLoading,
    refetch,
  };
}
