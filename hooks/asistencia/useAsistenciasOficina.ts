"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from '@/utils/supabase/client';

type AsistenciaEnriquecida = any; 

interface AsistenciaHookData {
  registros: AsistenciaEnriquecida[];
  loading: boolean;
}

const FIVE_MINUTES = 1000 * 60 * 5;

const KEYS = {
  asistenciasOficina: (oficinaId: string | null, inicio: string | null, final: string | null) => 
    ['asistencias-oficina', oficinaId, inicio, final],
};

export default function useAsistenciasOficina(
    oficinaId: string | null, 
    fechaInicio: string | null, 
    fechaFinal: string | null   
): AsistenciaHookData {

    const { data, isLoading } = useQuery({
        queryKey: KEYS.asistenciasOficina(oficinaId, fechaInicio, fechaFinal),
        
        queryFn: async () => {
            const supabase = createClient();
            
            const p_fecha_inicio = (fechaInicio && fechaInicio !== '') ? fechaInicio : null;
            const p_fecha_final = (fechaFinal && fechaFinal !== '') ? fechaFinal : null;
            
            let allData: any[] = [];
            let from = 0;
            const step = 1000;
            let hasMore = true;

            while (hasMore) {
                const { data, error } = await supabase.rpc('asistencias_oficinas', {
                    p_oficina_id: oficinaId, 
                    p_fecha_inicio: p_fecha_inicio,
                    p_fecha_final: p_fecha_final
                }).range(from, from + step - 1);

                if (error) {
                    console.error("Error fetching asistencias_oficinas:", error);
                    return allData.length > 0 ? allData : [];
                }

                if (data && data.length > 0) {
                    allData = allData.concat(data);
                    if (data.length < step) {
                        hasMore = false;
                    } else {
                        from += step;
                    }
                } else {
                    hasMore = false;
                }
            }

            return allData;
        },
        
        staleTime: FIVE_MINUTES, 
    });

    return { 
        registros: data || [], 
        loading: isLoading 
    };
}

export function usePermisosOficinaRango(
  userIds: string[],
  fechaInicio: string,
  fechaFin: string,
) {
  const idsKey = [...userIds].sort().join(",");

  return useQuery({
    queryKey: ["permisos-oficina-rango", idsKey, fechaInicio, fechaFin],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("permisos_empleado")
        .select("*")
        .in("user_id", userIds)
        .gte("fin", fechaInicio)
        .lte("inicio", `${fechaFin}T23:59:59`);

      if (error || !data) return {} as Record<string, unknown[]>;

      const map: Record<string, unknown[]> = {};
      data.forEach((permiso) => {
        const userId = permiso.user_id as string;
        if (!map[userId]) map[userId] = [];
        map[userId].push(permiso);
      });
      return map;
    },
    enabled: userIds.length > 0 && Boolean(fechaInicio && fechaFin),
    staleTime: FIVE_MINUTES,
  });
}