'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'react-toastify';
import Cargando from '@/components/ui/animations/Cargando';
import { asignarHorarioUsuario } from './actions';
import type { Horario, UsuarioConHorario } from './actions';
import { Search, X, Loader2, AlertTriangle } from 'lucide-react';
import Swal from 'sweetalert2';
import { useUsuariosConHorario, HORARIOS_KEYS } from './hooks';
import { useQueryClient } from '@tanstack/react-query';

interface AsignarUsuarioProps {
  isOpen: boolean;
  onClose: () => void;
  horario: Horario;
}

function FilaUsuario({ 
  usuario, 
  horarioQueSeAsigna, 
  onUsuarioAsignado 
}: { 
  usuario: UsuarioConHorario; 
  horarioQueSeAsigna: Horario;
  onUsuarioAsignado: (userId: string, newHorarioId: string | null) => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  
  const tieneEsteHorario = usuario.horario_id === horarioQueSeAsigna.id;
  const tieneOtroHorario = usuario.horario_id !== null && usuario.horario_id !== horarioQueSeAsigna.id;

  const handleAsignar = async () => {
    setIsSaving(true);
    
    if (tieneOtroHorario) {
      const { isConfirmed } = await Swal.fire({
        title: 'Confirmar reasignación',
        html: `Este usuario ya tiene el horario <b>${usuario.horario_nombre || 'desconocido'}</b>.<br/>¿Desea cambiarlo a <b>${horarioQueSeAsigna.nombre}</b>?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, cambiar',
        cancelButtonText: 'Cancelar'
      });

      if (!isConfirmed) {
        setIsSaving(false);
        return;
      }
    }

    const success = await asignarHorarioUsuario(usuario.user_id, horarioQueSeAsigna.id);
    if (success) {
      toast.success(`Horario asignado a ${usuario.nombre}.`);
      onUsuarioAsignado(usuario.user_id, horarioQueSeAsigna.id);
    }
    
    setIsSaving(false);
  };

  return (
    <div className="flex items-center justify-between gap-2 p-2 hover:bg-gray-50 dark:hover:bg-neutral-800/50 rounded-lg transition-colors">
      <div className="flex flex-col">
        <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{usuario.nombre}</span>
        {tieneEsteHorario && (
          <span className="text-xs text-green-600 dark:text-green-400 font-semibold">
            Asignado: {horarioQueSeAsigna.nombre}
          </span>
        )}
        {tieneOtroHorario && (
          <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
            Asignado a: {usuario.horario_nombre}
          </span>
        )}
        {usuario.horario_id === null && (
          <span className="text-xs text-gray-400 dark:text-neutral-500 font-semibold italic">
            Sin asignar
          </span>
        )}
      </div>
      
      <Button
        size="sm"
        onClick={handleAsignar}
        disabled={isSaving || tieneEsteHorario}
        className={`text-xs px-3 py-1 h-auto text-white transition-all ${
          tieneEsteHorario 
            ? 'bg-green-600 dark:bg-green-700 hover:bg-green-600 cursor-default opacity-90' 
            : 'bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600'
        }`}
      >
        {isSaving 
          ? <Loader2 className="h-4 w-4 animate-spin" /> 
          : tieneEsteHorario 
            ? 'Asignado' 
            : 'Asignar'}
      </Button>
    </div>
  );
}

export default function AsignarUsuario({ isOpen, onClose, horario }: AsignarUsuarioProps) {
  const queryClient = useQueryClient();
  const { usuarios, loading } = useUsuariosConHorario(isOpen);
  const [searchTerm, setSearchTerm] = useState('');

  const { usuariosAsignadosFiltrados, usuariosDisponiblesFiltrados } = useMemo(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();

    const usuariosPreFiltrados = searchTerm
      ? usuarios.filter(u => u.nombre?.toLowerCase().includes(lowerSearchTerm))
      : usuarios;

    const asignados = usuariosPreFiltrados.filter(u => u.horario_id === horario.id);
    const disponibles = usuariosPreFiltrados.filter(u => u.horario_id !== horario.id);
    
    return { usuariosAsignadosFiltrados: asignados, usuariosDisponiblesFiltrados: disponibles };
  }, [usuarios, searchTerm, horario]);
  
  const handleUsuarioAsignado = (userId: string, newHorarioId: string | null) => {
    queryClient.setQueryData<UsuarioConHorario[]>(HORARIOS_KEYS.usuarios, (prevUsuarios) =>
      (prevUsuarios ?? []).map((u) =>
        u.user_id === userId
          ? {
              ...u,
              horario_id: newHorarioId,
              horario_nombre:
                newHorarioId === null ? "Sin asignar" : horario.nombre,
            }
          : u,
      ),
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-lg relative max-h-[85vh] flex flex-col border dark:border-neutral-800"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b dark:border-neutral-800">
              <div className="flex flex-col">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Asignar Horario</h2>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{horario.nombre}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors">
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="p-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-neutral-500" />
                <Input
                  placeholder="Buscar usuario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full text-xs dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:placeholder:text-neutral-500"
                />
              </div>
            </div>

            <div className="flex-grow p-4 pt-0 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-neutral-800">
              {loading ? (
                <Cargando texto="Cargando usuarios..." />
              ) : (
                <>
                  {searchTerm && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-neutral-400 mt-2">Resultados (disponibles):</h4>
                      {usuariosDisponiblesFiltrados.length === 0 ? (
                        <p className="text-center text-xs text-gray-500 dark:text-neutral-500 py-2 italic">No hay usuarios disponibles con ese nombre.</p>
                      ) : (
                        usuariosDisponiblesFiltrados.map(usuario => (
                          <FilaUsuario 
                            key={usuario.user_id}
                            usuario={usuario}
                            horarioQueSeAsigna={horario}
                            onUsuarioAsignado={handleUsuarioAsignado}
                          />
                        ))
                      )}
                      <hr className="my-4 dark:border-neutral-800" />
                    </div>
                  )}

                  <h4 className="text-xs font-semibold text-gray-500 dark:text-neutral-400">
                    Usuarios ya asignados a este horario ({usuariosAsignadosFiltrados.length}):
                  </h4>
                  {usuariosAsignadosFiltrados.length === 0 ? (
                    <p className="text-center text-xs text-gray-500 dark:text-neutral-500 py-6 italic">
                      {searchTerm 
                        ? 'No hay usuarios asignados que coincidan.' 
                        : 'Aún no hay usuarios asignados a este horario.'
                      }
                    </p>
                  ) : (
                    usuariosAsignadosFiltrados.map(usuario => (
                      <FilaUsuario 
                        key={usuario.user_id}
                        usuario={usuario}
                        horarioQueSeAsigna={horario}
                        onUsuarioAsignado={handleUsuarioAsignado}
                      />
                    ))
                  )}
                </>
              )}
            </div>
            
            <div className="p-4 border-t dark:border-neutral-800 flex justify-end">
              <Button variant="outline" onClick={onClose} className="text-xs dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-700">
                Cerrar
              </Button>
            </div>
            
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}