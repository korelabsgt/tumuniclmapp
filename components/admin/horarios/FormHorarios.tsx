'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'react-toastify';
import { guardarHorario } from './actions';
import type { Horario } from './actions';

type PeriodoDia = 'AM' | 'PM';

type Hora12 = {
  hora: string;
  minuto: string;
  periodo: PeriodoDia;
};

const HORAS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTOS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

const convert24to12 = (h24: number): { hora: string; periodo: PeriodoDia } => {
  const periodo: PeriodoDia = h24 >= 12 ? 'PM' : 'AM';
  let hora12 = h24 % 12;
  if (hora12 === 0) hora12 = 12;
  return { hora: String(hora12).padStart(2, '0'), periodo };
};

const convert12to24 = (hora12: string, periodo: PeriodoDia): string => {
  let h24 = parseInt(hora12, 10);
  if (periodo === 'PM' && h24 < 12) h24 += 12;
  if (periodo === 'AM' && h24 === 12) h24 = 0;
  return String(h24).padStart(2, '0');
};

const parseHora24 = (time: string): Hora12 => {
  const [hh = '08', mm = '00'] = time.split(':');
  const h24 = parseInt(hh, 10);
  const { hora, periodo } = convert24to12(Number.isNaN(h24) ? 8 : h24);
  const mmNum = Math.min(55, Math.max(0, Math.round(parseInt(mm.substring(0, 2), 10) / 5) * 5));
  const minuto = String(Number.isNaN(mmNum) ? 0 : mmNum).padStart(2, '0');
  return { hora, minuto, periodo };
};

const toHora24 = ({ hora, minuto, periodo }: Hora12): string =>
  `${convert12to24(hora, periodo)}:${minuto.padStart(2, '0')}`;

const SELECT_HORA_CLASS =
  'min-w-0 flex-1 cursor-pointer rounded-md border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white';

