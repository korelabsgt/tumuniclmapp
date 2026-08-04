'use client';

import { Suspense } from 'react';
import VerRoles from '@/components/admin/roles/VerRoles';

export default function RolesPage() {
  return (
    <Suspense fallback={<div className="text-center py-10">Cargando roles...</div>}>
      <VerRoles />
    </Suspense>
  );
}
