import { Suspense } from 'react';
import ReporteVehiculos from '@/components/combustible/entregaCupon/ReporteVehiculos';
import { getReportePorVehiculo } from '@/components/combustible/entregaCupon/lib/actions';
import Cargando from '@/components/ui/animations/Cargando';

export const dynamic = 'force-dynamic';

async function ReporteVehiculosContent() {
  const hoy = new Date();
  const mes = hoy.getMonth();
  const anio = hoy.getFullYear();

  const initialParams = {
    modoRango: false,
    mes,
    anio,
    mesInicio: mes,
    mesFin: mes,
    anioInicio: anio,
    anioFin: anio,
  };

  const data = await getReportePorVehiculo(initialParams);

  return <ReporteVehiculos initialData={data} initialParams={initialParams} />;
}

export default function ReporteVehiculosPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <ReporteVehiculosContent />
    </Suspense>
  );
}
