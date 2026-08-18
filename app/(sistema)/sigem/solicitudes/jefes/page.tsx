import { Suspense } from 'react';
import GestorSolicitudesJefes from '@/components/solicitudes/jefes/GestorSolicitudesJefes';
import Cargando from '@/components/ui/animations/Cargando';

export default function SolicitudesJefesPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <GestorSolicitudesJefes />
    </Suspense>
  );
}
