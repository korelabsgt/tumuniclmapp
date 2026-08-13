'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Table2, Layers, FileDown, Loader2, ChevronDown, Car } from 'lucide-react';

export type TipoReporte = 'consumos' | 'liquidaciones' | 'mensual' | 'vehiculos';

interface Props {
  onSelect: (tipo: TipoReporte) => void;
  reportLoading?: boolean;
}

const OPCIONES: {
  id: TipoReporte;
  titulo: string;
  icon: React.ReactNode;
  estilos: string;
}[] = [
    {
      id: 'consumos',
      titulo: 'Reporte de consumos',
      icon: <Table2 size={16} />,
      estilos: 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
    },
    {
      id: 'liquidaciones',
      titulo: 'Reporte de liquidaciones',
      icon: <Layers size={16} />,
      estilos: 'text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
    },
    {
      id: 'mensual',
      titulo: 'Reporte mensual DAFIM',
      icon: <FileDown size={16} />,
      estilos: 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-neutral-800',
    },
    {
      id: 'vehiculos',
      titulo: 'Reporte por vehículos',
      icon: <Car size={16} />,
      estilos: 'text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20',
    },
  ];

export default function DropdownReportes({ onSelect, reportLoading = false }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (tipo: TipoReporte) => {
    if (reportLoading && tipo === 'mensual') return;
    setOpen(false);
    onSelect(tipo);
  };

  return (
    <div ref={ref} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={reportLoading}
        className="w-full sm:w-auto flex items-center justify-between gap-2 pl-3 pr-2.5 py-2.5 min-w-[180px] bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 border border-blue-600 dark:border-blue-500 rounded-xl text-[11px] font-bold text-white transition-all shadow-sm disabled:opacity-50"
      >
        <span className="flex items-center gap-2">
          {reportLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <FileDown size={16} />
          )}
          <span>Generar Reportes</span>
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 sm:right-auto sm:min-w-[280px] top-full mt-1.5 z-50 py-1.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {OPCIONES.map((opcion) => (
            <button
              key={opcion.id}
              type="button"
              onClick={() => handleSelect(opcion.id)}
              disabled={reportLoading && opcion.id === 'mensual'}
              className={`flex items-center gap-2.5 w-full px-3 py-3.5 text-left text-[11px] font-bold transition-colors disabled:opacity-50 ${opcion.estilos}`}
            >
              <span className="shrink-0">{opcion.icon}</span>
              <span className="flex-1">{opcion.titulo}</span>
              {reportLoading && opcion.id === 'mensual' && (
                <Loader2 size={14} className="animate-spin shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
