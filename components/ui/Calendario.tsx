'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  format,
  isToday,
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';

interface CalendarioProps {
  fechaSeleccionada: string;
  onSelectDate: (date: string) => void;
  modo?: 'dia' | 'mes';
  className?: string;
}

export default function Calendario({ fechaSeleccionada, onSelectDate, modo = 'dia', className }: CalendarioProps) {
  const [fechaDeReferencia, setFechaDeReferencia] = useState(new Date(fechaSeleccionada + 'T00:00:00'));

  const inicioDeMes = startOfMonth(fechaDeReferencia);
  const finDeMes = endOfMonth(fechaDeReferencia);
  const diasDelMes = eachDayOfInterval({ start: inicioDeMes, end: finDeMes });

  const irMesSiguiente = () => setFechaDeReferencia(modo === 'mes' ? addMonths(fechaDeReferencia, 12) : addMonths(fechaDeReferencia, 1));
  const irMesAnterior = () => setFechaDeReferencia(modo === 'mes' ? subMonths(fechaDeReferencia, 12) : subMonths(fechaDeReferencia, 1));

  const handleSeleccionFecha = (dia: Date) => {
    onSelectDate(format(dia, 'yyyy-MM-dd'));
  };

  const handleSeleccionMes = (mesIndex: number) => {
    const nuevaFecha = new Date(fechaDeReferencia.getFullYear(), mesIndex, 1);
    onSelectDate(format(nuevaFecha, 'yyyy-MM-dd'));
  };

  const mesesCortos = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  return (
    <div className={cn("space-y-4 rounded-lg border border-gray-200 bg-white p-4 transition-colors dark:border-neutral-800 dark:bg-neutral-950", className)}>
      <div className="flex justify-between items-center p-2 rounded-lg">
        <button 
          type="button" 
          onClick={irMesAnterior} 
          className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-neutral-800 text-gray-600 dark:text-gray-400 transition-colors" 
          aria-label={modo === 'mes' ? "Año anterior" : "Mes anterior"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
        </button>
        <div className='flex gap-2 text-lg lg:text-xl font-semibold text-gray-800 dark:text-gray-100 capitalize'>
          {modo === 'dia' && <span>{format(fechaDeReferencia, 'LLLL', { locale: es })}</span>}
          <span>{format(fechaDeReferencia, 'yyyy')}</span>
        </div>
        <button 
          type="button" 
          onClick={irMesSiguiente} 
          className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-neutral-800 text-gray-600 dark:text-gray-400 transition-colors" 
          aria-label={modo === 'mes' ? "Año siguiente" : "Siguiente mes"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
        </button>
      </div>
      
      {modo === 'mes' ? (
        <div className="grid grid-cols-3 gap-2 text-center p-2">
          {mesesCortos.map((mes, idx) => {
            const isSelected = parseInt(fechaSeleccionada.split('-')[1]) === idx + 1 && parseInt(fechaSeleccionada.split('-')[0]) === fechaDeReferencia.getFullYear();
            const isCurrentMonth = new Date().getMonth() === idx && new Date().getFullYear() === fechaDeReferencia.getFullYear();
            return (
              <button
                key={mes}
                type="button"
                onClick={() => handleSeleccionMes(idx)}
                className={`py-3 rounded-lg font-semibold text-sm transition-all
                  ${isSelected ? 'bg-blue-600 dark:bg-blue-700 text-white shadow-sm' : ''}
                  ${isCurrentMonth && !isSelected ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800' : ''}
                  ${!isSelected && !isCurrentMonth ? 'hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-gray-300' : ''}
                `}
              >
                {mes}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1 text-center">
        {['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map((dia) => (
          <span key={dia} className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">{dia}</span>
        ))}
        {Array.from({ length: inicioDeMes.getDay() === 0 ? 6 : inicioDeMes.getDay() - 1 }, (_, i) => (
          <div key={`empty-${i}`} className="w-8 h-8"></div>
        ))}
        {diasDelMes.map((dia) => {
          const isSelected = isSameDay(dia, new Date(fechaSeleccionada + 'T00:00:00'));
          const isTodayDate = isToday(dia);
          const isPastDate = dia.setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
          
          return (
            <button
              type="button"
              key={dia.toString()}
              onClick={() => handleSeleccionFecha(dia)}
              className={`w-8 h-8 flex items-center justify-center rounded-md transition-all cursor-pointer text-sm
                ${isPastDate && isSelected ? 'bg-slate-200 dark:bg-neutral-800 text-slate-600 dark:text-gray-400' : ''}
                ${isPastDate && !isSelected ? 'text-slate-400 dark:text-neutral-600' : ''}
                ${!isPastDate && isSelected ? 'bg-blue-600 dark:bg-blue-700 text-white' : ''}
                ${isTodayDate && !isSelected ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800' : ''}
                ${!isPastDate && !isSelected && !isTodayDate ? 'hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-gray-300' : ''}
              `}
            >
              {format(dia, 'd')}
            </button>
          );
        })}
      </div>
      )}
    </div>
  );
};