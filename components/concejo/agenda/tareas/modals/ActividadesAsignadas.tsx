'use client';

import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import {
  X,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  User,
  AlignLeft,
  CheckSquare,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { ActividadConcejo, Tarea, UsuarioAsignable } from '../../lib/esquemas';
import {
  obtenerActividadesDePunto,
  obtenerUsuariosAsignables,
  crearActividadConcejo,
  editarActividadConcejo,
  eliminarActividadConcejo,
} from '../lib/actividades';

interface ActividadesAsignadasProps {
  isOpen: boolean;
  onClose: (hasChanged: boolean) => void;
  tarea: Tarea;
  puedeEditar: boolean;
}

interface ChecklistItem {
  title: string;
  is_completed: boolean;
}

type Vista = 'lista' | 'formulario' | 'detalle';

const fechaPorDefecto = () => {
  const d = new Date();
  d.setHours(16, 0, 0, 0);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T16:00`;
};

const formatearFechaInput = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatearFechaActividad = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  let hora = d.getHours();
  const minutos = String(d.getMinutes()).padStart(2, '0');
  const period = hora >= 12 ? 'PM' : 'AM';
  hora = hora % 12;
  hora = hora ? hora : 12;
  const horaStr = String(hora).padStart(2, '0');
  return `${day}/${month}/${year} a las ${horaStr}:${minutos} ${period}`;
};

const formatearConfirmacion = (iso: string) => `Confirmada el: ${formatearFechaActividad(iso)}`;

const estadoBadge = (actividad: ActividadConcejo) => {
  if (actividad.status === 'Completado') {
    return { label: 'Completado', clase: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
  }
  if (!actividad.confirmed_at) {
    return { label: 'Sin confirmar', clase: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
  }
  const vencida = new Date(actividad.due_date) < new Date();
  if (vencida) {
    return { label: 'Vencida', clase: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' };
  }
  return { label: 'Asignada', clase: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
};

export default function ActividadesAsignadas({ isOpen, onClose, tarea, puedeEditar }: ActividadesAsignadasProps) {
  const [actividades, setActividades] = useState<ActividadConcejo[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioAsignable[]>([]);
  const [cargando, setCargando] = useState(true);
  const [hasChanged, setHasChanged] = useState(false);
  const [vista, setVista] = useState<Vista>('lista');
  const [guardando, setGuardando] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(fechaPorDefecto);
  const [assignedTo, setAssignedTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [checklistInput, setChecklistInput] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [actividadDetalle, setActividadDetalle] = useState<ActividadConcejo | null>(null);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [acts, users] = await Promise.all([
        obtenerActividadesDePunto(tarea.id),
        obtenerUsuariosAsignables(),
      ]);
      setActividades(acts);
      setUsuarios(users);
    } catch (e) {
      console.error('Error cargando actividades:', e);
      toast.error('No se pudieron cargar las actividades.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      cargarDatos();
      setVista('lista');
      setActividadDetalle(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tarea.id]);

  const usuariosFiltrados = useMemo(
    () => usuarios.filter((u) => u.nombre.toLowerCase().includes(searchTerm.toLowerCase())),
    [usuarios, searchTerm],
  );

  const limpiarFormulario = () => {
    setEditandoId(null);
    setTitle('');
    setDescription('');
    setDueDate(fechaPorDefecto());
    setAssignedTo('');
    setSearchTerm('');
    setShowDropdown(false);
    setChecklistInput('');
    setChecklist([]);
  };

  const abrirNueva = () => {
    limpiarFormulario();
    setActividadDetalle(null);
    setVista('formulario');
  };

  const abrirDetalle = (actividad: ActividadConcejo) => {
    setActividadDetalle(actividad);
    setVista('detalle');
  };

  const abrirEdicion = (actividad: ActividadConcejo) => {
    setActividadDetalle(null);
    setEditandoId(actividad.id);
    setTitle(actividad.title);
    setDescription(actividad.description || '');
    setDueDate(formatearFechaInput(actividad.due_date));
    setAssignedTo(actividad.assigned_to || '');
    setSearchTerm(actividad.assignee_nombre || '');
    setShowDropdown(false);
    setChecklistInput('');
    setChecklist([]);
    setVista('formulario');
  };

  const seleccionarUsuario = (userId: string, nombre: string) => {
    setAssignedTo(userId);
    setSearchTerm(nombre);
    setShowDropdown(false);
  };

  const agregarChecklist = () => {
    if (!checklistInput.trim()) return;
    setChecklist([...checklist, { title: checklistInput.trim(), is_completed: false }]);
    setChecklistInput('');
  };

  const quitarChecklist = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  const enviarPush = async (titulo: string, mensaje: string, userId: string) => {
    try {
      await fetch('/api/push/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titulo,
          message: mensaje,
          url: '/sigem/actividades',
          targetIds: [userId],
        }),
      });
    } catch (e) {
      console.error('Error enviando push de actividad:', e);
    }
  };

  const guardar = async () => {
    if (!title.trim() || !dueDate) {
      toast.warn('Completa el título y la fecha de la actividad.');
      return;
    }
    if (!assignedTo) {
      toast.warn('Selecciona a quién se le asigna la actividad.');
      return;
    }

    setGuardando(true);
    try {
      const dueIso = new Date(dueDate).toISOString();

      if (editandoId) {
        await editarActividadConcejo(editandoId, {
          title: title.trim(),
          description,
          due_date: dueIso,
          assigned_to: assignedTo,
        });
        toast.success('Actividad actualizada.');
      } else {
        await crearActividadConcejo({
          tareaConcejoId: tarea.id,
          title: title.trim(),
          description,
          due_date: dueIso,
          assigned_to: assignedTo,
          checklist,
        });
        const nombreAsignado = usuarios.find((u) => u.user_id === assignedTo)?.nombre || 'el usuario';
        enviarPush(
          '📋 Nueva Actividad Asignada',
          `Se te asignó una actividad del Concejo: "${title.trim()}".`,
          assignedTo,
        );
        toast.success(`Actividad asignada a ${nombreAsignado}.`);
      }

      setHasChanged(true);
      await cargarDatos();
      limpiarFormulario();
      setVista('lista');
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'Error al guardar la actividad.';
      toast.error(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (actividad: ActividadConcejo) => {
    const { isConfirmed } = await Swal.fire({
      title: '¿Eliminar actividad?',
      text: `Se eliminará "${actividad.title}". Esta acción no se puede revertir.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (!isConfirmed) return;

    try {
      await eliminarActividadConcejo(actividad.id);
      setHasChanged(true);
      await cargarDatos();
      toast.success('Actividad eliminada.');
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'Error al eliminar la actividad.';
      toast.error(mensaje);
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={() => onClose(hasChanged)} className="relative z-50">
        <TransitionChild as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/10 backdrop-blur-sm dark:bg-black/60" />
        </TransitionChild>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
            <DialogPanel className="bg-white dark:bg-neutral-900 rounded-lg w-full max-w-2xl shadow-xl transition-colors border border-transparent dark:border-neutral-800 flex flex-col max-h-[90vh]">

              <div className="flex justify-between items-start p-6 pb-4 border-b border-gray-100 dark:border-neutral-800">
                <div className="pr-4">
                  <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Actividades asignadas
                  </DialogTitle>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{tarea.titulo_item}</p>
                </div>
                <button
                  onClick={() => onClose(hasChanged)}
                  className="p-2 -mr-2 -mt-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                {cargando ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                  </div>
                ) : vista === 'lista' ? (
                  <div className="space-y-4">
                    {puedeEditar && (
                      <button
                        onClick={abrirNueva}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
                      >
                        <Plus size={18} /> Nueva actividad
                      </button>
                    )}

                    {actividades.length === 0 ? (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                        No hay actividades asignadas para este punto.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {actividades.map((actividad, index) => {
                          const badge = estadoBadge(actividad);
                          return (
                            <li
                              key={actividad.id}
                              className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/40 p-3"
                            >
                              <div className="flex items-start gap-3">
                                <span className="shrink-0 mt-0.5 w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 text-xs font-bold text-gray-500 dark:text-gray-400">
                                  {index + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 min-w-0">{actividad.title}</p>
                                    <span className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.clase}`}>
                                      {actividad.confirmed_at || actividad.status === 'Completado' ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                                      {badge.label}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center gap-1">
                                      <User size={12} /> {actividad.assignee_nombre}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Calendar size={12} /> {formatearFechaActividad(actividad.due_date)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-end gap-1 mt-2">
                                    <button
                                      onClick={() => abrirDetalle(actividad)}
                                      title="Ver estado"
                                      className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                                    >
                                      <Eye size={15} />
                                    </button>
                                    {puedeEditar && (
                                      <>
                                        <button
                                          onClick={() => abrirEdicion(actividad)}
                                          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                        >
                                          <Pencil size={15} />
                                        </button>
                                        <button
                                          onClick={() => eliminar(actividad)}
                                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                          <Trash2 size={15} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                  {actividad.confirmed_at && (
                                    <p className="mt-2 pt-2 border-t border-gray-200 dark:border-neutral-700 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                      <CheckCircle2 size={12} />
                                      {formatearConfirmacion(actividad.confirmed_at)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : vista === 'detalle' && actividadDetalle ? (
                  <div className="space-y-4">
                    <button
                      onClick={() => { setActividadDetalle(null); setVista('lista'); }}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      <ArrowLeft size={16} /> Volver a la lista
                    </button>

                    <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/40 p-4 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{actividadDetalle.title}</h3>
                        <span className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${estadoBadge(actividadDetalle).clase}`}>
                          {actividadDetalle.confirmed_at || actividadDetalle.status === 'Completado' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                          {estadoBadge(actividadDetalle).label}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                        <p className="flex items-center gap-2">
                          <User size={14} className="text-gray-400 shrink-0" />
                          <span><span className="text-gray-400">Asignado a:</span> {actividadDetalle.assignee_nombre}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400 shrink-0" />
                          <span><span className="text-gray-400">Fecha límite:</span> {formatearFechaActividad(actividadDetalle.due_date)}</span>
                        </p>
                        {actividadDetalle.description && (
                          <p className="flex items-start gap-2">
                            <AlignLeft size={14} className="text-gray-400 shrink-0 mt-0.5" />
                            <span className="whitespace-pre-wrap">{actividadDetalle.description}</span>
                          </p>
                        )}
                      </div>

                      {actividadDetalle.checklist && actividadDetalle.checklist.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <CheckSquare size={14} /> Pendientes
                          </p>
                          <ul className="space-y-1.5">
                            {actividadDetalle.checklist.map((item, i) => (
                              <li key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                {item.is_completed ? (
                                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                ) : (
                                  <Clock size={14} className="text-gray-400 shrink-0" />
                                )}
                                <span className={item.is_completed ? 'line-through text-gray-400' : ''}>{item.title}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {actividadDetalle.confirmed_at ? (
                        <p className="pt-3 border-t border-gray-200 dark:border-neutral-700 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 size={14} />
                          {formatearConfirmacion(actividadDetalle.confirmed_at)}
                        </p>
                      ) : (
                        <p className="pt-3 border-t border-gray-200 dark:border-neutral-700 text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <Clock size={14} />
                          Pendiente de confirmación por el asignado
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button
                      onClick={() => { limpiarFormulario(); setVista('lista'); }}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      <ArrowLeft size={16} /> Volver a la lista
                    </button>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Título de la actividad</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-3 bg-gray-50 dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-base text-gray-700 dark:text-gray-100"
                        autoFocus
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <Calendar size={14} /> Fecha límite
                      </label>
                      <input
                        type="datetime-local"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full p-3 bg-gray-50 dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-base text-gray-700 dark:text-gray-100 dark:[color-scheme:dark]"
                      />
                    </div>

                    <div className="space-y-2 relative">
                      <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <User size={14} /> Asignar a
                      </label>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); if (!e.target.value.trim()) setAssignedTo(''); }}
                        onFocus={() => setShowDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                        placeholder="Escribe un nombre..."
                        className="w-full p-3 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-base text-gray-700 dark:text-gray-100"
                      />
                      {showDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                          {usuariosFiltrados.length > 0 ? (
                            usuariosFiltrados.map((u) => (
                              <button
                                key={u.user_id}
                                type="button"
                                onClick={() => seleccionarUsuario(u.user_id, u.nombre)}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-200 text-sm transition-colors border-b border-gray-50 dark:border-neutral-700/50 last:border-0"
                              >
                                {u.nombre}
                              </button>
                            ))
                          ) : (
                            <div className="p-3 text-center text-gray-400 text-xs italic">No se encontraron usuarios</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <AlignLeft size={14} /> Descripción
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full p-3 bg-gray-50 dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-base text-gray-700 dark:text-gray-100 resize-none"
                      />
                    </div>

                    {!editandoId && (
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          <CheckSquare size={14} /> Lista de pendientes
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={checklistInput}
                            onChange={(e) => setChecklistInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarChecklist(); } }}
                            className="flex-1 p-3 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-base text-gray-700 dark:text-gray-100"
                          />
                          <button type="button" onClick={agregarChecklist} className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-colors shrink-0">
                            <Plus size={20} />
                          </button>
                        </div>
                        {checklist.length > 0 && (
                          <div className="space-y-2 mt-2">
                            {checklist.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-neutral-800 p-2.5 rounded-lg border border-gray-100 dark:border-neutral-700">
                                <span className="text-sm text-gray-600 dark:text-gray-300 truncate flex-1 mr-2">• {item.title}</span>
                                <button type="button" onClick={() => quitarChecklist(idx)} className="text-red-400 hover:text-red-600 p-1">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      type="button"
                      onClick={guardar}
                      disabled={guardando}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl"
                    >
                      {guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Asignar actividad'}
                    </Button>
                  </div>
                )}
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
