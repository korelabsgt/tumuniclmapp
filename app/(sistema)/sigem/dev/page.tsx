import { Suspense } from 'react';
import IndexDev from '@/components/dev/IndexDev';
export default function DevPage() {
  return (
    <Suspense fallback={<div className="text-center py-10">Cargando Módulo...</div>}>
      <IndexDev />
    </Suspense>
  );
}
