'use client';

import React, { useState, useTransition, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { getPublicaciones } from '@/components/home/lib/actions';
import { PublicacionItem } from '@/components/home/PublicacionItem';
import type { Publicacion, Politica } from '@/components/home/lib/actions';

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
      <div className="flex flex-wrap gap-3 mb-8">
        {/* Filtro de Año */}
        <div className="relative">
          <select
            value={añoFiltro ?? ''}
            onChange={e => cambiarAño(e.target.value ? Number(e.target.value) : undefined)}
            className="appearance-none pl-4 pr-8 py-2 rounded-full border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            <option value="">Todos los años</option>
            {añosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* Filtros de Política */}
        {politicas.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => cambiarPolitica(undefined)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                !politicaFiltro
                  ? 'bg-[#02245b] text-white border-[#02245b]'
                  : 'bg-white dark:bg-neutral-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-neutral-700 hover:border-[#02245b] hover:text-[#02245b]'
              }`}
            >
              Todas
            </button>
            {politicas.map(pol => (
              <button
                key={pol.id}
                onClick={() => cambiarPolitica(pol.id === politicaFiltro ? undefined : pol.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                  politicaFiltro === pol.id
                    ? 'bg-[#02245b] text-white border-[#02245b]'
                    : 'bg-white dark:bg-neutral-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-neutral-700 hover:border-[#02245b] hover:text-[#02245b]'
                }`}
              >
                {pol.nombre}
              </button>
            ))}
          </div>
        )}
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
        <div className="text-center py-20 text-gray-400 dark:text-gray-600">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm">No hay publicaciones para los filtros seleccionados.</p>
        </div>
      ) : (
        <div>
          {publicaciones.map(pub => (
            <PublicacionItem key={pub.id} publicacion={pub} />
          ))}
        </div>
      )}
    </div>
  );
}
