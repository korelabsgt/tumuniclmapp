import { Suspense } from 'react';
import VerAgenda from '@/components/concejo/agenda/Ver';

export default function ConcejoPage() {
  return (
    <Suspense fallback={<div className="text-center py-10">Cargando Módulo...</div>}>
      <VerAgenda />
    </Suspense>
  );
}
