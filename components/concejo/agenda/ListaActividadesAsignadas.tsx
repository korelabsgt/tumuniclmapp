'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { obtenerTodasActividadesConcejo } from './tareas/lib/actividades';
import { ActividadConcejoConContexto } from './lib/esquemas';
import type { ArchivoAdjunto } from '@/components/tareas/types';
import ArchivosActividadModal from './modals/ArchivosActividadModal';
import EditarActividadModal from './modals/EditarActividadModal';
import ActividadesAsignadas from './tareas/modals/ActividadesAsignadas';
import type { Tarea } from './lib/esquemas';
import { Button } from '@/components/ui/button';
import { User, Calendar, CheckCircle2, Clock, ChevronDown, Paperclip, ArrowRight, Pencil, AlertTriangle, Hourglass, Eye, FileBarChart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CargandoAnimacion from '@/components/ui/animations/Cargando';
import useUserData from '@/hooks/sesion/useUserData';
import ReporteActividadesAsignadas from './ReporteActividadesAsignadas';

const ACTIVIDADES_QUERY_KEY = ['actividades-concejo-todas', 'v3'] as const;

const formatearFechaHorario = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const diaSemana = dias[d.getDay()];
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  let hora = d.getHours();
  const minutos = String(d.getMinutes()).padStart(2, '0');
  const period = hora >= 12 ? 'PM' : 'AM';
  hora = hora % 12;
  hora = hora ? hora : 12;
  const horaStr = String(hora).padStart(2, '0');
  return `${diaSemana} ${day}/${month}/${year}, ${horaStr}:${minutos} ${period}`;
};

const formatRetraso = (dueDateStr: string, completedAtStr?: string | null) => {
  const due = new Date(dueDateStr);
  const end = completedAtStr ? new Date(completedAtStr) : new Date();
  const diffMs = end.getTime() - due.getTime();
  if (diffMs <= 0) return null;

  const diffMins = Math.floor(diffMs / 60000);
  const days = Math.floor(diffMins / 1440);
  const hours = Math.floor((diffMins % 1440) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days} día${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hr${hours !== 1 ? 's' : ''}`);

  if (parts.length === 0) return 'Menos de 1 hr';
  return `Atrasada por ${parts.join(', ')}`;
};

const formatTiempoRestante = (dueDateStr: string) => {
  const due = new Date(dueDateStr);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  if (diffMs <= 0) return null;

  const diffMins = Math.floor(diffMs / 60000);
  const days = Math.floor(diffMins / 1440);
  const hours = Math.floor((diffMins % 1440) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days} día${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hr${hours !== 1 ? 's' : ''}`);

  if (parts.length === 0) return 'Menos de 1 hr';
  return `Faltan ${parts.join(', ')}`;
};

const lineasFechaActividad = (actividad: ActividadConcejoConContexto) => {
  const lineas: { label: string; fecha: string }[] = [];

  if (actividad.confirmed_at) {
    lineas.push({
      label: 'Confirmada',
      fecha: formatearFechaHorario(actividad.confirmed_at),
    });
  }
  if (actividad.due_date) {
    lineas.push({ label: 'Fecha límite', fecha: formatearFechaHorario(actividad.due_date) });
  }
  if (actividad.status === 'Completado' && actividad.updated_at) {
    lineas.push({
      label: 'Completada',
      fecha: formatearFechaHorario(actividad.updated_at),
    });
  }

  return lineas;
};

const estadoAgendaClase = (estado: string) => {
  if (estado === 'En progreso') {
    return 'text-green-600 dark:text-green-400';
  }
  if (estado === 'Finalizada') {
    return 'text-gray-500 dark:text-gray-400';
  }
  return 'text-blue-600 dark:text-blue-400';
};

type GrupoActividades = {
  agendaId: string;
  agendaTitulo: string;
  agendaFecha: string;
  agendaEstado: string;
  agendaDescripcion: string;
  items: ActividadConcejoConContexto[];
};

