'use client';

import { Suspense } from 'react';
import { CrearBeneficiario } from '@/components/fertilizante/beneficiario/crear/crearBeneficiario';
import Cargando from '@/components/ui/animations/Cargando'; // 1. Importar el componente

export default function CrearBeneficiarioPage() {
  return (
    <Suspense fallback={<Cargando />}> {/* 2. Usar el componente aquí */}
      <CrearBeneficiario />
    </Suspense>
  );
}