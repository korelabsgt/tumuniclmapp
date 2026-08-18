'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-50 dark:bg-neutral-950">
      
      <div className="w-full max-w-lg mx-auto bg-white border dark:bg-neutral-900 rounded-2xl border-gray-100 dark:border-neutral-800 overflow-hidden">
        
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

          <h1 className="mb-3 text-5xl font-bold tracking-tight text-red-500 dark:text-white">
            Acceso Restringido
          </h1>
          
          <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
            Lo sentimos, no tienes los permisos necesarios para visualizar esta sección o la página no existe.
          </p>

          <div className="flex justify-center w-full">
            <Button
              onClick={() => router.push('/sigem')}
              className="w-full h-10 px-6 text-sm font-bold text-white transition-colors bg-blue-600 rounded-lg sm:w-auto hover:bg-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Inicio
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}