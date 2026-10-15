'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { ClipboardList, User, Calendar, Loader2, Plus, Eye } from 'lucide-react';
import { differenceInDays, isToday } from 'date-fns';
import type { ActividadConcejoConContexto, Tarea } from '../lib/esquemas';
import {
  obtenerActividadesPendientesRevisionConcejo,
  crearPuntoSeguimientoActividad,
} from './lib/actividades';
import ActividadesAsignadas from './modals/ActividadesAsignadas';

const pendientesRevisionQueryKey = (agendaId: string) =>
  ['actividades-concejo-pendientes-revision', 'v3', agendaId] as const;

const claseItemAccion =
  'w-full cursor-pointer text-left px-2 py-2 rounded-lg flex items-center gap-2 transition-colors group hover:bg-gray-50 dark:hover:bg-neutral-700/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent';

const informacionSesionOrigen = (actividad: ActividadConcejoConContexto) => {
  if (actividad.agenda_descripcion?.trim()) {
    return actividad.agenda_descripcion.trim();
  }
  const acta = actividad.agenda_acta?.trim();
  const libro = actividad.agenda_libro?.trim();
  if (acta && libro) return `ACTA ${acta}, LIBRO ${libro}`;
  if (acta) return `ACTA ${acta}`;
  if (libro) return `LIBRO ${libro}`;
  return null;
};

const calcularDiasRestantes = (fechaReunion: string): string => {
  const fecha = new Date(fechaReunion);
  if (isToday(fecha)) return 'Hoy';
  const dias = differenceInDays(fecha, new Date());
  if (dias < 0) return 'Vencido';
  return `${dias + 1} días`;
};

const estadoAgendaClase = (estado: string) => {
  if (estado === 'En progreso') return 'text-green-600 dark:text-green-400';
  if (estado === 'Finalizada') return 'text-gray-500 dark:text-gray-400';
  return 'text-blue-600 dark:text-blue-400';
};

const formatearFechaSesionOrigen = (iso: string) => {
  if (!iso) return null;
  const texto = formatearFechaHorario(iso);
  return texto || null;
};

const tituloSesionOrigen = (actividad: ActividadConcejoConContexto) => {
  const titulo = actividad.agenda_titulo?.trim();
  if (!titulo || titulo === 'Sesión desconocida') return null;
  return titulo;
};

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

type SeguimientoActividadesPendientesProps = {
  agendaId: string;
  puedeAsignar: boolean;
  onActualizado: () => void;
};

