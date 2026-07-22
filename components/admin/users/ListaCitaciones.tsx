'use client';

import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Usuario } from '@/lib/usuarios/esquemas';
import { useTodasCitaciones } from './forms/hooks';
import CitacionForm from './forms/CitacionForm';
import CitacionesControls from './CitacionesControls';
import SelectorEmpleadoModal from './SelectorEmpleadoModal';
import Cargando from '@/components/ui/animations/Cargando';
import { useDependencias } from '@/hooks/dependencias/useDependencias';
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseISO } from 'date-fns';
import {
  SearchX,
  ChevronDown,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  User,
} from 'lucide-react';

type UsuarioConJerarquia = Usuario & {
  puesto_nombre: string | null;
  oficina_nombre: string | null;
  oficina_path_orden: string | null;
};

type CitacionRaw = {
  id: string;
  id_usuario: string;
  motivo: string;
  fecha_cita: string;
  estado: string;
  fecha_confirmado: string | null;
  created_at: string;
};

type CitacionVista = CitacionRaw & {
  usuario_nombre: string;
  oficina_nombre: string;
  oficina_path_orden: string;
  puesto_nombre: string | null;
};

type FiltroEstado = 'Todas' | 'Confirmadas' | 'Pendientes' | 'Vencidas';
type ClasificacionEstado = Exclude<FiltroEstado, 'Todas'>;

type Props = {
  usuarios: UsuarioConJerarquia[];
  rolActual: string | null;
};

const ESTADO_TAB_STYLES: Record<FiltroEstado, { active: string; inactive: string }> = {
  Todas: {
    active: 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400',
    inactive: 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
  },
  Confirmadas: {
    active: 'border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400',
    inactive: 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
  },
  Pendientes: {
    active: 'border-b-2 border-orange-600 text-orange-600 dark:text-orange-400',
    inactive: 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
  },
  Vencidas: {
    active: 'border-b-2 border-red-600 text-red-600 dark:text-red-400',
    inactive: 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
  },
};

const ESTADO_ORDEN: FiltroEstado[] = ['Todas', 'Confirmadas', 'Pendientes', 'Vencidas'];