const estadoBadge = (actividad: ActividadConcejoConContexto) => {
  if (actividad.status === 'Completado') {
    return { label: 'Completado', clase: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' };
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

type ResumenEstadosGrupo = {
  sinTerminar: number;
  completadas: number;
  pendientesRevision: number;
  revisadas: number;
};

const contarEstadosGrupo = (items: ActividadConcejoConContexto[]): ResumenEstadosGrupo => {
  const resumen = { sinTerminar: 0, completadas: 0, pendientesRevision: 0, revisadas: 0 };

  items.forEach((actividad) => {
    if (actividad.status === 'Completado') {
      resumen.completadas += 1;
      if (actividad.revisado_por) {
        resumen.revisadas += 1;
      } else {
        resumen.pendientesRevision += 1;
      }
      return;
    }
    resumen.sinTerminar += 1;
  });

  return resumen;
};

const BORDE_TABLA = 'border-slate-300 dark:border-neutral-700';

const nombresParticipantes = (actividad: ActividadConcejoConContexto) =>
  (actividad.miembros ?? []).map((m) => m.nombre_usuario).filter(Boolean);

const fragmentarMenciones = (texto: string, nombres: string[]) => {
  if (!nombres.length) return [texto];
  const ordenados = [...nombres].sort((a, b) => b.length - a.length);
  const escaped = ordenados.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`@(${escaped.join('|')})`, 'g');
  const nodos: React.ReactNode[] = [];
  let ultimo = 0;
  for (const coincidencia of texto.matchAll(re)) {
    const indice = coincidencia.index ?? 0;
    if (indice > ultimo) nodos.push(texto.slice(ultimo, indice));
    nodos.push(
      <span key={indice} className="font-bold text-[#0066cc] dark:text-blue-400">
        {coincidencia[1]}
      </span>,
    );
    ultimo = indice + coincidencia[0].length;
  }
  if (ultimo < texto.length) nodos.push(texto.slice(ultimo));
  return nodos.length ? nodos : [texto];
};

type ListaActividadesAsignadasProps = {
  filtroAnio: string;
  filtroMes: string | null;
};

type FiltroActividadesLista = 'todas' | 'sin_completar' | 'pendiente_revision' | 'reporte';

export default function ListaActividadesAsignadas({
  filtroAnio,
  filtroMes,
}: ListaActividadesAsignadasProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { rol } = useUserData();
  const puedeEditar = ['SUPER', 'SECRETARIO', 'SEC-TECNICO'].includes(rol || '');
  const { data, isLoading } = useQuery({
    queryKey: ACTIVIDADES_QUERY_KEY,
    queryFn: obtenerTodasActividadesConcejo,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const [gruposAbiertos, setGruposAbiertos] = useState<Record<string, boolean>>({});
  const [actividadArchivos, setActividadArchivos] = useState<ActividadConcejoConContexto | null>(null);
  const [actividadEditando, setActividadEditando] = useState<ActividadConcejoConContexto | null>(null);
  const [tareaActividades, setTareaActividades] = useState<Tarea | null>(null);
  const [filtroLista, setFiltroLista] = useState<FiltroActividadesLista>('todas');

  const abrirActividadesPunto = (actividad: ActividadConcejoConContexto) => {
    setTareaActividades({
      id: actividad.punto_id,
      titulo_item: actividad.punto_titulo,
      estado: '',
      votacion: null,
      notas: null,
      seguimiento: null,
    });
  };

  const cerrarActividadesPunto = (hasChanged: boolean) => {
    setTareaActividades(null);
    if (hasChanged) {
      void queryClient.invalidateQueries({ queryKey: ACTIVIDADES_QUERY_KEY });
    }
  };

  useEffect(() => {
    setGruposAbiertos({});
  }, [filtroAnio, filtroMes]);

  const enPeriodo = (actividad: ActividadConcejoConContexto) => {
    if (!actividad.agenda_fecha) return false;
    const agendaDate = new Date(actividad.agenda_fecha);
    const agendaYear = agendaDate.getFullYear().toString();
    const agendaMonth = agendaDate.getMonth().toString();
    const cumpleAnio = filtroAnio === '' || agendaYear === filtroAnio;
    const cumpleMes = filtroMes === null || agendaMonth === filtroMes;
    return cumpleAnio && cumpleMes;
  };

  const actividadesPeriodo = useMemo(() => {
    const unicas = new Map<string, ActividadConcejoConContexto>();
    (data ?? []).forEach((actividad) => {
      if (!enPeriodo(actividad) || unicas.has(actividad.id)) return;
      unicas.set(actividad.id, actividad);
    });
    return Array.from(unicas.values());
  }, [data, filtroAnio, filtroMes]);

  const actividadesReporte = useMemo(() => {
    const unicas = new Map<string, ActividadConcejoConContexto>();
    (data ?? []).forEach((actividad) => {
      if (!actividad.agenda_fecha || unicas.has(actividad.id)) return;
      unicas.set(actividad.id, actividad);
    });
    return Array.from(unicas.values());
  }, [data]);

  const actividades = useMemo(() => {
    if (filtroLista === 'reporte') return actividadesPeriodo;
    return (data ?? []).filter((actividad) => {
      if (!enPeriodo(actividad)) return false;
      if (filtroLista === 'sin_completar') return actividad.status !== 'Completado';
      if (filtroLista === 'pendiente_revision') {
        return actividad.status === 'Completado' && !actividad.revisado_por;
      }
      return true;
    });
  }, [data, filtroAnio, filtroMes, filtroLista, actividadesPeriodo]);

  const archivosPorActividad = useMemo(() => {
    const map = new Map<string, ArchivoAdjunto[]>();
    actividades.forEach((actividad) => {
      map.set(actividad.id, actividad.archivos ?? []);
    });
    return map;
  }, [actividades]);

  const grupos = useMemo(() => {
    const map = new Map<string, GrupoActividades>();
    actividades.forEach((a) => {
      const key = a.agenda_id || 'sin-sesion';
      if (!map.has(key)) {
        map.set(key, {
          agendaId: a.agenda_id,
          agendaTitulo: a.agenda_titulo,
          agendaFecha: a.agenda_fecha,
          agendaEstado: a.agenda_estado,
          agendaDescripcion: a.agenda_descripcion,
          items: [],
        });
      }
      map.get(key)!.items.push(a);
    });
    return Array.from(map.values());
  }, [actividades]);

  const getGrupoKey = (grupo: GrupoActividades) => grupo.agendaId || 'sin-sesion';

  const toggleGrupo = (key: string) => {
    setGruposAbiertos((actual) => ({ ...actual, [key]: !actual[key] }));
  };

  const cerrarArchivos = () => setActividadArchivos(null);

  if (isLoading) {
    return <CargandoAnimacion texto="Cargando actividades..." />;
  }

  const sinActividades = (data ?? []).length === 0;

  const archivosModal = actividadArchivos
    ? archivosPorActividad.get(actividadArchivos.id) ?? []
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          className={`inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border p-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${BORDE_TABLA} bg-zinc-50 dark:bg-neutral-900/50`}
          role="tablist"
          aria-label="Filtrar actividades"
        >
          {(
            [
              { id: 'todas', label: 'Todas' },
              { id: 'sin_completar', label: 'Sin completar' },
              { id: 'pendiente_revision', label: 'Pendientes de revisión' },
            ] as const
          ).map((opcion) => {
            const activa = filtroLista === opcion.id;
            return (
              <button
                key={opcion.id}
                type="button"
                role="tab"
                aria-selected={activa}
                onClick={() => setFiltroLista(opcion.id)}
                className={`cursor-pointer rounded-md px-2 py-1 text-[11px] font-semibold leading-tight whitespace-nowrap transition-colors sm:px-2.5 sm:text-xs ${
                  activa
                    ? 'bg-white text-[#0066cc] shadow-sm dark:bg-zinc-800 dark:text-blue-400'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {opcion.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setFiltroLista('reporte')}
          className={`ml-auto flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors sm:px-3 sm:text-xs ${
            filtroLista === 'reporte'
              ? 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-500/50 dark:bg-purple-950/40 dark:text-purple-300'
              : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800'
          }`}
        >
          <FileBarChart className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
          Reporte
        </button>
      </div>

      {filtroLista === 'reporte' ? (
        <ReporteActividadesAsignadas actividades={actividadesReporte} onVer={abrirActividadesPunto} />
      ) : actividades.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-gray-300 dark:border-neutral-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">
            {sinActividades
              ? 'El Concejo aún no ha asignado actividades.'
              : filtroLista === 'pendiente_revision'
                ? 'No hay actividades terminadas pendientes de revisión en el período seleccionado.'
                : 'No hay actividades asignadas o pendientes en el período seleccionado.'}
          </p>
        </div>
      ) : (
        <div className={`overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-neutral-900 ${BORDE_TABLA}`}>
        {grupos.map((grupo) => {
          const grupoKey = getGrupoKey(grupo);
          const abierto = !!gruposAbiertos[grupoKey];
          const resumen = contarEstadosGrupo(grupo.items);

          return (
            <div key={grupoKey} className={`border-b last:border-b-0 ${BORDE_TABLA}`}>
            <div
              onClick={() => toggleGrupo(grupoKey)}
              className={`cursor-pointer select-none bg-slate-100 transition-colors hover:bg-slate-200/70 dark:bg-neutral-800/90 dark:hover:bg-neutral-800 ${BORDE_TABLA} border-b`}
            >
              <div className="flex flex-col gap-0.5 px-3 py-2 sm:hidden">
                <div className="flex items-start gap-2">
                  <motion.div initial={false} animate={{ rotate: abierto ? 180 : 0 }} transition={{ duration: 0.2 }} className="mt-0.5 shrink-0">
                    <ChevronDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </motion.div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      {grupo.agendaTitulo || 'Sin sesión'}
                      <span className="ml-2 font-semibold normal-case tracking-normal text-slate-500 dark:text-slate-400">
                        ({grupo.items.length} {grupo.items.length === 1 ? 'actividad' : 'actividades'})
                      </span>
                    </p>
                    <p className={`text-xs font-semibold ${estadoAgendaClase(grupo.agendaEstado)}`}>{grupo.agendaEstado}</p>
                    {grupo.agendaDescripcion ? (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{grupo.agendaDescripcion}</p>
                    ) : null}
                    {resumen.sinTerminar > 0 ? (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{resumen.sinTerminar} sin terminar</p>
                    ) : null}
                    {resumen.completadas > 0 ? (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{resumen.completadas} completadas</p>
                    ) : null}
                    {resumen.pendientesRevision > 0 ? (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{resumen.pendientesRevision} pend. revisión</p>
                    ) : null}
                    {resumen.revisadas > 0 ? (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{resumen.revisadas} revisadas</p>
                    ) : null}
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 text-[11px] text-slate-500 dark:text-slate-400">
                        {grupo.agendaFecha ? formatearFechaHorario(grupo.agendaFecha) : ''}
                      </p>
                      {grupo.agendaId ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            router.push(`/protected/concejo/agenda/${grupo.agendaId}`);
                          }}
                          className="h-8 shrink-0 cursor-pointer gap-1 px-2 text-xs text-green-600 hover:bg-green-100 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-900/30"
                        >
                          Entrar
                          <ArrowRight size={14} />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
              <div className="hidden items-center justify-between gap-3 px-4 py-2.5 sm:flex">
              <div className="flex min-w-0 items-center gap-2">
                <motion.div initial={false} animate={{ rotate: abierto ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
                  <ChevronDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </motion.div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    <span>{grupo.agendaTitulo || 'Sin sesión'}</span>
                    <span className="ml-2 font-semibold normal-case tracking-normal text-slate-500 dark:text-slate-400">
                      ({grupo.items.length} {grupo.items.length === 1 ? 'actividad' : 'actividades'})
                    </span>
                  </p>
                  <p className="truncate text-[11px] font-normal normal-case tracking-normal text-slate-500 dark:text-slate-400">
                    <span className={estadoAgendaClase(grupo.agendaEstado)}>{grupo.agendaEstado}</span>
                    {grupo.agendaDescripcion ? ` · ${grupo.agendaDescripcion}` : ''}
                    {grupo.agendaFecha ? ` · ${formatearFechaHorario(grupo.agendaFecha)}` : ''}
                    {resumen.sinTerminar > 0 ? ` · ${resumen.sinTerminar} sin terminar` : ''}
                    {resumen.completadas > 0 ? ` · ${resumen.completadas} completadas` : ''}
                    {resumen.pendientesRevision > 0 ? ` · ${resumen.pendientesRevision} pend. revisión` : ''}
                    {resumen.revisadas > 0 ? ` · ${resumen.revisadas} revisadas` : ''}
                  </p>
                </div>
              </div>
              {grupo.agendaId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    router.push(`/protected/concejo/agenda/${grupo.agendaId}`);
                  }}
                  className="h-8 shrink-0 cursor-pointer gap-1.5 border border-green-600 px-2 text-green-600 hover:bg-green-100 hover:text-green-700 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/30"
                >
                  Ir a sesión
                  <ArrowRight size={14} />
                </Button>
              )}
              </div>
            </div>

            <AnimatePresence initial={false}>
              {abierto && (
                <motion.div
                  key={`contenido-${grupoKey}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <ul className="divide-y divide-slate-200 dark:divide-neutral-800">
                    {grupo.items.map((actividad, index) => {
                      const badge = estadoBadge(actividad);
                      const totalArchivos = archivosPorActividad.get(actividad.id)?.length ?? 0;
                      const fechasActividad = lineasFechaActividad(actividad);
                      const retrasoText = formatRetraso(actividad.due_date, actividad.updated_at);
                      const tiempoRestanteText = formatTiempoRestante(actividad.due_date);

                      return (
                        <li
                          key={`${actividad.punto_id}-${actividad.id}`}
                          className="bg-white px-4 py-3 dark:bg-neutral-900"
                        >
                          <div className="min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <p className="flex min-w-0 items-start gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-zinc-200 text-[11px] font-bold text-zinc-800 dark:bg-zinc-700 dark:text-white">
                                  {index + 1}
                                </span>
                                <span>
                                  <span className="text-muted-foreground">Punto </span>
                                  <span className="text-zinc-900 dark:text-white">{actividad.punto_titulo}</span>
                                </span>
                              </p>
                              <span className={`flex h-8 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold ${badge.clase}`}>
                                {actividad.confirmed_at || actividad.status === 'Completado' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                                {badge.label}
                              </span>
                            </div>

                            <div className="mt-2 flex flex-col gap-2">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <p className="flex items-center gap-1.5 text-sm font-medium text-[#0066cc] dark:text-blue-400">
                                  <User size={14} className="shrink-0" />
                                  {actividad.assignee_nombre}
                                </p>
                                {actividad.status === 'Completado' && actividad.revisado_por ? (
                                  <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-500/20">
                                    Revisado por: {actividad.revisado_por.nombre}
                                  </span>
                                ) : actividad.status === 'Completado' ? (
                                  <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-500/20">
                                    Pendiente de revisión
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 ring-1 ring-inset ring-zinc-300/80 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600">
                                    Sin terminar
                                  </span>
                                )}
                              </div>
                              {actividad.description?.trim() ? (
                                <p className="whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300">
                                  {fragmentarMenciones(
                                    actividad.description,
                                    nombresParticipantes(actividad),
                                  )}
                                </p>
                              ) : null}
                              {actividad.miembros && actividad.miembros.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-zinc-600 dark:text-zinc-300">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Participantes:</span>
                                  {actividad.miembros.map((m) => (
                                    <span key={m.id} className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-xs">
                                      <User size={11} className="text-purple-500" />
                                      <span>{m.nombre_usuario}</span>
                                      {m.confirmed_at ? (
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">({formatearFechaHorario(m.confirmed_at)})</span>
                                      ) : (
                                        <span className="text-[10px] text-orange-500 font-medium">(Sin confirmar)</span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="mt-3 flex flex-col gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-700 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
                              <div className="flex min-w-0 flex-1 flex-col gap-1">
                                {fechasActividad.length > 0 && (
                                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                    <Calendar size={12} className="mt-0.5 shrink-0" />
                                    <p className="min-w-0">
                                      {fechasActividad.map((linea, i) => (
                                        <React.Fragment key={linea.label}>
                                          {i > 0 && (
                                            <span className="mx-1.5 font-normal text-gray-400 dark:text-gray-500">·</span>
                                          )}
                                          <span>
                                            {linea.label}: {linea.fecha}
                                          </span>
                                        </React.Fragment>
                                      ))}
                                    </p>
                                  </div>
                                )}
                                {retrasoText && (
                                  <span className="text-xs font-semibold text-red-500 dark:text-red-400 mt-1 flex items-center gap-1">
                                    <AlertTriangle size={14} />
                                    {actividad.status === 'Completado' ? `Se completó con un tiempo tardío de: ${retrasoText.replace(/^Atrasada por /i, '')}` : retrasoText}
                                  </span>
                                )}
                                {!retrasoText && tiempoRestanteText && actividad.status !== 'Completado' && (
                                  <span className="text-xs font-semibold text-blue-500 dark:text-blue-400 mt-1 flex items-center gap-1">
                                    <Hourglass size={14} />
                                    {tiempoRestanteText}
                                  </span>
                                )}
                              </div>
                              <div className="flex shrink-0 items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => abrirActividadesPunto(actividad)}
                                  className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-700"
                                >
                                  <Eye size={14} className="shrink-0 text-[#0066cc] dark:text-blue-400" />
                                  Ver
                                </button>
                                {puedeEditar && (
                                  <button
                                    type="button"
                                    onClick={() => setActividadEditando(actividad)}
                                    className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-700"
                                  >
                                    <Pencil size={14} className="shrink-0 text-[#0066cc] dark:text-blue-400" />
                                    Editar
                                  </button>
                                )}
                                {totalArchivos > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setActividadArchivos(actividad)}
                                    className="relative flex h-8 w-auto shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 pr-7 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-700"
                                  >
                                    <Paperclip size={14} className="shrink-0 text-[#0066cc] dark:text-blue-400" />
                                    <span className="text-xs font-semibold leading-none text-zinc-700 dark:text-zinc-200">
                                      Archivos cargados
                                    </span>
                                    <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0066cc] px-1.5 text-[10px] font-bold leading-none text-white shadow-sm dark:bg-blue-400 dark:text-zinc-900">
                                      {totalArchivos}
                                    </span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          );
        })}
        </div>
      )}

      <ArchivosActividadModal
        open={!!actividadArchivos}
        onClose={cerrarArchivos}
        tituloActividad={actividadArchivos?.title ?? ''}
        archivos={archivosModal}
      />
      <EditarActividadModal
        open={!!actividadEditando}
        actividad={actividadEditando}
        onClose={() => setActividadEditando(null)}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: ACTIVIDADES_QUERY_KEY });
        }}
      />
      {tareaActividades && (
        <ActividadesAsignadas
          isOpen={!!tareaActividades}
          onClose={cerrarActividadesPunto}
          tarea={tareaActividades}
          puedeEditar={puedeEditar}
        />
      )}
    </div>
  );
}
