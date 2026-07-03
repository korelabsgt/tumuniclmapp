"use client";

import React, { Fragment, useMemo } from "react";
import { format, parseISO, isSameDay, isSameMonth, differenceInDays, eachDayOfInterval, isWeekend } from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronDown,
  Search,
  Plus,
  Trash2,
  CalendarDays,
  Clock,
  FileText,
  User,
  Briefcase,
  Eye,
  Upload,
  Pencil,
  PartyPopper,
  ChevronsUpDown,
  AlertCircle,
  ArrowRight,
  ArrowUpDown,
  Calendar,
  Shield,
  Umbrella,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";
import PreviewPermiso from "./modals/PreviewPermiso";
import JustificacionPermiso from "./modals/JustificacionPermiso";
import GestionAsueto from "./modals/GestionAsueto";
import { PermisoEmpleado } from "./types";
import { Button } from "@/components/ui/button";
import Cargando from "@/components/ui/animations/Cargando";
import CrearEditarPermiso from "./modals/CrearEditarPermiso";
import { motion, AnimatePresence } from "framer-motion";
import { usePermisos, TipoVistaPermisos } from "./hooks";
import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import Calendario from "@/components/ui/Calendario";

function getSemanasDelMes(yyyyMM: string) {
  const [year, month] = yyyyMM.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  
  const semanas = [];
  let current = start;
  
  while (current <= end) {
    let weekEnd = new Date(current);
    while (weekEnd.getDay() !== 0 && weekEnd < end) {
      weekEnd.setDate(weekEnd.getDate() + 1);
    }
    
    const labelInicio = format(current, "EE d", { locale: es });
    const labelFin = format(weekEnd, "EE d", { locale: es });
    const label = `${labelInicio.charAt(0).toUpperCase() + labelInicio.slice(1)} - ${labelFin.charAt(0).toUpperCase() + labelFin.slice(1)}`.replace(/\./g, "");
    
    semanas.push({
      inicio: format(current, "yyyy-MM-dd"),
      fin: format(weekEnd, "yyyy-MM-dd"),
      label
    });
    
    current = new Date(weekEnd);
    current.setDate(current.getDate() + 1);
  }
  return semanas;
}

type CategoriaPermiso = "igss" | "vacaciones" | "academicas" | "extras" | "permisos";

const CATEGORIA_ORDEN: Record<CategoriaPermiso, number> = {
  extras: 0,
  igss: 1,
  academicas: 2,
  vacaciones: 3,
  permisos: 4,
};

interface Props {
  tipoVista: TipoVistaPermisos;
}

