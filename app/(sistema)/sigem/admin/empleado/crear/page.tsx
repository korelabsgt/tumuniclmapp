'use client';

import { Suspense } from 'react';
import { CrearEmpleado } from '@/components/admin/empleados/crear/crearEmpleado'; // ⬅️ Ajuste si su ruta es diferente
import Cargando from '@/components/ui/animations/Cargando';

export default function CrearEmpleadoPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <CrearEmpleado />
    </Suspense>
  );
}
