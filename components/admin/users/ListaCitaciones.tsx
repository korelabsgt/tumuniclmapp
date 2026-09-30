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
import { AccordionToggleButton } from '@/components/ui/accordion-toggle';
import { motion, AnimatePresence } from 'framer-motion';
import { parseISO } from 'date-fns';
import {
  SearchX,
  ChevronDown,
  ChevronRight,
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

  const todosAbiertos = useMemo(
    () =>
      citacionesAgrupadas.length > 0 &&
      citacionesAgrupadas.every(
        (g) =>
          oficinasAbiertas[g.key] &&
          g.subgrupos.every((s) => empleadosAbiertos[s.key]),
      ),
    [citacionesAgrupadas, oficinasAbiertas, empleadosAbiertos],
  );

  const toggleTodosAcordeon = () => {
    if (todosAbiertos) {
      setOficinasAbiertas({});
      setEmpleadosAbiertos({});
      return;
    }
    const ofNext: Record<string, boolean> = {};
    const empNext: Record<string, boolean> = {};
    citacionesAgrupadas.forEach((g) => {
      ofNext[g.key] = true;
      g.subgrupos.forEach((s) => {
        empNext[s.key] = true;
      });
    });
    setOficinasAbiertas(ofNext);
    setEmpleadosAbiertos(empNext);
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
                <div className="mb-3 flex items-center gap-2 border-b border-gray-200 pb-1 dark:border-neutral-800">
                  <div className="flex flex-1 items-center gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  {listaVisual.length > 0 && (
                    <AccordionToggleButton
                      expanded={todosAbiertos}
                      onToggle={toggleTodosAcordeon}
                    />
                  )}
                </div>

                <div className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto w-full">
                    <div className="divide-y divide-slate-300 dark:divide-neutral-700 min-w-[700px] w-full">
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
                        citacionesAgrupadas.map((grupo) => {
                          const estaAbierta = oficinasAbiertas[grupo.key] || false;
                          return (
                            <div key={grupo.key} className="border-b last:border-b-0 border-slate-200 dark:border-neutral-800">
                              {/* Barra de Oficina */}
                              <div
                                onClick={() => toggleOficina(grupo.key)}
                                className="bg-slate-100 dark:bg-neutral-800/90 hover:bg-slate-200/70 dark:hover:bg-neutral-800 px-4 py-2.5 flex items-center justify-between border-b border-slate-300 dark:border-neutral-700 cursor-pointer transition-colors select-none sticky left-0 z-10"
                              >
                                <div className="flex items-center gap-2">
                                  <motion.div
                                    initial={false}
                                    animate={{ rotate: estaAbierta ? 90 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="shrink-0"
                                  >
                                    <ChevronRight className="w-4 h-4 text-slate-500" />
                                  </motion.div>
                                  <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                    {grupo.titulo}
                                  </span>
                                </div>
                              </div>

                              <AnimatePresence initial={false}>
                                {estaAbierta && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                                    className="overflow-hidden divide-y divide-slate-200 dark:divide-neutral-800"
                                  >
                                    {grupo.subgrupos.map((persona, userIdx) => {
                                      const empleadoAbierto = empleadosAbiertos[persona.key] || false;
                                      const totalPendientes = persona.citaciones.filter((c) => c.estado === 'Pendiente' && clasificar(c) !== 'Vencidas').length;
                                      const totalVencidas = persona.citaciones.filter((c) => clasificar(c) === 'Vencidas').length;

                                      return (
                                        <div key={persona.key} className="border-b last:border-b-0 border-slate-200 dark:border-neutral-800">
                                          {/* Fila del Empleado */}
                                          <div
                                            onClick={() => toggleEmpleado(persona.key)}
                                            className="grid grid-cols-[3.5rem_1fr] items-center bg-slate-50 dark:bg-neutral-800/50 hover:bg-slate-100 dark:hover:bg-neutral-800 border-b border-slate-300 dark:border-neutral-700 cursor-pointer transition-colors select-none sticky left-0 z-10"
                                          >
                                        {/* Columna NO. con Chevron y Número a 2 dígitos */}
                                        <div className="py-2.5 px-1 border-r border-slate-300 dark:border-neutral-700 flex items-center justify-center gap-1">
                                          <motion.div
                                            initial={false}
                                            animate={{ rotate: empleadoAbierto ? 90 : 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="shrink-0"
                                          >
                                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                                          </motion.div>
                                          <span className="font-mono font-bold text-slate-500 dark:text-slate-400 text-xs">
                                            {String(userIdx + 1).padStart(2, '0')}
                                          </span>
                                        </div>

                                        {/* Contenido del Empleado */}
                                        <div className="px-3 sm:px-4 py-2 flex items-center justify-between gap-2 min-w-0">
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <User className="w-4 h-4 text-blue-500 shrink-0" />
                                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase truncate">
                                              {persona.nombre}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-2 text-[10px] shrink-0">
                                            {totalPendientes > 0 && (
                                              <span className="flex items-center gap-1 text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded border border-orange-200 dark:border-orange-800 font-medium">
                                                <Clock size={11} /> {totalPendientes} Pendiente{totalPendientes !== 1 ? 's' : ''}
                                              </span>
                                            )}
                                            {totalVencidas > 0 && (
                                              <span className="flex items-center gap-1 text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800 font-medium">
                                                <AlertCircle size={11} /> {totalVencidas} Vencida{totalVencidas !== 1 ? 's' : ''}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Sub-tabla Desplegable de Citaciones */}
                                      <AnimatePresence initial={false}>
                                        {empleadoAbierto && (
                                          <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                                            className="overflow-hidden"
                                          >
                                            <div>
                                              {/* Encabezados internos de la Citación */}
                                              <div className="grid grid-cols-[3.5rem_1.4fr_2fr_1.4fr] items-stretch text-[11px] sm:text-xs bg-slate-100/90 dark:bg-neutral-800/80 font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide border-b border-slate-300 dark:border-neutral-700">
                                                <div className="px-2 py-2 border-r border-slate-300 dark:border-neutral-700 flex items-center justify-center">
                                                  No.
                                                </div>
                                                <div className="px-3 sm:px-4 py-2 border-r border-slate-300 dark:border-neutral-700 flex items-center">
                                                  Fecha Cita
                                                </div>
                                                <div className="px-3 sm:px-4 py-2 border-r border-slate-300 dark:border-neutral-700 flex items-center">
                                                  Motivo
                                                </div>
                                                <div className="px-3 sm:px-4 py-2 flex items-center justify-center">
                                                  Estado / Confirmación
                                                </div>
                                              </div>

                                              <div className="divide-y divide-slate-300 dark:divide-neutral-700">
                                                {persona.citaciones.map((citacion, citIdx) => {
                                                  const pendiente = citacion.estado === 'Pendiente';
                                                  const vencida = clasificar(citacion) === 'Vencidas';

                                                  return (
                                                    <div
                                                      key={citacion.id}
                                                      onClick={() => {
                                                        if (!canOpenModal) return;
                                                        setCitacionModal({
                                                          userId: persona.key,
                                                          citacion,
                                                        });
                                                      }}
                                                      className={`grid grid-cols-[3.5rem_1.4fr_2fr_1.4fr] items-stretch text-[11px] sm:text-xs bg-white dark:bg-neutral-900/80 transition-colors ${
                                                        canOpenModal
                                                          ? 'hover:bg-slate-50/80 dark:hover:bg-neutral-800/60 cursor-pointer'
                                                          : 'cursor-default'
                                                      }`}
                                                    >
                                                      {/* No. */}
                                                      <div className="px-2 py-2.5 border-r border-slate-300 dark:border-neutral-700 flex items-center justify-center text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                                                        {String(citIdx + 1).padStart(2, '0')}
                                                      </div>

                                                      {/* Fecha Cita */}
                                                      <div className="px-3 sm:px-4 py-2.5 border-r border-slate-300 dark:border-neutral-700 flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                                        <Calendar size={13} className="shrink-0 text-slate-400" />
                                                        <span className="capitalize font-medium">
                                                          {formatearFechaCita(citacion.fecha_cita)}
                                                        </span>
                                                      </div>

                                                      {/* Motivo */}
                                                      <div className="px-3 sm:px-4 py-2.5 border-r border-slate-300 dark:border-neutral-700 flex items-center text-slate-700 dark:text-slate-300 font-medium">
                                                        <span className="line-clamp-2">
                                                          {citacion.motivo}
                                                        </span>
                                                      </div>

                                                      {/* Estado / Confirmación */}
                                                      <div className="px-2 py-2 flex flex-col items-center justify-center gap-1 text-center">
                                                        <span
                                                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                                            vencida
                                                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800'
                                                              : pendiente
                                                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800'
                                                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                                          }`}
                                                        >
                                                          {pendiente ? (
                                                            <Clock className="w-3 h-3 mr-1" />
                                                          ) : vencida ? (
                                                            <AlertCircle className="w-3 h-3 mr-1" />
                                                          ) : (
                                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                                          )}
                                                          {vencida ? 'Vencida' : citacion.estado}
                                                        </span>
                                                        {citacion.fecha_confirmado && (
                                                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                                            {formatearConfirmacion(citacion.fecha_confirmado)}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })
                  )}
                    </div>
                  </div>
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
