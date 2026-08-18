'use client';

import { useState } from 'react';
import { Usuario, ChecklistItem } from '../types';
import { X, Plus, Trash2, Calendar, User, AlignLeft, CheckSquare } from 'lucide-react';
import { toast } from 'react-toastify'; 
import { useTareaMutations } from '../hooks'; 

interface NewTareaProps {
  isOpen: boolean;
  onClose: () => void;
  usuarios: Usuario[];
  usuarioActual: string;
  esJefe: boolean;
}

export default function NewTarea({ isOpen, onClose, usuarios, usuarioActual, esJefe }: NewTareaProps) {
  const { crear } = useTareaMutations(); 
  
  const obtenerFechaPorDefecto = () => {
    const d = new Date();
    d.setHours(16, 0, 0, 0); // 4:00 PM
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(obtenerFechaPorDefecto);
  
  const [assignedTo, setAssignedTo] = useState(usuarioActual); 
  const [searchTerm, setSearchTerm] = useState(''); 
  const [showDropdown, setShowDropdown] = useState(false); 

  const [checklistInput, setChecklistInput] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  if (!isOpen) return null;

  const isSubmitting = crear.isPending; 

  const filteredUsuarios = usuarios.filter(u => 
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowDropdown(true);
    if (value.trim() === '') {
      setAssignedTo(usuarioActual);
    }
  };

  const handleSelectUser = (userId: string, nombre: string) => {
    setAssignedTo(userId);
    setSearchTerm(nombre); 
    setShowDropdown(false); 
  };

  const addChecklistItem = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!checklistInput.trim()) return;
    setChecklist([...checklist, { title: checklistInput.trim(), is_completed: false }]);
    setChecklistInput('');
  };

  const removeChecklistItem = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  const sendPushNotification = async (titulo: string, mensaje: string, userIds: string[]) => {
    try {
      if (userIds.length === 0) return;

      await fetch('/api/push/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titulo,
          message: mensaje,
          url: '/sigem/actividades',
          targetIds: userIds,
        }),
      });
    } catch (error) {
      console.error('Error enviando notificación push:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !dueDate) {
      setError('Por favor completa el título y la fecha.');
      toast.warning('Faltan datos obligatorios'); 
      return;
    }

    try {
      const asignadoA = esJefe ? assignedTo : usuarioActual;
      const tituloActividad = title.trim();
      const nombreAsignador = usuarios.find((u) => u.user_id === usuarioActual)?.nombre || 'Alguien';
      const esAutoAsignada = asignadoA === usuarioActual;

      await crear.mutateAsync({
        title: tituloActividad,
        description,
        due_date: new Date(dueDate).toISOString(),
        assigned_to: asignadoA,
        checklist: checklist,
        status: 'Asignado'
      });

      sendPushNotification(
        esAutoAsignada ? '📋 Actividad auto-asignada' : '📋 Nueva Actividad Asignada',
        esAutoAsignada
          ? `✅ Te asignaste una actividad: "${tituloActividad}".`
          : `✅ ${nombreAsignador} te asignó una actividad: "${tituloActividad}".`,
        [asignadoA]
      );
      
      toast.success('¡Tarea creada correctamente!'); 

      setTitle('');
      setDescription('');
      setDueDate(obtenerFechaPorDefecto());
      setChecklist([]);
      setAssignedTo(usuarioActual);
      setSearchTerm(''); 
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al crear la tarea');
      toast.error(err.message || 'Error al guardar'); 
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="fixed -inset-[100vmax] bg-black/5 dark:bg-black/20 backdrop-blur-md -z-10 pointer-events-none" />
      <div className="bg-white dark:bg-neutral-900 w-full rounded-t-2xl sm:rounded-2xl shadow-2xl sm:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col transition-colors duration-200">
        
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 sticky top-0 z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-500">Nueva Actividad</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Título de la actividad</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Revisar documentación..."
                  className="w-full p-3 sm:p-4 bg-gray-50 dark:bg-neutral-800 border-gray-100 dark:border-neutral-700 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-base text-gray-700 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <Calendar size={14} /> Fecha Límite
                </label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-neutral-800 border-gray-100 dark:border-neutral-700 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-base text-gray-700 dark:text-gray-100 dark:[color-scheme:dark]"
                />
              </div>

              <div className="space-y-2 relative">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <User size={14} /> Asignar a
                </label>
                
                <div className="relative">
                  <input
                    type="text"
                    value={!esJefe ? '(Auto-asignado a mí)' : searchTerm}
                    onChange={handleSearchChange}
                    onFocus={() => esJefe && setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    disabled={!esJefe}
                    placeholder={esJefe ? "Escribe un nombre..." : "(Auto-asignado a mí)"}
                    className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-base transition-colors
                      ${esJefe 
                        ? 'bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-100 placeholder-gray-400' 
                        : 'bg-gray-100 dark:bg-neutral-800/50 border-gray-200 dark:border-neutral-700 text-gray-400 cursor-not-allowed'
                      }`}
                  />

                  {esJefe && showDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => handleSelectUser(usuarioActual, '(A mí mismo)')}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm text-blue-600 dark:text-blue-400 font-medium border-b border-gray-50 dark:border-neutral-700"
                      >
                        Asignarme a mí
                      </button>
                      {filteredUsuarios.length > 0 ? (
                        filteredUsuarios.filter(u => u.user_id !== usuarioActual).map((user) => (
                          <button
                            key={user.user_id}
                            type="button"
                            onClick={() => handleSelectUser(user.user_id, user.nombre)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-200 text-sm transition-colors border-b border-gray-50 dark:border-neutral-700/50 last:border-0"
                          >
                            {user.nombre}
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-center text-gray-400 text-xs italic">No se encontraron empleados</div>
                      )}
                    </div>
                  )}
                </div>
                {esJefe && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 ml-1">
                    {searchTerm.trim() === '' ? '* Vacío = Se te asigna a ti.' : 'Selecciona de la lista.'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <AlignLeft size={14} /> Descripción
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalles adicionales..."
                  rows={3}
                  className="w-full p-3 sm:p-4 bg-gray-50 dark:bg-neutral-800 border-gray-100 dark:border-neutral-700 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-base text-gray-700 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                />
              </div>
            </div>

            <div className="flex flex-col justify-stretch">
              <div className="space-y-3 bg-blue-50/30 dark:bg-blue-900/10 p-3 sm:p-4 rounded-xl border border-blue-100/50 dark:border-blue-800/50 h-full flex flex-col min-h-[260px] lg:min-h-full">
                <label className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  <CheckSquare size={14} /> Lista de pendientes
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={checklistInput}
                    onChange={(e) => setChecklistInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addChecklistItem(e)}
                    placeholder="Escribe aquí..."
                    className="flex-1 p-3 bg-white dark:bg-neutral-900 border border-blue-100 dark:border-blue-900 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none text-base text-gray-700 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                  <button type="button" onClick={() => addChecklistItem()} className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-colors flex items-center justify-center shrink-0">
                    <Plus size={20} />
                  </button>
                </div>
                {checklist.length > 0 ? (
                  <div className="space-y-2 max-h-56 lg:max-h-none overflow-y-auto pr-1 mt-2 custom-scrollbar flex-1">
                    {checklist.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white dark:bg-neutral-900 p-3 rounded-lg border border-gray-100 dark:border-neutral-800 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300 truncate flex-1 mr-2">• {item.title}</span>
                        <button type="button" onClick={() => removeChecklistItem(idx)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-12 italic my-auto">Sin pendientes asignados</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
            <div>
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-900 flex items-center gap-2">
                  <span>⚠️</span> {error}
                </div>
              )}
            </div>
            <div className="pb-2 sm:pb-0">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 sm:py-4 rounded-xl shadow-lg shadow-blue-200 dark:shadow-none active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus size={20} /> Crear Actividad
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}