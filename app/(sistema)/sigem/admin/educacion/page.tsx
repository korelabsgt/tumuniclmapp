// protected/admin/organos/page.tsx
'use client';

import { Suspense } from 'react';
import VerEducacion from '@/components/educacion/Ver';
import Cargando from '@/components/ui/animations/Cargando';

export default function OrganosPage() {
  return (

    <Suspense fallback={<Cargando/>}>
      <VerEducacion/>
    </Suspense>
    
  );

}