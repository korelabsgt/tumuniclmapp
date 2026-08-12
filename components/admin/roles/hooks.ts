"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";

const FIVE_MINUTES = 1000 * 60 * 5;

export type RolAdmin = {
  id: string;
  nombre: string;
};

export const ROLES_QUERY_KEY = ["admin-roles"] as const;

export function useRolesAdmin() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ROLES_QUERY_KEY,
    queryFn: async (): Promise<RolAdmin[]> => {
      const supabase = createClient();
      const { data, error } = await supabase.from("roles").select("id, nombre");
      if (error) {
        throw new Error(error.message);
      }
      return (
        data?.filter(
          (rol) =>
            rol.nombre !== "AFILIADOR" && rol.nombre !== "ADMIN-AFILIACION",
        ) || []
      );
    },
    staleTime: FIVE_MINUTES,
  });

  return {
    roles: data ?? [],
    loading: isLoading,
    refetch,
  };
}
