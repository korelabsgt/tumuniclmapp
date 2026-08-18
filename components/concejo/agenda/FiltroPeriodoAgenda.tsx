'use client';

import { Calendar } from 'lucide-react';
import { format, setMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import SelectorMesAnio from '@/components/tareas/SelectorMesAnio';
import { cn } from '@/lib/utils';

type FiltroPeriodoAgendaProps = {
  filtroAnio: string;
  filtroMes: string | null;
  onChangeAnio: (anio: string) => void;
  onChangeMes: (mes: string | null) => void;
};

const ANIOS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

export default function FiltroPeriodoAgenda({
  filtroAnio,
  filtroMes,
  onChangeAnio,
  onChangeMes,
}: FiltroPeriodoAgendaProps) {
  const todoElAnio = filtroMes === null;
  const anio = parseInt(filtroAnio, 10);
  const mes = filtroMes !== null ? parseInt(filtroMes, 10) : new Date().getMonth();

  const etiqueta = todoElAnio
    ? String(anio)
    : `${format(setMonth(new Date(), mes), 'LLLL', { locale: es })} ${anio}`;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 xl:flex-none">
      <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900 sm:flex-none">
        <Calendar size={16} className="shrink-0 text-[#0066cc] dark:text-blue-400" />
        <SelectorMesAnio
          mes={mes}
          anio={anio}
          onChange={(m, a) => {
            onChangeMes(m.toString());
            onChangeAnio(a.toString());
          }}
          onSelectAnio={(a) => {
            onChangeMes(null);
            onChangeAnio(a.toString());
          }}
          anioActivo={todoElAnio}
          etiqueta={etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1)}
          mostrarFlechas={false}
          aniosDisponibles={ANIOS}
          className="!h-full !w-full !min-w-0 !border-0 !rounded-none !bg-transparent dark:!bg-transparent [&_button]:!h-full [&_button]:!w-full [&_button]:!border-0 [&_button]:!px-0 [&_button]:!text-sm [&_button]:!font-semibold [&_button]:!text-zinc-800 dark:[&_button]:!text-zinc-100"
        />
      </div>

      <button
        type="button"
        onClick={() => onChangeMes(null)}
        className={cn(
          'h-10 shrink-0 cursor-pointer rounded-xl border px-3 text-sm font-semibold whitespace-nowrap transition-colors',
          todoElAnio
            ? 'border-zinc-200 bg-zinc-200 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white'
            : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800',
        )}
      >
        Todo el año
      </button>
    </div>
  );
}
