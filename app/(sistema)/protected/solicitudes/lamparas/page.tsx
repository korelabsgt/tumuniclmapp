import { Suspense } from 'react';
import GestorSolitLamparas from '@/components/solicitudes/lamparas/GestorSolitLamparas';
import Cargando from '@/components/ui/animations/Cargando';

export default function LamparasPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <GestorSolitLamparas />
    </Suspense>
  );
}
