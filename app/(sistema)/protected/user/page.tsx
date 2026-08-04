import { Suspense } from 'react';
import Dashboard from '@/components/dashboard/Dashboard';



export default function Page() {
  return (
    <Suspense fallback={<div className="text-center py-10">Cargando Dashboard...</div>}>
      <Dashboard />
    </Suspense>
  );
}