'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Cargando from '@/components/ui/animations/Cargando';
import { Plus, Clock, Users, Trash2, Edit, Search } from 'lucide-react';
import BotonVolver from '@/components/ui/botones/BotonVolver';

import useUserData from '@/hooks/sesion/useUserData';
import { eliminarHorario } from './actions';
import type { Horario } from './actions';
import FormularioHorario from './FormHorarios';
import AsignarUsuario from './AsignarUsuarios'; 
import { useHorarios } from './hooks'; 

const formatTime = (timeString: string | null) => {
  if (!timeString) return 'N/A';
  try {
    const [hours, minutes] = timeString.split(':');
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12.toString().padStart(2, '0')}:${minutes} ${period}`;
  } catch {
    return timeString;
  }
};

const formatDays = (days: number[] | null): string => {
  if (!days || days.length === 0) return 'N/A';
  if (days.length === 7) return 'Todos los días';
  if (days.length === 5 && days.every(d => [1,2,3,4,5].includes(d))) return 'Lunes a Viernes';
  
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return days.sort().map(d => dayNames[d] || '?').join(', ');
};

interface ListaHorariosProps {
  horarios: Horario[];
  onEditar: (horario: Horario) => void;
  onEliminar: (id: string) => void;
  onAbrirAsignar: (horario: Horario) => void;
}

function ListaHorarios({ horarios, onEditar, onEliminar, onAbrirAsignar }: ListaHorariosProps) {
  return (
    <div className="w-full max-w-4xl space-y-3">
      {horarios.length === 0 && (
        <p className="text-center text-gray-500 dark:text-neutral-500 text-xs">No hay horarios creados.</p>
      )}
      {horarios.map(horario => (
        <div key={horario.id} className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
          <div className="flex-grow">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{horario.nombre}</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-neutral-400 mt-1">
              <span className="text-xs"><span className="font-semibold">Días:</span> {formatDays(horario.dias)}</span>
              <span className="text-xs"><span className="font-semibold">Entrada:</span> {formatTime(horario.entrada)}</span>
              <span className="text-xs"><span className="font-semibold">Salida:</span> {formatTime(horario.salida)}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
            <Button 
              size="sm" 
              className="w-1/3 sm:w-auto text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white"
              onClick={() => onAbrirAsignar(horario)}
            >
              <Users className="h-4 w-4 mr-2" /> Asignar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-1/3 sm:w-auto text-xs dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-700"
              onClick={() => onEditar(horario)}
            >
              <Edit className="h-4 w-4 mr-2" /> Editar
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              className="w-1/3 sm:w-auto text-xs"
              onClick={() => onEliminar(horario.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Eliminar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Horarios() {
  const router = useRouter();
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
    <div className="p-4 md:p-8 w-full">
      <ToastContainer position="bottom-right" />
      
      <div className="flex flex-col gap-4 w-full mx-auto pb-6 md:flex-row md:justify-between md:items-center md:px-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/sigem/admin/users')}
          className="text-blue-600 dark:text-blue-400 text-base underline w-full md:w-auto flex-shrink-0 justify-start"
        >
          Volver
        </Button>
        
        <div className="relative w-full md:w-auto md:flex-grow md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-neutral-500" />
          <Input
            type="text"
            placeholder="Buscar horario por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full text-xs dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:placeholder:text-neutral-500"
          />
        </div>

        <Button
            onClick={handleCrear}
            className="flex items-center justify-center gap-2 w-full md:w-auto bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white"
          >
            <Plus className="h-4 w-4" /> Crear Nuevo Horario
        </Button>
      </div>
      
      <div className="flex justify-center">
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