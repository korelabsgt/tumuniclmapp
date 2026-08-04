import { Suspense } from 'react';
import Dashboard from '@/components/dashboard/Dashboard';

// Componente de carga que se mostrará mientras el Dashboard principal está cargando.
function DashboardSkeleton() {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-8 pt-2">
      <div className="text-center mb-6">
        <div className="h-10 bg-gray-200 rounded-md dark:bg-gray-700 w-1/2 mx-auto mb-4"></div>
        <div className="h-6 bg-gray-200 rounded-md dark:bg-gray-700 w-3/4 mx-auto"></div>
      </div>
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
      <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl mb-8"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
      </div>
    </div>
  );
}


export default function Page() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}