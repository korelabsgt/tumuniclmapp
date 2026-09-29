"use client";

import React, { useState } from "react";
import { parseISO, isSameDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pencil,
  Trash2,
  Eye,
  User,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";
import { AcuerdoEmpleado } from "./types";
import { TipoVistaAcuerdos } from "./hooks";
import { cn } from "@/lib/utils";
import { formatearRangoTarjeta } from "@/components/permisos/lib/fechas";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PerfilUsuario } from "@/components/permisos/acciones";
import {
  getCategoriaAcuerdoBadgeClass,
  getCategoriaAcuerdoIcon,
  getCategoriaAcuerdoLabel,
  getCategoriaAcuerdo,
} from "./categorias";
import { formatearDiasSemana } from "./utilidades";
import { getModalidadAcuerdo, parseDiasAcuerdo } from "./dias-acuerdo";

const BORDE_TABLA = "border-slate-300 dark:border-neutral-700";
const FILA_TABLA = `border-b ${BORDE_TABLA}`;
const COLOR_FILA =
  "bg-white dark:bg-neutral-900/80 hover:bg-slate-50/80 dark:hover:bg-neutral-800/60";

// Grid de tabla adaptativo para Acuerdos
const GRID_TABLA_ACUERDOS =
  "grid grid-cols-[4.5rem_1fr_8.5rem_8.5rem_7rem_3.5rem] sm:grid-cols-[5.5rem_1fr_9.5rem_9.5rem_7.5rem_4rem] items-stretch text-[11px] sm:text-xs";
const CELDA_BASE = `px-2 sm:px-3 py-2.5 border-r ${BORDE_TABLA} flex items-center`;

interface Props {
  gruposConDatos: {
    oficina_nombre: string;
    acuerdos: AcuerdoEmpleado[];
  }[];
  tipoVista: TipoVistaAcuerdos;
  todosAbiertos: boolean;
  perfilUsuario: PerfilUsuario | null;
  handleVerPreview: (e: React.MouseEvent, a: AcuerdoEmpleado) => void;
  handleElegirDiasSemana: (e: React.MouseEvent, a: AcuerdoEmpleado) => void;
  handleClickFila: (a: AcuerdoEmpleado) => void;
  handleEliminarAcuerdo: (e: React.MouseEvent, id: string) => void;
  getEstadoBadge: (estado: string) => React.ReactNode;
}

