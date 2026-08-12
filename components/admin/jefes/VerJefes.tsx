'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Crown } from 'lucide-react';
import { useEstructuraJefes } from './hooks';
import Cargando from '@/components/ui/animations/Cargando';
import Estructura from './Estructura';
import Jefes from './Jefes';
import { Button } from '@/components/ui/button';

export default function VerJefes() {
  const router = useRouter();
  const { datos, initialLoading, reloading, refetch } = useEstructuraJefes();
  const [vista, setVista] = useState<'estructura' | 'jefes'>('estructura');

  const cargar = () => {
    void refetch();
  };

  return (
    <div className="w-full lg:w-[85%] mx-auto md:px-4 transition-all duration-300 relative">
      <div className="p-2 bg-white dark:bg-neutral-900 rounded-lg shadow-md border border-gray-100 dark:border-neutral-800 transition-colors duration-200 min-h-[500px]">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 p-2 border-b border-gray-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.push('/protected/admin/users')}
              className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 -ml-2"
              title="Volver a usuarios"
            >
              <ArrowLeft size={20} />
            </Button>

            <div className="flex items-center gap-3 pl-1">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                <Crown size={20} />
              </div>
              
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 uppercase tracking-tight">
                  {vista === 'estructura' ? 'Estructura de Mando' : 'Listado de Jefes'}
                </h2>
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                  Gestión Administrativa
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:flex bg-slate-100 dark:bg-neutral-950 p-1 rounded-md w-full md:w-auto">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setVista('estructura')}
              className={`text-xs font-bold uppercase h-8 md:h-7 ${vista === 'estructura' ? 'bg-white dark:bg-neutral-800 shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Estructura
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setVista('jefes')}
              className={`text-xs font-bold uppercase h-8 md:h-7 ${vista === 'jefes' ? 'bg-white dark:bg-neutral-800 shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Jefes
            </Button>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="relative">
            {/* Si está recargando, mostramos un overlay sutil pero NO desmontamos */}
            {reloading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-neutral-900/50 z-10 flex items-start justify-center pt-20 backdrop-blur-[1px]">
                    <div className="bg-white dark:bg-neutral-800 px-4 py-2 rounded-full shadow-lg border border-gray-100 dark:border-neutral-700 flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Actualizando...</span>
                    </div>
                </div>
            )}

            {initialLoading ? (
                <Cargando texto="Cargando datos..." />
            ) : (
                vista === 'estructura' 
                    ? <Estructura datos={datos} onReload={() => cargar()} />
                    : <Jefes datos={datos} />
            )}
        </div>

      </div>
    </div>
  );
}