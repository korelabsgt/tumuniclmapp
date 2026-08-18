
// SIN 'use client'
import { Suspense } from 'react';
import VerNivel from '@/components/educacion/pages/VerNivel/Nivel';

export default function VerNivelPageRoute() {
  return (
    <Suspense fallback={<div className="text-center py-10">Cargando Nivel...</div>}>
      <VerNivel />
    </Suspense>
  );
}