export default function TablaAcuerdosPrincipal({
  gruposConDatos,
  tipoVista,
  todosAbiertos,
  perfilUsuario,
  handleVerPreview,
  handleElegirDiasSemana,
  handleClickFila,
  handleEliminarAcuerdo,
  getEstadoBadge,
}: Props) {
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

      // Agrupar acuerdos por empleado para generar claves
      const acuerdosPorEmpleado: Record<string, AcuerdoEmpleado[]> = {};
      g.acuerdos.forEach((a) => {
        const aAny = a as any;
        const empId =
          a.user_id ||
          aAny.usuario_id ||
          a.usuario?.id ||
          aAny.nombre_empleado ||
          "desconocido";
        if (!acuerdosPorEmpleado[empId]) acuerdosPorEmpleado[empId] = [];
        acuerdosPorEmpleado[empId].push(a);
      });

      Object.keys(acuerdosPorEmpleado).forEach((empId) => {
        const keyEmpleado = `${g.oficina_nombre}-${empId}`;
        mapaEmpleados[keyEmpleado] = todosAbiertos;
      });
    });

    setOficinasAbiertas(mapaOficinas);
    setEmpleadosAbiertos(mapaEmpleados);
  }, [todosAbiertos, gruposConDatos]);

  const toggleOficinaLocal = (oficinaNombre: string) => {
    setOficinasAbiertas((prev) => ({
      ...prev,
      [oficinaNombre]: !prev[oficinaNombre],
    }));
  };

  const toggleEmpleadoLocal = (keyEmpleado: string) => {
    setEmpleadosAbiertos((prev) => ({
      ...prev,
      [keyEmpleado]: !prev[keyEmpleado],
    }));
  };

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm transition-all">
      <div className="overflow-x-auto">
        <div className="min-w-[950px] w-full">
          {/* CUERPO DE LA TABLA AGRUPADO POR OFICINA Y EMPLEADO */}
          <div className="divide-y divide-slate-300 dark:divide-neutral-700">
            {gruposConDatos.map((grupo) => {
              const estaOficinaAbierta =
                oficinasAbiertas[grupo.oficina_nombre] ?? todosAbiertos;

              // Agrupar acuerdos de este grupo por Empleado
              const acuerdosPorEmpleado: Record<
                string,
                { nombre: string; puesto?: string; dpi?: string; acuerdos: AcuerdoEmpleado[] }
              > = {};

              grupo.acuerdos.forEach((acuerdo) => {
                const aAny = acuerdo as any;
                const empId =
                  acuerdo.user_id ||
                  aAny.usuario_id ||
                  acuerdo.usuario?.id ||
                  aAny.nombre_empleado ||
                  "desconocido";

                const nombre =
                  acuerdo.usuario?.nombre ||
                  aAny.nombre_completo ||
                  aAny.nombre_empleado ||
                  "Empleado Sin Nombre";

                const puesto =
                  acuerdo.usuario?.puesto_nombre ||
                  aAny.puesto_empleado ||
                  aAny.puesto ||
                  "";

                const dpi =
                  (acuerdo.usuario as any)?.dpi ||
                  aAny.dpi_empleado ||
                  aAny.dpi ||
                  "";

                if (!acuerdosPorEmpleado[empId]) {
                  acuerdosPorEmpleado[empId] = {
                    nombre,
                    puesto,
                    dpi,
                    acuerdos: [],
                  };
                }
                acuerdosPorEmpleado[empId].acuerdos.push(acuerdo);
              });

              return (
                <div key={grupo.oficina_nombre} className="w-full">
                  {/* FILA ENCABEZADO DE OFICINA */}
                  <div
                    onClick={() => toggleOficinaLocal(grupo.oficina_nombre)}
                    className="w-full px-3 py-2 bg-slate-200/90 dark:bg-neutral-800 hover:bg-slate-300/70 dark:hover:bg-neutral-750 flex items-center justify-between cursor-pointer border-b border-slate-300 dark:border-neutral-700 transition-colors select-none sticky left-0 z-10"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-slate-300 dark:hover:bg-neutral-700 text-slate-600 dark:text-neutral-300 transition-colors"
                      >
                        {estaOficinaAbierta ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <span className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-neutral-100 uppercase tracking-wide">
                        {grupo.oficina_nombre}
                      </span>
                      <span className="ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {grupo.acuerdos.length} acuerdo
                        {grupo.acuerdos.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* CONTENIDO DE OFICINA (EMPLEADOS) */}
                  <AnimatePresence initial={false}>
                    {estaOficinaAbierta && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        {Object.entries(acuerdosPorEmpleado).map(
                          ([empId, empData]) => {
                            const keyEmpleado = `${grupo.oficina_nombre}-${empId}`;
                            const estaEmpAbierto =
                              empleadosAbiertos[keyEmpleado] ?? todosAbiertos;

                            return (
                              <div
                                key={keyEmpleado}
                                className="w-full border-b border-slate-300 dark:border-neutral-700 last:border-b-0"
                              >
                                {/* ENCABEZADO DE EMPLEADO */}
                                <div
                                  onClick={() => toggleEmpleadoLocal(keyEmpleado)}
                                  className="w-full pl-6 pr-3 py-2 bg-slate-50 dark:bg-neutral-800/40 hover:bg-slate-100/80 dark:hover:bg-neutral-800/80 flex items-center justify-between cursor-pointer border-b border-slate-200 dark:border-neutral-700/80 transition-colors select-none sticky left-0 z-10"
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <button
                                      type="button"
                                      className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-500 dark:text-neutral-400 transition-colors shrink-0"
                                    >
                                      {estaEmpAbierto ? (
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      ) : (
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                    <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                    <span className="font-bold text-xs text-slate-800 dark:text-neutral-100 truncate">
                                      {empData.nombre}
                                    </span>
                                    {empData.puesto && (
                                      <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400 truncate hidden sm:inline">
                                        • {empData.puesto}
                                      </span>
                                    )}
                                    {empData.dpi && (
                                      <span className="text-[10px] text-slate-400 dark:text-neutral-500 shrink-0">
                                        (DPI: {empData.dpi})
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] font-semibold text-slate-500 dark:text-neutral-400 shrink-0">
                                    {empData.acuerdos.length} acuerdo
                                    {empData.acuerdos.length !== 1 ? "s" : ""}
                                  </span>
                                </div>

                                {/* LISTADO DE ACUERDOS DEL EMPLEADO */}
                                <AnimatePresence initial={false}>
                                  {estaEmpAbierto && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.15 }}
                                      className="overflow-hidden"
                                    >
                                      {/* ENCABEZADO DE COLUMNAS DE LA TABLA (SE MUESTRA AL DESPLEGAR AL USUARIO) */}
                                      <div
                                        className={cn(
                                          GRID_TABLA_ACUERDOS,
                                          "bg-slate-100/90 dark:bg-neutral-800/80 font-bold text-slate-700 dark:text-neutral-200 uppercase tracking-wider select-none text-[10px] sm:text-[11px] border-b border-slate-300 dark:border-neutral-700"
                                        )}
                                      >
                                        <div className={cn(CELDA_BASE, "justify-center text-center")}>
                                          CÓDIGO
                                        </div>
                                        <div className={CELDA_BASE}>TIPO Y DETALLE</div>
                                        <div className={cn(CELDA_BASE, "justify-center text-center")}>
                                          CONFIG. DÍAS
                                        </div>
                                        <div className={cn(CELDA_BASE, "justify-center text-center")}>
                                          FECHAS / DURACIÓN
                                        </div>
                                        <div className={cn(CELDA_BASE, "justify-center text-center")}>
                                          ESTADO
                                        </div>
                                        <div className={cn(CELDA_BASE, "border-r-0 justify-center text-center")}>
                                          ACC.
                                        </div>
                                      </div>

                                      {empData.acuerdos.map((acuerdo) => {
                                        const catKey = getCategoriaAcuerdo(acuerdo);
                                        const CatIcon: LucideIcon = getCategoriaAcuerdoIcon(catKey);
                                        const catLabel = getCategoriaAcuerdoLabel(catKey);
                                        const badgeClass = getCategoriaAcuerdoBadgeClass(catKey);
                                        const codigoCorto = acuerdo.id.substring(0, 7).toUpperCase();
                                        const rawDias = (acuerdo as any).dias_semana_json ?? acuerdo.dias;
                                        const parsedDias = parseDiasAcuerdo(rawDias);
                                        const modalidad = getModalidadAcuerdo(parsedDias);
                                        const esSemanalFlexible = modalidad === "semanal";
                                        const puedeAsignarDias =
                                          esSemanalFlexible &&
                                          acuerdo.estado === "aprobado" &&
                                          tipoVista === "gestion_rrhh";
                                        const textoDias = formatearDiasSemana(rawDias);

                                        const fInicioStr = acuerdo.inicio || (acuerdo as any).fecha_inicio;
                                        const fFinStr = acuerdo.fin || (acuerdo as any).fecha_fin;

                                        let textoRangoFechas = "—";
                                        let totalDiasCalc = 0;

                                        if (fInicioStr && fFinStr) {
                                          try {
                                            const iniISO = parseISO(fInicioStr);
                                            const finISO = parseISO(fFinStr);
                                            const fechaInicioObj = new Date(
                                              iniISO.getFullYear(),
                                              iniISO.getMonth(),
                                              iniISO.getDate()
                                            );
                                            const fechaFinObj = new Date(
                                              finISO.getFullYear(),
                                              finISO.getMonth(),
                                              finISO.getDate()
                                            );
                                            const esMismo = isSameDay(fechaInicioObj, fechaFinObj);
                                            textoRangoFechas = formatearRangoTarjeta(
                                              fechaInicioObj,
                                              fechaFinObj,
                                              esMismo
                                            );
                                            const diffMs = Math.abs(
                                              fechaFinObj.getTime() - fechaInicioObj.getTime()
                                            );
                                            totalDiasCalc = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
                                          } catch {
                                            textoRangoFechas = "—";
                                          }
                                        }

                                        return (
                                          <div
                                            key={acuerdo.id}
                                            className={cn(
                                              GRID_TABLA_ACUERDOS,
                                              FILA_TABLA,
                                              COLOR_FILA,
                                              "transition-colors"
                                            )}
                                          >
                                            {/* CÓDIGO */}
                                            <div className={cn(CELDA_BASE, "justify-center font-mono text-[10px] font-bold text-slate-500 dark:text-neutral-400")}>
                                              <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-neutral-800 rounded border border-slate-200 dark:border-neutral-700">
                                                {codigoCorto}
                                              </span>
                                            </div>

                                            {/* TIPO Y DETALLE */}
                                            <div className={cn(CELDA_BASE, "flex-col justify-center items-start gap-1 min-w-0")}>
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border", badgeClass)}>
                                                  <CatIcon className="w-3 h-3 shrink-0" />
                                                  <span className="truncate max-w-[200px]">{catLabel}</span>
                                                </span>
                                              </div>
                                              {acuerdo.descripcion && (
                                                <p className="text-[10px] text-slate-500 dark:text-neutral-400 italic leading-tight">
                                                  &quot;{acuerdo.descripcion}&quot;
                                                </p>
                                              )}
                                            </div>

                                            {/* CONFIG. DÍAS */}
                                            <div className={cn(CELDA_BASE, "justify-center text-center")}>
                                              {puedeAsignarDias ? (
                                                <button
                                                  type="button"
                                                  onClick={(e) => handleElegirDiasSemana(e, acuerdo)}
                                                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all border cursor-pointer bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 hover:bg-purple-100"
                                                >
                                                  <CalendarClock className="w-3 h-3 shrink-0" />
                                                  <span className="truncate max-w-[110px]">
                                                    Asignar días
                                                  </span>
                                                </button>
                                              ) : (
                                                <div className="text-[10px] text-slate-600 dark:text-neutral-300 font-medium leading-tight text-center flex flex-col items-center gap-0.5" title={textoDias}>
                                                  {textoDias.includes(" (") && textoDias.endsWith(")") ? (
                                                    <>
                                                      <span>{textoDias.split(" (")[0]}</span>
                                                      <span className="text-[9.5px] text-slate-500 dark:text-neutral-400 font-normal">
                                                        ({textoDias.split(" (")[1]}
                                                      </span>
                                                    </>
                                                  ) : (
                                                    <span>{textoDias}</span>
                                                  )}
                                                </div>
                                              )}
                                            </div>

                                            {/* FECHAS / DURACIÓN */}
                                            <div className={cn(CELDA_BASE, "justify-center text-center flex-col gap-0.5")}>
                                              <span className="font-semibold text-slate-700 dark:text-neutral-200 text-[10px]">
                                                {textoRangoFechas}
                                              </span>
                                              <span className="text-[9px] text-slate-400 dark:text-neutral-500">
                                                {totalDiasCalc > 0
                                                  ? `${totalDiasCalc} día${totalDiasCalc !== 1 ? "s" : ""}`
                                                  : "—"}
                                              </span>
                                            </div>

                                            {/* ESTADO */}
                                            <div className={cn(CELDA_BASE, "justify-center text-center flex-col gap-0.5 leading-tight")}>
                                              {acuerdo.estado === "aprobado" ? (
                                                <span className="font-bold text-[11px] text-emerald-600 dark:text-emerald-400">
                                                  Aprobado RRHH
                                                </span>
                                              ) : acuerdo.estado === "aprobado_jefe" ? (
                                                <span className="font-bold text-[11px] text-amber-600 dark:text-amber-400">
                                                  Pendiente RRHH
                                                </span>
                                              ) : acuerdo.estado?.includes("rechazado") ? (
                                                <span className="font-bold text-[11px] text-red-600 dark:text-red-400">
                                                  Rechazado
                                                </span>
                                              ) : (
                                                <span className="font-bold text-[11px] text-emerald-600 dark:text-emerald-400">
                                                  Aprobado RRHH
                                                </span>
                                              )}
                                              {acuerdo.remunerado !== null && acuerdo.remunerado !== undefined && (
                                                <span
                                                  className={cn(
                                                    "text-[10px] font-semibold",
                                                    acuerdo.remunerado
                                                      ? "text-emerald-600 dark:text-emerald-400"
                                                      : "text-slate-500 dark:text-neutral-400"
                                                  )}
                                                >
                                                  {acuerdo.remunerado ? "Remunerado" : "No remunerado"}
                                                </span>
                                              )}
                                            </div>

                                            {/* ACCIONES */}
                                            <div className={cn(CELDA_BASE, "justify-center border-r-0 !p-0")}>
                                              <Popover
                                                open={!!popoverAbierto[acuerdo.id]}
                                                onOpenChange={(open) =>
                                                  setPopoverAbierto((prev) => ({
                                                    ...prev,
                                                    [acuerdo.id]: open,
                                                  }))
                                                }
                                              >
                                                <PopoverTrigger asChild>
                                                  <button
                                                    type="button"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-full h-full flex items-center justify-center p-2 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer outline-none focus:outline-none"
                                                    title="Opciones del acuerdo"
                                                  >
                                                    <MoreVertical className="w-4 h-4 shrink-0" />
                                                  </button>
                                                </PopoverTrigger>
                                                <PopoverContent
                                                  align="center"
                                                  side="left"
                                                  sideOffset={8}
                                                  collisionPadding={10}
                                                  onOpenAutoFocus={(e) => e.preventDefault()}
                                                  className="w-40 p-1 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-xl rounded-xl z-50 flex flex-col gap-0.5"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <div className="flex flex-col gap-0.5">
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        setPopoverAbierto((prev) => ({
                                                          ...prev,
                                                          [acuerdo.id]: false,
                                                        }));
                                                        handleVerPreview(e, acuerdo);
                                                      }}
                                                      className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-md transition-colors text-left"
                                                    >
                                                      <Eye className="w-3.5 h-3.5 text-blue-500" />
                                                      <span>Ver Vista Previa</span>
                                                    </button>

                                                    {tipoVista === "gestion_rrhh" && (
                                                      <>
                                                        <button
                                                          type="button"
                                                          onClick={(e) => {
                                                            setPopoverAbierto((prev) => ({
                                                              ...prev,
                                                              [acuerdo.id]: false,
                                                            }));
                                                            handleClickFila(acuerdo);
                                                          }}
                                                          className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-md transition-colors text-left"
                                                        >
                                                          <Pencil className="w-3.5 h-3.5 text-amber-500" />
                                                          <span>Editar</span>
                                                        </button>

                                                        <button
                                                          type="button"
                                                          onClick={(e) => {
                                                            setPopoverAbierto((prev) => ({
                                                              ...prev,
                                                              [acuerdo.id]: false,
                                                            }));
                                                            handleEliminarAcuerdo(e, acuerdo.id);
                                                          }}
                                                          className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors text-left"
                                                        >
                                                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                                          <span>Borrar</span>
                                                        </button>
                                                      </>
                                                    )}
                                                  </div>
                                                </PopoverContent>
                                              </Popover>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          }
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
