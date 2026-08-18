'use client';

import React, { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
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
import GestorArchivos from '@/components/tareas/GestorArchivos';
import type { ArchivoAdjunto } from '@/components/tareas/types';
import VisorPDFInline from '@/components/files/VisorPDFInline';

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

type Vista = 'lista' | 'formulario';

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

const progresoChecklist = (checklist: ActividadConcejo['checklist']) => {
  const items = checklist || [];
  const total = items.length;
  const completados = items.filter((item) => item.is_completed).length;
  const porcentaje = total === 0 ? 0 : Math.round((completados / total) * 100);
  return { items, total, completados, porcentaje };
};

function DetalleActividadPanel({
  actividad,
  indice,
  acciones,
  onVerPdf,
}: {
  actividad: ActividadConcejo;
  indice?: number;
  acciones?: ReactNode;
  onVerPdf?: (archivo: ArchivoAdjunto) => void;
}) {
  const { items: checklist, total, completados, porcentaje } = progresoChecklist(actividad.checklist);
  const badge = estadoBadge(actividad);

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {indice !== undefined && (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                {indice}
              </span>
            )}
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{actividad.title}</h3>
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.clase}`}>
              {actividad.confirmed_at || actividad.status === 'Completado' ? <CheckCircle2 size={11} /> : <Clock size={11} />}
              {badge.label}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <User size={12} /> {actividad.assignee_nombre}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={12} /> {formatearFechaActividad(actividad.due_date)}
            </span>
          </div>
        </div>
        {acciones ? <div className="flex shrink-0 items-center gap-1">{acciones}</div> : null}
      </div>

      <div className="space-y-4 p-4">
        {actividad.description && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Descripción</p>
            <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{actividad.description}</p>
          </div>
        )}

        {total > 0 && (
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-2">
              <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <CheckSquare size={14} /> Lista de pendientes
              </p>
              <span className={`text-xs font-bold ${porcentaje === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-300'}`}>
                {completados}/{total} · {porcentaje}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className={`h-full rounded-full transition-all duration-500 ${porcentaje === 100 ? 'bg-emerald-500' : 'bg-[#0066cc] dark:bg-blue-400'}`}
                style={{ width: `${porcentaje}%` }}
              />
            </div>
            <ul className="space-y-1.5">
              {checklist.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  {item.is_completed ? (
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                  ) : (
                    <Clock size={14} className="shrink-0 text-zinc-400" />
                  )}
                  <span className={item.is_completed ? 'text-zinc-400 line-through' : ''}>{item.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {actividad.confirmed_at ? (
          <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={14} />
            {formatearConfirmacion(actividad.confirmed_at)}
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
            <Clock size={14} />
            Pendiente de confirmación por el asignado
          </p>
        )}

        <GestorArchivos
          tareaId={actividad.id}
          archivosIniciales={actividad.archivos ?? null}
          esLectura
          onVerPdf={onVerPdf}
        />
      </div>
    </article>
  );
}

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
  const [pdfViendo, setPdfViendo] = useState<ArchivoAdjunto | null>(null);

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
      setPdfViendo(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tarea.id]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

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
    setVista('formulario');
  };

  const abrirEdicion = (actividad: ActividadConcejo) => {
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
      <Dialog onClose={() => onClose(hasChanged)} className="relative z-[200]">
        <TransitionChild as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-zinc-100 dark:bg-zinc-900" />
        </TransitionChild>
        <div className="fixed inset-0 flex flex-col">
          <TransitionChild as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 translate-y-2" enterTo="opacity-100 translate-y-0" leave="ease-in duration-200" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-2">
            <DialogPanel className="flex h-[100dvh] w-full flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-800">

              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] dark:border-zinc-700 sm:px-6">
                <div className="min-w-0 pr-2">
                  <DialogTitle className="text-xl font-bold tracking-tight text-[#0066cc] dark:text-blue-400">
                    Actividades asignadas
                  </DialogTitle>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground line-clamp-2">
                    {tarea.titulo_item}
                  </p>
                </div>
                <button
                  onClick={() => onClose(hasChanged)}
                  className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-white"
                  aria-label="Cerrar"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 custom-scrollbar sm:px-6">
                {cargando ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                  </div>
                ) : pdfViendo?.ruta_storage ? (
                  <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
                    <VisorPDFInline
                      bucketName="archivos_actividades"
                      filePath={pdfViendo.ruta_storage}
                      fileName={pdfViendo.nombre}
                      onBack={() => setPdfViendo(null)}
                      expandido
                      className="min-h-[min(75dvh,720px)] flex-1"
                    />
                  </div>
                ) : vista === 'lista' ? (
                  <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
                    {puedeEditar && (
                      <button
                        onClick={abrirNueva}
                        className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-zinc-200 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
                      >
                        <Plus size={18} /> Nueva actividad
                      </button>
                    )}

                    {actividades.length === 0 ? (
                      <p className="py-12 text-center text-muted-foreground">
                        No hay actividades asignadas para este punto.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-4">
                        {actividades.map((actividad, index) => (
                          <li key={actividad.id}>
                            <DetalleActividadPanel
                              actividad={actividad}
                              indice={index + 1}
                              onVerPdf={setPdfViendo}
                              acciones={
                                puedeEditar ? (
                                  <>
                                    <button
                                      onClick={() => abrirEdicion(actividad)}
                                      className="cursor-pointer rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-[#0066cc] dark:hover:bg-zinc-800 dark:hover:text-blue-400"
                                      title="Editar"
                                    >
                                      <Pencil size={16} />
                                    </button>
                                    <button
                                      onClick={() => eliminar(actividad)}
                                      className="cursor-pointer rounded-lg p-2 text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                                      title="Eliminar"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                ) : undefined
                              }
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <div className="mx-auto w-full max-w-3xl space-y-4">
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
                      className="h-12 w-full cursor-pointer rounded-xl bg-zinc-200 text-sm font-semibold text-zinc-900 hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
                    >
                      {guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Asignar actividad'}
                    </Button>
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-zinc-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-zinc-700 sm:px-6">
                <p className="text-center text-xs text-muted-foreground">
                  {actividades.length} actividad{actividades.length === 1 ? '' : 'es'} en este punto
                </p>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
