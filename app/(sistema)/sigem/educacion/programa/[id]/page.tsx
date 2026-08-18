import { Suspense } from 'react';
import Programa from '@/components/educacion/pages/Programa';

export default function VerProgramaPageRoute() {
  return (
    <Suspense fallback={<div className="text-center py-10">Cargando Programa...</div>}>
      <Programa/>
    </Suspense>
  );
}