export default function SeguimientoActividadesPendientes({
  agendaId,
  puedeAsignar,
  onActualizado,
}: SeguimientoActividadesPendientesProps) {
  const queryClient = useQueryClient();
  const [creandoId, setCreandoId] = useState<string | null>(null);
  const [tareaActividades, setTareaActividades] = useState<Tarea | null>(null);

  const { data: pendientes = [], isLoading } = useQuery({
    queryKey: pendientesRevisionQueryKey(agendaId),
    queryFn: () => obtenerActividadesPendientesRevisionConcejo(agendaId),
    staleTime: 0,
  });

  const handleCrearPunto = async (taskId: string) => {
    setCreandoId(taskId);
    try {
      await crearPuntoSeguimientoActividad(taskId, agendaId);
      toast.success('Punto de seguimiento creado. La misma actividad quedó asignada a ese punto.');
      void queryClient.invalidateQueries({ queryKey: pendientesRevisionQueryKey(agendaId) });
      void queryClient.invalidateQueries({ queryKey: ['actividades-concejo-todas'] });
      onActualizado();
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'No se pudo crear el punto de seguimiento.';
      toast.error(mensaje);
    } finally {
      setCreandoId(null);
    }
  };

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
      void queryClient.invalidateQueries({ queryKey: pendientesRevisionQueryKey(agendaId) });
      onActualizado();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando actividades pendientes de revisar…
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-base font-bold text-[#0066cc] dark:text-blue-400">
          <ClipboardList size={18} />
          Actividades pendientes de revisar
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Actividades completadas sin revisión del concejo. Cree un punto de seguimiento en esta sesión; se reutiliza la misma actividad y sus archivos. Si ya tiene punto aquí, no aparece en esta lista; en otra sesión futura volverá a salir hasta que se revise.
        </p>
      </div>

      {pendientes.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No hay actividades completadas pendientes de revisar para esta sesión.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {pendientes.map((actividad) => {
            const creando = creandoId === actividad.id;
            const infoSesion = informacionSesionOrigen(actividad);
            const fechaSesion = formatearFechaSesionOrigen(actividad.agenda_fecha);
            const tituloSesion = tituloSesionOrigen(actividad);
            const diasRestantes = actividad.agenda_fecha
              ? calcularDiasRestantes(actividad.agenda_fecha)
              : null;

            return (
              <li
                key={actividad.id}
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 dark:border-zinc-600 dark:bg-zinc-900/40"
              >
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm font-semibold leading-normal text-zinc-900 dark:text-zinc-100">
                      {actividad.title}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-relaxed text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <User size={12} className="shrink-0" />
                        {actividad.assignee_nombre}
                      </span>
                      <span className="text-zinc-300 dark:text-zinc-600">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} className="shrink-0" />
                        Completada:{' '}
                        {actividad.updated_at
                          ? formatearFechaHorario(actividad.updated_at)
                          : formatearFechaHorario(actividad.due_date)}
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">Punto:</span>{' '}
                      {actividad.punto_titulo}
                    </p>

                    <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[#0066cc] dark:text-blue-400">
                        Sesión
                      </span>
                      {tituloSesion ? (
                        <span className="font-semibold text-zinc-800 dark:text-zinc-100">{tituloSesion}</span>
                      ) : null}
                      {fechaSesion ? (
                        <span className="text-zinc-500 dark:text-zinc-400">{fechaSesion}</span>
                      ) : null}
                      {!tituloSesion && !fechaSesion ? (
                        <span className="text-zinc-500">Sin datos de sesión</span>
                      ) : null}
                      {infoSesion ? (
                        <>
                          <span className="text-zinc-300 dark:text-zinc-600">·</span>
                          <span>{infoSesion}</span>
                        </>
                      ) : null}
                      {actividad.agenda_estado ? (
                        <>
                          <span className="text-zinc-300 dark:text-zinc-600">·</span>
                          <span className={`font-bold ${estadoAgendaClase(actividad.agenda_estado)}`}>
                            {actividad.agenda_estado}
                          </span>
                          {diasRestantes ? (
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                              , {diasRestantes}
                              {diasRestantes.includes('días') ? ' restantes' : ''}
                            </span>
                          ) : null}
                        </>
                      ) : null}
                    </p>
                  </div>

                  <div className="grid w-full shrink-0 grid-cols-2 gap-1.5 sm:inline-flex sm:w-auto sm:flex-col sm:items-stretch sm:gap-0.5">
                    <button
                      type="button"
                      onClick={() => void handleCrearPunto(actividad.id)}
                      disabled={!puedeAsignar || creando}
                      className={claseItemAccion}
                    >
                      <div className="shrink-0 rounded-md bg-blue-100 p-1 text-[#0066cc] transition-colors group-hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:group-hover:bg-blue-900/50">
                        {creando ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Plus size={15} />
                        )}
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-200">Crear punto</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">En esta sesión</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => abrirActividadesPunto(actividad)}
                      className={claseItemAccion}
                    >
                      <div className="shrink-0 rounded-md bg-blue-100 p-1 text-[#0066cc] transition-colors group-hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:group-hover:bg-blue-900/50">
                        <Eye size={15} />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-200">Ver actividad</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">Archivos y detalle</p>
                      </div>
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!puedeAsignar && pendientes.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Solo secretaría técnica puede crear puntos de seguimiento.
        </p>
      )}

      {tareaActividades && (
        <ActividadesAsignadas
          isOpen={!!tareaActividades}
          onClose={cerrarActividadesPunto}
          tarea={tareaActividades}
        />
      )}
    </section>
  );
}
