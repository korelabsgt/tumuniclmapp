// protected/admin/organos/page.tsx
'use client';

import { Suspense } from 'react';
import Horarios from '@/components/admin/horarios/Horarios';
import Cargando from '@/components/ui/animations/Cargando';

export default function OrganosPage() {
  return (

    <Suspense fallback={<Cargando/>}>
      <Horarios/>
    </Suspense>
    
  );

}