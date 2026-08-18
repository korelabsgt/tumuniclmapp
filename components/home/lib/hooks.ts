'use client';

import { useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

/**
 * Hook para verificar si el usuario actual tiene sesión activa
 * (solo check silencioso, sin redirección).
 */
export function useAuthPublico() {
  const verificar = useCallback(async (): Promise<boolean> => {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  }, []);

  return { verificar };
}
