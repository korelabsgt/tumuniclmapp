import { Suspense } from 'react';
import ReporteDepartamentos from '@/components/combustible/entregaCupon/ReporteDepartamentos';
import { getReporteJerarquicoCombustible } from '@/components/combustible/entregaCupon/lib/actions';
import Cargando from '@/components/ui/animations/Cargando';

export const dynamic = 'force-dynamic';

async function ReporteContent() {
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

  const data = await getReporteJerarquicoCombustible(initialParams);

  return <ReporteDepartamentos initialData={data} initialParams={initialParams} />;
}

export default function ReporteCombustiblePage() {
  return (
    <Suspense fallback={<Cargando />}>
      <ReporteContent />
    </Suspense>
  );
}
