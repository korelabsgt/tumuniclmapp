'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronDown, Eye, User } from 'lucide-react';
import type { ActividadConcejoConContexto } from './lib/esquemas';

type SeccionId = 'sin_completar' | 'con_atraso' | 'a_tiempo' | 'todas';
type Categoria = Exclude<SeccionId, 'todas'>;

type FilaUsuario = {
  userId: string;
  nombre: string;
  sinCompletar: ActividadConcejoConContexto[];
  conAtraso: ActividadConcejoConContexto[];
  aTiempo: ActividadConcejoConContexto[];
};

const formatearFecha = (iso: string) => {
  if (!iso) return '';
  const fecha = new Date(iso);
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const anio = String(fecha.getFullYear()).slice(-2);
  let hora = fecha.getHours();
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  const periodo = hora >= 12 ? 'PM' : 'AM';
  hora = hora % 12 || 12;
  return `${dias[fecha.getDay()]} ${dia}/${mes}/${anio}, ${String(hora).padStart(2, '0')}:${minutos} ${periodo}`;
};

const retrasoMs = (actividad: ActividadConcejoConContexto) => {
  const limite = new Date(actividad.due_date).getTime();
  const fin =
    actividad.status === 'Completado' && actividad.updated_at
      ? new Date(actividad.updated_at).getTime()
      : Date.now();
  return fin - limite;
};

const diasDeAtraso = (actividad: ActividadConcejoConContexto) => {
  const ms = retrasoMs(actividad);
  if (ms <= 0) return 0;
  return Math.max(1, Math.floor(ms / 86400000));
};

const textoDias = (dias: number) =>
  dias === 1 ? '1 día de atraso' : `${dias} días de atraso`;

const esConAtraso = (actividad: ActividadConcejoConContexto) =>
  actividad.status === 'Completado' && retrasoMs(actividad) > 0;

const compararNombre = (a: FilaUsuario, b: FilaUsuario) =>
  a.nombre.localeCompare(b.nombre, 'es');

const anioActividad = (actividad: ActividadConcejoConContexto) =>
  new Date(actividad.agenda_fecha).getFullYear().toString();

const categoriaDe = (actividad: ActividadConcejoConContexto): Categoria => {
  if (actividad.status !== 'Completado') return 'sin_completar';
  if (esConAtraso(actividad)) return 'con_atraso';
  return 'a_tiempo';
};

const tonoCategoria = (categoria: Categoria) =>
  categoria === 'sin_completar'
    ? 'text-red-600 dark:text-red-400'
    : categoria === 'con_atraso'
      ? 'text-orange-700 dark:text-orange-400'
      : 'text-emerald-700 dark:text-emerald-400';

const etiquetaCategoria = (actividad: ActividadConcejoConContexto, categoria: Categoria) => {
  const dias = diasDeAtraso(actividad);
  if (categoria === 'a_tiempo') return 'A tiempo';
  if (categoria === 'con_atraso') return textoDias(dias);
  return dias > 0 ? `Sin completar · ${textoDias(dias)}` : 'Sin completar';
};

const mayorAtraso = (actividades: ActividadConcejoConContexto[]) =>
  actividades.reduce((mayor, actividad) => Math.max(mayor, diasDeAtraso(actividad)), 0);

