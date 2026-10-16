'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Cargando from '@/components/ui/animations/Cargando';
import { Plus, Users, Trash2, Edit, Search } from 'lucide-react';
import BotonVolver from '@/components/ui/botones/BotonVolver';

import useUserData from '@/hooks/sesion/useUserData';
import { eliminarHorario } from './actions';
import type { Horario } from './actions';
import FormularioHorario from './FormHorarios';
import AsignarUsuario from './AsignarUsuarios'; 
import { useHorarios } from './hooks'; 

const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const formatTime = (timeString: string | null) => {
  if (!timeString) return 'N/A';
  try {
    const [hours, minutes] = timeString.split(':');
    const h = parseInt(hours, 10);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12.toString().padStart(2, '0')}:${minutes} ${period}`;
  } catch {
    return timeString;
  }
};

const formatDays = (days: number[] | null): string => {
  if (!days || days.length === 0) return 'N/A';
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 7) return 'Todos los días';

  const segmentos: { inicio: number; fin: number }[] = [];
  let inicio = sorted[0];
  let fin = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === fin + 1) {
      fin = sorted[i];
    } else {
      segmentos.push({ inicio, fin });
      inicio = sorted[i];
      fin = sorted[i];
    }
  }
  segmentos.push({ inicio, fin });

  return segmentos
    .map(({ inicio: ini, fin: f }) => {
      const nombreIni = NOMBRES_DIA[ini] ?? '?';
      const nombreFin = NOMBRES_DIA[f] ?? '?';
      if (ini === f) return nombreIni;
      return `${nombreIni} a ${nombreFin}`;
    })
    .join(', ');
};

interface ListaHorariosProps {
  horarios: Horario[];
  onEditar: (horario: Horario) => void;
  onEliminar: (id: string) => void;
  onAbrirAsignar: (horario: Horario) => void;
}

function FilaHorario({
  horario,
  onEditar,
  onEliminar,
  onAbrirAsignar,
}: {
  horario: Horario;
  onEditar: (horario: Horario) => void;
  onEliminar: (id: string) => void;
  onAbrirAsignar: (horario: Horario) => void;
}) {
  const dias = formatDays(horario.dias);
  const entrada = formatTime(horario.entrada);
  const salida = formatTime(horario.salida);

  const acciones = () => (
    <div className="flex shrink-0 items-center justify-end gap-1">
      <Button
        type="button"
        onClick={() => onAbrirAsignar(horario)}
        variant="ghost"
        className="h-8 cursor-pointer gap-1 px-2 text-xs font-medium text-blue-600 hover:bg-blue-100 hover:text-blue-700 sm:h-9 sm:gap-2 sm:px-3 sm:text-sm dark:text-blue-400 dark:hover:bg-blue-900/30"
      >
        <Users className="h-4 w-4" />
        Asignar
      </Button>
      <Button
        type="button"
        onClick={() => onEditar(horario)}
        variant="ghost"
        aria-label="Editar"
        title="Editar"
        className="h-8 w-8 cursor-pointer p-0 text-blue-600 hover:bg-blue-100 sm:h-9 sm:w-9 dark:text-blue-400 dark:hover:bg-blue-900/30"
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        onClick={() => onEliminar(horario.id)}
        variant="ghost"
        aria-label="Eliminar"
        title="Eliminar"
        className="h-8 w-8 cursor-pointer p-0 text-red-600 hover:bg-red-100 sm:h-9 sm:w-9 dark:text-red-400 dark:hover:bg-red-900/30"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="border-b border-slate-300 last:border-b-0 dark:border-neutral-700">
      <div className="flex select-none flex-col gap-0.5 bg-white px-3 py-2 sm:hidden dark:bg-neutral-900">
        <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          {horario.nombre}
        </p>
        <p className="text-[11px] text-slate-600 dark:text-slate-300">
          <span className="font-semibold">Días:</span> {dias}
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          <span className="font-semibold">Entrada:</span> {entrada}
          <span className="mx-1.5">·</span>
          <span className="font-semibold">Salida:</span> {salida}
        </p>
        <div className="flex justify-end pt-0.5">{acciones()}</div>
      </div>
      <div className="hidden select-none items-center justify-between gap-3 bg-white px-4 py-2.5 sm:flex dark:bg-neutral-900">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase leading-snug tracking-wider text-blue-600 dark:text-blue-400">
            {horario.nombre}
          </p>
          <p className="truncate text-[11px] font-normal text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Días:</span> {dias}
            <span className="mx-1.5">·</span>
            <span className="font-semibold">Entrada:</span> {entrada}
            <span className="mx-1.5">·</span>
            <span className="font-semibold">Salida:</span> {salida}
          </p>
        </div>
        {acciones()}
      </div>
    </div>
  );
}

function ListaHorarios({ horarios, onEditar, onEliminar, onAbrirAsignar }: ListaHorariosProps) {
  if (horarios.length === 0) {
    return (
      <div className="w-full text-center py-10 border-2 border-dashed border-gray-300 dark:border-neutral-800 rounded-xl">
        <p className="text-gray-500 dark:text-neutral-500 text-xs">No hay horarios creados.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      {horarios.map((horario) => (
        <FilaHorario
          key={horario.id}
          horario={horario}
          onEditar={onEditar}
          onEliminar={onEliminar}
          onAbrirAsignar={onAbrirAsignar}
        />
      ))}
    </div>
  );
}

export default function Horarios() {
  const { horarios, loading, refetch: handleFetchHorarios } = useHorarios();
  const [horarioAEditar, setHorarioAEditar] = useState<Horario | null>(null);
  
  const [isModalAsignarOpen, setIsModalAsignarOpen] = useState(false);
  const [horarioParaAsignar, setHorarioParaAsignar] = useState<Horario | null>(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { rol, cargando: cargandoUsuario } = useUserData();
  const isLoading = loading || cargandoUsuario;

  const horariosMostrados = useMemo(() => {
    if (!horarios) return [];
    
    const lowerSearchTerm = searchTerm.toLowerCase();

    const filteredByRole = horarios.filter(horario => {
      if (horario.nombre === 'Sistema') {
        return rol === 'SUPER';
      }
      return true;
    });

    if (!searchTerm.trim()) {
      return filteredByRole;
    }

    const filteredBySearch = filteredByRole.filter(horario => 
      horario.nombre.toLowerCase().includes(lowerSearchTerm)
    );

    return filteredBySearch;

  }, [horarios, rol, searchTerm]);

  const handleEditar = (horario: Horario) => {
    setHorarioAEditar(horario);
    setIsFormModalOpen(true);
  };

  const handleCrear = () => {
    setHorarioAEditar(null);
    setIsFormModalOpen(true);
  };

  const handleGuardar = () => {
    setIsFormModalOpen(false);
    setHorarioAEditar(null);
    handleFetchHorarios(); 
  };
  
  const handleCancelar = () => {
    setIsFormModalOpen(false);
    setHorarioAEditar(null);
  };

  const handleEliminar = async (id: string) => {
    const success = await eliminarHorario(id);
    if (success) {
      handleFetchHorarios();
    }
  };

  const handleAbrirModalAsignar = (horario: Horario) => {
    setHorarioParaAsignar(horario);
    setIsModalAsignarOpen(true);
  };

  const handleCerrarModalAsignar = () => {
    setIsModalAsignarOpen(false);
    setHorarioParaAsignar(null);
  };

  return (
    <div className="w-full p-4 md:p-8">
      <ToastContainer position="bottom-right" />

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
        <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex flex-col gap-3 px-3 py-2.5 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
            <BotonVolver
              ruta="/protected/admin/users"
              className="h-8 shrink-0 gap-1 self-start px-1 text-sm [&_svg]:h-4 [&_svg]:w-4 sm:h-10 sm:gap-2 sm:px-4 sm:text-xl sm:[&_svg]:h-5 sm:[&_svg]:w-5"
            />

            <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:ml-4 lg:w-auto lg:flex-1">
              <div className="relative w-full min-w-0 sm:max-w-xs lg:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-neutral-500" />
                <Input
                  type="text"
                  placeholder="Buscar horario por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 w-full rounded-xl border-zinc-300 bg-white pl-9 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-neutral-500"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={handleCrear}
                className="h-10 w-full shrink-0 cursor-pointer gap-2 border border-green-600 px-3 text-sm font-semibold text-green-600 hover:bg-green-100 hover:text-green-700 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/50 sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Crear Nuevo Horario
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <Cargando texto="Cargando..." />
        ) : (
          <ListaHorarios
            horarios={horariosMostrados}
            onEditar={handleEditar}
            onEliminar={handleEliminar}
            onAbrirAsignar={handleAbrirModalAsignar}
          />
        )}
      </div>

      <AnimatePresence>
        {isFormModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <FormularioHorario
                horarioAEditar={horarioAEditar}
                onGuardar={handleGuardar}
                onCancelar={handleCancelar}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {horarioParaAsignar && (
        <AsignarUsuario
          isOpen={isModalAsignarOpen}
          onClose={handleCerrarModalAsignar}
          horario={horarioParaAsignar}
        />
      )}
    </div>
  );
}