import { Suspense } from 'react';
import VerDependencias from '@/components/admin/dependencias/Ver';
import Cargando from '@/components/ui/animations/Cargando';

export default function DependenciasPage() {
  return (
    <div className="p-4 md:p-6">
      <Suspense fallback={<Cargando />}>
        <VerDependencias />
      </Suspense>
    </div>
  );
}