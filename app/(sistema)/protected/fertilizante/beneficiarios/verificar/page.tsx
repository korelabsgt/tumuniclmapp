'use client';

import { Suspense } from 'react';
import VerificarBeneficiario from '@/components/fertilizante/beneficiario/verificar/verificarBeneficiario';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Cargando from '@/components/ui/animations/Cargando'; // 1. Importar el componente

export default function EditarBeneficiarioPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto pt-12 px-4">
      <div className="relative mb-8 text-center">
          <Button
          variant="ghost"
          onClick={() => router.push('/protected/fertilizante/beneficiarios')}
          className="text-blue-600 text-base underline absolute left-0 top-1/2 -translate-y-1/2"
        >
          Volver
        </Button>
        <h1 className="text-4xl font-bold">Verificar Entrega de Abono</h1>
      </div>

      <Suspense fallback={<Cargando />}> {/* 2. Usar el componente aquí */}
        <VerificarBeneficiario />
      </Suspense>
    </div>
  );
}