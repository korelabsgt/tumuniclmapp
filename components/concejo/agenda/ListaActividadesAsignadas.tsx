'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { obtenerTodasActividadesConcejo } from './tareas/lib/actividades';
import { ActividadConcejoConContexto } from './lib/esquemas';
import type { ArchivoAdjunto } from '@/components/tareas/types';
import ArchivosActividadModal from './modals/ArchivosActividadModal';
import EditarActividadModal from './modals/EditarActividadModal';
import { Button } from '@/components/ui/button';
import { User, Calendar, CheckCircle2, Clock, ChevronDown, Paperclip, ArrowRight, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CargandoAnimacion from '@/components/ui/animations/Cargando';
import useUserData from '@/hooks/sesion/useUserData';

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

type ResumenEstadosGrupo = {
  pendientes: number;
  asignadas: number;
  vencidas: number;
  completadas: number;
};

const contarEstadosGrupo = (items: ActividadConcejoConContexto[]): ResumenEstadosGrupo => {
  const resumen = { pendientes: 0, asignadas: 0, vencidas: 0, completadas: 0 };
  const ahora = new Date();

  items.forEach((actividad) => {
    if (actividad.status === 'Completado') {
      resumen.completadas += 1;
      return;
    }
    if (!actividad.confirmed_at) {
      resumen.pendientes += 1;
      return;
    }
    if (actividad.due_date && new Date(actividad.due_date) < ahora) {
      resumen.vencidas += 1;
      return;
    }
    resumen.asignadas += 1;
  });

  return resumen;
};

const ACCORDION_TRANSITION = { duration: 0.48, ease: [0.32, 0.72, 0, 1] as const };
const CONTENIDO_TRANSITION = { duration: 0.42, ease: [0.32, 0.72, 0, 1] as const };

type ListaActividadesAsignadasProps = {
  filtroAnio: string;
  filtroMes: string | null;
};

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

  const [grupoAbierto, setGrupoAbierto] = useState<string | null>(null);
  const [actividadArchivos, setActividadArchivos] = useState<ActividadConcejoConContexto | null>(null);
  const [actividadEditando, setActividadEditando] = useState<ActividadConcejoConContexto | null>(null);

  useEffect(() => {
    setGrupoAbierto(null);
  }, [filtroAnio, filtroMes]);

  const actividades = useMemo(() => {
    const todas = data ?? [];
    return todas.filter((actividad) => {
      if (!actividad.agenda_fecha) return false;
      const agendaDate = new Date(actividad.agenda_fecha);
      const agendaYear = agendaDate.getFullYear().toString();
      const agendaMonth = agendaDate.getMonth().toString();
      const cumpleAnio = filtroAnio === '' || agendaYear === filtroAnio;
      const cumpleMes = filtroMes === null || agendaMonth === filtroMes;
      return cumpleAnio && cumpleMes;
    });
  }, [data, filtroAnio, filtroMes]);

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

  const isGrupoAbierto = (key: string) => grupoAbierto === key;

  const toggleGrupo = (key: string) => {
    setGrupoAbierto((actual) => (actual === key ? null : key));
  };

  const cerrarArchivos = () => setActividadArchivos(null);

  if (isLoading) {
    return <CargandoAnimacion texto="Cargando actividades..." />;
  }

  const sinActividades = (data ?? []).length === 0;

  if (actividades.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed border-gray-300 dark:border-neutral-800 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">
          {sinActividades
            ? 'El Concejo aún no ha asignado actividades.'
            : 'No hay actividades asignadas en el período seleccionado.'}
        </p>
      </div>
    );
  }

  const archivosModal = actividadArchivos
    ? archivosPorActividad.get(actividadArchivos.id) ?? []
    : [];

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence initial={false} mode="popLayout">
        {grupos
          .filter((grupo) => grupoAbierto === null || getGrupoKey(grupo) === grupoAbierto)
          .map((grupo) => {
          const grupoKey = getGrupoKey(grupo);
          const abierto = isGrupoAbierto(grupoKey);
          const resumen = contarEstadosGrupo(grupo.items);

          return (
            <motion.div
              layout
              key={grupoKey}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={ACCORDION_TRANSITION}
              className="overflow-hidden rounded-lg border border-gray-200 border-l-4 border-l-purple-500 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
            >
            <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
              <div className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => toggleGrupo(grupoKey)}
                  className="min-w-0 flex-1 cursor-pointer text-left"
                >
                  <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm md:text-base min-w-0">
                    <span>{grupo.agendaTitulo}</span>
                    {grupo.agendaDescripcion && (
                      <>
                        <span className="mx-1.5 font-normal text-gray-400 dark:text-gray-500">·</span>
                        <span className="font-normal text-gray-600 dark:text-gray-300">{grupo.agendaDescripcion}</span>
                      </>
                    )}
                    {grupo.agendaFecha && (
                      <>
                        <span className="mx-1.5 hidden font-normal text-gray-400 dark:text-gray-500 lg:inline">·</span>
                        <span className="hidden font-normal text-gray-500 dark:text-gray-400 lg:inline">
                          {formatearFechaHorario(grupo.agendaFecha)}
                        </span>
                      </>
                    )}
                  </p>
                  {grupo.agendaFecha && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 md:text-sm lg:hidden">
                      {formatearFechaHorario(grupo.agendaFecha)}
                    </p>
                  )}
                  <p className="mt-1 text-xs font-medium">
                    <span className={estadoAgendaClase(grupo.agendaEstado)}>{grupo.agendaEstado}</span>
                    <span className="text-gray-400 dark:text-gray-500"> · </span>
                    <span className="text-gray-600 dark:text-gray-300">
                      {grupo.items.length} {grupo.items.length === 1 ? 'actividad' : 'actividades'}
                    </span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {resumen.pendientes > 0 && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        {resumen.pendientes} {resumen.pendientes === 1 ? 'pendiente' : 'pendientes'}
                      </span>
                    )}
                    {resumen.asignadas > 0 && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {resumen.asignadas} {resumen.asignadas === 1 ? 'asignada' : 'asignadas'}
                      </span>
                    )}
                    {resumen.vencidas > 0 && (
                      <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                        {resumen.vencidas} {resumen.vencidas === 1 ? 'vencida' : 'vencidas'}
                      </span>
                    )}
                    {resumen.completadas > 0 && (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {resumen.completadas} {resumen.completadas === 1 ? 'completada' : 'completadas'}
                      </span>
                    )}
                  </div>
                </button>

                <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleGrupo(grupoKey)}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-neutral-800 dark:hover:text-gray-200"
                    aria-expanded={abierto}
                    aria-label={abierto ? 'Contraer actividades' : 'Expandir actividades'}
                  >
                    <ChevronDown
                      size={20}
                      className={`transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${abierto ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {grupo.agendaId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/protected/concejo/agenda/${grupo.agendaId}`)}
                      className="h-8 shrink-0 cursor-pointer gap-1.5 px-2 text-green-600 hover:bg-green-100 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-900/30"
                    >
                      Ir a sesión
                      <ArrowRight size={14} />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <AnimatePresence initial={false} mode="sync">
              {abierto && (
                <motion.div
                  key={`contenido-${grupoKey}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={CONTENIDO_TRANSITION}
                  className="overflow-hidden"
                >
                  <ul className="flex flex-col gap-3 border-t border-zinc-200 bg-zinc-100/70 p-3 dark:border-zinc-700 dark:bg-zinc-950/40">
                    {grupo.items.map((actividad, index) => {
                      const badge = estadoBadge(actividad);
                      const totalArchivos = archivosPorActividad.get(actividad.id)?.length ?? 0;
                      const fechasActividad = lineasFechaActividad(actividad);

                      return (
                        <li
                          key={actividad.id}
                          className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
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
                              <p className="flex items-center gap-1.5 text-sm font-medium text-[#0066cc] dark:text-blue-400">
                                <User size={14} className="shrink-0" />
                                {actividad.assignee_nombre}
                              </p>
                              {actividad.description?.trim() ? (
                                <p className="whitespace-pre-wrap rounded-xl bg-zinc-50 px-3 py-2 text-sm leading-relaxed text-zinc-600 dark:bg-zinc-900/70 dark:text-zinc-300">
                                  {actividad.description}
                                </p>
                              ) : null}
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
                              </div>
                              <div className="flex shrink-0 items-center justify-end gap-2">
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
            </motion.div>
          );
        })}
      </AnimatePresence>

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
    </div>
  );
}
