'use client';

import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Asistencia } from '@/lib/asistencia/esquemas';
import { createClient } from '@/utils/supabase/client';

const FIVE_MINUTES = 1000 * 60 * 5;

export const asistenciaUsuarioQueryKey = (
  userId: string | null,
  fechaInicio: Date | string | null,
  fechaFinal: Date | string | null,
) => ['asistencia-usuario', userId, fechaInicio, fechaFinal] as const;

export function useAsistenciaUsuario(
  userId: string | null,
  fechaInicio: Date | string | null,
  fechaFinal: Date | string | null
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: asistenciaUsuarioQueryKey(userId, fechaInicio, fechaFinal),
    
    queryFn: async () => {
      if (!userId) return [];

      const supabase = createClient();
      let supabaseError = null;

      try {
        const { data, error } = await supabase.rpc('asistencias_usuario', { 
          p_user_id: userId,
          p_fecha_inicio: fechaInicio,
          p_fecha_final: fechaFinal
        });

        supabaseError = error;

        if (supabaseError) {
          console.error('Error en useAsistenciaUsuario:', supabaseError);
          toast.error('Error al cargar las asistencias del usuario.');
          throw new Error(supabaseError.message);
        }

        return (data as Asistencia[]) ?? [];

      } catch (err: any) {
        if (!supabaseError) {
             console.error('Error inesperado en useAsistenciaUsuario:', err);
             toast.error('Error inesperado al cargar asistencias.');
        }
        throw err; 
      }
    },
    
    enabled: !!userId,
    
    staleTime: FIVE_MINUTES,
    retry: false, 
  });

  return { 
    asistencias: data || [], 
    loading: isLoading, 
    error: error ? (error as Error).message : null, 
    fetchAsistencias: refetch 
  };
}