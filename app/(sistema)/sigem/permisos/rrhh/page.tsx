'use client';

import { Suspense } from 'react';
import VerPermisos from '@/components/permisos/VerPermisos';
import Cargando from '@/components/ui/animations/Cargando';

export default function PermisosRRHHPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <VerPermisos tipoVista="gestion_rrhh" />
    </Suspense>
  );
}