// protected/agenda/page.tsx
import { Suspense } from 'react';
import VerAgenda from '@/components/concejo/agenda/Ver';
import Cargando from '@/components/ui/animations/Cargando';

export default function ConcejoPage() {
  return (
    <Suspense fallback={<Cargando texto="Cargando agenda..." />}>
      <VerAgenda />
    </Suspense>
  );
}
