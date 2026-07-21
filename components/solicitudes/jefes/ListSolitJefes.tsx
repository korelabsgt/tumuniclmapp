'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSolicitudesJefes, useSolicitudJefeMutations } from './lib/hook';
import { SolicitudJefe } from './lib/zod';
import SolitJefeItem from './SolitJefeItem';
import CrearSolicitud from './modals/CrearSolicitud';
import CambioEstadoJefesModal from './modals/CambioEstadoJefesModal';

import { Search, SearchX, Plus, RefreshCw, ChevronLeft, ChevronRight, ArrowUpDown, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import SelectorMesAnio from '@/components/tareas/SelectorMesAnio';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isSameDay,
  isSameMonth,
  parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';
import Swal from 'sweetalert2';

const TAB_STYLES: Record<string, { active: string; inactive: string; badge: string }> = {
  pendiente: {
    active: 'bg-amber-500 text-white shadow-sm',
    inactive: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40',
  },
  completado: {
    active: 'bg-emerald-600 text-white shadow-sm',
    inactive: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40',
  },
  rechazado: {
    active: 'bg-red-600 text-white shadow-sm',
    inactive: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40',
  },
};

const GT_OFFSET_MS = -6 * 60 * 60 * 1000;

const getGTDate = (dateString: string) => {
  const utc = new Date(dateString);
  return new Date(utc.getTime() + GT_OFFSET_MS);
};

const getLocalDayParts = (dateString: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [y, m, d] = dateString.split('-').map(Number);
    return { year: y, month: m - 1, day: d };
  }
  const dateGT = getGTDate(dateString);
  return { year: dateGT.getFullYear(), month: dateGT.getMonth(), day: dateGT.getDate() };
};

const getFechaCriterio = (sol: SolicitudJefe, criterio: 'actividad' | 'solicitud') => {
  if (criterio === 'actividad' && sol.fecha_solicitud) return sol.fecha_solicitud;
  return sol.created_at;
};

