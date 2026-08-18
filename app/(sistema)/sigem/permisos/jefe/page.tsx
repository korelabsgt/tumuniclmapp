'use client';

import { Suspense } from 'react';
import VerPermisos from '@/components/permisos/VerPermisos';
import Cargando from '@/components/ui/animations/Cargando';

export default function PermisosJefePage() {
  return (
    <Suspense fallback={<Cargando />}>
      <VerPermisos tipoVista="gestion_jefe" />
    </Suspense>
  );
}