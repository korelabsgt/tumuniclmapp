'use client';

import { Suspense } from 'react';
import EditarEmpleadoForm from '@/components/admin/empleados/editar/EditarEmpleadoForm';
import Cargando from '@/components/ui/animations/Cargando';

export default function EditarEmpleadoPage() {
  return (
      <Suspense fallback={<Cargando />}>
        <EditarEmpleadoForm />
      </Suspense>
  );
}