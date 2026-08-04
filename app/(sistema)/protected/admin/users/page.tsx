'use client';

import { Suspense } from 'react';
import  VerUsuarios from '@/components/admin/users/VerUsuarios';
import Cargando from '@/components/ui/animations/Cargando'; // 1. Importar el componente

export default function SignupPage() {
  return (
    <Suspense fallback={<Cargando />}> 
      <VerUsuarios />
    </Suspense>
  );
}