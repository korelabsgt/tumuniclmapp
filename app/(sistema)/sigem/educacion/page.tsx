// protected/educacion/page.tsx
import { Suspense } from 'react';
import VerEducacion from '@/components/educacion/Ver';

export default function OrganosPage() {
  return (
    <Suspense fallback={<div className="text-center py-10">Cargando Módulo...</div>}>
      <VerEducacion/>
    </Suspense>
  );
}