'use client';

import { Suspense } from 'react';
import VerAcuerdos from '@/components/permisos/acuerdos/VerAcuerdos';
import Cargando from '@/components/ui/animations/Cargando';

export default function AcuerdosJefePage() {
  return (
    <Suspense fallback={<Cargando />}>
      <VerAcuerdos tipoVista="gestion_jefe" />
    </Suspense>
  );
}
