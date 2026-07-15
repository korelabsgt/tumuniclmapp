'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export type HorarioUsuario = {
  entrada: string;
  salida: string | null;
};

export function useHorariosUsuarios() {
  const { data, isLoading } = useQuery({
    queryKey: ['usuarios-horarios-asistencia'],
    queryFn: async (): Promise<Record<string, HorarioUsuario>> => {
      const supabase = createClient();
      const { data: rows, error } = await supabase
        .from('info_usuario')
        .select('user_id, horarios ( entrada, salida )')
        .eq('activo', true);

      if (error || !rows) return {};

      const map: Record<string, HorarioUsuario> = {};
      rows.forEach((row) => {
        const horario = row.horarios as { entrada: string; salida: string } | null;
        if (horario?.entrada) {
          map[row.user_id] = {
            entrada: horario.entrada,
            salida: horario.salida ?? null,
          };
        }
      });
      return map;
    },
    staleTime: 1000 * 60 * 5,
  });

  return { horariosMap: data ?? {}, loading: isLoading };
}
