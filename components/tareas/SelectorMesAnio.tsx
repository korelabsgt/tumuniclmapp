'use client';

import { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MESES_CORTOS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS_DISPONIBLES_DEFAULT = Array.from({ length: 6 }, (_, i) => ANIO_ACTUAL - 1 + i);

interface Props {
  mes: number;
  anio: number;
  onChange: (mes: number, anio: number) => void;
  onSelectAnio?: (anio: number) => void;
  className?: string;
  aniosDisponibles?: number[];
  mostrarFlechas?: boolean;
  etiqueta?: string;
  anioActivo?: boolean;
}

export default function SelectorMesAnio({
  mes,
  anio,
  onChange,
  onSelectAnio,
  className = '',
  aniosDisponibles = ANIOS_DISPONIBLES_DEFAULT,
  mostrarFlechas = true,
  etiqueta,
  anioActivo = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [anioVista, setAnioVista] = useState(anio);

  const anioMin = Math.min(...aniosDisponibles);
  const anioMax = Math.max(...aniosDisponibles);

  const indiceAnioVista = aniosDisponibles.indexOf(anioVista);
  const puedeAnioAnterior = indiceAnioVista > 0;
  const puedeAnioSiguiente = indiceAnioVista < aniosDisponibles.length - 1;

  const puedeMesAnterior = anio > anioMin || (anio === anioMin && mes > 0);
  const puedeMesSiguiente = anio < anioMax || (anio === anioMax && mes < 11);

  const irMesAnterior = () => {
    if (!puedeMesAnterior) return;
    if (mes === 0) onChange(11, anio - 1);
    else onChange(mes - 1, anio);
  };

  const irMesSiguiente = () => {
    if (!puedeMesSiguiente) return;
    if (mes === 11) onChange(0, anio + 1);
    else onChange(mes + 1, anio);
  };

  const seleccionarMes = (indiceMes: number) => {
    onChange(indiceMes, anioVista);
    setOpen(false);
  };

  const seleccionarAnio = () => {
    if (!onSelectAnio) return;
    onSelectAnio(anioVista);
    setOpen(false);
  };

  const flechaClass = 'h-full px-2 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition-colors shrink-0 cursor-pointer';

  return (
    <div className={`flex items-center md:w-fit h-9 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg overflow-hidden ${mostrarFlechas ? 'w-full' : 'w-auto'} ${className}`}>
      {mostrarFlechas && (
        <button
          type="button"
          onClick={irMesAnterior}
          disabled={!puedeMesAnterior}
          className={flechaClass}
          aria-label="Mes anterior"
        >
          <ChevronLeft size={18} />
        </button>
      )}

      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setAnioVista(aniosDisponibles.includes(anio) ? anio : aniosDisponibles[0]);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`min-w-0 w-full h-full flex items-center justify-center gap-1 px-2.5 sm:px-3 text-[11px] sm:text-xs font-bold outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/20 text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors whitespace-nowrap cursor-pointer ${
              mostrarFlechas ? 'flex-1 md:flex-none border-x border-slate-200 dark:border-neutral-800 px-1.5 sm:px-2 md:px-4' : ''
            }`}
          >
            <span className="truncate capitalize">{etiqueta ?? `${MESES[mes]} ${anio}`}</span>
            <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform sm:w-4 sm:h-4 ${open ? 'rotate-180' : ''}`} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[148px] p-1.5 rounded-lg border-slate-200 dark:border-neutral-800" align="center">
          <div className="flex items-center justify-between mb-1">
            <button
              type="button"
              disabled={!puedeAnioAnterior}
              onClick={() => setAnioVista(aniosDisponibles[indiceAnioVista - 1])}
              className="p-0.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            {onSelectAnio ? (
              <button
                type="button"
                onClick={seleccionarAnio}
                className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                  anioActivo && anio === anioVista
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-neutral-800'
                }`}
                title="Ver todo el año"
              >
                {anioVista}
              </button>
            ) : (
              <span className="text-[11px] font-bold text-slate-800 dark:text-white">{anioVista}</span>
            )}
            <button
              type="button"
              disabled={!puedeAnioSiguiente}
              onClick={() => setAnioVista(aniosDisponibles[indiceAnioVista + 1])}
              className="p-0.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-0.5">
            {MESES_CORTOS.map((nombre, i) => {
              const activo = !anioActivo && mes === i && anio === anioVista;
              return (
                <button
                  key={nombre}
                  type="button"
                  onClick={() => seleccionarMes(i)}
                  className={`h-6 flex items-center justify-center rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                    activo
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  {nombre}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {mostrarFlechas && (
        <button
          type="button"
          onClick={irMesSiguiente}
          disabled={!puedeMesSiguiente}
          className={flechaClass}
          aria-label="Mes siguiente"
        >
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}
