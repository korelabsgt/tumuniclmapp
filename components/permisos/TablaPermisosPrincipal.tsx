"use client";

import React, { useState } from "react";
import { format, parseISO, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Pencil,
  Trash2,
  Eye,
  Upload,
  User,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  MoreVertical,
  type LucideIcon,
} from "lucide-react";
import { PermisoEmpleado, EstadoPermiso } from "./types";
import { TipoVistaPermisos } from "./hooks";
import { cn } from "@/lib/utils";
import { formatearRangoTarjeta, formatearFechaTarjeta } from "./lib/fechas";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { gestionarPermiso, PerfilUsuario } from "./acciones";
import { toast } from "react-toastify";

const BORDE_TABLA = "border-slate-300 dark:border-neutral-700";
const FILA_TABLA = `border-b ${BORDE_TABLA}`;

const COLOR_FILA =
  "bg-white dark:bg-neutral-900/80 hover:bg-slate-50/80 dark:hover:bg-neutral-800/60";

// Grid de tabla adaptativo con columnas ampliadas (Evidencia y Horario)
const GRID_TABLA_PERMISOS =
  "grid grid-cols-[4.5rem_1.8fr_6.5rem_7.5rem_8rem_7rem_4rem] sm:grid-cols-[5rem_2fr_7rem_8.5rem_8.5rem_7.5rem_4rem] items-stretch text-[11px] sm:text-xs";
const CELDA_BASE = `px-2 sm:px-3 py-2.5 border-r ${BORDE_TABLA} flex items-center`;

interface Props {
  gruposConDatos: {
    oficina_nombre: string;
    permisos: PermisoEmpleado[];
  }[];
  tipoVista: TipoVistaPermisos;
  todosAbiertos: boolean;
  puedeGestionarEvidencia: boolean;
  perfilUsuario: PerfilUsuario | null;
  cargarDatos: () => void;
  handleVerPreview: (e: React.MouseEvent, p: PermisoEmpleado) => void;
  handleAbrirJustificacion: (e: React.MouseEvent, p: PermisoEmpleado) => void;
  handleClickFila: (p: PermisoEmpleado) => void;
  handleEliminarPermiso: (e: React.MouseEvent, id: string) => void;
  getCategoriaBadgeClass: (cat: any) => string;
  getCategoriaIcon: (cat: any) => LucideIcon;
  getCategoria: (p: PermisoEmpleado) => any;
  getHorasTrabajo: (start: Date, end: Date) => number;
  formatHorasLabel: (horas: number) => string;
  getEstadoTextoPlain: (estado: string) => React.ReactNode;
}

