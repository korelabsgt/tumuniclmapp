"use client";

import React, { Fragment, useMemo } from "react";
import {
  format,
  parseISO,
  isSameDay,
  isSameMonth,
  differenceInDays,
  eachDayOfInterval,
  isWeekend,
} from "date-fns";
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
  ArrowUpDown,
  Shield,
  Umbrella,
  GraduationCap,
  CreditCard,
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
import {
  formatearFechaTarjetaDesdeISO,
  formatearRangoTarjeta,
} from "@/components/permisos/lib/fechas";
import FiltroFechaPermisos, {
  aplicarModoMes,
} from "./FiltroFechaPermisos";
import PermisosNav from "./PermisosNav";

type CategoriaPermiso =
  | "igss"
  | "vacaciones"
  | "academicas"
  | "extras"
  | "permisos";

const CATEGORIA_ORDEN: Record<CategoriaPermiso, number> = {
  extras: 0,
  igss: 1,
  academicas: 2,
  vacaciones: 3,
  permisos: 4,
};

function getEstadoTextoPlain(estado: string) {
  switch (estado) {
    case "aprobado":
      return (
        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm lg:text-base">
          Aprobado RRHH
        </span>
      );
    case "aprobado_jefe":
      return (
        <span className="text-blue-600 dark:text-blue-400 font-bold text-sm lg:text-base">
          Preaprobado Jefe
        </span>
      );
    case "rechazado_jefe":
    case "rechazado_rrhh":
    case "rechazado":
      return (
        <span className="text-red-600 dark:text-red-400 font-bold text-sm lg:text-base">
          {estado === "rechazado_jefe"
            ? "Rechazado Jefe"
            : estado === "rechazado_rrhh"
              ? "Rechazado RRHH"
              : "Rechazado"}
        </span>
      );
    default:
      return (
        <span className="text-amber-600 dark:text-amber-400 font-bold text-sm lg:text-base">
          Pendiente Jefe
        </span>
      );
  }
}

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
    handleNuevoPermiso,
    handleClickFila,
    handleEliminarPermiso,
  } = actions;

  const [modalPreviewAbierto, setModalPreviewAbierto] = React.useState(false);
  const [permisoParaImagen, setPermisoParaImagen] =
    React.useState<PermisoEmpleado | null>(null);
  const [modalJustificacionAbierto, setModalJustificacionAbierto] =
    React.useState(false);
  const [permisoParaJustificar, setPermisoParaJustificar] =
    React.useState<PermisoEmpleado | null>(null);
  const [modalAsuetoAbierto, setModalAsuetoAbierto] = React.useState(false);
  const puedeGestionarEvidencia = ["RRHH", "SUPER", "SECRETARIO"].includes(
    perfilUsuario?.rol || "",
  );

  const volverAModoMes = () =>
    aplicarModoMes({ setModoFiltro, setFechaInicio, setFechaFin });

  const handleVerPreview = (e: React.MouseEvent, permiso: PermisoEmpleado) => {
    e.stopPropagation();
    setPermisoParaImagen(permiso);
    setModalPreviewAbierto(true);
  };

  const handleAbrirJustificacion = (
    e: React.MouseEvent,
    permiso: PermisoEmpleado,
  ) => {
    e.stopPropagation();
    setPermisoParaJustificar(permiso);
    setModalJustificacionAbierto(true);
  };

  // FILTRO VISUAL
  const gruposConDatos = useMemo(() => {
    return datosAgrupados.filter((grupo) => grupo.permisos.length > 0);
  }, [datosAgrupados]);

  const esAcademicasTexto = (t: string, d: string) =>
    t.includes("académ") ||
    t.includes("academ") ||
    d.includes("académ") ||
    d.includes("academ");

  const getCategoriaFromTexto = (t: string, d: string): CategoriaPermiso => {
    if (t.includes("igss") || d.includes("igss")) return "igss";
    if (t.includes("vacaciones") || d.includes("vacaciones"))
      return "vacaciones";
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

  const getCategoriaBorderClass = (
    tipo: string,
    descripcion: string | null,
  ) => {
    const t = tipo.toLowerCase();
    const d = (descripcion || "").toLowerCase();
    const cat = getCategoriaFromTexto(t, d);

    if (cat === "igss") return "border-t-[3px] border-t-amber-500";
    if (cat === "vacaciones") return "border-t-[3px] border-t-purple-500";
    if (cat === "academicas") return "border-t-[3px] border-t-green-500";
    if (cat === "extras") return "border-t-[3px] border-t-slate-500";
    return "border-t-[3px] border-t-blue-500";
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
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
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
      const weekdays = allDays.filter((day) => !isWeekend(day));
      if (weekdays.length === 0) return 0;

      if (isSameDay(start, end)) {
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return Math.min(Math.max(hours, 0), HOURS_PER_DAY);
      }

      let totalHours = 0;
      for (const day of weekdays) {
        if (isSameDay(day, start)) {
          const startHour = start.getHours() + start.getMinutes() / 60;
          totalHours += Math.max(
            0,
            Math.min(WORK_END - Math.max(startHour, WORK_START), HOURS_PER_DAY),
          );
        } else if (isSameDay(day, end)) {
          const endHour = end.getHours() + end.getMinutes() / 60;
          totalHours += Math.max(
            0,
            Math.min(endHour - WORK_START, HOURS_PER_DAY),
          );
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

  const navTipoVista =
    tipoVista === "mis_permisos"
      ? "mis"
      : tipoVista === "gestion_jefe"
        ? "jefe"
        : "rrhh";

  return (
    <>
      <div className="w-full lg:w-[95%] mx-auto md:px-4 pb-10 transition-all">
        <div className="p-2 bg-white dark:bg-neutral-900 rounded-lg shadow-md w-full border border-gray-100 dark:border-neutral-800 transition-colors duration-200">
          <div className="flex flex-col gap-2 sm:gap-3 mb-3 sm:mb-4 p-1 sm:p-2">
            <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center sm:justify-between">
              <PermisosNav tipoVista={navTipoVista} />
              <div className="flex gap-2 w-full sm:w-auto">
                {tipoVista === "gestion_rrhh" && (
                  <button
                    type="button"
                    onClick={() => setModalAsuetoAbierto(true)}
                    className="flex flex-1 sm:flex-initial min-w-0 items-center justify-center gap-1.5 h-8 lg:h-10 px-2 sm:px-2.5 lg:px-3 text-[11px] sm:text-xs lg:text-sm font-bold text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-md transition-colors border-2 border-amber-600 dark:border-amber-400 cursor-pointer"
                  >
                    <PartyPopper className="w-3 h-3 lg:w-4 lg:h-4 shrink-0" />
                    <span className="truncate">Gestionar Asuetos</span>
                  </button>
                )}
                {(tipoVista === "mis_permisos" ||
                  tipoVista === "gestion_rrhh") && (
                  <button
                    type="button"
                    onClick={handleNuevoPermiso}
                    className="flex flex-1 sm:flex-initial min-w-0 items-center justify-center gap-1.5 h-8 lg:h-10 px-2 sm:px-2.5 lg:px-3 text-[11px] sm:text-xs lg:text-sm font-bold text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md transition-colors border-2 border-blue-600 dark:border-blue-400 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                    <span className="truncate">Nuevo Permiso</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:gap-4 bg-gray-50/50 dark:bg-neutral-900/30 py-4 sm:py-5 px-2 sm:px-3 rounded-xl border border-gray-100 dark:border-neutral-800/50 w-full">
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
                  <span className="hidden sm:inline">
                    {todosAbiertos ? "Ocultar Todos" : "Ver Todos"}
                  </span>
                  <span className="sm:hidden">
                    {todosAbiertos ? "Ocultar" : "Ver"}
                  </span>
                </Button>
              </div>

              {(tipoVista === "gestion_jefe" || tipoVista === "gestion_rrhh") &&
                (conteosPendientes.pendientes > 0 ||
                  conteosPendientes.avalados > 0) && (
                  <div className="flex gap-2 w-full">
                    {conteosPendientes.pendientes > 0 && (
                      <button
                        onClick={() => {
                          if (
                            filtroEstado === "pendiente" &&
                            modoFiltro === "pendientes"
                          ) {
                            setFiltroEstado("todos");
                            volverAModoMes();
                          } else {
                            setFiltroEstado("pendiente");
                            setModoFiltro("pendientes");
                          }
                        }}
                        className={cn(
                          "flex-1 h-9 flex items-center justify-center gap-1 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer",
                          modoFiltro === "pendientes" &&
                            filtroEstado === "pendiente"
                            ? "bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700"
                            : "bg-white dark:bg-neutral-950 text-gray-500 border-gray-200 dark:border-neutral-800 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                        )}
                      >
                        <span className="truncate">P. Jefe</span>
                        <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-neutral-600 text-[10px] font-bold text-amber-600 dark:text-amber-400 px-1">
                          {conteosPendientes.pendientes}
                        </span>
                      </button>
                    )}
                    {conteosPendientes.avalados > 0 && (
                      <button
                        onClick={() => {
                          if (
                            filtroEstado === "aprobado_jefe" &&
                            modoFiltro === "pendientes"
                          ) {
                            setFiltroEstado("todos");
                            volverAModoMes();
                          } else {
                            setFiltroEstado("aprobado_jefe");
                            setModoFiltro("pendientes");
                          }
                        }}
                        className={cn(
                          "flex-1 h-9 flex items-center justify-center gap-1 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer",
                          modoFiltro === "pendientes" &&
                            filtroEstado === "aprobado_jefe"
                            ? "bg-purple-50 text-purple-600 border-purple-300 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-700"
                            : "bg-white dark:bg-neutral-950 text-gray-500 border-gray-200 dark:border-neutral-800 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                        )}
                      >
                        <span className="truncate">P. RRHH</span>
                        <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-neutral-600 text-[10px] font-bold text-purple-600 dark:text-purple-400 px-1">
                          {conteosPendientes.avalados}
                        </span>
                      </button>
                    )}
                  </div>
                )}

              <div className="flex flex-col gap-2 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-end lg:gap-3 w-full">
                <FiltroFechaPermisos
                  modoFiltro={modoFiltro}
                  fechaSeleccionada={fechaSeleccionada}
                  fechaInicio={fechaInicio}
                  fechaFin={fechaFin}
                  setModoFiltro={setModoFiltro}
                  setFechaSeleccionada={setFechaSeleccionada}
                  setFechaInicio={setFechaInicio}
                  setFechaFin={setFechaFin}
                  alCambiarModo={() => setFiltroEstado("todos")}
                />

                <div className="order-3 lg:order-none lg:col-start-3 lg:row-start-1 lg:justify-self-end flex items-center gap-1 shrink-0 w-full lg:w-auto justify-start">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (filtroEstado === "aprobado") {
                        setFiltroEstado("todos");
                      } else {
                        setFiltroEstado("aprobado");
                        if (modoFiltro === "pendientes") volverAModoMes();
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
                        if (modoFiltro === "pendientes") volverAModoMes();
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
                            <div className="p-2 sm:p-2.5 flex flex-col gap-3">
                              {Object.values(
                                grupo.permisos.reduce(
                                  (acc, p) => {
                                    const uid = p.user_id;
                                    if (!acc[uid])
                                      acc[uid] = {
                                        usuario: p.usuario,
                                        permisos: [],
                                      };
                                    acc[uid].permisos.push(p);
                                    return acc;
                                  },
                                  {} as Record<
                                    string,
                                    {
                                      usuario: any;
                                      permisos: PermisoEmpleado[];
                                    }
                                  >,
                                ),
                              ).map((usuarioGrupo) => (
                                <UsuarioGrupoPermisos
                                  key={
                                    usuarioGrupo.usuario?.id || Math.random()
                                  }
                                  usuarioGrupo={usuarioGrupo}
                                  tipoVista={tipoVista}
                                  puedeGestionarEvidencia={puedeGestionarEvidencia}
                                  handleVerPreview={handleVerPreview}
                                  handleAbrirJustificacion={
                                    handleAbrirJustificacion
                                  }
                                  handleClickFila={handleClickFila}
                                  handleEliminarPermiso={handleEliminarPermiso}
                                  getCategoriaBorderClass={
                                    getCategoriaBorderClass
                                  }
                                  getCategoria={getCategoria}
                                  getCategoriaIcon={getCategoriaIcon}
                                  getCategoriaBadgeClass={
                                    getCategoriaBadgeClass
                                  }
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
        soloLectura={!puedeGestionarEvidencia}
      />
      <CrearEditarPermiso
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        permisoAEditar={permisoParaEditar}
        onSuccess={cargarDatos}
        perfilUsuario={perfilUsuario}
        tipoVista={tipoVista}
        usuariosParaModal={usuariosParaModal}
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
  puedeGestionarEvidencia,
  handleVerPreview,
  handleAbrirJustificacion,
  handleClickFila,
  handleEliminarPermiso,
  getCategoriaBorderClass,
  getCategoria,
  getCategoriaIcon,
  getCategoriaBadgeClass,
  getHorasTrabajo,
  formatHorasLabel,
}: {
  usuarioGrupo: { usuario: any; permisos: PermisoEmpleado[] };
  tipoVista: TipoVistaPermisos;
  puedeGestionarEvidencia: boolean;
  handleVerPreview: (e: React.MouseEvent, p: PermisoEmpleado) => void;
  handleAbrirJustificacion: (e: React.MouseEvent, p: PermisoEmpleado) => void;
  handleClickFila: (p: PermisoEmpleado) => void;
  handleEliminarPermiso: (e: React.MouseEvent, id: string) => void;
  getCategoriaBorderClass: (t: string, d: string | null) => string;
  getCategoria: (p: PermisoEmpleado) => CategoriaPermiso;
  getCategoriaIcon: (cat: CategoriaPermiso) => LucideIcon;
  getCategoriaBadgeClass: (cat: CategoriaPermiso) => string;
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
      {
        v: 0,
        vd: 0,
        e: 0,
        ed: 0,
        i: 0,
        id: 0,
        a: 0,
        ad: 0,
        o: 0,
        od: 0,
        td: 0,
      },
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
      (a, b) => parseISO(a.inicio).getTime() - parseISO(b.inicio).getTime(),
    );
  }, [filtro, orden, usuarioGrupo.permisos, getCategoria]);

  const chipTipo = (activo: boolean, activoCls: string, inactivoCls: string) =>
    cn(
      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] lg:text-xs font-semibold transition-colors cursor-pointer select-none",
      activo ? activoCls : inactivoCls,
    );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5 px-2 py-2 bg-slate-100/50 dark:bg-neutral-800/50 rounded-md border border-slate-200 dark:border-neutral-700">
        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full shrink-0">
          <User className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-base lg:text-lg font-bold text-slate-800 dark:text-gray-100 leading-tight">
            {usuarioGrupo.usuario?.nombre}
          </span>
          <span className="text-xs lg:text-sm text-slate-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
            <Briefcase className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
            <span className="truncate">
              {usuarioGrupo.usuario?.puesto_nombre || "Sin puesto"}
            </span>
          </span>
        </div>
      </div>

      <div className="rounded-lg bg-slate-100/60 dark:bg-neutral-800/40 px-2.5 py-2 flex flex-col gap-2 w-full">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-neutral-500 mr-0.5 shrink-0">
            Tipo
          </span>
          {stats.e > 0 && (
            <button
              type="button"
              onClick={() =>
                setFiltro(filtro === "extras" ? "todos" : "extras")
              }
              className={chipTipo(
                filtro === "extras",
                "bg-slate-500/25 text-slate-800 dark:text-slate-100",
                "text-slate-500 dark:text-neutral-400 hover:bg-white/50 dark:hover:bg-neutral-700/40",
              )}
            >
              <Clock className="w-3 h-3 shrink-0 opacity-70" />
              {stats.e} Ext {stats.ed > 0 && `· ${formatHorasLabel(stats.ed)}`}
            </button>
          )}
          {stats.i > 0 && (
            <button
              type="button"
              onClick={() => setFiltro(filtro === "igss" ? "todos" : "igss")}
              className={chipTipo(
                filtro === "igss",
                "bg-amber-500/20 text-amber-700 dark:text-amber-300",
                "text-slate-500 dark:text-neutral-400 hover:bg-amber-500/10",
              )}
            >
              <Shield className="w-3 h-3 shrink-0 text-amber-500" />
              {stats.i} IGSS {stats.id > 0 && `· ${formatHorasLabel(stats.id)}`}
            </button>
          )}
          {stats.a > 0 && (
            <button
              type="button"
              onClick={() =>
                setFiltro(filtro === "academicas" ? "todos" : "academicas")
              }
              className={chipTipo(
                filtro === "academicas",
                "bg-green-500/20 text-green-700 dark:text-green-300",
                "text-slate-500 dark:text-neutral-400 hover:bg-green-500/10",
              )}
            >
              <GraduationCap className="w-3 h-3 shrink-0 text-green-500" />
              {stats.a} Educ {stats.ad > 0 && `· ${formatHorasLabel(stats.ad)}`}
            </button>
          )}
          {stats.v > 0 && (
            <button
              type="button"
              onClick={() =>
                setFiltro(filtro === "vacaciones" ? "todos" : "vacaciones")
              }
              className={chipTipo(
                filtro === "vacaciones",
                "bg-purple-500/20 text-purple-700 dark:text-purple-300",
                "text-slate-500 dark:text-neutral-400 hover:bg-purple-500/10",
              )}
            >
              <Umbrella className="w-3 h-3 shrink-0 text-purple-500" />
              {stats.v} Vac {stats.vd > 0 && `· ${formatHorasLabel(stats.vd)}`}
            </button>
          )}
          {stats.o > 0 && (
            <button
              type="button"
              onClick={() =>
                setFiltro(filtro === "permisos" ? "todos" : "permisos")
              }
              className={chipTipo(
                filtro === "permisos",
                "bg-blue-500/20 text-blue-700 dark:text-blue-300",
                "text-slate-500 dark:text-neutral-400 hover:bg-blue-500/10",
              )}
            >
              <FileText className="w-3 h-3 shrink-0 text-blue-500" />
              {stats.o} Perm {stats.od > 0 && `· ${formatHorasLabel(stats.od)}`}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1.5 border-t border-slate-200/70 dark:border-neutral-700/70">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-neutral-500 shrink-0">
            Vista
          </span>
          <button
            type="button"
            onClick={() => setFiltro("todos")}
            className={cn(
              "text-sm lg:text-base font-medium transition-colors cursor-pointer tabular-nums",
              filtro === "todos"
                ? "text-slate-900 dark:text-slate-100 underline decoration-blue-500 decoration-2 underline-offset-[3px]"
                : "text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200",
            )}
          >
            Total{" "}
            <span className="font-semibold">
              {stats.td > 0 ? formatHorasLabel(stats.td) : "0h"}
            </span>
          </button>
          <span className="text-slate-300 dark:text-neutral-600 select-none">
            ·
          </span>
          <button
            type="button"
            onClick={() => setOrden(orden === "fecha" ? "tipo" : "fecha")}
            title={
              orden === "fecha"
                ? "Ordenado por fecha. Clic para ordenar por tipo"
                : "Ordenado por tipo. Clic para ordenar por fecha"
            }
            className="inline-flex items-center gap-1 text-sm lg:text-base font-medium text-cyan-700 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 transition-colors cursor-pointer"
          >
            {orden === "fecha" ? (
              <>
                <CalendarDays className="w-3.5 h-3.5 shrink-0 opacity-80" />
                Por fecha
              </>
            ) : (
              <>
                <ArrowUpDown className="w-3.5 h-3.5 shrink-0 opacity-80" />
                Por tipo
              </>
            )}
          </button>
        </div>
      </div>

      {/* Listado de permisos para este usuario (Filtrado) */}
      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 pl-1.5 ml-0.5 border-l border-slate-200 dark:border-neutral-700">
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
            const textoHora = `${format(fechaInicioConHora, "h:mm a", { locale: es })} - ${format(fechaFinConHora, "h:mm a", { locale: es })}`;
            const borderClass = getCategoriaBorderClass(
              permiso.tipo,
              permiso.descripcion,
            );
            const muestraEvidencia =
              puedeGestionarEvidencia || !!permiso.comprobante_url;

            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={permiso.id}
                className={cn(
                  "group relative flex flex-col justify-between bg-white dark:bg-neutral-900 rounded-xl p-3.5 shadow-md hover:shadow-lg transition-all w-full border-2 border-slate-300 dark:border-neutral-600 ring-1 ring-slate-200/80 dark:ring-neutral-700/80",
                  borderClass,
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  {(() => {
                    const cat = getCategoria(permiso);
                    const CatIcon = getCategoriaIcon(cat);
                    return (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs lg:text-base px-2.5 lg:px-3 py-0.5 lg:py-1 rounded font-mono font-bold tracking-wider",
                          getCategoriaBadgeClass(cat),
                        )}
                      >
                        <CatIcon className="w-3 h-3 lg:w-3.5 lg:h-3.5 shrink-0" />
                        Cód:{" "}
                        <span className="font-black">
                          {`${permiso.id.substring(0, 3)}-${permiso.id.substring(3, 6)}`.toUpperCase()}
                        </span>
                      </span>
                    );
                  })()}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs lg:text-sm text-gray-400 font-medium whitespace-nowrap">
                      {formatearFechaTarjetaDesdeISO(permiso.created_at)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="bg-slate-50 dark:bg-neutral-800/50 p-2 rounded">
                    <p className="text-xs lg:text-lg font-bold text-slate-700 dark:text-slate-300 capitalize mb-1">
                      {permiso.tipo.replace("_", " ")}
                    </p>
                    <div className="flex flex-col gap-1.5 text-sm lg:text-base text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3 lg:w-4 lg:h-4 text-blue-500/70" />
                          <span className="font-medium">{textoFecha}</span>
                        </div>
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                          <span>
                            {(() => {
                              const cat = getCategoria(permiso);
                              if (cat === "extras") return null;
                              const h = getHorasTrabajo(
                                fechaInicioConHora,
                                fechaFinConHora,
                              );
                              if (h <= 0) return null;
                              return `• ${formatHorasLabel(h)}`;
                            })()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 min-w-0">
                          <Clock className="w-3 h-3 lg:w-4 lg:h-4 text-orange-500/70 shrink-0" />
                          <span>{textoHora}</span>
                        </div>
                        {muestraEvidencia && (
                          <button
                            type="button"
                            onClick={(e) =>
                              handleAbrirJustificacion(e, permiso)
                            }
                            className={cn(
                              "flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs lg:text-sm font-bold rounded-md transition-colors border-2 cursor-pointer shrink-0",
                              permiso.comprobante_url
                                ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border-emerald-600 dark:border-emerald-400"
                                : "text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border-indigo-600 dark:border-indigo-400",
                            )}
                            title={
                              permiso.comprobante_url
                                ? "Ver evidencia"
                                : "Subir evidencia"
                            }
                          >
                            {permiso.comprobante_url ? (
                              <Eye className="w-4 h-4 shrink-0" />
                            ) : (
                              <Upload className="w-4 h-4 shrink-0" />
                            )}
                            Evidencia
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {permiso.descripcion && (
                    <div className="p-1.5 rounded bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-900/20">
                      <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 italic line-clamp-2">
                        {permiso.descripcion}
                      </p>
                    </div>
                  )}
                  {(permiso.aprobado_jefe_nombre || permiso.aprobado_rrhh_nombre) && (
                    <div className="flex flex-col gap-0.5 text-sm lg:text-base text-slate-600 dark:text-slate-400">
                      {permiso.aprobado_jefe_nombre && (
                        <p>
                          <span className="font-bold text-slate-500 dark:text-slate-500">
                            Preaprobado por:
                          </span>{" "}
                          {permiso.aprobado_jefe_nombre}
                        </p>
                      )}
                      {permiso.aprobado_rrhh_nombre && (
                        <p>
                          <span className="font-bold text-slate-500 dark:text-slate-500">
                            Aprobado por:
                          </span>{" "}
                          {permiso.aprobado_rrhh_nombre}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between w-full gap-2">
                    {getEstadoTextoPlain(permiso.estado)}
                    {permiso.estado === "aprobado" &&
                      permiso.remunerado !== null && (
                        <span
                          className={cn(
                            "font-bold text-sm lg:text-base shrink-0",
                            permiso.remunerado
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400",
                          )}
                        >
                          {permiso.remunerado ? "Remunerado" : "No remunerado"}
                        </span>
                      )}
                  </div>
                </div>

                <div className="flex w-full gap-2 mt-auto pt-3 border-t border-gray-200 dark:border-neutral-700">
                  <button
                    onClick={(e) => handleVerPreview(e, permiso)}
                    className="flex flex-1 min-w-0 items-center justify-center gap-1.5 px-2 py-2.5 lg:py-3 text-xs lg:text-sm font-bold text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md transition-colors border-2 border-blue-600 dark:border-blue-400 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4 shrink-0" />
                    Permiso
                  </button>

                  {puedeEditar && (
                    <button
                      onClick={() => handleClickFila(permiso)}
                      className="flex flex-1 min-w-0 items-center justify-center gap-1.5 px-2 py-2.5 lg:py-3 text-xs lg:text-sm font-bold text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-md transition-colors border-2 border-amber-600 dark:border-amber-400 cursor-pointer"
                    >
                      <Pencil className="w-4 h-4 shrink-0" />
                      <span className="truncate">Editar / Aprobar</span>
                    </button>
                  )}

                  {puedeEliminar && (
                    <button
                      onClick={(e) => handleEliminarPermiso(e, permiso.id)}
                      className="flex flex-1 min-w-0 items-center justify-center gap-1.5 px-2 py-2.5 lg:py-3 text-xs lg:text-sm font-bold text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-md transition-colors border-2 border-red-600 dark:border-red-400 cursor-pointer"
                      title="Borrar"
                      aria-label="Borrar"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      Borrar
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