const rangoMes = (mes: number, anio: number) => {
  const start = `${anio}-${String(mes + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(anio, mes + 1, 0).getDate();
  const end = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
};

const fechaLocalCita = (iso: string) => {
  const part = iso.split('T')[0];
  const [y, m, d] = part.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const formatearFechaCita = (fechaStr: string) => {
  const d = new Date(fechaStr);
  const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const diaSemana = dias[d.getDay()];
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = String(d.getFullYear()).slice(-2);
  let hora = d.getHours();
  const minutos = String(d.getMinutes()).padStart(2, '0');
  const ampm = hora >= 12 ? 'PM' : 'AM';
  hora = hora % 12;
  hora = hora ? hora : 12;
  return `${diaSemana} ${dia}/${mes}/${anio} a las ${String(hora).padStart(2, '0')}:${minutos} ${ampm}`;
};

const formatearConfirmacion = (fechaStr: string) => {
  const d = new Date(fechaStr);
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = String(d.getFullYear()).slice(-2);
  let hora = d.getHours();
  const minutos = String(d.getMinutes()).padStart(2, '0');
  const ampm = hora >= 12 ? 'PM' : 'AM';
  hora = hora % 12;
  hora = hora ? hora : 12;
  return `${dias[d.getDay()]} ${dia}/${mes}/${anio}, ${hora}:${minutos} ${ampm}`;
};

export default function ListaCitaciones({ usuarios, rolActual }: Props) {
  const { citaciones, loading, invalidate } = useTodasCitaciones(true);
  const { dependencias, loading: loadingDependencias } = useDependencias();

  const ahora = new Date();
  const [isMounted, setIsMounted] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [busquedaPor, setBusquedaPor] = useState<'dependencia' | 'nombre'>(() =>
    typeof window !== 'undefined'
      ? ((localStorage.getItem('citaciones_busqueda_por') as 'dependencia' | 'nombre') || 'dependencia')
      : 'dependencia',
  );
  const [mesSeleccionado, setMesSeleccionado] = useState(() => ahora.getMonth());
  const [anioSeleccionado, setAnioSeleccionado] = useState(() => ahora.getFullYear());
  const [fechaInicialRango, setFechaInicialRango] = useState(
    () => rangoMes(ahora.getMonth(), ahora.getFullYear()).start,
  );
  const [fechaFinalRango, setFechaFinalRango] = useState(
    () => rangoMes(ahora.getMonth(), ahora.getFullYear()).end,
  );
  const [ordenDescendente, setOrdenDescendente] = useState(true);
  const [oficinasAbiertas, setOficinasAbiertas] = useState<Record<string, boolean>>({});
  const [empleadosAbiertos, setEmpleadosAbiertos] = useState<Record<string, boolean>>({});
  const [nivel2Id, setNivel2Id] = useState<string | null>(null);
  const [nivel3Id, setNivel3Id] = useState<string | null>(null);
  const [oficinaFiltroId, setOficinaFiltroId] = useState<string | null>(null);
  const [citacionModal, setCitacionModal] = useState<{
    userId: string;
    citacion?: CitacionVista;
  } | null>(null);
  const [modalSeleccionEmpleado, setModalSeleccionEmpleado] = useState(false);

  const canOpenModal =
    rolActual === 'SUPER' || rolActual === 'RRHH' || rolActual === 'SECRETARIO';

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('citaciones_busqueda_por', busquedaPor);
  }, [busquedaPor]);

  const usuariosMap = useMemo(() => {
    const map = new Map<string, UsuarioConJerarquia>();
    usuarios.forEach((u) => map.set(u.id, u));
    return map;
  }, [usuarios]);

  const empleadosDisponibles = useMemo(
    () => usuarios.filter((u) => u.rol !== 'INVITADO'),
    [usuarios],
  );

  const citacionesEnriquecidas = useMemo(() => {
    return (citaciones as CitacionRaw[])
      .map((c) => {
        const usuario = usuariosMap.get(c.id_usuario);
        if (!usuario) return null;
        if (usuario.rol === 'INVITADO') return null;
        return {
          ...c,
          usuario_nombre: usuario.nombre || 'Sin nombre',
          oficina_nombre: usuario.oficina_nombre || 'Sin Oficina',
          oficina_path_orden: usuario.oficina_path_orden || '9999',
          puesto_nombre: usuario.puesto_nombre,
        } satisfies CitacionVista;
      })
      .filter((c): c is CitacionVista => c !== null);
  }, [citaciones, usuariosMap]);

  const oficinasNivel2 = useMemo(() => {
    const rootIds = new Set(dependencias.filter((d) => d.parent_id === null).map((d) => d.id));
    return dependencias
      .filter((d) => !d.es_puesto && d.parent_id !== null && rootIds.has(d.parent_id))
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }, [dependencias]);

  const oficinasNivel3 = useMemo(() => {
    if (!nivel2Id) return [];
    return dependencias
      .filter((d) => !d.es_puesto && d.parent_id === nivel2Id)
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }, [dependencias, nivel2Id]);

  const nombresOficinaFiltro = useMemo(() => {
    if (!oficinaFiltroId) return null;
    const ids = new Set<string>();
    if (nivel3Id && oficinaFiltroId === nivel3Id) {
      ids.add(nivel3Id);
    } else if (nivel2Id && oficinaFiltroId === nivel2Id) {
      ids.add(nivel2Id);
      dependencias.filter((d) => d.parent_id === nivel2Id).forEach((d) => ids.add(d.id));
    } else {
      ids.add(oficinaFiltroId);
    }
    return new Set(
      dependencias
        .filter((d) => ids.has(d.id))
        .map((d) => d.nombre)
        .filter((n): n is string => Boolean(n)),
    );
  }, [oficinaFiltroId, nivel2Id, nivel3Id, dependencias]);

  const clasificar = (c: CitacionVista): ClasificacionEstado => {
    if (c.estado === 'Confirmada') return 'Confirmadas';
    if (new Date(c.fecha_cita) < new Date()) return 'Vencidas';
    return 'Pendientes';
  };

  const citacionesPorFecha = useMemo(() => {
    if (!isMounted || !fechaInicialRango || !fechaFinalRango) return [];

    const inicio = parseISO(`${fechaInicialRango}T00:00:00`);
    const fin = parseISO(`${fechaFinalRango}T00:00:00`);
    const termino = searchTerm.toLowerCase().trim();

    return citacionesEnriquecidas.filter((c) => {
      if (!c.fecha_cita) return false;
      const tDate = fechaLocalCita(c.fecha_cita);
      if (tDate < inicio || tDate > fin) return false;

      if (nombresOficinaFiltro && !nombresOficinaFiltro.has(c.oficina_nombre)) return false;

      if (termino) {
        if (busquedaPor === 'nombre') {
          if (!c.usuario_nombre.toLowerCase().includes(termino)) return false;
        } else if (!c.oficina_nombre.toLowerCase().includes(termino)) {
          return false;
        }
      }

      return true;
    });
  }, [
    citacionesEnriquecidas,
    fechaInicialRango,
    fechaFinalRango,
    searchTerm,
    busquedaPor,
    nombresOficinaFiltro,
    isMounted,
  ]);

  const conteos = useMemo(
    () => ({
      Todas: citacionesPorFecha.length,
      Pendientes: citacionesPorFecha.filter((c) => clasificar(c) === 'Pendientes').length,
      Confirmadas: citacionesPorFecha.filter((c) => clasificar(c) === 'Confirmadas').length,
      Vencidas: citacionesPorFecha.filter((c) => clasificar(c) === 'Vencidas').length,
    }),
    [citacionesPorFecha],
  );

  const listaVisual = useMemo(() => {
    const filtradas =
      filtroEstado === 'Todas'
        ? citacionesPorFecha
        : citacionesPorFecha.filter((c) => clasificar(c) === filtroEstado);
    return [...filtradas].sort((a, b) => {
      const cmp = new Date(a.fecha_cita).getTime() - new Date(b.fecha_cita).getTime();
      return ordenDescendente ? -cmp : cmp;
    });
  }, [citacionesPorFecha, filtroEstado, ordenDescendente]);

  const citacionesAgrupadas = useMemo(() => {
    if (!isMounted) return [];

    const grupos: Record<
      string,
      {
        key: string;
        titulo: string;
        path: string;
        subgrupos: Record<string, { key: string; nombre: string; citaciones: CitacionVista[] }>;
      }
    > = {};

    listaVisual.forEach((c) => {
      const ofName = c.oficina_nombre;
      if (!grupos[ofName]) {
        grupos[ofName] = {
          key: ofName,
          titulo: ofName,
          path: c.oficina_path_orden,
          subgrupos: {},
        };
      }
      if (!grupos[ofName].subgrupos[c.id_usuario]) {
        grupos[ofName].subgrupos[c.id_usuario] = {
          key: c.id_usuario,
          nombre: c.usuario_nombre,
          citaciones: [],
        };
      }
      grupos[ofName].subgrupos[c.id_usuario].citaciones.push(c);
    });

    return Object.values(grupos)
      .map((g) => {
        const subgrupos = Object.values(g.subgrupos)
          .map((s) => ({
            ...s,
            citaciones: [...s.citaciones].sort((a, b) => {
              const cmp = new Date(a.fecha_cita).getTime() - new Date(b.fecha_cita).getTime();
              return ordenDescendente ? -cmp : cmp;
            }),
          }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        return {
          key: g.key,
          titulo: g.titulo,
          path: g.path,
          total: subgrupos.reduce((acc, s) => acc + s.citaciones.length, 0),
          subgrupos,
        };
      })
      .sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
  }, [listaVisual, isMounted, ordenDescendente]);

  const resetOficinas = useCallback(() => {
    setOficinasAbiertas({});
    setEmpleadosAbiertos({});
  }, []);

  const handleSeleccionMes = useCallback(
    (mes: number, anio: number) => {
      setMesSeleccionado(mes);
      setAnioSeleccionado(anio);
      const { start, end } = rangoMes(mes, anio);
      setFechaInicialRango(start);
      setFechaFinalRango(end);
      resetOficinas();
    },
    [resetOficinas],
  );

  const handleMostrarOficina = () => {
    setOficinaFiltroId(nivel3Id || nivel2Id);
    resetOficinas();
  };

  const toggleOficina = (nombre: string) => {
    setOficinasAbiertas((prev) => ({ ...prev, [nombre]: !prev[nombre] }));
  };

  const toggleEmpleado = (userId: string) => {
    setEmpleadosAbiertos((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleCerrarModal = () => {
    setCitacionModal(null);
    invalidate();
  };

  if (!isMounted || loading) {
    return <Cargando texto="Cargando citaciones..." />;
  }

  return (
    <>
      <div className="w-full xl:w-4/5 mx-auto md:px-4">
        <div className="p-2 bg-white dark:bg-neutral-950 rounded-lg shadow-md w-full border border-gray-100 dark:border-neutral-800 transition-colors duration-200">
          <CitacionesControls
            mesSeleccionado={mesSeleccionado}
            anioSeleccionado={anioSeleccionado}
            onMesChange={handleSeleccionMes}
            nivel2Id={nivel2Id}
            setNivel2Id={setNivel2Id}
            nivel3Id={nivel3Id}
            setNivel3Id={setNivel3Id}
            oficinasNivel2={oficinasNivel2}
            oficinasNivel3={oficinasNivel3}
            handleMostrarOficina={handleMostrarOficina}
            fechaInicialRango={fechaInicialRango}
            setFechaInicialRango={setFechaInicialRango}
            fechaFinalRango={fechaFinalRango}
            setFechaFinalRango={setFechaFinalRango}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            busquedaPor={busquedaPor}
            setBusquedaPor={setBusquedaPor}
            ordenDescendente={ordenDescendente}
            setOrdenDescendente={setOrdenDescendente}
            mostrarBotonNuevo={canOpenModal}
            etiquetaBotonNuevo="Nueva Citación"
            onNuevo={() => setModalSeleccionEmpleado(true)}
          />

          <div className="border-t border-gray-200 dark:border-neutral-800 pt-4 mt-4">
            {loadingDependencias ? (
              <Cargando texto="Cargando citaciones..." />
            ) : (
              <div className="w-full">
                <div className="flex items-center gap-0.5 mb-3 border-b border-gray-200 dark:border-neutral-800 pb-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {ESTADO_ORDEN.map((tab) => {
                    const styles = ESTADO_TAB_STYLES[tab];
                    const isActive = filtroEstado === tab;
                    const Icon =
                      tab === 'Todas'
                        ? Calendar
                        : tab === 'Confirmadas'
                          ? CheckCircle2
                          : tab === 'Pendientes'
                            ? Clock
                            : AlertCircle;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setFiltroEstado(tab)}
                        className={`flex items-center gap-1 px-2.5 py-2 font-semibold text-[11px] sm:text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          isActive ? styles.active : styles.inactive
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {tab} ({conteos[tab]})
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="w-full overflow-x-auto rounded-lg border border-gray-100 dark:border-neutral-800">
                  {listaVisual.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <SearchX size={28} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-gray-200">
                        No se encontraron citaciones
                      </p>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                        Solo aparecen empleados que ya tienen citaciones en el periodo.
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 dark:bg-neutral-900 text-left">
                        <tr>
                          <th className="py-3 px-3 text-[10px] xl:text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Empleado / Citaciones
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {citacionesAgrupadas.map((grupo) => {
                          const estaAbierta = oficinasAbiertas[grupo.key] || false;
                          return (
                            <Fragment key={grupo.key}>
                              <tr>
                                <td colSpan={1} className="p-0">
                                  <div
                                    onClick={() => toggleOficina(grupo.key)}
                                    className="bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 cursor-pointer transition-colors py-2.5 px-4 text-sm font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-between rounded-sm"
                                  >
                                    <span>
                                      {grupo.titulo} ({grupo.total})
                                    </span>
                                    <motion.div
                                      initial={false}
                                      animate={{ rotate: estaAbierta ? 180 : 0 }}
                                      transition={{ duration: 0.3 }}
                                    >
                                      <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                    </motion.div>
                                  </div>
                                </td>
                              </tr>
                              <AnimatePresence initial={false}>
                                {estaAbierta && (
                                  <tr>
                                    <td colSpan={1} className="p-0">
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        style={{ overflow: 'hidden' }}
                                      >
                                        <div className="divide-y divide-slate-100 dark:divide-neutral-800">
                                          {grupo.subgrupos.map((persona) => {
                                            const empleadoAbierto = empleadosAbiertos[persona.key] || false;
                                            return (
                                            <div key={persona.key} className="px-3 py-2">
                                              <div
                                                onClick={() => toggleEmpleado(persona.key)}
                                                className="flex items-center gap-2 px-2 py-2 rounded-md bg-slate-100/80 dark:bg-neutral-800/40 cursor-pointer hover:bg-slate-200/80 dark:hover:bg-neutral-700/50"
                                              >
                                                <User size={14} className="text-slate-400 shrink-0" />
                                                <span className="text-xs font-bold text-slate-700 dark:text-gray-200 truncate flex-1">
                                                  {persona.nombre}
                                                </span>
                                                <span className="shrink-0 text-[10px] font-semibold bg-slate-200 dark:bg-neutral-700 text-slate-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                                  {persona.citaciones.length}
                                                </span>
                                                <motion.div
                                                  initial={false}
                                                  animate={{ rotate: empleadoAbierto ? 180 : 0 }}
                                                  transition={{ duration: 0.3 }}
                                                >
                                                  <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400 shrink-0" />
                                                </motion.div>
                                              </div>
                                              <AnimatePresence initial={false}>
                                                {empleadoAbierto && (
                                                  <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                    style={{ overflow: 'hidden' }}
                                                    className="mt-2 space-y-2 pl-2"
                                                  >
                                                {persona.citaciones.map((citacion) => {
                                                  const pendiente = citacion.estado === 'Pendiente';
                                                  const vencida = clasificar(citacion) === 'Vencidas';
                                                  return (
                                                    <button
                                                      key={citacion.id}
                                                      type="button"
                                                      onClick={() => {
                                                        if (!canOpenModal) return;
                                                        setCitacionModal({
                                                          userId: persona.key,
                                                          citacion,
                                                        });
                                                      }}
                                                      className={`relative w-full text-left p-3 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden transition-colors ${
                                                        canOpenModal
                                                          ? 'hover:bg-slate-50 dark:hover:bg-neutral-800 cursor-pointer'
                                                          : 'cursor-default'
                                                      }`}
                                                    >
                                                      <div
                                                        className={`absolute left-0 top-0 bottom-0 w-1 ${
                                                          vencida
                                                            ? 'bg-red-500'
                                                            : pendiente
                                                              ? 'bg-orange-500'
                                                              : 'bg-emerald-500'
                                                        }`}
                                                      />
                                                      <div className="pl-2">
                                                        <span
                                                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider mb-1.5 ${
                                                            vencida
                                                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                              : pendiente
                                                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                          }`}
                                                        >
                                                          {pendiente ? (
                                                            <Clock className="w-3 h-3 mr-1" />
                                                          ) : (
                                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                                          )}
                                                          {vencida ? 'Vencida' : citacion.estado}
                                                        </span>
                                                        <p className="text-sm font-semibold text-slate-800 dark:text-gray-100 whitespace-pre-wrap">
                                                          {citacion.motivo}
                                                        </p>
                                                        <p className="mt-1 text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1.5">
                                                          <Calendar size={12} className="shrink-0" />
                                                          {formatearFechaCita(citacion.fecha_cita)}
                                                        </p>
                                                        {citacion.fecha_confirmado && (
                                                          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                                            Confirmación:{' '}
                                                            {formatearConfirmacion(
                                                              citacion.fecha_confirmado,
                                                            )}
                                                          </p>
                                                        )}
                                                      </div>
                                                    </button>
                                                  );
                                                })}
                                                  </motion.div>
                                                )}
                                              </AnimatePresence>
                                            </div>
                                            );
                                          })}
                                        </div>
                                      </motion.div>
                                    </td>
                                  </tr>
                                )}
                              </AnimatePresence>
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Transition show={!!citacionModal} as={Fragment}>
        <Dialog onClose={() => {}} className="relative z-50">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30 dark:bg-black/70 backdrop-blur-sm" />
          </TransitionChild>
          <div className="fixed inset-0 flex items-center justify-center p-1 sm:p-4">
            <DialogPanel className="w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-neutral-700 overflow-hidden bg-white dark:bg-neutral-900 ring-1 ring-black/5">
              {citacionModal && (
                <CitacionForm
                  id={citacionModal.userId}
                  initialData={citacionModal.citacion}
                  nombreEmpleado={
                    citacionModal.citacion?.usuario_nombre ??
                    usuariosMap.get(citacionModal.userId)?.nombre
                  }
                  onSuccess={handleCerrarModal}
                  onCancel={handleCerrarModal}
                />
              )}
            </DialogPanel>
          </div>
        </Dialog>
      </Transition>

      <SelectorEmpleadoModal
        open={modalSeleccionEmpleado}
        onClose={() => setModalSeleccionEmpleado(false)}
        empleados={empleadosDisponibles}
        titulo="Nueva citación"
        onSelect={(userId) => {
          setModalSeleccionEmpleado(false);
          setCitacionModal({ userId });
        }}
      />
    </>
  );
}
