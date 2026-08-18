'use client';

import { useState, useEffect } from 'react';
import { Tarea } from '../types';
import { X, Save, Calendar, AlignLeft, Type, Lock } from 'lucide-react'; 
import { toast } from 'react-toastify';
import { useTareaMutations } from '../hooks'; 

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tarea: Tarea;
  esJefe: boolean; 
}

export default function EditarTarea({ isOpen, onClose, tarea, esJefe }: Props) {
  const { actualizar } = useTareaMutations(); 
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  const formatDateForInput = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  useEffect(() => {
    if (isOpen && tarea) {
      setTitle(tarea.title);
      setDescription(tarea.description || '');
      setDueDate(formatDateForInput(tarea.due_date));
    }
  }, [isOpen, tarea]);

  if (!isOpen) return null;

  const isSubmitting = actualizar.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const isoDate = dueDate ? new Date(dueDate).toISOString() : null;
      const fechaOriginal = formatDateForInput(tarea.due_date);
      const fechaCambio = dueDate !== fechaOriginal;
      const estabaCompletada = tarea.status === 'Completado';
      const estabaVencida = new Date(tarea.due_date) < new Date();

      const datosActualizados: any = {
        title,
        description,
        due_date: isoDate
      };

      if (fechaCambio && (estabaCompletada || estabaVencida)) {
        datosActualizados.status = 'Asignado';
        if (estabaCompletada) {
          datosActualizados.updated_at = null;
        }
      }

      await actualizar.mutateAsync({ id: tarea.id, updates: datosActualizados });

      toast.success('Tarea actualizada correctamente');
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error('Error al actualizar la tarea');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="fixed -inset-[100vmax] bg-black/5 dark:bg-black/20 backdrop-blur-md -z-10 pointer-events-none" />
      <div className="bg-white dark:bg-neutral-900 w-full sm:rounded-2xl rounded-t-2xl shadow-2xl sm:max-w-xl lg:max-w-2xl flex flex-col transition-colors duration-200 max-h-[90vh] overflow-y-auto">
        
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900 z-10">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-gray-100 flex items-center gap-2">
            Editar Actividad
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
          
          <div className="space-y-2">
            <label className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
               <span className="flex items-center gap-2"><Type size={14}/> Título</span>
               {!esJefe && <span className="text-[10px] text-orange-500 flex items-center gap-1"><Lock size={10}/> Solo lectura</span>}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!esJefe} 
              className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-base font-medium
                ${!esJefe 
                  ? 'bg-gray-100 dark:bg-neutral-800/50 border-gray-200 dark:border-neutral-700 text-gray-500 cursor-not-allowed opacity-70' 
                  : 'bg-gray-50 dark:bg-neutral-800 border-gray-100 dark:border-neutral-700 text-gray-700 dark:text-gray-100'
                }`}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <span className="flex items-center gap-2"><Calendar size={14} /> Fecha y Hora Límite</span>
              {!esJefe && <span className="text-[10px] text-orange-500 flex items-center gap-1"><Lock size={10}/> Solo lectura</span>}
            </label>
            <input
              type="datetime-local" 
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={!esJefe} 
              className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-base dark:[color-scheme:dark]
                ${!esJefe 
                  ? 'bg-gray-100 dark:bg-neutral-800/50 border-gray-200 dark:border-neutral-700 text-gray-500 cursor-not-allowed opacity-70' 
                  : 'bg-gray-50 dark:bg-neutral-800 border-gray-100 dark:border-neutral-700 text-gray-700 dark:text-gray-100'
                }`}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <AlignLeft size={14} /> Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Añade detalles o actualizaciones..."
              className="w-full p-3 bg-gray-50 dark:bg-neutral-800 border-gray-100 dark:border-neutral-700 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-base text-gray-700 dark:text-gray-100 resize-none"
            />
          </div>

          <div className="pt-2 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors text-center"
            >
                Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 sm:py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-blue-900/20 active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Guardando...' : <><Save size={18} /> Guardar Cambios</>}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}