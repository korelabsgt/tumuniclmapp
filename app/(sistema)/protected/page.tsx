'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function ProtectedPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verificarAcceso = async () => {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push('/');
        return;
      }

      const { data, error } = await supabase
        .from('usuarios_roles')
        .select('roles(nombre)')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      const rolNombre =
        !error && data?.roles && 'nombre' in data.roles
          ? (data.roles as { nombre: string }).nombre
          : null;

      const rolNormalizado = rolNombre?.toUpperCase();
      const destination = (rolNormalizado === 'ADMINISTRADOR' || rolNormalizado === 'SUPER') 
        ? '/protected/admin' 
        : '/protected/user';

      router.prefetch(destination);

      setIsLoading(false);

      setTimeout(() => {
        router.push(destination);
      }, 1500);
    };

    verificarAcceso();
  }, [router]);

  return null; 
}