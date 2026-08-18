'use client';

import { Suspense } from 'react';
import VerPermisos from '@/components/permisos/VerPermisos';
import Cargando from '@/components/ui/animations/Cargando';

export default function PermisosPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <VerPermisos tipoVista="mis_permisos" />
    </Suspense>
  );
}