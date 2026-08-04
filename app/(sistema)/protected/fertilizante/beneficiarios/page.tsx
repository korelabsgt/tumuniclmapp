// app/protected/fertilizante/beneficiarios/page.tsx

'use client';
import { Suspense } from 'react';
import VerBeneficiarios from '@/components/fertilizante/VerBeneficiarios';
export default function BeneficiariosPage() {
  return (
    <Suspense>
      <VerBeneficiarios />
    </Suspense>
  );
}
