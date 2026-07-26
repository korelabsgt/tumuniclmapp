"use client";

import React, { useMemo } from "react";
import { format, parseISO, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronDown,
  Search,
  Plus,
  Trash2,
  CalendarDays,
  FileText,
  User,
  Briefcase,
  Eye,
  Pencil,
  ChevronsUpDown,
  ArrowRight,
  ArrowUpDown,
  Calendar,
  CalendarClock,
} from "lucide-react";
import PreviewAcuerdo from "./modals/PreviewAcuerdo";
import ElegirDiasSemanaAcuerdo from "./modals/ElegirDiasSemanaAcuerdo";
import { AcuerdoEmpleado } from "./types";
import { Button } from "@/components/ui/button";
import Cargando from "@/components/ui/animations/Cargando";
import CrearEditarAcuerdo from "./modals/CrearEditarAcuerdo";
import { motion, AnimatePresence } from "framer-motion";
import { useAcuerdos, TipoVistaAcuerdos } from "./hooks";
import { type PerfilUsuario } from "@/components/permisos/acciones";
import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import Calendario from "@/components/ui/Calendario";
import PermisosNav from "../PermisosNav";
import {
  CategoriaAcuerdo,
  getCategoriaAcuerdo,
  getCategoriaAcuerdoIcon,
  getCategoriaAcuerdoLabel,
  getCategoriaAcuerdoBorderClass,
  getCategoriaAcuerdoBadgeClass,
} from "./categorias";
import { formatearDiasSemana } from "./utilidades";
import {
  formatearFechaFiltro,
  formatearFechaTarjetaDesdeISO,
  formatearRangoTarjeta,
  getSemanasDelMes,
} from "@/components/permisos/lib/fechas";
import { getModalidadAcuerdo, parseDiasAcuerdo } from "./dias-acuerdo";

const CATEGORIA_ORDEN: Record<CategoriaAcuerdo, number> = {
  suspension_igss: 0,
  vacaciones: 1,
  permiso_especial: 2,
  licencia_goce: 3,
  licencia_sin_goce: 4,
};

interface Props {
  tipoVista: TipoVistaAcuerdos;
}