function SelectorHoraAmPm({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: Hora12;
  onChange: (next: Hora12) => void;
}) {
  return (
    <div>
      <label className="mb-2 block font-bold text-gray-700 dark:text-neutral-300" htmlFor={`${id}-hora`}>
        {label}
      </label>
      <div className="flex items-center gap-1">
        <select
          id={`${id}-hora`}
          value={value.hora}
          onChange={(e) => onChange({ ...value, hora: e.target.value })}
          className={SELECT_HORA_CLASS}
          aria-label={`${label} hora`}
        >
          {HORAS_12.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <span className="shrink-0 text-gray-700 dark:text-neutral-300">:</span>
        <select
          id={`${id}-minuto`}
          value={value.minuto}
          onChange={(e) => onChange({ ...value, minuto: e.target.value })}
          className={SELECT_HORA_CLASS}
          aria-label={`${label} minutos`}
        >
          {MINUTOS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          id={`${id}-periodo`}
          value={value.periodo}
          onChange={(e) => onChange({ ...value, periodo: e.target.value as PeriodoDia })}
          className={`${SELECT_HORA_CLASS} max-w-[4.5rem] shrink-0`}
          aria-label={`${label} AM o PM`}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}

const DIAS_SEMANA = [
  { numero: 1, nombre: 'Lunes' },
  { numero: 2, nombre: 'Martes' },
  { numero: 3, nombre: 'Miércoles' },
  { numero: 4, nombre: 'Jueves' },
  { numero: 5, nombre: 'Viernes' },
  { numero: 6, nombre: 'Sábado' },
  { numero: 0, nombre: 'Domingo' },
];

interface FormularioHorarioProps {
  horarioAEditar: Horario | null;
  onGuardar: () => void;
  onCancelar: () => void;
}

export default function FormularioHorario({ horarioAEditar, onGuardar, onCancelar }: FormularioHorarioProps) {
  const [nombre, setNombre] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [entrada, setEntrada] = useState<Hora12>({ hora: '08', minuto: '00', periodo: 'AM' });
  const [salida, setSalida] = useState<Hora12>({ hora: '04', minuto: '00', periodo: 'PM' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (horarioAEditar) {
      setNombre(horarioAEditar.nombre || '');
      setSelectedDays(horarioAEditar.dias || []);
      setEntrada(parseHora24(horarioAEditar.entrada?.substring(0, 5) || '08:00'));
      setSalida(parseHora24(horarioAEditar.salida?.substring(0, 5) || '16:00'));
    } else {
      setNombre('');
      setSelectedDays([1, 2, 3, 4, 5]);
      setEntrada({ hora: '08', minuto: '00', periodo: 'AM' });
      setSalida({ hora: '04', minuto: '00', periodo: 'PM' });
    }
  }, [horarioAEditar]);

  const handleDayClick = (day: number) => {
    setSelectedDays(prevDays =>
      prevDays.includes(day) ? prevDays.filter(d => d !== day) : [...prevDays, day]
    );
  };

  const handleGuardar = async () => {
    const entrada24 = toHora24(entrada);
    const salida24 = toHora24(salida);

    if (!nombre || selectedDays.length === 0 || !entrada24 || !salida24) {
      toast.error('Por favor, complete todos los campos.');
      return;
    }
    
    setIsSubmitting(true);
    const horarioData = { 
      nombre, 
      dias: selectedDays, 
      entrada: entrada24, 
      salida: salida24,
    };

    const success = await guardarHorario(horarioAEditar, horarioData);
    
    if (success) {
      onGuardar();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-200 dark:border-neutral-800 max-h-[90vh] overflow-y-auto transition-colors">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">
        {horarioAEditar ? 'Editar Horario' : 'Crear Nuevo Horario'}
      </h2>
      
      <div className="mb-4">
        <label className="block text-gray-700 dark:text-neutral-300 font-bold mb-2" htmlFor="nombre">
          Nombre del Horario
        </label>
        <Input
          id="nombre"
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Normal, Medio Turno, Sistema"
          className="dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:placeholder:text-neutral-500"
        />
      </div>

      <div className="flex gap-2 mb-6">
        <button 
          type="button" 
          onClick={() => setSelectedDays([1, 2, 3, 4, 5])} 
          className="w-1/2 px-3 py-2 bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          Semana Laboral
        </button>
        <button 
          type="button" 
          onClick={() => setSelectedDays([0, 1, 2, 3, 4, 5, 6])} 
          className="w-1/2 px-3 py-2 bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          Toda la Semana
        </button>
      </div>

      <div className="mb-6">
        <label className="block text-gray-700 dark:text-neutral-300 font-bold mb-3">
          Seleccionar Días
        </label>
        <div className="grid grid-cols-7 gap-2 text-center">
          {DIAS_SEMANA.map(dia => {
            const isSelected = selectedDays.includes(dia.numero);
            return (
              <div
                key={dia.numero}
                onClick={() => handleDayClick(dia.numero)}
                className={`
                  p-3 rounded-lg cursor-pointer border relative
                  transition-all duration-300 ease-in-out
                  transform hover:scale-105
                  ${isSelected 
                    ? 'bg-blue-500 dark:bg-blue-700 text-white border-blue-400 dark:border-blue-500 border-2 shadow-lg scale-105' 
                    : 'bg-gray-50 dark:bg-neutral-800/50 text-gray-600 dark:text-neutral-400 border-gray-200 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-700'
                  }
                `}
              >
                <span className="font-semibold text-sm">{dia.nombre.substring(0, 3)}</span>
                {isSelected && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectorHoraAmPm id="entrada" label="Entrada" value={entrada} onChange={setEntrada} />
        <SelectorHoraAmPm id="salida" label="Salida" value={salida} onChange={setSalida} />
      </div>
      
      <div className="flex justify-between items-center border-t border-gray-200 dark:border-neutral-800 pt-4 mt-6">
        <Button
          variant="ghost"
          onClick={onCancelar}
          className="text-gray-600 dark:text-neutral-400 hover:text-gray-800 dark:hover:text-neutral-100 transition-colors"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleGuardar}
          disabled={isSubmitting}
          className="px-5 py-2 text-white bg-blue-600 dark:bg-blue-700 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-semibold shadow-md hover:shadow-lg"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
}