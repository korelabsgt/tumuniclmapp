'use client';

import React, { useState, useTransition, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { getPublicaciones } from '@/components/home/lib/actions';
import { PublicacionItem } from '@/components/home/PublicacionItem';
import type { Publicacion, Politica } from '@/components/home/lib/actions';

const NOMBRES_MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const NOMBRES_MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

interface Props {
  publicacionesIniciales: Publicacion[];
  politicas: Politica[];
}

export function ListPublicaciones({ publicacionesIniciales, politicas }: Props) {
  const añosDisponibles = React.useMemo(() => {
    const años = new Set(publicacionesIniciales.map(p => p.año));
    return Array.from(años).sort((a, b) => b - a);
  }, [publicacionesIniciales]);

  const [publicaciones, setPublicaciones] = useState<Publicacion[]>(publicacionesIniciales);
  const [añoFiltro, setAñoFiltro] = useState<number | undefined>(undefined);
  const [politicaFiltro, setPoliticaFiltro] = useState<string | undefined>(undefined);
  const [isPending, startTransition] = useTransition();

  const aplicarFiltros = useCallback((año?: number, politicaId?: string) => {
    startTransition(async () => {
      const data = await getPublicaciones(año, politicaId ?? null);
      setPublicaciones(data);
    });
  }, []);

  function cambiarAño(año: number | undefined) {
    setAñoFiltro(año);
    aplicarFiltros(año, politicaFiltro);
  }

  function cambiarPolitica(politicaId: string | undefined) {
    setPoliticaFiltro(politicaId);
    aplicarFiltros(añoFiltro, politicaId);
  }

  return (
    <div className="w-full">
      {/* ─── Filtros ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3 border-b border-gray-200 dark:border-neutral-700 pb-2 sm:pb-0">
        {/* Filtros de Política (Tabs) */}
        <div className="flex flex-wrap gap-6">
          {politicas.map(pol => (
            <button
              key={pol.id}
              onClick={() => cambiarPolitica(pol.id === politicaFiltro ? undefined : pol.id)}
              className={`py-3 px-1 text-sm font-semibold transition-all border-b-2 -mb-[1px] sm:-mb-[2px] ${
                politicaFiltro === pol.id
                  ? 'border-[#02245b] dark:border-blue-500 text-[#02245b] dark:text-blue-500'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-neutral-600'
              }`}
            >
              {pol.nombre}
            </button>
          ))}
        </div>

        {/* Filtro de Año (Segmented Control) */}
        <div className="relative shrink-0 sm:mb-2 mt-2 sm:mt-0">
          <div className="flex items-center border border-gray-200 dark:border-neutral-700 rounded-lg overflow-hidden bg-white dark:bg-neutral-800 shadow-sm">
            {/* Left Arrow (Older) */}
            <button
              onClick={() => {
                if (añosDisponibles.length === 0) return;
                if (añoFiltro === undefined) {
                  cambiarAño(añosDisponibles[0]); // Entrar al año más reciente
                } else {
                  const idx = añosDisponibles.indexOf(añoFiltro);
                  if (idx >= 0 && idx < añosDisponibles.length - 1) {
                    cambiarAño(añosDisponibles[idx + 1]); // Ir a un año más antiguo
                  }
                }
              }}
              disabled={añosDisponibles.length === 0 || (añoFiltro !== undefined && añosDisponibles.indexOf(añoFiltro) === añosDisponibles.length - 1)}
              className="p-2 border-r border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 text-gray-500 dark:text-gray-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Middle Dropdown */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center justify-center min-w-[120px] gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors text-sm font-semibold text-gray-800 dark:text-gray-200 focus:outline-none">
                  {añoFiltro ? `Año ${añoFiltro}` : 'Todos los años'}
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-2 bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 shadow-xl rounded-xl" align="center">
                <div className="flex flex-col gap-1">
                  <button 
                    onClick={() => cambiarAño(undefined)}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors text-left ${
                      añoFiltro === undefined
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-[#02245b] dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    Todos los años
                  </button>
                  {añosDisponibles.map(a => (
                    <button 
                      key={a}
                      onClick={() => cambiarAño(a)}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors text-left ${
                        añoFiltro === a
                          ? 'bg-[#02245b] dark:bg-blue-600 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      Año {a}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Right Arrow (Newer) */}
            <button
              onClick={() => {
                if (añoFiltro !== undefined) {
                  const idx = añosDisponibles.indexOf(añoFiltro);
                  if (idx > 0) {
                    cambiarAño(añosDisponibles[idx - 1]); // Ir a un año más reciente
                  }
                }
              }}
              disabled={añoFiltro === undefined || (añoFiltro !== undefined && añosDisponibles.indexOf(añoFiltro) === 0)}
              className="p-2 border-l border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 text-gray-500 dark:text-gray-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Lista de publicaciones ───────────────────────────────────────────── */}
      {isPending ? (
        <div className="flex flex-col gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse space-y-3 py-8 border-b border-gray-100 dark:border-neutral-700">
              <div className="h-3 w-24 bg-gray-200 dark:bg-neutral-700 rounded-full" />
              <div className="h-7 w-3/4 bg-gray-200 dark:bg-neutral-700 rounded-full" />
              <div className="h-4 w-full bg-gray-100 dark:bg-neutral-800 rounded-full" />
              <div className="h-4 w-5/6 bg-gray-100 dark:bg-neutral-800 rounded-full" />
            </div>
          ))}
        </div>
      ) : publicaciones.length === 0 ? (
        <div className="text-center py-16 px-4 bg-gray-50 dark:bg-neutral-800/50 rounded-2xl border border-gray-100 dark:border-neutral-800">
          <p className="text-gray-500 dark:text-gray-400">No se encontraron publicaciones con estos filtros.</p>
          <button 
            onClick={() => {
              cambiarAño(undefined);
              cambiarPolitica(undefined);
            }}
            className="mt-4 text-[#0066cc] dark:text-blue-400 hover:underline text-sm font-medium"
          >
            Ver todas las publicaciones
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-0 divide-y divide-gray-100 dark:divide-neutral-800">
          {publicaciones.map(pub => (
            <PublicacionItem key={pub.id} publicacion={pub} />
          ))}
        </div>
      )}
    </div>
  );
}