export default function VerAcuerdos({ tipoVista }: Props) {
  const { state, actions } = useAcuerdos(tipoVista);
  const {
    loadingAcuerdos,
    searchTerm,
    filtroEstado,
    fechaSeleccionada,
    modoFiltro,
    fechaInicio,
    fechaFin,
    modalAbierto,
    acuerdoParaEditar,
    perfilUsuario,
    oficinasAbiertas,
    todosAbiertos,
    datosAgrupados,
    estadisticas,
    conteosPendientes,
    usuariosParaModal,
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
    handleNuevoAcuerdo,
    handleClickFila,
    handleEliminarAcuerdo,
  } = actions;

  const [modalPreviewAbierto, setModalPreviewAbierto] = React.useState(false);
  const [acuerdoParaImagen, setAcuerdoParaImagen] = React.useState<AcuerdoEmpleado | null>(null);
  const [modalElegirDiasAbierto, setModalElegirDiasAbierto] = React.useState(false);
  const [acuerdoParaElegirDias, setAcuerdoParaElegirDias] = React.useState<AcuerdoEmpleado | null>(null);
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [calendarSemanaOpen, setCalendarSemanaOpen] = React.useState(false);
  const [calendarInicioOpen, setCalendarInicioOpen] = React.useState(false);
  const [calendarFinOpen, setCalendarFinOpen] = React.useState(false);

  const [mesSemanas, setMesSemanas] = React.useState(format(new Date(), "yyyy-MM"));
  const semanasDisponibles = useMemo(() => getSemanasDelMes(mesSemanas), [mesSemanas]);

  React.useEffect(() => {
    if (modoFiltro === "semana" && semanasDisponibles.length > 0) {
      const matches = semanasDisponibles.some(
        (s) => s.inicio === fechaInicio && s.fin === fechaFin,
      );
      if (!matches) {
        const hoy = format(new Date(), "yyyy-MM-dd");
        const currentWeek = semanasDisponibles.find(
          (s) => s.inicio <= hoy && s.fin >= hoy,
        );
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

  const formatMes = (mesYear: string) => {
    const d = parseISO(mesYear + "-01");
    const str = format(d, "MMMM yyyy", { locale: es });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const handleVerPreview = (e: React.MouseEvent, acuerdo: AcuerdoEmpleado) => {
    e.stopPropagation();
    setAcuerdoParaImagen(acuerdo);
    setModalPreviewAbierto(true);
  };

  const handleElegirDiasSemana = (e: React.MouseEvent, acuerdo: AcuerdoEmpleado) => {
    e.stopPropagation();
    setAcuerdoParaElegirDias(acuerdo);
    setModalElegirDiasAbierto(true);
  };

  const abrirElegirDiasDesdePreview = (acuerdo: AcuerdoEmpleado) => {
    setAcuerdoParaElegirDias(acuerdo);
    setModalElegirDiasAbierto(true);
  };

  const gruposConDatos = useMemo(() => {
    return datosAgrupados.filter((grupo) => grupo.acuerdos.length > 0);
  }, [datosAgrupados]);

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
          <span className="inline-flex items-center px-2.5 lg:px-3 py-0.5 lg:py-1 rounded-md text-[10px] lg:text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
            Pendiente RRHH
          </span>
        );
      case "rechazado_jefe":
        return (
          <span className="inline-flex items-center px-2.5 lg:px-3 py-0.5 lg:py-1 rounded-md text-[10px] lg:text-xs font-bold bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
            Rechazado
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
            Pendiente RRHH
          </span>
        );
    }
  };

  const navTipoVista =
    tipoVista === "mis_acuerdos"
      ? "mis"
      : tipoVista === "gestion_jefe"
        ? "jefe"
        : "rrhh";

  const aplicarModoSemana = () => {
    setModoFiltro("semana");
    setMesSemanas(format(new Date(), "yyyy-MM"));
    const hoy = format(new Date(), "yyyy-MM-dd");
    const semActual = getSemanasDelMes(format(new Date(), "yyyy-MM")).find(
      (s) => s.inicio <= hoy && s.fin >= hoy,
    );
    if (semActual) {
      setFechaInicio(semActual.inicio);
      setFechaFin(semActual.fin);
    }
  };

  const handleCambioModoFiltro = (modo: "dia" | "semana" | "rango") => {
    setFiltroEstado("todos");
    if (modo === "semana") {
      aplicarModoSemana();
      return;
    }
    setModoFiltro(modo);
  };

  const modoFiltroSelect =
    modoFiltro === "dia" || modoFiltro === "semana" || modoFiltro === "rango"
      ? modoFiltro
      : "semana";

  const selectFiltroFechaClass =
    "shrink-0 appearance-none [&::-ms-expand]:hidden bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-lg px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold focus:outline-none focus:border-blue-400 transition-all shadow-sm cursor-pointer dark:text-gray-200";

  const botonFechaRangoClass = cn(
    selectFiltroFechaClass,
    "flex items-center justify-center gap-1.5 flex-1 min-w-0 lg:min-w-[7.5rem] whitespace-nowrap px-2 text-center",
  );

  const modoSelectMobileClass = cn(
    selectFiltroFechaClass,
    "shrink-0 w-[5.25rem] min-w-[5.25rem] text-center lg:hidden",
  );

  const modoSelectDesktopClass = cn(
    selectFiltroFechaClass,
    "hidden lg:block text-center",
    modoFiltro === "rango" && "lg:flex-none lg:w-[5.25rem] lg:min-w-[5.25rem]",
  );

  const modoSelectEl = (
    <select
      value={modoFiltroSelect}
      onChange={(e) =>
        handleCambioModoFiltro(e.target.value as "dia" | "semana" | "rango")
      }
      className={modoSelectDesktopClass}
    >
      <option value="dia">Día</option>
      <option value="semana">Semana</option>
      <option value="rango">Rango</option>
    </select>
  );

  const modoSelectMobileEl = (
    <select
      value={modoFiltroSelect}
      onChange={(e) =>
        handleCambioModoFiltro(e.target.value as "dia" | "semana" | "rango")
      }
      className={modoSelectMobileClass}
    >
      <option value="dia">Día</option>
      <option value="semana">Semana</option>
      <option value="rango">Rango</option>
    </select>
  );

  return (
    <>
      <div className="w-full lg:w-[95%] mx-auto md:px-4 pb-10 transition-all">
        <div className="p-2 bg-white dark:bg-neutral-900 rounded-lg shadow-md w-full border border-gray-100 dark:border-neutral-800 transition-colors duration-200">
          <div className="flex flex-col gap-2 sm:gap-3 mb-3 sm:mb-4 p-1 sm:p-2">
            <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center sm:justify-between">
              <PermisosNav tipoVista={navTipoVista} />
              {tipoVista === "gestion_rrhh" && (
                <button
                  type="button"
                  onClick={handleNuevoAcuerdo}
                  className="flex w-full sm:w-auto items-center justify-center gap-1.5 h-8 lg:h-10 px-2.5 lg:px-3 text-xs lg:text-sm font-bold text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md transition-colors border-2 border-blue-600 dark:border-blue-400 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                  Nuevo Acuerdo
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:gap-3 bg-gray-50/50 dark:bg-neutral-900/30 p-2 sm:p-3 rounded-xl border border-gray-100 dark:border-neutral-800/50 w-full">
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

              <div className="flex flex-col gap-2 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-end lg:gap-3 w-full">
                <div className="order-2 lg:order-none lg:col-start-1 lg:row-start-1 lg:justify-self-start flex-1 min-w-0 w-full flex flex-col items-center gap-1">
                  {modoFiltro !== "pendientes" && (
                    <div className="flex items-center gap-2 w-full min-w-0 lg:justify-center">
                      {modoSelectMobileEl}
                      <span className="text-[10px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 flex-1 min-w-0 text-left lg:flex-none lg:text-center lg:w-full">
                        Selecciona la fecha para mostrar
                      </span>
                    </div>
                  )}

                  <div
                    className={cn(
                      "flex justify-center gap-2 w-full min-w-0",
                      modoFiltro === "rango"
                        ? "items-center"
                        : "items-center overflow-x-auto",
                    )}
                  >
                    {modoSelectEl}

                    {modoFiltro === "dia" && (
                      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              selectFiltroFechaClass,
                              "flex items-center gap-1.5 min-w-0",
                            )}
                          >
                            <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                            <span className="capitalize truncate">
                              {formatearFechaFiltro(fechaSeleccionada)}
                            </span>
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
                    )}

                    {modoFiltro === "semana" && (
                      <>
                        <select
                          className={cn(
                            selectFiltroFechaClass,
                            "text-center min-w-0 flex-1 max-w-[11rem] sm:max-w-none",
                          )}
                          onChange={(e) => {
                            const idx = parseInt(e.target.value, 10);
                            const sem = semanasDisponibles[idx];
                            if (sem) {
                              setFechaInicio(sem.inicio);
                              setFechaFin(sem.fin);
                            }
                          }}
                          value={semanasDisponibles.findIndex(
                            (s) => s.inicio === fechaInicio && s.fin === fechaFin,
                          )}
                        >
                          <option value="-1" disabled>
                            Semana
                          </option>
                          {semanasDisponibles.map((sem, idx) => (
                            <option key={idx} value={idx}>
                              {sem.label}
                            </option>
                          ))}
                        </select>
                        <Popover
                          open={calendarSemanaOpen}
                          onOpenChange={setCalendarSemanaOpen}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                selectFiltroFechaClass,
                                "flex items-center gap-1.5 min-w-0 shrink-0",
                              )}
                            >
                              <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                              <span className="truncate">{formatMes(mesSemanas)}</span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <Calendario
                              modo="mes"
                              fechaSeleccionada={
                                fechaInicio || format(new Date(), "yyyy-MM-dd")
                              }
                              onSelectDate={(date) => {
                                const newMes = date.substring(0, 7);
                                setMesSemanas(newMes);
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
                      </>
                    )}

                    {modoFiltro === "rango" && (
                      <div className="flex flex-1 min-w-0 w-full items-center justify-center gap-1.5 sm:gap-2">
                        <Popover open={calendarInicioOpen} onOpenChange={setCalendarInicioOpen}>
                          <PopoverTrigger asChild>
                            <button type="button" className={botonFechaRangoClass}>
                              <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span>{formatearFechaFiltro(fechaInicio)}</span>
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
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 shrink-0" />
                        <Popover open={calendarFinOpen} onOpenChange={setCalendarFinOpen}>
                          <PopoverTrigger asChild>
                            <button type="button" className={botonFechaRangoClass}>
                              <Calendar className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              <span>{formatearFechaFiltro(fechaFin)}</span>
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
                    )}
                  </div>
                </div>

                <div className="order-3 lg:order-none lg:col-start-3 lg:row-start-1 lg:justify-self-end flex items-center gap-1 shrink-0 w-full lg:w-auto justify-start">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (filtroEstado === "aprobado") {
                        setFiltroEstado("todos");
                      } else {
                        setFiltroEstado("aprobado");
                        if (modoFiltro === "pendientes") aplicarModoSemana();
                      }
                    }}
                    className={cn(
                      "h-9 sm:h-10 lg:h-11 px-2 sm:px-3 text-[10px] sm:text-[11px] font-bold rounded-lg border transition-all shadow-sm",
                      filtroEstado === "aprobado"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
                    )}
                  >
                    Apr: {estadisticas.aprobados}
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => {
                      if (filtroEstado === "rechazado") {
                        setFiltroEstado("todos");
                      } else {
                        setFiltroEstado("rechazado");
                        if (modoFiltro === "pendientes") aplicarModoSemana();
                      }
                    }}
                    className={cn(
                      "h-9 sm:h-10 lg:h-11 px-2 sm:px-3 text-[10px] sm:text-[11px] font-bold rounded-lg border transition-all shadow-sm",
                      filtroEstado === "rechazado"
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
                    )}
                  >
                    Rech: {estadisticas.rechazados}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-neutral-800 pt-3 sm:pt-4">
            {loadingAcuerdos ? (
              <Cargando texto="Cargando acuerdos..." />
            ) : gruposConDatos.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 text-xs py-8">
                No hay información disponible.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {gruposConDatos.map((grupo) => {
                  const estaAbierta = oficinasAbiertas[grupo.oficina_nombre] || false;
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
                              ({grupo.acuerdos.length})
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
                                grupo.acuerdos.reduce(
                                  (acc, a) => {
                                    const uid = a.user_id;
                                    if (!acc[uid])
                                      acc[uid] = {
                                        usuario: a.usuario,
                                        acuerdos: [],
                                      };
                                    acc[uid].acuerdos.push(a);
                                    return acc;
                                  },
                                  {} as Record<
                                    string,
                                    {
                                      usuario: AcuerdoEmpleado["usuario"];
                                      acuerdos: AcuerdoEmpleado[];
                                    }
                                  >,
                                ),
                              ).map((usuarioGrupo) => (
                                <UsuarioGrupoAcuerdos
                                  key={usuarioGrupo.usuario?.id || Math.random()}
                                  usuarioGrupo={usuarioGrupo}
                                  tipoVista={tipoVista}
                                  perfilUsuario={perfilUsuario}
                                  handleVerPreview={handleVerPreview}
                                  handleElegirDiasSemana={handleElegirDiasSemana}
                                  handleClickFila={handleClickFila}
                                  handleEliminarAcuerdo={handleEliminarAcuerdo}
                                  getEstadoBadge={getEstadoBadge}
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

      <PreviewAcuerdo
        isOpen={modalPreviewAbierto}
        onClose={() => setModalPreviewAbierto(false)}
        acuerdo={acuerdoParaImagen}
        tipoVista={tipoVista}
        perfilUsuario={perfilUsuario}
        onElegirDias={abrirElegirDiasDesdePreview}
      />
      <CrearEditarAcuerdo
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        acuerdoAEditar={acuerdoParaEditar}
        onSuccess={cargarDatos}
        perfilUsuario={perfilUsuario}
        tipoVista={tipoVista}
        usuariosParaModal={usuariosParaModal}
      />
      <ElegirDiasSemanaAcuerdo
        isOpen={modalElegirDiasAbierto}
        onClose={() => setModalElegirDiasAbierto(false)}
        acuerdo={acuerdoParaElegirDias}
        onSuccess={cargarDatos}
      />
    </>
  );
}

function UsuarioGrupoAcuerdos({
  usuarioGrupo,
  tipoVista,
  perfilUsuario,
  handleVerPreview,
  handleElegirDiasSemana,
  handleClickFila,
  handleEliminarAcuerdo,
  getEstadoBadge,
}: {
  usuarioGrupo: {
    usuario: AcuerdoEmpleado["usuario"];
    acuerdos: AcuerdoEmpleado[];
  };
  tipoVista: TipoVistaAcuerdos;
  perfilUsuario: PerfilUsuario | null;
  handleVerPreview: (e: React.MouseEvent, a: AcuerdoEmpleado) => void;
  handleElegirDiasSemana: (e: React.MouseEvent, a: AcuerdoEmpleado) => void;
  handleClickFila: (a: AcuerdoEmpleado) => void;
  handleEliminarAcuerdo: (e: React.MouseEvent, id: string) => void;
  getEstadoBadge: (e: string) => React.ReactNode;
}) {
  const [filtro, setFiltro] = React.useState<CategoriaAcuerdo | "todos">("todos");
  const [orden, setOrden] = React.useState<"fecha" | "tipo">("fecha");

  const stats = React.useMemo(() => {
    return usuarioGrupo.acuerdos.reduce(
      (acc, a) => {
        const cat = getCategoriaAcuerdo(a);
        acc[cat]++;
        acc.total++;
        return acc;
      },
      {
        vacaciones: 0,
        permiso_especial: 0,
        licencia_goce: 0,
        licencia_sin_goce: 0,
        suspension_igss: 0,
        total: 0,
      } as Record<CategoriaAcuerdo | "total", number>,
    );
  }, [usuarioGrupo.acuerdos]);

  const acuerdosFiltrados = React.useMemo(() => {
    const lista =
      filtro === "todos"
        ? [...usuarioGrupo.acuerdos]
        : usuarioGrupo.acuerdos.filter((a) => getCategoriaAcuerdo(a) === filtro);

    if (orden === "tipo") {
      return lista.sort((a, b) => {
        const catA = CATEGORIA_ORDEN[getCategoriaAcuerdo(a)];
        const catB = CATEGORIA_ORDEN[getCategoriaAcuerdo(b)];
        if (catA !== catB) return catA - catB;
        return parseISO(a.inicio).getTime() - parseISO(b.inicio).getTime();
      });
    }

    return lista.sort(
      (a, b) => parseISO(a.inicio).getTime() - parseISO(b.inicio).getTime(),
    );
  }, [filtro, orden, usuarioGrupo.acuerdos]);

  const categoriasConDatos = (
    Object.entries(stats) as [CategoriaAcuerdo | "total", number][]
  ).filter(([key, count]) => key !== "total" && count > 0) as [CategoriaAcuerdo, number][];

  return (
    <div className="flex flex-col gap-2">
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

        <div className="mt-1 md:mt-0 flex items-center justify-center md:justify-end gap-1.5 flex-wrap">
          {categoriasConDatos.map(([cat, count]) => {
            const CatIcon = getCategoriaAcuerdoIcon(cat);
            const label = getCategoriaAcuerdoLabel(cat);
            const badgeClass = getCategoriaAcuerdoBadgeClass(cat);
            return (
              <button
                key={cat}
                onClick={() => setFiltro(filtro === cat ? "todos" : cat)}
                className={cn(
                  "text-[9px] lg:text-xs font-bold px-1.5 lg:px-2 py-0.5 lg:py-1 rounded transition-all border inline-flex items-center gap-1",
                  filtro === cat
                    ? "scale-105 text-white border-transparent"
                    : cn(badgeClass, "hover:opacity-80"),
                  filtro === cat && cat === "vacaciones" && "bg-purple-600 border-purple-700",
                  filtro === cat && cat === "permiso_especial" && "bg-blue-600 border-blue-700",
                  filtro === cat && cat === "licencia_goce" && "bg-emerald-600 border-emerald-700",
                  filtro === cat && cat === "licencia_sin_goce" && "bg-slate-600 border-slate-700",
                  filtro === cat && cat === "suspension_igss" && "bg-yellow-500 text-yellow-950 border-yellow-600",
                )}
              >
                <CatIcon className="w-3 h-3 shrink-0" />
                {count} {label}
              </button>
            );
          })}
          <button
            onClick={() => setFiltro("todos")}
            className={cn(
              "text-[10px] lg:text-xs font-bold px-2 lg:px-2.5 py-0.5 lg:py-1 rounded border shrink-0 transition-all",
              filtro === "todos"
                ? "bg-slate-200 text-slate-800 border-slate-300 dark:bg-neutral-700 dark:text-white"
                : "bg-white text-slate-500 border-slate-100 dark:bg-neutral-900 dark:border-neutral-800 hover:bg-slate-50",
            )}
          >
            Total: {stats.total}
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
              "bg-white text-slate-600 border-slate-200 dark:bg-neutral-900 dark:text-slate-300 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800",
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

      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3 pl-2 md:pl-4 border-l-2 border-slate-100 dark:border-neutral-800 ml-3">
        <AnimatePresence mode="popLayout">
          {acuerdosFiltrados.map((acuerdo) => {
            const esSemanalFlexible =
              getModalidadAcuerdo(parseDiasAcuerdo(acuerdo.dias)) === "semanal";
            const puedeAsignarDias =
              esSemanalFlexible &&
              acuerdo.estado === "aprobado" &&
              tipoVista === "gestion_rrhh";
            const puedeEditar = tipoVista === "gestion_rrhh";
            const puedeEliminar = tipoVista === "gestion_rrhh";

            const fechaInicioConHora = parseISO(acuerdo.inicio);
            const fechaFinConHora = parseISO(acuerdo.fin);
            const fechaInicio = new Date(
              fechaInicioConHora.getFullYear(),
              fechaInicioConHora.getMonth(),
              fechaInicioConHora.getDate(),
            );
            const fechaFin = new Date(
              fechaFinConHora.getFullYear(),
              fechaFinConHora.getMonth(),
              fechaFinConHora.getDate(),
            );
            const esMismoDia = isSameDay(fechaInicio, fechaFin);

            const textoFecha = formatearRangoTarjeta(
              fechaInicio,
              fechaFin,
              esMismoDia,
            );

            const cat = getCategoriaAcuerdo(acuerdo);
            const CatIcon = getCategoriaAcuerdoIcon(cat);
            const borderClass = getCategoriaAcuerdoBorderClass(cat);
            const diasTexto = formatearDiasSemana(acuerdo.dias);

            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={acuerdo.id}
                className={cn(
                  "group relative flex flex-col justify-between bg-white dark:bg-neutral-900 rounded-lg p-3 shadow-sm hover:shadow-md transition-all w-full border border-gray-200 dark:border-neutral-800",
                  borderClass,
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[10px] lg:text-sm px-2 lg:px-3 py-0.5 lg:py-1 rounded font-mono font-bold tracking-wider",
                      getCategoriaAcuerdoBadgeClass(cat),
                    )}
                  >
                    <CatIcon className="w-3 h-3 lg:w-3.5 lg:h-3.5 shrink-0" />
                    Cód:{" "}
                    <span className="font-black">
                      {`${acuerdo.id.substring(0, 3)}-${acuerdo.id.substring(3, 6)}`.toUpperCase()}
                    </span>
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] lg:text-xs text-gray-400 font-medium whitespace-nowrap">
                      {formatearFechaTarjetaDesdeISO(acuerdo.created_at)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="bg-slate-50 dark:bg-neutral-800/50 p-2 rounded">
                    <p className="text-xs lg:text-lg font-bold text-slate-700 dark:text-slate-300 capitalize mb-1">
                      {acuerdo.tipo}
                    </p>
                    <div className="flex flex-col gap-1 text-[10px] lg:text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3 lg:w-4 lg:h-4 text-blue-500/70" />
                        <span className="font-medium">{textoFecha}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 min-w-0">
                          <FileText className="w-3 h-3 lg:w-4 lg:h-4 text-indigo-500/70 shrink-0" />
                          <span className="font-medium">{diasTexto}</span>
                        </div>
                        {puedeAsignarDias && (
                          <button
                            onClick={(e) => handleElegirDiasSemana(e, acuerdo)}
                            className="flex items-center justify-center gap-1 px-2 py-1 text-[9px] lg:text-xs font-bold text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40 rounded-md transition-colors border-2 border-violet-600 dark:border-violet-400 cursor-pointer shrink-0"
                          >
                            <CalendarClock className="w-3 h-3 shrink-0" />
                            <span className="hidden sm:inline">Asignar días</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {acuerdo.descripcion && (
                    <div className="p-1.5 rounded bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-900/20">
                      <p className="text-[10px] lg:text-sm text-gray-600 dark:text-gray-400 italic line-clamp-2">
                        {acuerdo.descripcion}
                      </p>
                    </div>
                  )}
                  {acuerdo.aprobado_rrhh_nombre && (
                    <div className="flex flex-col gap-0.5 text-[10px] lg:text-xs text-slate-600 dark:text-slate-400">
                      <p>
                        <span className="font-bold text-slate-500 dark:text-slate-500">
                          Aprobado por:
                        </span>{" "}
                        {acuerdo.aprobado_rrhh_nombre}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 mt-auto pt-2 border-t border-gray-50 dark:border-neutral-800 md:flex-row md:items-center md:justify-between md:gap-3">
                  <div className="flex items-center justify-center md:justify-start gap-1.5 flex-nowrap overflow-x-auto">
                    {getEstadoBadge(acuerdo.estado)}
                    {acuerdo.estado === "aprobado" && acuerdo.remunerado !== null && (
                      <span
                        className={cn(
                          "text-[9px] lg:text-xs font-bold px-1.5 lg:px-2.5 py-0.5 lg:py-1 rounded border inline-flex items-center shrink-0",
                          acuerdo.remunerado
                            ? "text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800"
                            : "text-gray-600 bg-gray-100 border-gray-200 dark:text-gray-400 dark:bg-neutral-800 dark:border-neutral-700",
                        )}
                      >
                        {acuerdo.remunerado ? "REMUNERADO" : "NO REM"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-center md:justify-end gap-1.5 flex-wrap">
                    <button
                      onClick={(e) => handleVerPreview(e, acuerdo)}
                      className="flex items-center justify-center gap-1.5 px-2.5 lg:px-3 py-1.5 lg:py-1.5 text-[10px] lg:text-sm font-bold text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md transition-colors border-2 border-blue-600 dark:border-blue-400 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                      Ver
                    </button>

                    {puedeEditar && (
                      <button
                        onClick={() => handleClickFila(acuerdo)}
                        className="flex items-center justify-center gap-1.5 px-2.5 lg:px-3 py-1.5 lg:py-1.5 text-[10px] lg:text-sm font-bold text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-md transition-colors border-2 border-amber-600 dark:border-amber-400 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                        Editar
                      </button>
                    )}

                    {puedeEliminar && (
                      <button
                        onClick={(e) => handleEliminarAcuerdo(e, acuerdo.id)}
                        className="flex items-center justify-center gap-1.5 px-2 lg:px-3 py-1.5 lg:py-1.5 text-[10px] lg:text-sm font-bold text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-md transition-colors border-2 border-red-600 dark:border-red-400 cursor-pointer"
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
