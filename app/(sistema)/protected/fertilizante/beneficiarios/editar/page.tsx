'use client';

import { Suspense } from 'react';
import EditarBeneficiarioForm from '@/components/fertilizante/beneficiario/editar/EditarBeneficiarioForm';
import { useRouter } from 'next/navigation';
import Cargando from '@/components/ui/animations/Cargando';
import { formPageClass } from '@/components/fertilizante/formStyles';

export default function EditarBeneficiarioPage() {
  const router = useRouter();

  return (
    <div className={formPageClass}>
      <button
        type="button"
        onClick={() => router.push('/protected/fertilizante/beneficiarios')}
        className="text-emerald-600 dark:text-emerald-400 text-sm underline p-0 m-0 h-auto min-h-0 bg-transparent border-0 shadow-none cursor-pointer font-medium"
      >
        Volver
      </button>
      <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6 mt-2">Editar Beneficiario</h1>

      <Suspense fallback={<Cargando />}>
        <EditarBeneficiarioForm />
      </Suspense>
    </div>
  );
}