const toFechaKey = (dateString: string) => {
  const parts = getLocalDayParts(dateString);
  return `${parts.year}-${String(parts.month + 1).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
};

const rangoMesActual = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
};

const getWeekDays = (date: Date) =>
  eachDayOfInterval({
    start: startOfWeek(date, { locale: es, weekStartsOn: 1 }),
    end: endOfWeek(date, { locale: es, weekStartsOn: 1 }),
  });

interface Props {
  initialData: SolicitudJefe[];
  userServerSide?: {
    userId: string | null;
    isOperario: boolean;
  };
}

export default function ListSolitJefes({ initialData }: Props) {
  const { solicitudes, loading, refresh } = useSolicitudesJefes(initialData);
  const { eliminar } = useSolicitudJefeMutations();
  const [isMounted, setIsMounted] = useState(false);
  const [isCrearOpen, setIsCrearOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingSolicitud, setEditingSolicitud] = useState<SolicitudJefe | null>(null);
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudJefe | null>(null);
  const [isEstadoModalOpen, setIsEstadoModalOpen] = useState(false);
  const scrollPositionRef = useRef(0);

  const toggleAccordion = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      scrollPositionRef.current = window.scrollY;
      setExpandedId(id);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  useEffect(() => {
    if (expandedId === null) {
      window.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
    }
  }, [expandedId]);

  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [criterioFecha, setCriterioFecha] = useState<'actividad' | 'solicitud'>('actividad');
  const [filtroTipo, setFiltroTipo] = useState<'mes' | 'rango'>('mes');
  const [fechaReferencia, setFechaReferencia] = useState(() => new Date());
  const [semanaVista, setSemanaVista] = useState(() => new Date());
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | undefined>(undefined);
  const [todoElAnio, setTodoElAnio] = useState(false);
  const [fechaInicialRango, setFechaInicialRango] = useState(() => rangoMesActual().start);
  const [fechaFinalRango, setFechaFinalRango] = useState(() => rangoMesActual().end);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const diasDeLaSemana = useMemo(() => getWeekDays(semanaVista), [semanaVista]);

  const puedeSemanaAnterior = useMemo(() => {
    const inicioMes = startOfMonth(fechaReferencia);
    return startOfWeek(semanaVista, { locale: es, weekStartsOn: 1 }) >
      startOfWeek(inicioMes, { locale: es, weekStartsOn: 1 });
  }, [semanaVista, fechaReferencia]);

  const puedeSemanaSiguiente = useMemo(() => {
    const finMes = endOfMonth(fechaReferencia);
    return startOfWeek(semanaVista, { locale: es, weekStartsOn: 1 }) <
      startOfWeek(finMes, { locale: es, weekStartsOn: 1 });
  }, [semanaVista, fechaReferencia]);

  const coincideBusqueda = (sol: SolicitudJefe) => {
    const lowerTerm = searchTerm.toLowerCase();
    return (
      (sol.nombre_responsable || '').toLowerCase().includes(lowerTerm) ||
      (sol.ubicacion || '').toLowerCase().includes(lowerTerm) ||
      (sol.telefono_contacto || '').toLowerCase().includes(lowerTerm) ||
      sol.id.toLowerCase().includes(lowerTerm)
    );
  };

  const solicitudesBase = useMemo(() => {
    if (!isMounted) return [];
    return solicitudes.filter((sol) => {
      if (!coincideBusqueda(sol)) return false;
      if (filtroEstado !== 'Todos' && sol.estado !== filtroEstado) return false;
      return Boolean(getFechaCriterio(sol, criterioFecha));
    });
  }, [solicitudes, searchTerm, filtroEstado, criterioFecha, isMounted]);

  const conteoPorDia = useMemo(() => {
    const map: Record<string, number> = {};
    solicitudesBase.forEach((sol) => {
      const fechaRef = getFechaCriterio(sol, criterioFecha);
      if (!fechaRef) return;
      const key = toFechaKey(fechaRef);
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [solicitudesBase, criterioFecha]);

  const solicitudesFiltradas = useMemo(() => {
    return solicitudesBase.filter((sol) => {
      const fechaRef = getFechaCriterio(sol, criterioFecha);
      if (!fechaRef) return false;
      const key = toFechaKey(fechaRef);
      const solDay = parseISO(key + 'T00:00:00');

      if (filtroTipo === 'mes') {
        if (todoElAnio) {
          return solDay.getFullYear() === fechaReferencia.getFullYear();
        }
        if (diaSeleccionado) {
          return isSameDay(solDay, diaSeleccionado);
        }
        return (
          solDay.getMonth() === fechaReferencia.getMonth() &&
          solDay.getFullYear() === fechaReferencia.getFullYear()
        );
      }

      if (!fechaInicialRango || !fechaFinalRango) return false;
      const inicio = parseISO(fechaInicialRango + 'T00:00:00');
      const fin = parseISO(fechaFinalRango + 'T00:00:00');
      return solDay >= inicio && solDay <= fin;
    }).sort((a, b) => {
      const aKey = toFechaKey(getFechaCriterio(a, criterioFecha));
      const bKey = toFechaKey(getFechaCriterio(b, criterioFecha));
      if (bKey !== aKey) return bKey.localeCompare(aKey);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [
    solicitudesBase,
    criterioFecha,
    filtroTipo,
    diaSeleccionado,
    todoElAnio,
    fechaReferencia,
    fechaInicialRango,
    fechaFinalRango,
  ]);

  const solicitudesParaConteo = useMemo(
    () => solicitudes.filter((sol) => coincideBusqueda(sol)),
    [solicitudes, searchTerm],
  );

  const conteos = useMemo(
    () => ({
      pendiente: solicitudesParaConteo.filter((s) => s.estado === 'pendiente').length,
      completado: solicitudesParaConteo.filter((s) => s.estado === 'completado').length,
      rechazado: solicitudesParaConteo.filter((s) => s.estado === 'rechazado').length,
    }),
    [solicitudesParaConteo],
  );

  const groupedSolicitudes = useMemo(() => {
    const groups: { key: string; label: string; items: SolicitudJefe[] }[] = [];
    solicitudesFiltradas.forEach((sol) => {
      const fechaRef = getFechaCriterio(sol, criterioFecha);
      const key = toFechaKey(fechaRef);
      let group = groups.find((g) => g.key === key);
      if (!group) {
        const dateObj = parseISO(key + 'T00:00:00');
        group = {
          key,
          label: format(dateObj, "eeee, d 'de' LLLL", { locale: es }),
          items: [],
        };
        groups.push(group);
      }
      group.items.push(sol);
    });
    return groups;
  }, [solicitudesFiltradas, criterioFecha]);

  const semanaInicialDelMes = (mes: number, anio: number) => {
    const ahora = new Date();
    if (mes === ahora.getMonth() && anio === ahora.getFullYear()) return ahora;
    return new Date(anio, mes, 1);
  };

  const handleFiltroTipoClick = (tipo: 'mes' | 'rango') => {
    setFiltroTipo(tipo);
    setDiaSeleccionado(undefined);
    setTodoElAnio(false);
    if (tipo === 'rango') {
      const { start, end } = rangoMesActual();
      setFechaInicialRango(start);
      setFechaFinalRango(end);
    } else {
      setSemanaVista(semanaInicialDelMes(fechaReferencia.getMonth(), fechaReferencia.getFullYear()));
    }
  };

  const handleSeleccionFecha = (mes: number, anio: number) => {
    setFechaReferencia(new Date(anio, mes, 1));
    setSemanaVista(semanaInicialDelMes(mes, anio));
    setDiaSeleccionado(undefined);
    setTodoElAnio(false);
  };

  const handleSeleccionAnio = (anio: number) => {
    setFechaReferencia(new Date(anio, 0, 1));
    setSemanaVista(new Date(anio, 0, 1));
    setDiaSeleccionado(undefined);
    setTodoElAnio(true);
  };

  const handleSeleccionDia = (dia: Date) => {
    if (!isSameMonth(dia, fechaReferencia)) return;
    setTodoElAnio(false);
    if (diaSeleccionado && isSameDay(dia, diaSeleccionado)) {
      setDiaSeleccionado(undefined);
      return;
    }
    setDiaSeleccionado(dia);
  };

  const irSemanaAnterior = () => {
    if (!puedeSemanaAnterior) return;
    setSemanaVista((prev) => subWeeks(prev, 1));
    setDiaSeleccionado(undefined);
  };

  const irSemanaSiguiente = () => {
    if (!puedeSemanaSiguiente) return;
    setSemanaVista((prev) => addWeeks(prev, 1));
    setDiaSeleccionado(undefined);
  };

  const handleCambiarEstado = (sol: SolicitudJefe) => {
    setSelectedSolicitud(sol);
    setIsEstadoModalOpen(true);
  };

  const handleEditar = (sol: SolicitudJefe) => {
    setEditingSolicitud(sol);
    setIsCrearOpen(true);
  };

  const handleEliminar = async (sol: SolicitudJefe) => {
    const result = await Swal.fire({
      title: '¿Eliminar solicitud?',
      html: `<p style="margin-top:8px">Se eliminará permanentemente la solicitud de <b>${sol.ubicacion || 'sin ubicación'}</b>.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
    });

    if (!result.isConfirmed) return;

    try {
      const res = await eliminar.mutateAsync(sol.id);
      if (res.success) {
        Swal.fire({
          title: '¡Eliminada!',
          text: 'La solicitud fue eliminada.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
        });
        refresh();
      } else {
        Swal.fire('Error', res.error || 'No se pudo eliminar', 'error');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al eliminar';
      Swal.fire('Error', message, 'error');
    }
  };

  const solicitudExpandida = useMemo(() => {
    if (!expandedId) return null;
    return solicitudes.find((s) => s.id === expandedId) ?? solicitudesFiltradas.find((s) => s.id === expandedId) ?? null;
  }, [expandedId, solicitudes, solicitudesFiltradas]);

  if (!isMounted) return null;

  const pestañas = ['pendiente', 'completado', 'rechazado'] as const;
  const pestañasLabel: Record<string, string> = {
    pendiente: 'Pendiente',
    completado: 'Confirmado',
    rechazado: 'Rechazado',
  };

  return (
    <div className="max-w-[1600px] w-full mx-auto px-2 sm:px-6 lg:px-8 flex flex-col gap-4 pb-20 mt-5 sm:mt-7">
      {!expandedId && (
        <>
      <div className="flex flex-col sm:flex-row justify-between items-center sm:items-center gap-3 sm:gap-4 text-center sm:text-left">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Solicitudes de Jefes
          </h1>
          <p className="text-slate-500 dark:text-gray-400 text-sm font-medium">
            Gestione las solicitudes entre jefes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64 group">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
            />
            <input
              type="text"
              placeholder="Buscar nombre, ubicación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 dark:text-gray-200"
            />
          </div>
          <button
            onClick={() => setIsCrearOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold text-white transition-all shadow-sm whitespace-nowrap cursor-pointer"
          >
            <Plus size={16} />
            <span>NUEVA SOLICITUD</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full">
        <div className="flex flex-col xl:grid xl:grid-cols-[1fr_auto_1fr] items-stretch xl:items-center gap-3 w-full">
          <div className="flex items-center justify-stretch xl:justify-start gap-1 bg-white/90 dark:bg-neutral-900/90 p-1 rounded-lg border border-slate-200 dark:border-neutral-800 w-full xl:w-fit overflow-x-auto xl:justify-self-start">
            {pestañas.map((tab) => {
              const styles = TAB_STYLES[tab];
              const isActive = filtroEstado === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setFiltroEstado(isActive ? 'Todos' : tab)}
                  className={`flex flex-1 xl:flex-none items-center justify-center gap-1.5 px-2 h-8 rounded-md text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap uppercase tracking-tight cursor-pointer
                    ${isActive ? styles.active : styles.inactive}`}
                >
                  {pestañasLabel[tab]}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] min-w-[18px] text-center font-extrabold
                    ${isActive ? 'bg-white/20 text-white' : styles.badge}`}
                  >
                    {conteos[tab]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-nowrap items-stretch justify-between gap-1.5 sm:gap-2 w-full xl:w-auto xl:justify-center pb-0.5 xl:pb-0 justify-self-center h-9">
            <div className="grid grid-cols-2 gap-1 bg-white/90 dark:bg-neutral-900/90 p-0.5 rounded-lg border border-slate-200 dark:border-neutral-800 shrink-0 flex-[0.9] xl:flex-none xl:w-[10.5rem] h-full min-w-[5.5rem]">
              <button
                type="button"
                onClick={() => handleFiltroTipoClick('mes')}
                className={`w-full h-full px-1 sm:px-2 rounded-md text-[10px] sm:text-xs font-bold transition-all duration-300 whitespace-nowrap uppercase tracking-tight cursor-pointer ${
                  filtroTipo === 'mes'
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400'
                }`}
              >
                Mes
              </button>
              <button
                type="button"
                onClick={() => handleFiltroTipoClick('rango')}
                className={`w-full h-full px-1 sm:px-2 rounded-md text-[10px] sm:text-xs font-bold transition-all duration-300 whitespace-nowrap uppercase tracking-tight cursor-pointer ${
                  filtroTipo === 'rango'
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400'
                }`}
              >
                Rango
              </button>
            </div>

            <div className="relative flex items-center justify-center flex-1 min-w-0 h-full xl:flex-none xl:shrink-0">
              <AnimatePresence mode="wait" initial={false}>
                {filtroTipo === 'mes' ? (
                  <motion.div
                    key="selector-mes"
                    initial={{ opacity: 0, x: -12, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, x: 12, filter: 'blur(4px)' }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center h-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-transparent px-0.5 w-full xl:w-fit"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(fechaReferencia.getFullYear(), fechaReferencia.getMonth() - 1, 1);
                        handleSeleccionFecha(d.getMonth(), d.getFullYear());
                      }}
                      className="h-full px-1 sm:px-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-neutral-800 transition-all duration-300 cursor-pointer flex items-center shrink-0"
                      aria-label="Mes anterior"
                    >
                      <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                    <SelectorMesAnio
                      mes={fechaReferencia.getMonth()}
                      anio={fechaReferencia.getFullYear()}
                      onChange={handleSeleccionFecha}
                      onSelectAnio={handleSeleccionAnio}
                      anioActivo={todoElAnio}
                      etiqueta={
                        todoElAnio
                          ? String(fechaReferencia.getFullYear())
                          : undefined
                      }
                      mostrarFlechas={false}
                      aniosDisponibles={Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i)}
                      className="!w-full xl:!w-auto !h-full !border-0 !rounded-md !bg-transparent dark:!bg-transparent [&_button]:!h-full [&_button]:!py-0 [&_button]:!w-full"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(fechaReferencia.getFullYear(), fechaReferencia.getMonth() + 1, 1);
                        handleSeleccionFecha(d.getMonth(), d.getFullYear());
                      }}
                      className="h-full px-1 sm:px-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-neutral-800 transition-all duration-300 cursor-pointer flex items-center shrink-0"
                      aria-label="Mes siguiente"
                    >
                      <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="selector-rango"
                    initial={{ opacity: 0, x: 12, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, x: -12, filter: 'blur(4px)' }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center gap-1 sm:gap-1.5 w-full xl:w-auto h-full"
                  >
                    <Input
                      type="date"
                      value={fechaInicialRango}
                      onChange={(e) => setFechaInicialRango(e.target.value)}
                      className="flex-1 min-w-0 sm:w-[8.5rem] sm:flex-none text-[10px] sm:text-[11px] h-full px-1 sm:px-2 py-0 border border-slate-200 dark:border-neutral-700 focus-visible:ring-0 bg-transparent dark:bg-transparent dark:text-gray-100 rounded-lg"
                    />
                    <span className="text-slate-400 text-[10px] shrink-0">a</span>
                    <Input
                      type="date"
                      value={fechaFinalRango}
                      onChange={(e) => setFechaFinalRango(e.target.value)}
                      className="flex-1 min-w-0 sm:w-[8.5rem] sm:flex-none text-[10px] sm:text-[11px] h-full px-1 sm:px-2 py-0 border border-slate-200 dark:border-neutral-700 focus-visible:ring-0 bg-transparent dark:bg-transparent dark:text-gray-100 rounded-lg"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex xl:hidden items-stretch gap-1.5 flex-1 min-w-0 h-full">
              <div className="relative h-full flex-1 min-w-0">
                <ArrowUpDown
                  size={12}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <select
                  value={criterioFecha}
                  onChange={(e) => setCriterioFecha(e.target.value as 'actividad' | 'solicitud')}
                  className="h-full w-full pl-6 pr-1 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all duration-300"
                >
                  <option value="actividad">Por actividad</option>
                  <option value="solicitud">Por solicitud</option>
                </select>
              </div>
              <button
                onClick={() => refresh()}
                className="h-full aspect-square flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-200 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-600 dark:text-slate-300 rounded-lg transition-all duration-300 shrink-0 cursor-pointer"
                title="Actualizar lista"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="hidden xl:flex items-stretch gap-2 justify-self-end w-fit h-9">
            <div className="relative h-full">
              <ArrowUpDown
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <select
                value={criterioFecha}
                onChange={(e) => setCriterioFecha(e.target.value as 'actividad' | 'solicitud')}
                className="h-full pl-8 pr-3 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all duration-300"
              >
                <option value="actividad">Fecha de actividad</option>
                <option value="solicitud">Fecha de solicitud</option>
              </select>
            </div>
            <button
              onClick={() => refresh()}
              className="h-full aspect-square flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-200 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-600 dark:text-slate-300 rounded-lg transition-all duration-300 shrink-0 cursor-pointer"
              title="Actualizar lista"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {filtroTipo === 'mes' && (
            <motion.div
              key="franja-dias"
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden w-full"
            >
              <div className="flex items-center justify-center gap-1 sm:gap-2 w-full py-0.5">
                <div className="flex items-center gap-0.5 sm:gap-1.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-transparent px-0.5 py-0.5 w-full xl:w-fit">
                <button
                  type="button"
                  onClick={irSemanaAnterior}
                  disabled={!puedeSemanaAnterior}
                  className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-neutral-800 transition-all duration-300 cursor-pointer disabled:opacity-30 disabled:pointer-events-none shrink-0"
                  aria-label="Semana anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={format(semanaVista, 'yyyy-MM-dd')}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center justify-between flex-1 min-w-0 gap-0.5 sm:gap-2"
                  >
                    {diasDeLaSemana.map((dia) => {
                      const diaStr = format(dia, 'yyyy-MM-dd');
                      const delMes = isSameMonth(dia, fechaReferencia);
                      const esDiaSeleccionado = Boolean(diaSeleccionado && isSameDay(dia, diaSeleccionado));
                      const tieneActividad = delMes && (conteoPorDia[diaStr] || 0) > 0;

                      return (
                        <button
                          type="button"
                          key={dia.toString()}
                          onClick={() => handleSeleccionDia(dia)}
                          disabled={!delMes}
                          className={`relative flex flex-1 flex-col items-center justify-center min-w-0 h-10 sm:h-11 sm:flex-none sm:w-11 rounded-md transition-all duration-300 border ${
                            !delMes
                              ? 'bg-transparent text-slate-300 border-transparent dark:text-neutral-600 cursor-not-allowed'
                              : esDiaSeleccionado
                                ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 cursor-pointer'
                                : 'bg-transparent text-slate-800 border-transparent dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-neutral-800 cursor-pointer'
                          }`}
                        >
                          {tieneActividad && (
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
                          )}
                          <span className="text-[9px] sm:text-[10px] uppercase font-semibold leading-none tracking-wide">
                            {format(dia, 'eee', { locale: es })}
                          </span>
                          <span className="text-[11px] sm:text-xs font-bold leading-tight mt-0.5">{format(dia, 'd')}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>

                <button
                  type="button"
                  onClick={irSemanaSiguiente}
                  disabled={!puedeSemanaSiguiente}
                  className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-neutral-800 transition-all duration-300 cursor-pointer disabled:opacity-30 disabled:pointer-events-none shrink-0"
                  aria-label="Semana siguiente"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="border-t border-slate-100 dark:border-neutral-800 pt-1 transition-colors">
          <p className="text-xs text-blue-600 dark:text-blue-400 text-center my-1">
            Haz click una solicitud para ver más información 🔍
          </p>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${filtroTipo}-${criterioFecha}-${filtroEstado}-${diaSeleccionado?.toISOString() ?? 'mes'}-${todoElAnio}-${fechaReferencia.getMonth()}-${fechaReferencia.getFullYear()}-${fechaInicialRango}-${fechaFinalRango}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {solicitudesFiltradas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14">
                  <SearchX size={28} className="text-slate-300 mb-3" />
                  <h3 className="text-slate-900 dark:text-white font-bold text-sm">
                    No se encontraron solicitudes
                  </h3>
                  <p className="text-slate-500 text-xs mt-1">
                    Intente cambiar el periodo o los filtros.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-0 pb-2">
                  {groupedSolicitudes.map((group) => (
                    <div key={group.key} className="flex flex-col">
                      <div className="flex items-center gap-3 px-2 sm:px-3 py-2.5">
                        <div className="flex items-center gap-2 shrink-0 capitalize text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
                          <span>{group.label}</span>
                          <span className="bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-500 dark:text-slate-400 normal-case">
                            {group.items.length}
                          </span>
                        </div>
                        <div className="flex-1 h-px bg-slate-200 dark:bg-neutral-700" />
                      </div>
                      <div className="flex flex-col gap-2 p-2 sm:p-3">
                        {group.items.map((sol) => (
                          <SolitJefeItem
                            key={sol.id}
                            sol={sol}
                            isOpen={expandedId === sol.id}
                            onToggle={() => toggleAccordion(sol.id)}
                            onCambiarEstado={handleCambiarEstado}
                            onEditar={handleEditar}
                            onEliminar={handleEliminar}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

        </>
      )}

      {expandedId && (
        <>
          <motion.button
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={() => toggleAccordion(expandedId)}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 mb-2 cursor-pointer w-fit"
          >
            <ArrowLeft size={16} /> Volver a la lista
          </motion.button>
          {solicitudExpandida && (
            <motion.div
              key={expandedId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="w-full"
            >
              <SolitJefeItem
                sol={solicitudExpandida}
                isOpen
                onToggle={() => toggleAccordion(expandedId)}
                onCambiarEstado={handleCambiarEstado}
                onEditar={handleEditar}
                onEliminar={handleEliminar}
              />
            </motion.div>
          )}
        </>
      )}

      <CrearSolicitud
        isOpen={isCrearOpen}
        onClose={() => {
          setIsCrearOpen(false);
          setEditingSolicitud(null);
        }}
        onSuccess={() => {
          setIsCrearOpen(false);
          setEditingSolicitud(null);
          refresh();
        }}
        editData={editingSolicitud}
      />

      <CambioEstadoJefesModal
        isOpen={isEstadoModalOpen}
        onClose={() => {
          setIsEstadoModalOpen(false);
          setSelectedSolicitud(null);
        }}
        onSuccess={() => {
          setIsEstadoModalOpen(false);
          setSelectedSolicitud(null);
          refresh();
        }}
        solicitud={selectedSolicitud}
      />
    </div>
  );
}
