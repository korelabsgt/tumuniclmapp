'use client';

import { Suspense } from 'react';
import VerModulos from '@/components/admin/modulos/VerModulos';

export default function ModulosPage() {
  return (
    <Suspense fallback={<div className="text-center py-10">Cargando módulos...</div>}>
      <VerModulos />
    </Suspense>
  );
}
