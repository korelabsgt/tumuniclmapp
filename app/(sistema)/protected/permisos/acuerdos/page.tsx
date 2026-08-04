'use client';

import { Suspense } from 'react';
import VerAcuerdos from '@/components/permisos/acuerdos/VerAcuerdos';
import Cargando from '@/components/ui/animations/Cargando';

export default function AcuerdosPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <VerAcuerdos tipoVista="mis_acuerdos" />
    </Suspense>
  );
}
