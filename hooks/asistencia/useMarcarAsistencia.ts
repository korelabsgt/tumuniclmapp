'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { marcarNuevaAsistencia } from '@/lib/asistencia/acciones';
import { asistenciaUsuarioQueryKey } from '@/hooks/asistencia/useAsistenciaUsuario';

interface MarcarAsistenciaInput {
  userId: string;
  tipo: string;
  ubicacion: { lat: number; lng: number };
  notas: string;
}

export function useMarcarAsistencia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, tipo, ubicacion, notas }: MarcarAsistenciaInput) =>
      marcarNuevaAsistencia(userId, tipo, ubicacion, notas),
    onSuccess: (data, variables) => {
      if (!data) return;
      void queryClient.invalidateQueries({
        queryKey: asistenciaUsuarioQueryKey(variables.userId, null, null),
      });
    },
  });
}