export default function VerPermisos({ tipoVista }: Props) {
  const { state, actions } = usePermisos(tipoVista);
  const {
    loadingPermisos,
    searchTerm,
    filtroEstado,
    fechaSeleccionada,
    modoFiltro,
    fechaInicio,
    fechaFin,
    modalAbierto,
    permisoParaEditar,
    perfilUsuario,
    oficinasAbiertas,
    todosAbiertos,
    datosAgrupados,
    estadisticas,
    conteosPendientes,
  } = state;
  const {
    setSearchTerm,
    setFiltroEstado,
    setFechaSeleccionada,
    setModoFiltro,
    setFechaInicio,
    setFechaFin,
    setModalAbierto,
    toggleOficina,
    toggleTodos,
    cargarDatos,
    handleNuevoPermiso,
    handleClickFila,
    handleEliminarPermiso,
  } = actions;

  const [modalPreviewAbierto, setModalPreviewAbierto] = React.useState(false);
  const [permisoParaImagen, setPermisoParaImagen] = React.useState<PermisoEmpleado | null>(null);
  const [modalJustificacionAbierto, setModalJustificacionAbierto] = React.useState(false);
  const [permisoParaJustificar, setPermisoParaJustificar] = React.useState<PermisoEmpleado | null>(null);
  const [modalAsuetoAbierto, setModalAsuetoAbierto] = React.useState(false);
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [calendarSemanaOpen, setCalendarSemanaOpen] = React.useState(false);
  const [calendarInicioOpen, setCalendarInicioOpen] = React.useState(false);
  const [calendarFinOpen, setCalendarFinOpen] = React.useState(false);
  const mesInputRef = React.useRef<HTMLInputElement>(null);

  const [mesSemanas, setMesSemanas] = React.useState(format(new Date(), "yyyy-MM"));
  const semanasDisponibles = useMemo(() => getSemanasDelMes(mesSemanas), [mesSemanas]);

  React.useEffect(() => {
    if (modoFiltro === 'semana' && semanasDisponibles.length > 0) {
      const matches = semanasDisponibles.some(s => s.inicio === fechaInicio && s.fin === fechaFin);
      if (!matches) {
        const hoy = format(new Date(), 'yyyy-MM-dd');
        const currentWeek = semanasDisponibles.find(s => s.inicio <= hoy && s.fin >= hoy);
        if (currentWeek) {
          setFechaInicio(currentWeek.inicio);
          setFechaFin(currentWeek.fin);
        } else {
          setFechaInicio(semanasDisponibles[0].inicio);
          setFechaFin(semanasDisponibles[0].fin);
        }
      }
    }
  }, [modoFiltro, semanasDisponibles, fechaInicio, fechaFin, setFechaInicio, setFechaFin]);

  const formatFechaCorta = (fecha: string) => {
    const d = new Date(fecha + 'T00:00:00');
    let str = format(d, "EEE, d MMM yyyy", { locale: es });
    // Capitalizar y quitar puntos si los hay (ej: "lun." -> "Lun")
    return str.split(' ').map(word => {
      let cleaned = word.replace('.', '');
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }).join(' ');
  };

  const formatFechaCompacta = (fecha: string) => {
    const d = new Date(fecha + 'T00:00:00');
    let str = format(d, "d MMM yy", { locale: es });
    return str.split(' ').map(word => {
      const cleaned = word.replace('.', '');
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }).join(' ');
  };

  const formatMes = (mesYear: string) => {
    const d = parseISO(mesYear + "-01");
    let str = format(d, "MMMM yyyy", { locale: es });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const handleVerPreview = (e: React.MouseEvent, permiso: PermisoEmpleado) => {
    e.stopPropagation();
    setPermisoParaImagen(permiso);
    setModalPreviewAbierto(true);
  };

  const handleAbrirJustificacion = (e: React.MouseEvent, permiso: PermisoEmpleado) => {
    e.stopPropagation();
    setPermisoParaJustificar(permiso);
    setModalJustificacionAbierto(true);
  };

  // FILTRO VISUAL
  const gruposConDatos = useMemo(() => {
    return datosAgrupados.filter((grupo) => grupo.permisos.length > 0);
  }, [datosAgrupados]);

  const tituloPagina = useMemo(() => {
    if (tipoVista === "mis_permisos") return "Mis Solicitudes";
    if (tipoVista === "gestion_rrhh")
      return "Administración de Permisos (RRHH)";
    if (tipoVista === "gestion_jefe")
      return "Administración de Permisos (JEFE)";
    return "Permisos";
  }, [tipoVista]);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "aprobado":
        return (
          <span className="inline-flex items-center px-2.5 lg:px-3 py-0.5 lg:py-1 rounded-md text-[10px] lg:text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
            Aprobado RRHH
          </span>
        );
      case "aprobado_jefe":
        return (
          <span className="inline-flex items-center px-2.5 lg:px-3 py-0.5 lg:py-1 rounded-md text-[10px] lg:text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
            Preaprobado Jefe
          </span>
        );
      case "rechazado_jefe":
        return (
          <span className="inline-flex items-center px-2.5 lg:px-3 py-0.5 lg:py-1 rounded-md text-[10px] lg:text-xs font-bold bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
            Rechazado Jefe
          </span>
        );
      case "rechazado_rrhh":
        return (
          <span className="inline-flex items-center px-2.5 lg:px-3 py-0.5 lg:py-1 rounded-md text-[10px] lg:text-xs font-bold bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
            Rechazado RRHH
          </span>
        );
      case "rechazado":
        return (
          <span className="inline-flex items-center px-2.5 lg:px-3 py-0.5 lg:py-1 rounded-md text-[10px] lg:text-xs font-bold bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
            Rechazado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 lg:px-3 py-0.5 lg:py-1 rounded-md text-[10px] lg:text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
            Pendiente Jefe
          </span>
        );
    }
  };

  const esAcademicasTexto = (t: string, d: string) =>
    t.includes("académ") ||
    t.includes("academ") ||
    d.includes("académ") ||
    d.includes("academ");

  const getCategoriaFromTexto = (t: string, d: string): CategoriaPermiso => {
    if (t.includes("igss") || d.includes("igss")) return "igss";
    if (t.includes("vacaciones") || d.includes("vacaciones")) return "vacaciones";
    if (esAcademicasTexto(t, d)) return "academicas";
    if (
      t.includes("reposicion") ||
      t.includes("reposición") ||
      t.includes("horas") ||
      t.includes("extra") ||
      d.includes("reposicion") ||
      d.includes("reposición") ||
      d.includes("horas") ||
      d.includes("extra")
    )
      return "extras";
    return "permisos";
  };

  const getCategoriaBorderClass = (tipo: string, descripcion: string | null) => {
    const t = tipo.toLowerCase();
    const d = (descripcion || "").toLowerCase();
    const cat = getCategoriaFromTexto(t, d);

    if (cat === "igss") return "border-l-4 border-l-yellow-500";
    if (cat === "vacaciones") return "border-l-4 border-l-purple-500";
    if (cat === "academicas") return "border-l-4 border-l-green-500";
    if (cat === "extras") return "border-l-4 border-l-slate-500";
    return "border-l-4 border-l-blue-500";
  };

  const getCategoria = (p: PermisoEmpleado): CategoriaPermiso => {
    const t = p.tipo.toLowerCase();
    const d = (p.descripcion || "").toLowerCase();
    return getCategoriaFromTexto(t, d);
  };

  const getCategoriaIcon = (cat: CategoriaPermiso): LucideIcon => {
    switch (cat) {
      case "igss":
        return Shield;
      case "vacaciones":
        return Umbrella;
      case "academicas":
        return GraduationCap;
      case "extras":
        return Clock;
      default:
        return FileText;
    }
  };

  const getCategoriaBadgeClass = (cat: CategoriaPermiso) => {
    switch (cat) {
      case "igss":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400";
      case "vacaciones":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400";
      case "academicas":
        return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400";
      case "extras":
        return "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400";
      default:
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400";
    }
  };

  // Calcula horas laborales (jornada 8AM-4PM = 8h)
  const getHorasTrabajo = (start: Date, end: Date): number => {
    const WORK_START = 8;
    const WORK_END = 16;
    const HOURS_PER_DAY = 8;
    try {
      const allDays = eachDayOfInterval({ start, end });
      const weekdays = allDays.filter(day => !isWeekend(day));
      if (weekdays.length === 0) return 0;

      if (isSameDay(start, end)) {
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return Math.min(Math.max(hours, 0), HOURS_PER_DAY);
      }

      let totalHours = 0;
      for (const day of weekdays) {
        if (isSameDay(day, start)) {
          const startHour = start.getHours() + start.getMinutes() / 60;
          totalHours += Math.max(0, Math.min(WORK_END - Math.max(startHour, WORK_START), HOURS_PER_DAY));
        } else if (isSameDay(day, end)) {
          const endHour = end.getHours() + end.getMinutes() / 60;
          totalHours += Math.max(0, Math.min(endHour - WORK_START, HOURS_PER_DAY));
        } else {
          totalHours += HOURS_PER_DAY;
        }
      }
      return totalHours;
    } catch {
      return 0;
    }
  };

  // Formatea horas acumuladas como días (8h = 1d)
  const formatHorasLabel = (horas: number): string => {
    if (horas <= 0) return "";
    const dias = Math.floor(horas / 8);
    const horasRestantes = Math.round(horas % 8);
    if (dias === 0) return `${horasRestantes}h`;
    if (horasRestantes === 0) return `${dias}d`;
    return `${dias}d ${horasRestantes}h`;
  };

  const esRRHH = tipoVista === "gestion_rrhh";

  return (
    <>
      <div className="w-full lg:w-[95%] mx-auto md:px-4 pb-10 transition-all">
        <div className="p-2 bg-white dark:bg-neutral-900 rounded-lg shadow-md w-full border border-gray-100 dark:border-neutral-800 transition-colors duration-200">
          <div className="flex flex-col gap-2 sm:gap-3 mb-3 sm:mb-4 p-1 sm:p-2">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
              <h2
                className="text-lg lg:text-4xl font-bold text-gray-800 dark:text-gray-200 truncate max-w-2xl"
                title={tituloPagina}
              >
                {tituloPagina}
              </h2>

              <div className="flex flex-wrap gap-2 items-center">
                {tipoVista === "mis_permisos" && (
                  <Button
                    size="sm"
                    onClick={handleNuevoPermiso}
                    className="h-8 lg:h-12 text-xs lg:text-base bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-sm gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 lg:w-5 lg:h-5" /> Nuevo Permiso
                  </Button>
                )}
                {tipoVista === "gestion_rrhh" && (
                  <Button
                    size="sm"
                    onClick={() => setModalAsuetoAbierto(true)}
                    className="h-8 lg:h-12 text-xs lg:text-base bg-amber-500 hover:bg-amber-600 text-white border-0 gap-1.5"
                  >
                    <PartyPopper className="w-3 h-3 lg:w-5 lg:h-5" /> Gestionar Asuetos
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:gap-3 bg-gray-50/50 dark:bg-neutral-900/30 p-2 sm:p-3 rounded-xl border border-gray-100 dark:border-neutral-800/50 w-full">
              {/* Buscador + Ocultar */}
              <div className="flex items-center gap-2 w-full">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-9 sm:h-10 lg:h-11 pl-10 lg:pl-11 pr-3 text-xs lg:text-base border border-gray-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={toggleTodos}
                  className="shrink-0 h-9 sm:h-10 lg:h-11 px-2.5 sm:px-3 text-[10px] sm:text-xs lg:text-sm font-bold bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-300 dark:border-neutral-700 dark:hover:bg-neutral-700 gap-1"
                >
                  <ChevronsUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{todosAbiertos ? "Ocultar Todos" : "Ver Todos"}</span>
                  <span className="sm:hidden">{todosAbiertos ? "Ocultar" : "Ver"}</span>
                </Button>
              </div>

              {/* Switch: distribución pareja (flex-1) según opciones visibles */}
              <div className="flex items-stretch h-11 w-full bg-gray-200/50 dark:bg-neutral-800 p-1 rounded-lg gap-1">
                <button
                  onClick={() => { setModoFiltro('dia'); setFiltroEstado('todos'); }}
                  className={cn(
                    "flex-1 min-w-0 basis-0 h-full flex items-center justify-center text-sm sm:text-base font-bold rounded-md transition-all",
                    modoFiltro === 'dia'
                      ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  )}
                >
                  Día
                </button>
                <button
                  onClick={() => {
                    setModoFiltro('semana');
                    setFiltroEstado('todos');
                    setMesSemanas(format(new Date(), "yyyy-MM"));
                    const hoy = format(new Date(), 'yyyy-MM-dd');
                    const semActual = getSemanasDelMes(format(new Date(), "yyyy-MM")).find(s => s.inicio <= hoy && s.fin >= hoy);
                    if (semActual) {
                      setFechaInicio(semActual.inicio);
                      setFechaFin(semActual.fin);
                    }
                  }}
                  className={cn(
                    "flex-1 min-w-0 basis-0 h-full flex items-center justify-center text-sm sm:text-base font-bold rounded-md transition-all",
                    modoFiltro === 'semana'
                      ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  )}
                >
                  Semana
                </button>
                <button
                  onClick={() => { setModoFiltro('rango'); setFiltroEstado('todos'); }}
                  className={cn(
                    "flex-1 min-w-0 basis-0 h-full flex items-center justify-center text-sm sm:text-base font-bold rounded-md transition-all",
                    modoFiltro === 'rango'
                      ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  )}
                >
                  Rango
                </button>

                {(tipoVista === 'gestion_jefe' || tipoVista === 'gestion_rrhh') && conteosPendientes.pendientes > 0 && (
                  <button
                    onClick={() => {
                      if (filtroEstado === 'pendiente' && modoFiltro === 'pendientes') {
                        setFiltroEstado('todos');
                        setModoFiltro('dia');
                      } else {
                        setFiltroEstado('pendiente');
                        setModoFiltro('pendientes');
                      }
                    }}
                    className={cn(
                      "flex-1 min-w-0 basis-0 h-full flex items-center justify-center gap-1 text-sm sm:text-base font-bold rounded-md transition-all",
                      modoFiltro === 'pendientes' && filtroEstado === 'pendiente'
                        ? "bg-white dark:bg-neutral-700 text-amber-600 dark:text-amber-400 shadow-sm"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    )}
                  >
                    <span className="truncate">P. Jefe</span>
                    <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-neutral-600 text-[10px] font-bold text-amber-600 dark:text-amber-400 px-1">
                      {conteosPendientes.pendientes}
                    </span>
                  </button>
                )}

                {(tipoVista === 'gestion_jefe' || tipoVista === 'gestion_rrhh') && conteosPendientes.avalados > 0 && (
                  <button
                    onClick={() => {
                      if (filtroEstado === 'aprobado_jefe' && modoFiltro === 'pendientes') {
                        setFiltroEstado('todos');
                        setModoFiltro('dia');
                      } else {
                        setFiltroEstado('aprobado_jefe');
                        setModoFiltro('pendientes');
                      }
                    }}
                    className={cn(
                      "flex-1 min-w-0 basis-0 h-full flex items-center justify-center gap-1 text-sm sm:text-base font-bold rounded-md transition-all",
                      modoFiltro === 'pendientes' && filtroEstado === 'aprobado_jefe'
                        ? "bg-white dark:bg-neutral-700 text-purple-600 dark:text-purple-400 shadow-sm"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    )}
                  >
                    <span className="truncate">P. RRHH</span>
                    <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-neutral-600 text-[10px] font-bold text-purple-600 dark:text-purple-400 px-1">
                      {conteosPendientes.avalados}
                    </span>
                  </button>
                )}
              </div>

              {/* Fecha + Apr/Rech */}
              <div
                className={cn(
                  "flex gap-2",
                  modoFiltro === "rango"
                    ? "flex-col sm:flex-row sm:items-end sm:justify-between"
                    : "flex-row items-end justify-between",
                )}
              >
                <div className="flex-1 min-w-0 w-full sm:w-auto">
                {modoFiltro === 'dia' && (
                  <div className="flex flex-col items-start gap-1">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    Seleccione un día para mostrar
                  </span>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-2 bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-all shadow-sm">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <span className="dark:text-gray-200 capitalize">{formatFechaCorta(fechaSeleccionada)}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendario
                        fechaSeleccionada={fechaSeleccionada}
                        onSelectDate={(date) => {
                          setFechaSeleccionada(date);
                          setCalendarOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {modoFiltro === 'semana' && (
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    Seleccione una semana para mostrar
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      className="max-w-[130px] sm:max-w-none bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-lg px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold focus:outline-none focus:border-blue-400 transition-all shadow-sm cursor-pointer"
                      onChange={(e) => {
                        const idx = parseInt(e.target.value, 10);
                        const sem = semanasDisponibles[idx];
                        if (sem) {
                          setFechaInicio(sem.inicio);
                          setFechaFin(sem.fin);
                        }
                      }}
                      value={semanasDisponibles.findIndex(s => s.inicio === fechaInicio && s.fin === fechaFin)}
                    >
                      <option value="-1" disabled>Seleccione semana</option>
                      {semanasDisponibles.map((sem, idx) => (
                        <option key={idx} value={idx}>{sem.label}</option>
                      ))}
                    </select>
                    <Popover open={calendarSemanaOpen} onOpenChange={setCalendarSemanaOpen}>
                      <PopoverTrigger asChild>
                        <button className="flex items-center gap-1.5 bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-lg px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold hover:border-blue-400 transition-all shadow-sm min-w-0 sm:min-w-[120px]">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          <span className="dark:text-gray-200">{formatMes(mesSemanas)}</span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendario
                          modo="mes"
                          fechaSeleccionada={fechaInicio || format(new Date(), 'yyyy-MM-dd')}
                          onSelectDate={(date) => {
                            // Extraemos el yyyy-MM
                            const newMes = date.substring(0, 7);
                            setMesSemanas(newMes);
                            
                            // Al elegir un mes, seleccionamos la primera semana de ese mes
                            const semanasDelMes = getSemanasDelMes(newMes);
                            if (semanasDelMes.length > 0) {
                              setFechaInicio(semanasDelMes[0].inicio);
                              setFechaFin(semanasDelMes[0].fin);
                            }
                            setCalendarSemanaOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              {modoFiltro === 'rango' && (
                <div className="flex flex-col items-start gap-1 w-full min-w-0">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    Selecciona las fechas que deseas ver
                  </span>
                  <div className="flex items-center gap-1 sm:gap-2 flex-nowrap w-full min-w-0">
                    <Popover open={calendarInicioOpen} onOpenChange={setCalendarInicioOpen}>
                      <PopoverTrigger asChild>
                        <button className="flex items-center gap-1 sm:gap-2 bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-lg px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-semibold cursor-pointer hover:border-emerald-400 transition-all shadow-sm shrink-0 whitespace-nowrap">
                          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                          <span className="dark:text-gray-200 capitalize sm:hidden">{formatFechaCompacta(fechaInicio)}</span>
                          <span className="dark:text-gray-200 capitalize hidden sm:inline">{formatFechaCorta(fechaInicio)}</span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendario
                          fechaSeleccionada={fechaInicio}
                          onSelectDate={(date) => {
                            setFechaInicio(date);
                            setCalendarInicioOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 shrink-0" />
                    <Popover open={calendarFinOpen} onOpenChange={setCalendarFinOpen}>
                      <PopoverTrigger asChild>
                        <button className="flex items-center gap-1 sm:gap-2 bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-lg px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-semibold cursor-pointer hover:border-red-400 transition-all shadow-sm shrink-0 whitespace-nowrap">
                          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500 shrink-0" />
                          <span className="dark:text-gray-200 capitalize sm:hidden">{formatFechaCompacta(fechaFin)}</span>
                          <span className="dark:text-gray-200 capitalize hidden sm:inline">{formatFechaCorta(fechaFin)}</span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendario
                          fechaSeleccionada={fechaFin}
                          onSelectDate={(date) => {
                            setFechaFin(date);
                            setCalendarFinOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
                </div>

                <div className="flex items-center gap-1 shrink-0 w-full sm:w-auto justify-end">
                  <Button size="sm" onClick={() => { if (filtroEstado === "aprobado") { setFiltroEstado("todos"); } else { setFiltroEstado("aprobado"); if (modoFiltro === "pendientes") setModoFiltro("dia"); } }} className={cn("h-9 sm:h-10 lg:h-11 px-2 sm:px-3 text-[10px] sm:text-[11px] font-bold rounded-lg border transition-all shadow-sm", filtroEstado === "aprobado" ? "bg-emerald-600 text-white border-emerald-600" : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800")}>
                    Apr: {estadisticas.aprobados}
                  </Button>

                  <Button size="sm" onClick={() => { if (filtroEstado === "rechazado") { setFiltroEstado("todos"); } else { setFiltroEstado("rechazado"); if (modoFiltro === "pendientes") setModoFiltro("dia"); } }} className={cn("h-9 sm:h-10 lg:h-11 px-2 sm:px-3 text-[10px] sm:text-[11px] font-bold rounded-lg border transition-all shadow-sm", filtroEstado === "rechazado" ? "bg-red-600 text-white border-red-600" : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800")}>
                    Rech: {estadisticas.rechazados}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-neutral-800 pt-3 sm:pt-4">
            {loadingPermisos ? (
              <Cargando texto="Cargando permisos..." />
            ) : gruposConDatos.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 text-xs py-8">
                No hay información disponible.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {gruposConDatos.map((grupo) => {
                  const estaAbierta =
                    oficinasAbiertas[grupo.oficina_nombre] || false;
                  return (
                    <div
                      key={grupo.oficina_nombre}
                      className="border border-gray-100 dark:border-neutral-800 rounded-lg overflow-hidden"
                    >
                      <div
                        onClick={() => toggleOficina(grupo.oficina_nombre)}
                        className="bg-slate-50 dark:bg-neutral-800/50 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors py-3 px-4 text-sm font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span>
                            {grupo.oficina_nombre}{" "}
                            <span className="text-gray-400 text-xs ml-1 font-normal">
                              ({grupo.permisos.length})
                            </span>
                          </span>
                        </div>
                        <motion.div
                          initial={false}
                          animate={{ rotate: estaAbierta ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </motion.div>
                      </div>
                      <AnimatePresence initial={false}>
                        {estaAbierta && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white dark:bg-neutral-900"
                          >
                            <div className="p-3 flex flex-col gap-4">
                                {Object.values(
                                  grupo.permisos.reduce((acc, p) => {
                                    const uid = p.user_id;
                                    if (!acc[uid])
                                      acc[uid] = {
                                        usuario: p.usuario,
                                        permisos: [],
                                      };
                                    acc[uid].permisos.push(p);
                                    return acc;
                                  }, {} as Record<string, { usuario: any; permisos: PermisoEmpleado[] }>)
                                ).map((usuarioGrupo) => (
                                  <UsuarioGrupoPermisos
                                    key={usuarioGrupo.usuario?.id || Math.random()}
                                    usuarioGrupo={usuarioGrupo}
                                    tipoVista={tipoVista}
                                    handleVerPreview={handleVerPreview}
                                    handleAbrirJustificacion={handleAbrirJustificacion}
                                    handleClickFila={handleClickFila}
                                    handleEliminarPermiso={handleEliminarPermiso}
                                    getCategoriaBorderClass={getCategoriaBorderClass}
                                    getCategoria={getCategoria}
                                    getCategoriaIcon={getCategoriaIcon}
                                    getCategoriaBadgeClass={getCategoriaBadgeClass}
                                    getEstadoBadge={getEstadoBadge}
                                    getHorasTrabajo={getHorasTrabajo}
                                    formatHorasLabel={formatHorasLabel}
                                  />
                                ))}
                              </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <PreviewPermiso 
        isOpen={modalPreviewAbierto}
        onClose={() => setModalPreviewAbierto(false)}
        permiso={permisoParaImagen}
      />
      <JustificacionPermiso
        isOpen={modalJustificacionAbierto}
        onClose={() => setModalJustificacionAbierto(false)}
        permiso={permisoParaJustificar}
        onSaved={cargarDatos}
      />
      <CrearEditarPermiso
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        permisoAEditar={permisoParaEditar}
        onSuccess={cargarDatos}
        perfilUsuario={perfilUsuario}
        tipoVista={tipoVista}
      />
      <GestionAsueto
        isOpen={modalAsuetoAbierto}
        onClose={() => setModalAsuetoAbierto(false)}
      />
    </>
  );
}

// Subcomponente para cada grupo de usuario con filtro propio
function UsuarioGrupoPermisos({
  usuarioGrupo,
  tipoVista,
  handleVerPreview,
  handleAbrirJustificacion,
  handleClickFila,
  handleEliminarPermiso,
  getCategoriaBorderClass,
  getCategoria,
  getCategoriaIcon,
  getCategoriaBadgeClass,
  getEstadoBadge,
  getHorasTrabajo,
  formatHorasLabel,
}: {
  usuarioGrupo: { usuario: any; permisos: PermisoEmpleado[] };
  tipoVista: TipoVistaPermisos;
  handleVerPreview: (e: React.MouseEvent, p: PermisoEmpleado) => void;
  handleAbrirJustificacion: (e: React.MouseEvent, p: PermisoEmpleado) => void;
  handleClickFila: (p: PermisoEmpleado) => void;
  handleEliminarPermiso: (e: React.MouseEvent, id: string) => void;
  getCategoriaBorderClass: (t: string, d: string | null) => string;
  getCategoria: (p: PermisoEmpleado) => CategoriaPermiso;
  getCategoriaIcon: (cat: CategoriaPermiso) => LucideIcon;
  getCategoriaBadgeClass: (cat: CategoriaPermiso) => string;
  getEstadoBadge: (e: string) => React.ReactNode;
  getHorasTrabajo: (start: Date, end: Date) => number;
  formatHorasLabel: (horas: number) => string;
}) {
  const [filtro, setFiltro] = React.useState<
    "todos" | "extras" | "vacaciones" | "permisos" | "igss" | "academicas"
  >("todos");
  const [orden, setOrden] = React.useState<"fecha" | "tipo">("fecha");

  const stats = React.useMemo(() => {
    return usuarioGrupo.permisos.reduce(
      (acc, p) => {
        const cat = getCategoria(p);
        const d = getHorasTrabajo(parseISO(p.inicio), parseISO(p.fin));
        if (cat === "igss") {
          acc.i++;
          acc.id += d;
          acc.td += d;
        } else if (cat === "vacaciones") {
          acc.v++;
          acc.vd += d;
          acc.td += d;
        } else if (cat === "academicas") {
          acc.a++;
          acc.ad += d;
          acc.td += d;
        } else if (cat === "extras") {
          acc.e++;
          acc.ed += d;
          acc.td += d;
        } else {
          acc.o++;
          acc.od += d;
          acc.td += d;
        }
        return acc;
      },
      { v: 0, vd: 0, e: 0, ed: 0, i: 0, id: 0, a: 0, ad: 0, o: 0, od: 0, td: 0 }
    );
  }, [usuarioGrupo.permisos, getCategoria, getHorasTrabajo]);

  const permisosFiltrados = React.useMemo(() => {
    const lista =
      filtro === "todos"
        ? [...usuarioGrupo.permisos]
        : usuarioGrupo.permisos.filter((p) => getCategoria(p) === filtro);

    if (orden === "tipo") {
      return lista.sort((a, b) => {
        const catA = CATEGORIA_ORDEN[getCategoria(a)];
        const catB = CATEGORIA_ORDEN[getCategoria(b)];
        if (catA !== catB) return catA - catB;
        return parseISO(a.inicio).getTime() - parseISO(b.inicio).getTime();
      });
    }

    return lista.sort(
      (a, b) => parseISO(a.inicio).getTime() - parseISO(b.inicio).getTime()
    );
  }, [filtro, orden, usuarioGrupo.permisos, getCategoria]);

  return (
    <div className="flex flex-col gap-2">
      {/* Encabezado de Usuario Agrupado con Filtros Interactivos */}
      <div className="flex flex-col md:flex-row md:items-center justify-between px-2 py-1 bg-slate-100/50 dark:bg-neutral-800/50 rounded-md border border-slate-200 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
            <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs lg:text-base font-bold text-slate-800 dark:text-gray-200">
              {usuarioGrupo.usuario?.nombre}
            </span>
            <span className="text-[10px] lg:text-xs text-slate-500 dark:text-gray-500 flex items-center gap-1">
              <Briefcase className="w-2.5 h-2.5 lg:w-4 lg:h-4" />
              {usuarioGrupo.usuario?.puesto_nombre || "Sin puesto"}
            </span>
          </div>
        </div>

        <div className="mt-1 md:mt-0 flex items-center gap-1.5 flex-wrap">
          {stats.e > 0 && (
            <button
              onClick={() => setFiltro(filtro === "extras" ? "todos" : "extras")}
              className={cn(
                "text-[9px] lg:text-xs font-bold px-1.5 lg:px-2 py-0.5 lg:py-1 rounded transition-all border inline-flex items-center gap-1",
                filtro === "extras"
                  ? "bg-slate-600 text-white border-slate-700 scale-105"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-200"
              )}
            >
              <Clock className="w-3 h-3 shrink-0" />
              {stats.e} Ext {stats.ed > 0 && `= ${formatHorasLabel(stats.ed)}`}
            </button>
          )}
          {stats.i > 0 && (
            <button
              onClick={() =>
                setFiltro(filtro === "igss" ? "todos" : "igss")
              }
              className={cn(
                "text-[9px] lg:text-xs font-bold px-1.5 lg:px-2 py-0.5 lg:py-1 rounded transition-all border inline-flex items-center gap-1",
                filtro === "igss"
                  ? "bg-yellow-500 text-yellow-950 border-yellow-600 scale-105"
                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800 hover:bg-yellow-200"
              )}
            >
              <Shield className="w-3 h-3 shrink-0" />
              {stats.i} IGSS {stats.id > 0 && `= ${formatHorasLabel(stats.id)}`}
            </button>
          )}
          {stats.a > 0 && (
            <button
              onClick={() =>
                setFiltro(filtro === "academicas" ? "todos" : "academicas")
              }
              className={cn(
                "text-[9px] lg:text-xs font-bold px-1.5 lg:px-2 py-0.5 lg:py-1 rounded transition-all border inline-flex items-center gap-1",
                filtro === "academicas"
                  ? "bg-green-600 text-white border-green-700 scale-105"
                  : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-200"
              )}
            >
              <GraduationCap className="w-3 h-3 shrink-0" />
              {stats.a} Educ {stats.ad > 0 && `= ${formatHorasLabel(stats.ad)}`}
            </button>
          )}
          {stats.v > 0 && (
            <button
              onClick={() =>
                setFiltro(filtro === "vacaciones" ? "todos" : "vacaciones")
              }
              className={cn(
                "text-[9px] lg:text-xs font-bold px-1.5 lg:px-2 py-0.5 lg:py-1 rounded transition-all border inline-flex items-center gap-1",
                filtro === "vacaciones"
                  ? "bg-purple-600 text-white border-purple-700 scale-105"
                  : "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:bg-purple-200"
              )}
            >
              <Umbrella className="w-3 h-3 shrink-0" />
              {stats.v} Vac {stats.vd > 0 && `= ${formatHorasLabel(stats.vd)}`}
            </button>
          )}
          {stats.o > 0 && (
            <button
              onClick={() =>
                setFiltro(filtro === "permisos" ? "todos" : "permisos")
              }
              className={cn(
                "text-[9px] lg:text-xs font-bold px-1.5 lg:px-2 py-0.5 lg:py-1 rounded transition-all border inline-flex items-center gap-1",
                filtro === "permisos"
                  ? "bg-blue-600 text-white border-blue-700 scale-105"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-200"
              )}
            >
              <FileText className="w-3 h-3 shrink-0" />
              {stats.o} Perm {stats.od > 0 && `= ${formatHorasLabel(stats.od)}`}
            </button>
          )}
          <button
            onClick={() => setFiltro("todos")}
            className={cn(
              "text-[10px] lg:text-xs font-bold px-2 lg:px-2.5 py-0.5 lg:py-1 rounded border shrink-0 transition-all",
              filtro === "todos"
                ? "bg-slate-200 text-slate-800 border-slate-300 dark:bg-neutral-700 dark:text-white"
                : "bg-white text-slate-500 border-slate-100 dark:bg-neutral-900 dark:border-neutral-800 hover:bg-slate-50"
            )}
          >
            Total: {stats.td > 0 ? formatHorasLabel(stats.td) : "0h"}
          </button>
          <button
            type="button"
            onClick={() => setOrden(orden === "fecha" ? "tipo" : "fecha")}
            title={
              orden === "fecha"
                ? "Ordenado por fecha. Clic para ordenar por tipo"
                : "Ordenado por tipo. Clic para ordenar por fecha"
            }
            className={cn(
              "text-[9px] lg:text-xs font-bold px-1.5 lg:px-2 py-0.5 lg:py-1 rounded border shrink-0 transition-all inline-flex items-center gap-1",
              "bg-white text-slate-600 border-slate-200 dark:bg-neutral-900 dark:text-slate-300 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800"
            )}
          >
            {orden === "fecha" ? (
              <>
                <CalendarDays className="w-3 h-3 shrink-0" />
                Fecha
              </>
            ) : (
              <>
                <ArrowUpDown className="w-3 h-3 shrink-0" />
                Tipo
              </>
            )}
          </button>
        </div>
      </div>

      {/* Listado de permisos para este usuario (Filtrado) */}
      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3 pl-2 md:pl-4 border-l-2 border-slate-100 dark:border-neutral-800 ml-3">
        <AnimatePresence mode="popLayout">
          {permisosFiltrados.map((permiso) => {
            const esPendiente = permiso.estado === "pendiente";
            const puedeEliminar =
              tipoVista === "gestion_rrhh" ||
              (tipoVista === "mis_permisos" && esPendiente);
            const puedeEditar = tipoVista === "gestion_rrhh" || esPendiente;
            // Fecha completa con hora real (para mostrar el horario)
            const fechaInicioConHora = parseISO(permiso.inicio);
            const fechaFinConHora = parseISO(permiso.fin);
            // Fecha sin hora (para comparación de días) - extraemos componentes LOCALES
            // para evitar desfase UTC (ej: UTC 2026-06-02T00:00Z = local 2026-06-01T18:00 en GT)
            const fechaInicio = new Date(fechaInicioConHora.getFullYear(), fechaInicioConHora.getMonth(), fechaInicioConHora.getDate());
            const fechaFin = new Date(fechaFinConHora.getFullYear(), fechaFinConHora.getMonth(), fechaFinConHora.getDate());
            const esMismoDia = isSameDay(fechaInicio, fechaFin);
            
            const formatCustom = (date: Date) => {
              let str = format(date, "eee d MMM", { locale: es });
              return str.split(' ').map(word => {
                let cleaned = word.replace('.', '');
                return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
              }).join(' ');
            };

            const textoFecha = esMismoDia
              ? formatCustom(fechaInicio)
              : `Del ${formatCustom(fechaInicio)} al ${formatCustom(fechaFin)}`;
            const textoHora = `${format(fechaInicioConHora, "h:mm a", { locale: es })} - ${format(fechaFinConHora, "h:mm a", { locale: es })}`;
            const borderClass = getCategoriaBorderClass(
              permiso.tipo,
              permiso.descripcion
            );

            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={permiso.id}
                className={cn(
                  "group relative flex flex-col justify-between bg-white dark:bg-neutral-900 rounded-lg p-3 shadow-sm hover:shadow-md transition-all w-full border border-gray-200 dark:border-neutral-800",
                  borderClass
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  {(() => {
                    const cat = getCategoria(permiso);
                    const CatIcon = getCategoriaIcon(cat);
                    return (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[10px] lg:text-sm px-2 lg:px-3 py-0.5 lg:py-1 rounded font-mono font-bold tracking-wider",
                      getCategoriaBadgeClass(cat)
                    )}
                  >
                    <CatIcon className="w-3 h-3 lg:w-3.5 lg:h-3.5 shrink-0" />
                    Cód: <span className="font-black">{`${permiso.id.substring(0, 3)}-${permiso.id.substring(3, 6)}`.toUpperCase()}</span>
                  </span>
                    );
                  })()}
                  <span className="text-[9px] lg:text-xs text-gray-400 font-medium">
                    {format(parseISO(permiso.created_at), "d MMM yy", {
                      locale: es,
                    })}
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="bg-slate-50 dark:bg-neutral-800/50 p-2 rounded">
                    <p className="text-xs lg:text-lg font-bold text-slate-700 dark:text-slate-300 capitalize mb-1">
                      {permiso.tipo.replace("_", " ")}
                    </p>
                    <div className="flex flex-col gap-1 text-[10px] lg:text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3 lg:w-4 lg:h-4 text-blue-500/70" />
                          <span className="font-medium capitalize">
                            {textoFecha}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                          <span>
                            {(() => {
                              const cat = getCategoria(permiso);
                              if (cat === "extras") return null;
                              const h = getHorasTrabajo(fechaInicioConHora, fechaFinConHora);
                              if (h <= 0) return null;
                              return `• ${formatHorasLabel(h)}`;
                            })()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 lg:w-4 lg:h-4 text-orange-500/70" />
                        <span>{textoHora}</span>
                      </div>
                    </div>
                  </div>
                  {permiso.descripcion && (
                    <div className="p-1.5 rounded bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-900/20">
                      <p className="text-[10px] lg:text-sm text-gray-600 dark:text-gray-400 italic line-clamp-2">
                        {permiso.descripcion}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 mt-auto pt-2 border-t border-gray-50 dark:border-neutral-800 md:flex-row md:items-center md:justify-between md:gap-3">
                  <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto">
                    {getEstadoBadge(permiso.estado)}
                    {permiso.estado === "aprobado" && permiso.remunerado !== null && (
                      <span
                        className={cn(
                          "text-[9px] lg:text-xs font-bold px-1.5 lg:px-2.5 py-0.5 lg:py-1 rounded border inline-flex items-center shrink-0",
                          permiso.remunerado
                            ? "text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800"
                            : "text-gray-600 bg-gray-100 border-gray-200 dark:text-gray-400 dark:bg-neutral-800 dark:border-neutral-700"
                        )}
                      >
                        {permiso.remunerado ? "REMUNERADO" : "NO REM"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={(e) => handleVerPreview(e, permiso)}
                      className="flex items-center justify-center gap-1.5 px-2.5 lg:px-3 py-1.5 lg:py-1.5 text-[10px] lg:text-sm font-bold text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md transition-colors border border-blue-100 dark:border-blue-800"
                    >
                      <Eye className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                      Ver
                    </button>

                    <button
                      onClick={(e) => handleAbrirJustificacion(e, permiso)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 px-2.5 lg:px-3 py-1.5 lg:py-1.5 text-[10px] lg:text-sm font-bold rounded-md transition-colors border",
                        permiso.comprobante_url
                          ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800"
                          : "text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border-indigo-100 dark:border-indigo-800"
                      )}
                      title={permiso.comprobante_url ? "Ver comprobante" : "Subir comprobante"}
                    >
                      {permiso.comprobante_url ? (
                        <Eye className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                      )}
                      Justificación
                    </button>

                    {puedeEditar && (
                      <button
                        onClick={() => handleClickFila(permiso)}
                        className="flex items-center justify-center gap-1.5 px-2.5 lg:px-3 py-1.5 lg:py-1.5 text-[10px] lg:text-sm font-bold text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-md transition-colors border border-amber-100 dark:border-amber-800"
                      >
                        <Pencil className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                        Editar / Aprobar
                      </button>
                    )}

                    {puedeEliminar && (
                      <button
                        onClick={(e) => handleEliminarPermiso(e, permiso.id)}
                        className="flex items-center justify-center gap-1.5 px-2 lg:px-3 py-1.5 lg:py-1.5 text-[10px] lg:text-sm font-bold text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-md transition-colors border border-red-100 dark:border-red-800"
                        title="Borrar"
                        aria-label="Borrar"
                      >
                        <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                        <span className="hidden md:inline">Borrar</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
