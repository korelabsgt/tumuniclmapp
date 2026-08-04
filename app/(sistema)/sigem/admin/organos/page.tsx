// protected/admin/organos/page.tsx
'use client';

import { Suspense } from 'react';
import VerOrganos from '@/components/admin/organos/VerOrganos';

export default function OrganosPage() {
  return (
    <Suspense fallback={<div className="text-center py-10">Cargando Órganos...</div>}>
      <VerOrganos />
    </Suspense>
  );
}