export default function ReporteActividadesAsignadas({
  actividades,
  onVer,
}: {
  actividades: ActividadConcejoConContexto[];
  onVer: (actividad: ActividadConcejoConContexto) => void;
}) {
  const router = useRouter();
  const anioActual = new Date().getFullYear();
  const [anio, setAnio] = useState(String(anioActual));
  const [seccionActiva, setSeccionActiva] = useState<SeccionId>('sin_completar');
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});

  const anios = useMemo(() => {
    const presentes = new Set<number>();
    actividades.forEach((actividad) => {
      if (!actividad.agenda_fecha) return;
      presentes.add(Number(anioActividad(actividad)));
    });
    presentes.add(anioActual);
    const ultimo = Math.max(anioActual, ...presentes);
    presentes.add(ultimo + 1);
    return Array.from(presentes).sort((a, b) => b - a);
  }, [actividades, anioActual]);

  const actividadesAnio = useMemo(
    () => actividades.filter((actividad) => actividad.agenda_fecha && anioActividad(actividad) === anio),
    [actividades, anio],
  );

  const filas = useMemo(() => {
    const map = new Map<string, FilaUsuario>();

    actividadesAnio.forEach((actividad) => {
      const userId = actividad.assigned_to || 'sin-asignar';
      const actual = map.get(userId) ?? {
        userId,
        nombre: actividad.assignee_nombre || 'Sin asignar',
        sinCompletar: [],
        conAtraso: [],
        aTiempo: [],
      };

      if (actividad.status !== 'Completado') {
        actual.sinCompletar.push(actividad);
      } else if (esConAtraso(actividad)) {
        actual.conAtraso.push(actividad);
      } else {
        actual.aTiempo.push(actividad);
      }

      map.set(userId, actual);
    });

    return Array.from(map.values());
  }, [actividadesAnio]);

  const secciones = useMemo(() => {
    const ordenar = (
      lista: FilaUsuario[],
      tomar: (fila: FilaUsuario) => ActividadConcejoConContexto[],
      porAtraso: boolean,
    ) =>
      lista
        .filter((fila) => tomar(fila).length > 0)
        .sort((a, b) => {
          const diferencia = tomar(b).length - tomar(a).length;
          if (diferencia !== 0) return diferencia;
          if (porAtraso) {
            const atraso = mayorAtraso(tomar(b)) - mayorAtraso(tomar(a));
            if (atraso !== 0) return atraso;
          }
          return compararNombre(a, b);
        });

    return [
      {
        id: 'sin_completar' as SeccionId,
        titulo: 'Sin completar',
        tono: 'bg-red-50/90 text-red-800 dark:bg-red-950/40 dark:text-red-300',
        punto: 'bg-red-500',
        filas: ordenar(filas, (fila) => fila.sinCompletar, true),
        actividades: (fila: FilaUsuario) =>
          [...fila.sinCompletar].sort((a, b) => diasDeAtraso(b) - diasDeAtraso(a)),
      },
      {
        id: 'con_atraso' as SeccionId,
        titulo: 'Completadas con atraso',
        tono: 'bg-orange-50/90 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
        punto: 'bg-orange-500',
        filas: ordenar(filas, (fila) => fila.conAtraso, true),
        actividades: (fila: FilaUsuario) =>
          [...fila.conAtraso].sort((a, b) => diasDeAtraso(b) - diasDeAtraso(a)),
      },
      {
        id: 'a_tiempo' as SeccionId,
        titulo: 'Completadas a tiempo',
        tono: 'bg-emerald-50/90 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
        punto: 'bg-emerald-500',
        filas: ordenar(filas, (fila) => fila.aTiempo, false),
        actividades: (fila: FilaUsuario) =>
          [...fila.aTiempo].sort((a, b) => {
            const fa = a.updated_at ? new Date(a.updated_at).getTime() : 0;
            const fb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
            return fb - fa;
          }),
      },
      {
        id: 'todas' as SeccionId,
        titulo: 'Todas',
        tono: 'bg-slate-200 text-slate-800 dark:bg-neutral-700 dark:text-slate-100',
        punto: 'bg-slate-500',
        filas: [...filas]
          .filter((fila) => fila.sinCompletar.length + fila.conAtraso.length + fila.aTiempo.length > 0)
          .sort((a, b) => {
            const sin = b.sinCompletar.length - a.sinCompletar.length;
            if (sin !== 0) return sin;
            const atraso = b.conAtraso.length - a.conAtraso.length;
            if (atraso !== 0) return atraso;
            const dias =
              mayorAtraso([...b.sinCompletar, ...b.conAtraso]) -
              mayorAtraso([...a.sinCompletar, ...a.conAtraso]);
            if (dias !== 0) return dias;
            return compararNombre(a, b);
          }),
        actividades: (fila: FilaUsuario) => [
          ...[...fila.sinCompletar].sort((a, b) => diasDeAtraso(b) - diasDeAtraso(a)),
          ...[...fila.conAtraso].sort((a, b) => diasDeAtraso(b) - diasDeAtraso(a)),
          ...[...fila.aTiempo].sort((a, b) => {
            const fa = a.updated_at ? new Date(a.updated_at).getTime() : 0;
            const fb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
            return fb - fa;
          }),
        ],
      },
    ];
  }, [filas]);

  const seccion = secciones.find((item) => item.id === seccionActiva) ?? secciones[0];
  const total = seccion.filas.reduce((suma, fila) => suma + seccion.actividades(fila).length, 0);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-300 bg-slate-100 px-4 py-2.5 dark:border-neutral-700 dark:bg-neutral-800/90">
        <label className="mr-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Año
          <select
            value={anio}
            onChange={(event) => {
              setAnio(event.target.value);
              setAbiertos({});
            }}
            className="h-8 cursor-pointer rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0066cc] dark:border-neutral-600 dark:bg-neutral-900 dark:text-slate-100 dark:focus-visible:ring-blue-400"
          >
            {anios.map((valor) => (
              <option key={valor} value={String(valor)}>
                {valor}
              </option>
            ))}
          </select>
        </label>
        {secciones.map((opcion) => {
          const cantidad = opcion.filas.reduce((suma, fila) => suma + opcion.actividades(fila).length, 0);
          const activa = opcion.id === seccion.id;
          return (
            <button
              key={opcion.id}
              type="button"
              onClick={() => {
                setSeccionActiva(opcion.id);
                setAbiertos({});
              }}
              className={`h-8 cursor-pointer rounded-lg px-3 text-xs font-bold uppercase tracking-wide transition-colors ${
                activa
                  ? opcion.tono
                  : 'text-slate-500 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-neutral-800'
              }`}
            >
              {opcion.titulo} ({cantidad})
            </button>
          );
        })}
      </div>

      {total === 0 ? (
        <p className="px-4 py-10 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
          {seccion.id === 'todas'
            ? 'No hay actividades en este año.'
            : `No hay actividades de «${seccion.titulo.toLowerCase()}» en este año.`}
        </p>
      ) : (
        <div>
              {seccion.filas.map((fila, indice) => {
                const clave = `${seccion.id}-${fila.userId}`;
                const abierta = !!abiertos[clave];
                const lista = seccion.actividades(fila);
                const atraso = mayorAtraso(lista);
                return (
                  <div key={clave} className="border-b border-slate-200 last:border-b-0 dark:border-neutral-800">
                    <div
                      onClick={() => setAbiertos((actual) => ({ ...actual, [clave]: !actual[clave] }))}
                      className="flex min-h-14 cursor-pointer select-none items-center gap-2 bg-white px-4 py-2.5 transition-colors hover:bg-slate-50 dark:bg-neutral-900 dark:hover:bg-neutral-800/60"
                    >
                      <motion.div initial={false} animate={{ rotate: abierta ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </motion.div>
                      <span className="w-7 shrink-0 font-mono text-xs font-bold text-slate-400">
                        {String(indice + 1).padStart(2, '0')}.
                      </span>
                      <User size={15} className="shrink-0 text-blue-600 dark:text-blue-400" />
                      <p className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800 dark:text-slate-100 sm:text-sm">
                        {fila.nombre}
                        <span className="ml-2 font-semibold text-slate-500 dark:text-slate-400">
                          ({lista.length} {lista.length === 1 ? 'actividad' : 'actividades'})
                        </span>
                      </p>
                      {seccion.id === 'todas' ? (
                        mayorAtraso(fila.sinCompletar) > 0 ? (
                          <span className="shrink-0 font-mono text-[11px] font-semibold text-red-600 sm:text-xs dark:text-red-400">
                            {textoDias(mayorAtraso(fila.sinCompletar))}
                          </span>
                        ) : mayorAtraso(fila.conAtraso) > 0 ? (
                          <span className="shrink-0 font-mono text-[11px] font-semibold text-orange-700 sm:text-xs dark:text-orange-400">
                            {textoDias(mayorAtraso(fila.conAtraso))}
                          </span>
                        ) : null
                      ) : seccion.id !== 'a_tiempo' && atraso > 0 ? (
                        <span className={`shrink-0 font-mono text-[11px] font-semibold sm:text-xs ${seccion.id === 'sin_completar' ? 'text-red-600 dark:text-red-400' : 'text-orange-700 dark:text-orange-400'}`}>
                          {textoDias(atraso)}
                        </span>
                      ) : null}
                    </div>
                    <AnimatePresence initial={false}>
                      {abierta ? (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          {lista.map((actividad, indiceActividad) => {
                            const categoria = seccion.id === 'todas' ? categoriaDe(actividad) : seccion.id;
                            return (
                              <div
                                key={actividad.id}
                                className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50/70 px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-950/30"
                              >
                                <span className="w-8 shrink-0 text-center font-mono text-xs font-semibold text-slate-400">
                                  {String(indiceActividad + 1).padStart(2, '0')}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100 sm:text-sm">
                                    {actividad.title}
                                  </p>
                                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                    {actividad.agenda_titulo || 'Sin sesión'}
                                  </p>
                                  <p className="flex flex-wrap gap-x-3 text-[11px] text-slate-500 dark:text-slate-400">
                                    <span>Creada: {actividad.created_at ? formatearFecha(actividad.created_at) : 'Sin fecha'}</span>
                                    <span>Completar: {actividad.due_date ? formatearFecha(actividad.due_date) : 'Sin fecha'}</span>
                                  </p>
                                </div>
                                <span className={`text-[11px] font-semibold sm:text-xs ${tonoCategoria(categoria)}`}>
                                  {etiquetaCategoria(actividad, categoria)}
                                </span>
                                <div className="flex shrink-0 items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => onVer(actividad)}
                                    className="flex h-8 cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-700"
                                  >
                                    <Eye size={14} className="shrink-0 text-[#0066cc] dark:text-blue-400" />
                                    Ver
                                  </button>
                                  {actividad.agenda_id ? (
                                    <button
                                      type="button"
                                      onClick={() => router.push(`/protected/concejo/agenda/${actividad.agenda_id}`)}
                                      className="flex h-8 cursor-pointer items-center gap-1.5 rounded-xl border border-green-600 px-2.5 text-xs font-semibold text-green-600 transition-colors hover:bg-green-100 hover:text-green-700 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/30"
                                    >
                                      Ir a sesión
                                      <ArrowRight size={14} />
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                );
              })}
        </div>
      )}
    </div>
  );
}
