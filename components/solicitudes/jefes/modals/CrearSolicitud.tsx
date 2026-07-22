'use client'

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Plus, Trash2, Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CrearSolicitudJefeValues, SolicitudJefe } from '../lib/zod';
import { crearSolicitudJefe, editarSolicitudJefe } from '../lib/actions';
import { useJefes } from '../lib/hook';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: SolicitudJefe | null;
}

export default function CrearSolicitud({ isOpen, onClose, onSuccess, editData }: Props) {
  const { data: jefesList } = useJefes();
  const [loading, setLoading] = useState(false);
  const [openJefes, setOpenJefes] = useState(false);

  const [formData, setFormData] = useState<CrearSolicitudJefeValues>({
    titulo: '',
    descripcion: '',
    asignado_a_uid: '',
    fecha_actividad: '',
    subtareas: [{ descripcion: '', completado: false }],
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (editData) {
        const fechaRaw = editData.fecha_solicitud || '';
        const fechaActividad = fechaRaw.includes('T')
          ? fechaRaw.split('T')[0]
          : fechaRaw.includes(' ')
            ? fechaRaw.split(' ')[0]
            : fechaRaw;

        setFormData({
          titulo: editData.ubicacion || '',
          descripcion: editData.comentarios || '',
          asignado_a_uid: editData.asignado_a_uid || '',
          fecha_actividad: fechaActividad,
          subtareas: editData.checklists?.items || [{ descripcion: '', completado: false }],
        });
      } else {
        setFormData({
          titulo: '',
          descripcion: '',
          asignado_a_uid: '',
          fecha_actividad: '',
          subtareas: [{ descripcion: '', completado: false }],
        });
      }
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, editData]);

  const updateField = (field: keyof CrearSolicitudJefeValues, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSubtarea = () => {
    const current = formData.subtareas || [];
    updateField('subtareas', [...current, { descripcion: '', completado: false }]);
  };

  const removeSubtarea = (index: number) => {
    const current = formData.subtareas || [];
    if (current.length <= 1) return;
    updateField('subtareas', current.filter((_, i) => i !== index));
  };

  const updateSubtarea = (index: number, value: string) => {
    const current = [...(formData.subtareas || [])];
    current[index] = { ...current[index], descripcion: value };
    updateField('subtareas', current);
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
          url: '/protected/solicitudes/jefes',
          targetIds: userIds,
        }),
      });
    } catch (error) {
      console.error('Error enviando notificación push:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.titulo.trim()) {
      toast.warning('Debe ingresar el título de la solicitud.');
      return;
    }
    if (!formData.fecha_actividad.trim()) {
      toast.warning('Debe ingresar la fecha de la actividad.');
      return;
    }

    const tareasValidas = (formData.subtareas || []).filter(t => t.descripcion.trim() !== '');
    if (tareasValidas.length === 0) {
      toast.warning('Debe agregar al menos una subtarea.');
      return;
    }

    const dataToSubmit = {
      ...formData,
      subtareas: tareasValidas,
      asignado_a_uid: formData.asignado_a_uid || null, // Convert empty string to null
    };

    setLoading(true);
    try {
      let res;
      if (editData) {
        res = await editarSolicitudJefe(editData.id, dataToSubmit as any);
      } else {
        res = await crearSolicitudJefe(dataToSubmit as any);
      }

      if (res.success) {
        if (!editData && formData.asignado_a_uid) {
          sendPushNotification(
            '📋 Nueva Solicitud',
            `Te han realizado una solicitud: "${formData.titulo}".`,
            [formData.asignado_a_uid]
          );
        }
        toast.success(editData ? 'Solicitud actualizada correctamente' : 'Solicitud registrada correctamente');
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || `No se pudo ${editData ? 'actualizar' : 'crear'} la solicitud`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-neutral-900 w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-3xl flex flex-col sm:rounded-3xl shadow-2xl border-0 sm:border border-gray-100 dark:border-neutral-800 overflow-hidden">
        
        {/* Header Institucional */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-2 sm:py-3 border-b-2 border-blue-600">
          <div className="flex items-center gap-4">
            <img
              src="/images/logo-muni.png"
              alt="Logo"
              className="h-14 sm:h-20 object-contain"
            />
            <div>
              <p className="text-[12px] sm:text-[14px] font-black text-neutral-600 dark:text-neutral-400 tracking-widest uppercase leading-tight">
                Municipalidad de Concepción Las Minas
              </p>
              <p className="text-[10px] sm:text-[12px] font-bold text-neutral-500/80 tracking-wide mt-0.5">Chiquimula, Guatemala</p>
            </div>
          </div>
          <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-100 dark:bg-neutral-800 rounded-xl transition-colors ml-2 active:scale-95"
          >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Título de Formulario */}
        <div className="px-6 pt-4 pb-0 sm:px-8 sm:pt-5 sm:pb-0 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                {editData ? 'Editar Solicitud Jefe' : 'Nueva Solicitud Jefe'}
            </h2>
            <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest">
                {editData ? 'Actualice los datos de la solicitud' : 'Complete los detalles de la solicitud'}
            </p>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-2 sm:px-8 custom-scrollbar pb-24 sm:pb-2">
          <div className="space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-widest ml-1">
                        Título de la Solicitud <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.titulo}
                        onChange={(e) => updateField('titulo', e.target.value)}
                        placeholder="Ej: Apoyo logístico para evento..."
                        className="w-full bg-gray-50 dark:bg-neutral-800/50 border border-gray-200 dark:border-neutral-700 rounded-2xl p-3 text-base focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white outline-none"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-widest ml-1">
                        Fecha de la Actividad <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="date"
                        value={formData.fecha_actividad}
                        onChange={(e) => updateField('fecha_actividad', e.target.value)}
                        className="w-full bg-gray-50 dark:bg-neutral-800/50 border border-gray-200 dark:border-neutral-700 rounded-2xl p-3 text-base focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white outline-none"
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-widest ml-1">
                    Descripción / Comentarios
                </label>
                <textarea
                    value={formData.descripcion}
                    onChange={(e) => updateField('descripcion', e.target.value)}
                    placeholder="Detalles adicionales sobre la solicitud..."
                    className="w-full bg-gray-50 dark:bg-neutral-800/50 border border-gray-200 dark:border-neutral-700 rounded-2xl p-3 text-base focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white outline-none min-h-[100px] resize-y"
                />
            </div>

            <div className="space-y-1.5 flex flex-col">
                <label className="block text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-widest ml-1">
                    Asignar a otra persona (Opcional)
                </label>
                <Popover open={openJefes} onOpenChange={setOpenJefes}>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            className="w-full bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-neutral-800 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all dark:text-gray-200 outline-none flex justify-between items-center text-left"
                        >
                            {formData.asignado_a_uid
                                ? (jefesList || []).find((j: any) => j.jefeId === formData.asignado_a_uid)?.jefeNombre
                                : <span className="text-gray-500">Seleccionar empleado...</span>}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent 
                        className="z-[110] p-0 border border-gray-200 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] shadow-2xl rounded-xl overflow-hidden" 
                        align="center"
                        side="top"
                        avoidCollisions={false}
                        style={{ width: 'var(--radix-popover-trigger-width)' }}
                    >
                        <Command className="bg-transparent">
                            <CommandInput placeholder="Buscar nombre..." className="h-12 text-sm dark:text-white border-b border-gray-100 dark:border-neutral-800" />
                            <CommandList className="custom-scrollbar max-h-[250px]">
                                <CommandEmpty className="text-gray-500 py-4 text-center text-sm">No se encontraron resultados.</CommandEmpty>
                                <CommandGroup className="p-1.5">
                                    <CommandItem
                                        value="sin-asignar"
                                        onSelect={() => {
                                            updateField('asignado_a_uid', '');
                                            setOpenJefes(false);
                                        }}
                                        className="cursor-pointer text-sm py-2.5 px-4 dark:text-gray-300 data-[selected=true]:bg-blue-50 dark:data-[selected=true]:bg-blue-900/30 data-[selected=true]:text-blue-600 dark:data-[selected=true]:text-blue-400 transition-colors"
                                    >
                                        -- Sin asignar --
                                    </CommandItem>
                                    {(jefesList || []).map((j: any) => (
                                        <CommandItem
                                            key={j.jefeId}
                                            value={j.jefeNombre}
                                            onSelect={() => {
                                                updateField('asignado_a_uid', j.jefeId);
                                                setOpenJefes(false);
                                            }}
                                            className="cursor-pointer text-sm py-2.5 px-4 dark:text-gray-300 data-[selected=true]:bg-blue-50 dark:data-[selected=true]:bg-blue-900/30 data-[selected=true]:text-blue-600 dark:data-[selected=true]:text-blue-400 transition-colors flex justify-between items-center"
                                        >
                                            {j.jefeNombre}
                                            {formData.asignado_a_uid === j.jefeId && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                            )}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            <div className="space-y-2 mt-4">
                <div className="ml-1">
                    <label className="block text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-widest">
                        Subtareas <span className="text-red-500">*</span>
                    </label>
                </div>

                <div className="space-y-2">
                    {(formData.subtareas || []).map((item, index) => {
                        const items = formData.subtareas || [];
                        const isLast = index === items.length - 1;
                        return (
                            <div key={index} className="flex items-center gap-2">
                                <div className="flex-1 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                                        {index + 1}
                                    </div>
                                    <input
                                        type="text"
                                        value={item.descripcion}
                                        onChange={(e) => updateSubtarea(index, e.target.value)}
                                        placeholder="Descripción de la tarea..."
                                        className="flex-1 bg-gray-50 dark:bg-neutral-800/50 border border-gray-200 dark:border-neutral-700 rounded-2xl px-3 py-3 text-base dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                    />
                                </div>
                                {isLast ? (
                                    <button
                                        type="button"
                                        onClick={addSubtarea}
                                        className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl shadow-sm shadow-blue-500/30 transition-all duration-150 shrink-0"
                                    >
                                        <Plus size={18} strokeWidth={2.5} />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => removeSubtarea(index)}
                                        className="w-10 h-10 flex items-center justify-center text-gray-300 dark:text-neutral-600 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

          </div>
        </div>

        {/* Cintillo de Colores Institucional */}
        <div className="flex h-1.5 sm:h-2 w-full mt-4 mb-2">
          <div className="flex-1 bg-blue-900" />
          <div className="flex-1 bg-blue-600" />
          <div className="flex-1 bg-blue-400" />
          <div className="flex-1 bg-blue-200" />
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-lg flex justify-center items-center sticky bottom-0 sm:static">
            <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-12 sm:px-16 py-3 text-base font-bold bg-slate-900 dark:bg-blue-600 text-white rounded-xl transition-all shadow-xl shadow-blue-500/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    editData ? 'Actualizar' : 'Crear'
                )}
            </button>
        </div>

      </div>
    </div>
  );
}
