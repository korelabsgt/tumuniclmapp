"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";

const FIVE_MINUTES = 1000 * 60 * 5;

export type ModuloAdmin = {
  id: string;
  nombre: string;
};

export const MODULOS_QUERY_KEY = ["admin-modulos"] as const;

export function useModulosAdmin() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: MODULOS_QUERY_KEY,
    queryFn: async (): Promise<ModuloAdmin[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("modulos")
        .select("id, nombre");
      if (error) {
        throw new Error(error.message);
      }
      return data?.filter((modulo) => modulo.nombre !== "AFILIACION") || [];
    },
    staleTime: FIVE_MINUTES,
  });

  return {
    modulos: data ?? [],
    loading: isLoading,
    refetch,
  };
}
