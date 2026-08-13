'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { actualizarInfoPersonal, obtenerInfoUsuario } from './action';
import { obtenerLlamadasAtencion, eliminarLlamadaAtencion, obtenerTodasFaltas } from './llamadaAtencionActions';
import { obtenerCitacionesUsuario, obtenerTodasCitaciones, confirmarCitacion, eliminarCitacion } from './citacionActions';
import Swal from 'sweetalert2';
import { useBloqueosGlobales } from '@/components/layout/bloqueos/hooks';

export function useLlamadasAtencion(userId: string, enabled = true) {
  const queryClient = useQueryClient();
  const queryKey = ['llamadasAtencion', userId];

  const { data: llamadas = [], isLoading: loading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) return [];
      const result = await obtenerLlamadasAtencion(userId);
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: enabled && !!userId,
    refetchOnMount: false,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  const eliminarLlamada = async (idLlamada: string) => {
    const result = await eliminarLlamadaAtencion(idLlamada);
    if (result.success) {
      invalidate();
    }
    return result;
  };

  return {
    llamadas,
    loading,
    invalidate,
    eliminarLlamada
  };
}

export function useTodasFaltas(enabled = true) {
  const queryClient = useQueryClient();
  const queryKey = ['faltas-todas'];

  const { data: faltas = [], isLoading: loading } = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await obtenerTodasFaltas();
      if (!result.success) return [];
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['llamadasAtencion'] });
  };

  return {
    faltas,
    loading,
    invalidate,
  };
}

export function useCitaciones(userId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['citaciones', userId];

  const { data: citaciones = [], isLoading: loading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) return [];
      const result = await obtenerCitacionesUsuario(userId);
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!userId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['citaciones-todas'] });
  };

  const confirmar = async (idCitacion: string) => {
    const result = await confirmarCitacion(idCitacion);
    if (result.success) {
      invalidate();
    }
    return result;
  };

  const eliminar = async (idCitacion: string) => {
    const result = await eliminarCitacion(idCitacion);
    if (result.success) {
      invalidate();
    }
    return result;
  };

  return {
    citaciones,
    loading,
    invalidate,
    confirmar,
    eliminar
  };
}

export function useTodasCitaciones(enabled = true) {
  const queryClient = useQueryClient();
  const queryKey = ['citaciones-todas'];

  const { data: citaciones = [], isLoading: loading } = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await obtenerTodasCitaciones();
      if (!result.success) return [];
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['citaciones'] });
  };

  return {
    citaciones,
    loading,
    invalidate,
  };
}

export const CITACION_PENDIENTE_KEY = ['bloqueo-citacion'] as const;

export function useCitacionPendiente() {
  const { data, isLoading, refetch } = useBloqueosGlobales();

  return {
    data: data?.citacion ?? null,
    isLoading,
    refetch,
  };
}

export function useInfoForm(userId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const queryKey = ['info_usuario', userId];

  const { data: usuarioData, isLoading: isLoadingData } = useQuery({
    queryKey: queryKey,
    queryFn: () => obtenerInfoUsuario(userId),
    enabled: !!userId,
    
   
    staleTime: 1000 * 60 * 6, 
    gcTime: 1000 * 60 * 10,   
    refetchOnWindowFocus: false, 
  });

  const mutation = useMutation({
    mutationFn: (formData: any) => actualizarInfoPersonal(userId, formData),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: queryKey });
        
        router.refresh();

        Swal.fire({
          title: '¡Guardado!',
          text: 'La información personal ha sido actualizada correctamente.',
          icon: 'success',
          confirmButtonColor: '#2563eb',
          background: '#18181b',
          color: '#ffffff'
        });
      } else {
        Swal.fire({
          title: 'Error',
          text: result.error || 'No se pudo actualizar la información',
          icon: 'error',
          background: '#18181b',
          color: '#ffffff'
        });
      }
    },
    onError: (error: any) => {
      Swal.fire({
        title: 'Error de red',
        text: error.message || 'Ocurrió un error inesperado',
        icon: 'error',
        background: '#18181b',
        color: '#ffffff'
      });
    }
  });

  return {
    usuarioData,
    isLoadingData,
    handleSave: mutation.mutate,
    isSaving: mutation.isPending
  };
}