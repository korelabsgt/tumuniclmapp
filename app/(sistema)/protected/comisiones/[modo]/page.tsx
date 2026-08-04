// app/protected/comisiones/[modo]/page.tsx
'use client';

import { Suspense, use } from 'react';
import Ver from '@/components/comisiones/Ver'; 
import Cargando from '@/components/ui/animations/Cargando'; 

interface PageProps {
  params: Promise<{
    modo: string; 
  }>;
}

export default function Page({ params }: PageProps) {
  const resolvedParams = use(params);

  return (
    <Suspense fallback={<Cargando />}> 
      <Ver modo={resolvedParams.modo} />
    </Suspense>
  );
}