export default function TablaPermisosPrincipal({
  gruposConDatos,
  tipoVista,
  todosAbiertos,
  puedeGestionarEvidencia,
  perfilUsuario,
  cargarDatos,
  handleVerPreview,
  handleAbrirJustificacion,
  handleClickFila,
  handleEliminarPermiso,
  getCategoriaBadgeClass,
  getCategoriaIcon,
  getCategoria,
  getHorasTrabajo,
  formatHorasLabel,
  getEstadoTextoPlain,
}: Props) {
  const [loadingGestion, setLoadingGestion] = useState<string | null>(null);
  const [popoverAbierto, setPopoverAbierto] = useState<Record<string, boolean>>({});

  // Estado de despliegue por Oficina/Dependencia
  const [oficinasAbiertas, setOficinasAbiertas] = useState<Record<string, boolean>>({});

  // Estado de despliegue por Empleado
  const [empleadosAbiertos, setEmpleadosAbiertos] = useState<Record<string, boolean>>({});

  // Sincronizar con el botón general "Ver Todos / Ocultar Todos"
  React.useEffect(() => {
    const mapaOficinas: Record<string, boolean> = {};
    const mapaEmpleados: Record<string, boolean> = {};

    gruposConDatos.forEach((g) => {
      mapaOficinas[g.oficina_nombre] = todosAbiertos;
      g.permisos.forEach((p) => {
        const uid = p.user_id || "desconocido";
        mapaEmpleados[uid] = todosAbiertos;
      });
    });

    setOficinasAbiertas(mapaOficinas);
    setEmpleadosAbiertos(mapaEmpleados);
  }, [todosAbiertos, gruposConDatos]);

  const toggleOficina = (nombre: string) => {
    setOficinasAbiertas((prev) => ({
      ...prev,
      [nombre]: prev[nombre] !== undefined ? !prev[nombre] : !todosAbiertos,
    }));
  };

  const toggleEmpleado = (uid: string) => {
    setEmpleadosAbiertos((prev) => ({
      ...prev,
      [uid]: prev[uid] !== undefined ? !prev[uid] : !todosAbiertos,
    }));
  };

  const handleCambiarEstadoAccion = async (
    permiso: PermisoEmpleado,
    accion: "aprobar" | "rechazar"
  ) => {
    try {
      setLoadingGestion(permiso.id);
      await gestionarPermiso(permiso.id, accion, permiso.user_id);
      toast.success(
        `Permiso ${accion === "aprobar" ? "aprobado" : "rechazado"} correctamente`
      );
      setPopoverAbierto((prev) => ({ ...prev, [permiso.id]: false }));
      cargarDatos();
    } catch (err: any) {
      toast.error(err.message || "Error al cambiar estado");
    } finally {
      setLoadingGestion(null);
    }
  };

  return (
    <div className={`bg-white dark:bg-neutral-900 border ${BORDE_TABLA} rounded-xl shadow-sm overflow-hidden`}>
      <div className="overflow-x-auto w-full">
        <div className={`divide-y ${BORDE_TABLA} min-w-[950px] w-full`}>
          {gruposConDatos.map((grupo) => {
            const oficinaAbierta = oficinasAbiertas[grupo.oficina_nombre] !== false;

          return (
            <div key={grupo.oficina_nombre} className="border-b last:border-b-0 border-slate-200 dark:border-neutral-800">
              {/* Nivel 1: Clic en la Oficina / Dependencia */}
              <div
                onClick={() => toggleOficina(grupo.oficina_nombre)}
                className="bg-slate-100 dark:bg-neutral-800/90 hover:bg-slate-200/70 dark:hover:bg-neutral-800 px-4 py-2.5 flex items-center justify-between border-b border-slate-300 dark:border-neutral-700 cursor-pointer transition-colors select-none sticky left-0 z-10"
              >
                <div className="flex items-center gap-2">
                  <motion.div
                    initial={false}
                    animate={{ rotate: oficinaAbierta ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </motion.div>
                  <span className="font-bold text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    <span>{grupo.oficina_nombre}</span>
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">
                      ({grupo.permisos.length} permiso{grupo.permisos.length !== 1 ? "s" : ""})
                    </span>
                  </span>
                </div>
              </div>

              {/* Contenido de la Oficina */}
              <AnimatePresence initial={false}>
                {oficinaAbierta && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden divide-y divide-slate-200 dark:divide-neutral-800"
                  >
                    {Object.values(
                      grupo.permisos.reduce(
                        (acc, p) => {
                          const uid = p.user_id || p.usuario?.id || "desconocido";
                          if (!acc[uid])
                            acc[uid] = {
                              userId: uid,
                              usuario: p.usuario,
                              permisos: [],
                            };
                          acc[uid].permisos.push(p);
                          return acc;
                        },
                        {} as Record<
                          string,
                          { userId: string; usuario: any; permisos: PermisoEmpleado[] }
                        >
                      )
                    ).map((userGroup) => {
                      const empAbierto = empleadosAbiertos[userGroup.userId] !== false;

                      return (
                        <div key={userGroup.userId}>
                          {/* Nivel 2: Clic en el Empleado */}
                          <div
                            onClick={() => toggleEmpleado(userGroup.userId)}
                            className="bg-slate-50 dark:bg-neutral-800/50 hover:bg-slate-100 dark:hover:bg-neutral-800 px-4 py-2 flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 cursor-pointer transition-colors select-none sticky left-0 z-10"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <motion.div
                                initial={false}
                                animate={{ rotate: empAbierto ? 90 : 0 }}
                                transition={{ duration: 0.2 }}
                                className="shrink-0"
                              >
                                <ChevronRight className="w-4 h-4 text-slate-500" />
                              </motion.div>
                              <User className="w-4 h-4 text-blue-500 shrink-0" />
                              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                                {userGroup.usuario?.nombre || "Empleado sin Nombre"}
                              </span>
                              {userGroup.usuario?.puesto_nombre && (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:inline">
                                  - {userGroup.usuario.puesto_nombre}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 shrink-0">
                              {userGroup.permisos.length} permiso{userGroup.permisos.length !== 1 ? "s" : ""}
                            </span>
                          </div>

                          {/* Tabla de Permisos del Empleado */}
                          <AnimatePresence initial={false}>
                            {empAbierto && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                              >
                                <div>
                                  {/* Encabezados de Columna */}
                                  <div className={`${GRID_TABLA_PERMISOS} bg-slate-100/90 dark:bg-neutral-800/80 font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide border-b ${BORDE_TABLA}`}>
                                    <div className={`${CELDA_BASE} justify-center`}>CÓDIGO</div>
                                    <div className={`${CELDA_BASE}`}>TIPO Y DETALLE</div>
                                    <div className={`${CELDA_BASE} justify-center`}>EVIDENCIA</div>
                                    <div className={`${CELDA_BASE} justify-center`}>HORARIO</div>
                                    <div className={`${CELDA_BASE} justify-center text-center`}>FECHAS / DURACIÓN</div>
                                    <div className={`${CELDA_BASE} justify-center`}>ESTADO</div>
                                    <div className={`${CELDA_BASE} justify-center border-r-0`}>ACC.</div>
                                  </div>

                                  {/* Filas */}
                                  {userGroup.permisos.map((permiso) => {
                                    const esPendiente = permiso.estado === "pendiente";
                                    const esFaseJefe = permiso.estado === "pendiente";
                                    const esFaseRRHH = permiso.estado === "aprobado_jefe";
                                    const puedeEliminar =
                                      tipoVista === "gestion_rrhh" ||
                                      (tipoVista === "mis_permisos" && esPendiente);
                                    const puedeEditar =
                                      tipoVista === "gestion_rrhh" || esPendiente;

                                    const puedeGestionarEstadoRapido =
                                      (tipoVista === "gestion_jefe" && esFaseJefe) ||
                                      (tipoVista === "gestion_rrhh" && (esFaseJefe || esFaseRRHH));

                                    const fechaInicioConHora = parseISO(permiso.inicio);
                                    const fechaFinConHora = parseISO(permiso.fin);
                                    const fechaInicio = new Date(
                                      fechaInicioConHora.getFullYear(),
                                      fechaInicioConHora.getMonth(),
                                      fechaInicioConHora.getDate()
                                    );
                                    const fechaFin = new Date(
                                      fechaFinConHora.getFullYear(),
                                      fechaFinConHora.getMonth(),
                                      fechaFinConHora.getDate()
                                    );
                                    const esMismoDia = isSameDay(fechaInicio, fechaFin);
                                    const textoFecha = formatearRangoTarjeta(
                                      fechaInicio,
                                      fechaFin,
                                      esMismoDia
                                    );
                                    const textoHora = `${format(fechaInicioConHora, "h:mm a", { locale: es })} - ${format(fechaFinConHora, "h:mm a", { locale: es })}`;
                                    const cat = getCategoria(permiso);
                                    const muestraEvidencia =
                                      puedeGestionarEvidencia || !!permiso.comprobante_url;
                                    const h = getHorasTrabajo(fechaInicioConHora, fechaFinConHora);
                                    const popoverOpen = popoverAbierto[permiso.id] || false;

                                    return (
                                      <div
                                        key={permiso.id}
                                        className={`${GRID_TABLA_PERMISOS} ${COLOR_FILA} border-b ${BORDE_TABLA} last:border-b-0 transition-colors`}
                                      >
                                        {/* 1. Código */}
                                        <div className={`${CELDA_BASE} justify-center font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap`}>
                                          {`${permiso.id.substring(0, 3)}-${permiso.id.substring(3, 6)}`.toUpperCase()}
                                        </div>

                                        {/* 2. Tipo y Detalle */}
                                        <div className={`${CELDA_BASE} flex-col !items-start justify-center text-left gap-0.5 py-2 min-w-0`}>
                                          <span className="font-bold text-slate-800 dark:text-slate-100 capitalize truncate w-full text-left">
                                            {permiso.tipo.replace("_", " ")}
                                          </span>
                                          {permiso.descripcion && (
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 italic w-full text-left">
                                              {permiso.descripcion}
                                            </p>
                                          )}
                                        </div>

                                        {/* 3. Evidencia */}
                                        <div className={`${CELDA_BASE} justify-center`}>
                                          {muestraEvidencia ? (
                                            <button
                                              type="button"
                                              onClick={(e) => handleAbrirJustificacion(e, permiso)}
                                              className={cn(
                                                "inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold rounded-md transition-colors border cursor-pointer shrink-0",
                                                permiso.comprobante_url
                                                  ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                                                  : "text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                                              )}
                                              title={permiso.comprobante_url ? "Ver evidencia" : "Subir evidencia"}
                                            >
                                              {permiso.comprobante_url ? (
                                                <Eye className="w-3.5 h-3.5 shrink-0" />
                                              ) : (
                                                <Upload className="w-3.5 h-3.5 shrink-0" />
                                              )}
                                              <span>Evidencia</span>
                                            </button>
                                          ) : (
                                            <span className="text-slate-400 dark:text-slate-600 text-xs">-</span>
                                          )}
                                        </div>

                                        {/* 4. Horario */}
                                        <div className={`${CELDA_BASE} justify-center font-mono text-slate-600 dark:text-slate-400 text-[10px] whitespace-nowrap`}>
                                          {textoHora}
                                        </div>

                                        {/* 5. Fechas / Duración */}
                                        <div className={`${CELDA_BASE} flex-col justify-center items-center gap-0.5 text-center`}>
                                          {esMismoDia ? (<span className="font-bold font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">{textoFecha}</span>) : (<div className="flex flex-col items-center justify-center font-bold font-mono text-slate-700 dark:text-slate-300 text-[10px] sm:text-[11px] leading-tight text-center"><span className="whitespace-nowrap">Del {formatearFechaTarjeta(fechaInicio)}</span><span className="whitespace-nowrap">al {formatearFechaTarjeta(fechaFin)}</span></div>)}


                                          {h > 0 && (
                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                              {formatHorasLabel(h)}
                                            </span>
                                          )}
                                        </div>

                                        {/* 6. Estado con Menú Selección Rápida (Popover Select) */}
                                        <div className={`${CELDA_BASE} justify-center`}>
                                          {puedeGestionarEstadoRapido ? (
                                            <Popover
                                              open={popoverOpen}
                                              onOpenChange={(open) =>
                                                setPopoverAbierto((prev) => ({
                                                  ...prev,
                                                  [permiso.id]: open,
                                                }))
                                              }
                                            >
                                              <PopoverTrigger asChild>
                                                <button
                                                  type="button"
                                                  disabled={loadingGestion === permiso.id}
                                                  className={cn(
                                                    "w-full h-full flex flex-col justify-center items-center gap-0.5 text-center leading-tight select-none p-1 rounded-md transition-colors cursor-pointer hover:bg-slate-100/90 dark:hover:bg-neutral-800 border border-transparent hover:border-slate-300 dark:hover:border-neutral-700",
                                                    loadingGestion === permiso.id && "opacity-50 pointer-events-none"
                                                  )}
                                                  title="Clic para seleccionar y cambiar estado"
                                                >
                                                  {getEstadoTextoPlain(permiso.estado)}
                                                  {permiso.estado === "aprobado" && permiso.remunerado !== null && (
                                                    <span
                                                      className={cn(
                                                        "text-[10px] font-bold",
                                                        permiso.remunerado
                                                          ? "text-emerald-600 dark:text-emerald-400"
                                                          : "text-red-600 dark:text-red-400"
                                                      )}
                                                    >
                                                      {permiso.remunerado ? "Remunerado" : "No Remunerado"}
                                                    </span>
                                                  )}
                                                </button>
                                              </PopoverTrigger>

                                              <PopoverContent
                                                align="center"
                                                side="left"
                                                sideOffset={8}
                                                collisionPadding={10}
                                                onOpenAutoFocus={(e) => e.preventDefault()}
                                                className="w-48 p-1.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-xl rounded-xl z-50 focus:outline-none"
                                              >
                                                <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase px-2 py-1 border-b border-slate-100 dark:border-neutral-800 mb-1">
                                                  Seleccionar Estado
                                                </div>

                                                <div className="flex flex-col gap-1">
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handleCambiarEstadoAccion(permiso, "aprobar")
                                                    }
                                                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors w-full text-left cursor-pointer outline-none focus:outline-none"
                                                  >
                                                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                                    <span>
                                                      {tipoVista === "gestion_jefe" || esFaseJefe
                                                        ? "Preaprobar Jefe"
                                                        : "Aprobar RRHH"}
                                                    </span>
                                                  </button>

                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handleCambiarEstadoAccion(permiso, "rechazar")
                                                    }
                                                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors w-full text-left cursor-pointer outline-none focus:outline-none"
                                                  >
                                                    <XCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                                                    <span>Rechazar Solicitud</span>
                                                  </button>
                                                </div>
                                              </PopoverContent>
                                            </Popover>
                                          ) : (
                                            <div
                                              className="w-full h-full flex flex-col justify-center items-center gap-0.5 text-center leading-tight select-none p-1"
                                            >
                                              {getEstadoTextoPlain(permiso.estado)}
                                              {permiso.estado === "aprobado" && permiso.remunerado !== null && (
                                                <span
                                                  className={cn(
                                                    "text-[10px] font-bold",
                                                    permiso.remunerado
                                                      ? "text-emerald-600 dark:text-emerald-400"
                                                      : "text-red-600 dark:text-red-400"
                                                  )}
                                                >
                                                  {permiso.remunerado ? "Remunerado" : "No Remunerado"}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>

                                        {/* 7. Acciones con Menú Popover de 3 Puntos (Todo el cuadro es cliqueable) */}
                                        <div className={`${CELDA_BASE} justify-center border-r-0 !p-0`}>
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <button
                                                type="button"
                                                className="w-full h-full flex items-center justify-center p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer outline-none focus:outline-none"
                                                title="Opciones del permiso"
                                              >
                                                <MoreVertical className="w-4 h-4 shrink-0" />
                                              </button>
                                            </PopoverTrigger>

                                            <PopoverContent
                                              align="center"
                                              side="left"
                                              sideOffset={8}
                                              collisionPadding={10}
                                              className="w-44 p-1 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-xl rounded-xl z-50 flex flex-col gap-0.5"
                                            >
                                              <button
                                                type="button"
                                                onClick={(e) => handleVerPreview(e, permiso)}
                                                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors w-full text-left cursor-pointer"
                                              >
                                                <CreditCard className="w-4 h-4 shrink-0" />
                                                <span>Ver Permiso</span>
                                              </button>

                                              {puedeEditar && (
                                                <button
                                                  type="button"
                                                  onClick={() => handleClickFila(permiso)}
                                                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors w-full text-left cursor-pointer"
                                                >
                                                  <Pencil className="w-4 h-4 shrink-0" />
                                                  <span>Editar Permiso</span>
                                                </button>
                                              )}

                                              {puedeEliminar && (
                                                <button
                                                  type="button"
                                                  onClick={(e) => handleEliminarPermiso(e, permiso.id)}
                                                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors w-full text-left cursor-pointer"
                                                >
                                                  <Trash2 className="w-4 h-4 shrink-0" />
                                                  <span>Borrar</span>
                                                </button>
                                              )}
                                            </PopoverContent>
                                          </Popover>
                                        </div>
                                      </div>
                                    );
                                  })}
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
        })}
      </div>
      </div>
    </div>
  );
}
