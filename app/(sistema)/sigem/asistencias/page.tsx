'use client';

import { Suspense } from 'react';
import  AsistenciaOficinas from '@/components/asistencia/oficina/VerAsistenciaOficinas';
import Cargando from '@/components/ui/animations/Cargando'; 

export default function SignupPage() {
  return (
    <Suspense fallback={<Cargando />}> 
      <AsistenciaOficinas />
    </Suspense>
  );
}