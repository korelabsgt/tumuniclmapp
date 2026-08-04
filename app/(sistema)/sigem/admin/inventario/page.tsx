import { Suspense } from 'react';
import Cargando from '@/components/ui/animations/Cargando';

export default function InventarioPage() {
  return (
    <Suspense fallback={<Cargando texto="Cargando Inventario" />}>
      <div className="flex items-center justify-center h-full p-8 text-xl font-semibold text-gray-500">
        Módulo de Inventario en Construcción
      </div>
    </Suspense>
  );
}