'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { RotateCw } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error capturado por ErrorBoundary:', error);
  }, [error]);

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    } else {
      reset();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-50 dark:bg-neutral-950">
      <div className="w-full max-w-lg mx-auto overflow-hidden bg-white border border-gray-100 dark:bg-neutral-900 rounded-2xl dark:border-neutral-800">
        <div className="w-full h-6 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

        <div className="p-8 text-center">
          <div className="relative w-full h-48 mx-auto mb-6">
            <Image
              src="/images/logo-muni.png"
              alt="Logo"
              fill
              className="relative z-10 object-contain"
            />
          </div>

          <h1 className="mb-3 text-4xl font-bold tracking-tight text-red-500 sm:text-5xl dark:text-white">
            Problema de Conexión
          </h1>

          <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
            No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet o intenta recargar la página.
          </p>

          <div className="flex justify-center w-full">
            <Button
              onClick={handleReload}
              className="w-full h-10 px-6 text-sm font-bold text-white transition-colors bg-blue-600 rounded-lg sm:w-auto hover:bg-blue-700"
            >
              <RotateCw className="w-4 h-4 mr-2" />
              Recargar Página
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
