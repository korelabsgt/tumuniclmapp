'use client';

import { useQuery } from '@tanstack/react-query';
import { obtenerPermisosDelUsuario } from '@/components/permisos/acciones';

const FIVE_MINUTES = 1000 * 60 * 5;

export const permisosUsuarioQueryKey = (userId: string | null) =>
  ['permisos-usuario', userId] as const;

export function usePermisosUsuario(userId: string | null) {
  const { data, isLoading } = useQuery({
    queryKey: permisosUsuarioQueryKey(userId),
    queryFn: () => obtenerPermisosDelUsuario(userId!),
    enabled: !!userId,
    staleTime: FIVE_MINUTES,
  });

  return { permisos: data ?? [], loading: isLoading };
}
