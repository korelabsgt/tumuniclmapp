import { Suspense } from 'react';
import GestorSolitMobiliario from '@/components/solicitudes/mobiliario/GestorSolitMobiliario';
import Cargando from '@/components/ui/animations/Cargando';

export default function MobiliarioPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <GestorSolitMobiliario />
    </Suspense>
  );
}
