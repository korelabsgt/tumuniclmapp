import { Suspense } from 'react';
import Ver from '@/components/concejo/agenda/tareas/VerTareas';
import Cargando from '@/components/ui/animations/Cargando';

export default function ConcejoPage() {
  return (
    <Suspense fallback={<Cargando texto="Cargando Sesión..." />}>
      <Ver />
    </Suspense>
  );
}