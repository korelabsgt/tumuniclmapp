"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  ChevronRight,
  FileText,
  Printer,
  CalendarX2,
} from "lucide-react";
import { PermisoEmpleado, esTipoAcuerdo } from "./types";
import { generarPdfReporteEmpleado } from "./pdfReporteEmpleado";
import PreviewPermiso from "./modals/PreviewPermiso";
import ModalInasistenciasEmpleado from "./modals/ModalInasistenciasEmpleado";
import {
  useInasistenciasEmpleados,
  DatosInasistenciasEmpleado,
} from "./lib/inasistencias";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const BORDE_TABLA = "border-slate-300 dark:border-neutral-700";
const FILA_TABLA = `border-b ${BORDE_TABLA}`;

// Estilos unificados tipo cupones de combustible
const COLOR_EMPLEADO = {
  text: "text-amber-800 dark:text-amber-300",
  row: "bg-amber-50/50 dark:bg-amber-900/10 hover:brightness-[0.98] dark:hover:brightness-110",
  border: "border-amber-400 dark:border-amber-600",
};

const COLOR_FILA = "bg-slate-50/70 dark:bg-slate-900/20 text-slate-600 dark:text-slate-300";

// Columnas de la tabla de permisos integradas en una sola fila (No. + Detalle)
const GRID_PERMISOS =
  "grid grid-cols-[4.5rem_1fr] items-stretch text-[11px]";
const CELDA_BASE = `px-3 py-2.5 border-r ${BORDE_TABLA} flex items-center`;

interface Props {
  permisos: PermisoEmpleado[];
  searchTerm: string;
  modoTipoPermiso?: "permisos" | "igss" | "acuerdos";
  fechaInicio?: string;
  fechaFin?: string;
}

function esVacaciones(tipo: string, descripcion?: string | null): boolean {
  const t = (tipo || "").toLowerCase();
  const d = (descripcion || "").toLowerCase();
  return t.includes("vacacion") || d.includes("vacacion");
}

function esAcuerdo(tipo: string, descripcion?: string | null): boolean {
  const t = (tipo || "").toLowerCase();
  const d = (descripcion || "").toLowerCase();
  return esTipoAcuerdo(tipo) || t.includes("acuerdo") || d.includes("acuerdo");
}

function esAcuerdoEspecialOSuspensionIgss(tipo: string, descripcion?: string | null): boolean {
  const t = (tipo || "").toLowerCase();
  const d = (descripcion || "").toLowerCase();
  const esEspecial = t.includes("permiso especial") || d.includes("permiso especial");
  const esSuspensionIgss =
    (t.includes("suspensión") || t.includes("suspension") || d.includes("suspensión") || d.includes("suspension")) &&
    (t.includes("igss") || d.includes("igss"));
  return esEspecial || esSuspensionIgss;
}

function esIgss(tipo: string, descripcion?: string | null): boolean {
  const t = (tipo || "").toLowerCase();
  const d = (descripcion || "").toLowerCase();
  return t.includes("igss") || d.includes("igss");
}

export default function EstadisticasPermisos({
  permisos,
  searchTerm,
  modoTipoPermiso = "permisos",
  fechaInicio,
  fechaFin,
}: Props) {
  const [empleadosExpandidos, setEmpleadosExpandidos] = useState<
    Record<string, boolean>
  >({});
  const [permisoSeleccionado, setPermisoSeleccionado] =
    useState<PermisoEmpleado | null>(null);
  const [inasistenciasModalDatos, setInasistenciasModalDatos] =
    useState<DatosInasistenciasEmpleado | null>(null);

  // Extraer IDs únicos de los empleados para consulta ultra-rápida y específica
  const userIds = useMemo(() => {
    const ids = new Set<string>();
    permisos.forEach((p) => {
      const id = p.user_id || p.usuario?.id;
      if (id) ids.add(id);
    });
    return Array.from(ids);
  }, [permisos]);

  const { calcularInasistenciasUsuario, isLoading: cargandoInasistencias } =
    useInasistenciasEmpleados(fechaInicio, fechaFin, userIds);

  // Filtrar permisos según el modo (permisos | igss | acuerdos)
  const permisosFiltrados = useMemo(() => {
    return permisos.filter((p) => {
      const esDeAcuerdo = esAcuerdo(p.tipo, p.descripcion);

      if (modoTipoPermiso === "acuerdos") {
        // En Acuerdos solo se deben jalar: Permiso especial y Suspensión IGSS
        return esAcuerdoEspecialOSuspensionIgss(p.tipo, p.descripcion);
      }

      // Para Permisos e IGSS excluimos acuerdos y vacaciones
      if (esDeAcuerdo) return false;
      if (esVacaciones(p.tipo, p.descripcion)) return false;

      const esDelIgss = esIgss(p.tipo, p.descripcion);
      if (modoTipoPermiso === "igss") {
        return esDelIgss;
      } else {
        return !esDelIgss;
      }
    });
  }, [permisos, modoTipoPermiso]);

  // Agrupar por empleado
  const empleadosAgrupados = useMemo(() => {
    const mapa = new Map<
      string,
      {
        userId: string;
        nombre: string;
        oficina: string;
        puesto?: string;
        renglon?: string;
        dependencia_id?: string | null;
        permisos: PermisoEmpleado[];
      }
    >();

    for (const p of permisosFiltrados) {
      const u = p.usuario;
      const userId = p.user_id || u?.id || "desconocido";
      const nombre = u?.nombre || "Empleado sin Nombre";
      const oficina = u?.oficina_nombre || "Sin Asignar";
      const puesto = u?.puesto_nombre || undefined;
      const dependencia_id = (u as any)?.dependencia_id || null;

      if (!mapa.has(userId)) {
        mapa.set(userId, {
          userId,
          nombre,
          oficina,
          puesto,
          dependencia_id,
          permisos: [],
        });
      }

      mapa.get(userId)!.permisos.push(p);
    }

    let lista = Array.from(mapa.values());

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      lista = lista.filter(
        (e) =>
          e.nombre.toLowerCase().includes(term) ||
          e.oficina.toLowerCase().includes(term) ||
          (e.puesto && e.puesto.toLowerCase().includes(term))
      );
    }

    return lista.sort((a, b) => b.permisos.length - a.permisos.length);
  }, [permisosFiltrados, searchTerm]);

  // Función auxiliar para saber el tipo específico de acuerdo
  const clasificarAcuerdo = (p: PermisoEmpleado): "permiso_especial" | "suspension_igss" => {
    const t = (p.tipo || "").toLowerCase();
    const d = (p.descripcion || "").toLowerCase();
    if (t.includes("suspensión") || t.includes("suspension") || d.includes("suspensión") || d.includes("suspension") || t.includes("igss") || d.includes("igss")) {
      return "suspension_igss";
    }
    return "permiso_especial";
  };

  // Secciones separadas si es modo acuerdos
  const seccionesAcuerdos = useMemo(() => {
    if (modoTipoPermiso !== "acuerdos") return null;

    const mapaEspeciales = new Map<string, typeof empleadosAgrupados[0]>();
    const mapaSuspensiones = new Map<string, typeof empleadosAgrupados[0]>();

    for (const p of permisosFiltrados) {
      const u = p.usuario;
      const userId = p.user_id || u?.id || "desconocido";
      const nombre = u?.nombre || "Empleado sin Nombre";
      const oficina = u?.oficina_nombre || "Sin Asignar";
      const puesto = u?.puesto_nombre || undefined;
      const dependencia_id = (u as any)?.dependencia_id || null;

      const tipoAcuerdo = clasificarAcuerdo(p);
      const targetMap = tipoAcuerdo === "permiso_especial" ? mapaEspeciales : mapaSuspensiones;

      if (!targetMap.has(userId)) {
        targetMap.set(userId, {
          userId,
          nombre,
          oficina,
          puesto,
          dependencia_id,
          permisos: [],
        });
      }
      targetMap.get(userId)!.permisos.push(p);
    }

    const filtrarYOrdenar = (mapa: typeof mapaEspeciales) => {
      let lista = Array.from(mapa.values());
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        lista = lista.filter(
          (e) =>
            e.nombre.toLowerCase().includes(term) ||
            e.oficina.toLowerCase().includes(term) ||
            (e.puesto && e.puesto.toLowerCase().includes(term))
        );
      }
      return lista.sort((a, b) => b.permisos.length - a.permisos.length);
    };

    return {
      especiales: filtrarYOrdenar(mapaEspeciales),
      suspensiones: filtrarYOrdenar(mapaSuspensiones),
    };
  }, [modoTipoPermiso, permisosFiltrados, searchTerm]);

  const toggleExpandir = (userId: string) => {
    setEmpleadosExpandidos((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const totalSolicitudes = useMemo(() => {
    return empleadosAgrupados.reduce((acc, e) => acc + e.permisos.length, 0);
  }, [empleadosAgrupados]);

  const renderFilaEmpleado = (emp: typeof empleadosAgrupados[0], index: number, badgeTipo?: string) => {
    const expandido = !!empleadosExpandidos[emp.userId];
    const inasistenciasFechas = calcularInasistenciasUsuario(
      emp.userId,
      emp.dependencia_id,
    );
    const inasistenciasCount = inasistenciasFechas.length;

    return (
      <div key={emp.userId} className={FILA_TABLA}>
        {/* Fila del Empleado */}
        <div
          onClick={() => toggleExpandir(emp.userId)}
          className={`flex items-center gap-1.5 px-3 py-2.5 cursor-pointer ${COLOR_EMPLEADO.row} transition-colors sticky left-0 z-10 min-h-[3.5rem]`}
        >
          <span className="shrink-0 text-xs font-bold text-slate-400 dark:text-slate-500 min-w-[20px] text-left">
            {index + 1}.
          </span>

          <User size={15} className={`shrink-0 ${COLOR_EMPLEADO.text}`} />

          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm leading-snug md:flex md:flex-col md:leading-normal min-w-0">
              <span className={"font-bold underline decoration-2 underline-offset-[3px] decoration-current " + COLOR_EMPLEADO.text + " md:truncate"}>
                {emp.nombre}
              </span>
              {emp.oficina && (
                <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-normal md:truncate">
                  <span className="md:hidden"> - </span>{emp.oficina}
                </span>
              )}
            </p>
          </div>

          {/* Botón de inasistencias */}
          <button
            type="button"
            disabled={cargandoInasistencias}
            onClick={(e) => {
              e.stopPropagation();
              setInasistenciasModalDatos({
                userId: emp.userId,
                nombre: emp.nombre,
                oficina: emp.oficina,
                puesto: emp.puesto,
                fechas: inasistenciasFechas,
              });
            }}
            className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all mr-1.5 border ${
              cargandoInasistencias
                ? "bg-slate-100 dark:bg-neutral-800 text-slate-400 border-slate-200 dark:border-neutral-700 animate-pulse cursor-wait"
                : inasistenciasCount > 0
                  ? "bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-900/50 cursor-pointer"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-slate-300 border-slate-200 dark:border-neutral-700 cursor-pointer"
            }`}
            title={
              cargandoInasistencias
                ? "Calculando inasistencias..."
                : `Ver ${inasistenciasCount} inasistencias de ${emp.nombre}`
            }
          >
            <CalendarX2
              size={13}
              className={
                cargandoInasistencias
                  ? "text-slate-400 animate-pulse"
                  : inasistenciasCount > 0
                    ? "text-red-500 dark:text-red-400"
                    : "text-slate-400"
              }
            />
            <span className="inline-flex items-center gap-1 font-mono">
              {cargandoInasistencias ? (
                "Cargando..."
              ) : (
                <>
                  <span className="sm:hidden">
                    {String(inasistenciasCount).padStart(2, "0")} inasist.
                  </span>
                  <span className="hidden sm:inline">
                    {String(inasistenciasCount).padStart(2, "0")} inasistencia{inasistenciasCount !== 1 ? "s" : ""}
                  </span>
                </>
              )}
            </span>
          </button>

          <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400 mr-2 font-mono">
            <span className="sm:hidden">
              {String(emp.permisos.length).padStart(2, "0")}{" "}
              {modoTipoPermiso === "acuerdos" ? "acue." : "perm."}
            </span>
            <span className="hidden sm:inline">
              {String(emp.permisos.length).padStart(2, "0")}{" "}
              {modoTipoPermiso === "acuerdos"
                ? emp.permisos.length !== 1
                  ? "acuerdos"
                  : "acuerdo"
                : emp.permisos.length !== 1
                  ? "permisos"
                  : "permiso"}
            </span>
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              generarPdfReporteEmpleado(
                {
                  nombre: emp.nombre,
                  oficina: emp.oficina,
                  permisos: emp.permisos,
                },
                modoTipoPermiso
              );
            }}
            className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-950/40 transition-colors"
            title={`Descargar PDF de ${emp.nombre}`}
          >
            <Printer size={15} />
          </button>

          <motion.span
            animate={{ rotate: expandido ? 90 : 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="inline-flex shrink-0 text-slate-400"
          >
            <ChevronRight size={15} className={COLOR_EMPLEADO.text} />
          </motion.span>
        </div>

        {/* Detalle Integrado de Permisos en Fila Única (Sin encabezado de sub-tabla) */}
        <AnimatePresence initial={false}>
          {expandido && (
            <motion.div
              key="permisos"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className={`border-l-4 ${COLOR_EMPLEADO.border}`}>
                {emp.permisos.map((p, idx) => {
                  const fechaIniFormatted = p.inicio
                    ? format(parseISO(p.inicio), "dd/MM/yyyy", { locale: es })
                    : "-";
                  const fechaFinFormatted = p.fin
                    ? format(parseISO(p.fin), "dd/MM/yyyy", { locale: es })
                    : "-";
                  const esMismaFecha = fechaIniFormatted === fechaFinFormatted;

                  return (
                    <div
                      key={`${p.id}-${idx}`}
                      onClick={() => setPermisoSeleccionado(p)}
                      className={`${GRID_PERMISOS} ${COLOR_FILA} border-b ${BORDE_TABLA} last:border-b-0 hover:brightness-[0.98] dark:hover:brightness-110 cursor-pointer`}
                    >
                      {/* Columna 1: No. */}
                      <div className={`${CELDA_BASE} justify-center font-mono font-semibold text-slate-500 dark:text-slate-400 shrink-0`}>
                        No. {idx + 1}
                      </div>

                      {/* Columna 2: Toda la información en una sola fila (Fecha + Tipo/Descripción + Rango de Fechas) */}
                      <div className={`${CELDA_BASE} border-r-0 flex-wrap sm:flex-nowrap gap-1.5 justify-between py-2`}>
                        <div className="flex flex-wrap items-baseline gap-1.5 min-w-0 flex-1">
                          {/* Fecha / Rango destacado */}
                          <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs">
                            {esMismaFecha
                              ? fechaIniFormatted
                              : `${fechaIniFormatted} al ${fechaFinFormatted}`}
                          </span>

                          {/* Tipo de permiso */}
                          <span className={cn(
                            "font-bold",
                            p.tipo.toLowerCase().includes("igss")
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-purple-600 dark:text-purple-400"
                          )}>
                            {p.tipo}
                          </span>

                          {/* Descripción / Justificación */}
                          {p.descripcion && (
                            <span className="text-slate-500 dark:text-slate-400 text-xs truncate max-w-full">
                              - {p.descripcion}
                            </span>
                          )}
                        </div>

                        {/* Rango de fechas final si son diferentes */}
                        {!esMismaFecha && (
                          <span className="shrink-0 font-mono font-semibold text-[10px] text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                            {fechaIniFormatted} - {fechaFinFormatted}
                          </span>
                        )}
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
  };

  return (
    <div className="space-y-4">
      {/* VISTA DE ACUERDOS INTEGRADA EN UNA SOLA TABLA CON NUMERACIÓN CONTINUA */}
      {modoTipoPermiso === "acuerdos" && seccionesAcuerdos ? (
        <div className={`bg-white dark:bg-neutral-900 border ${BORDE_TABLA} rounded-xl shadow-sm overflow-hidden`}>
          {/* Encabezado General del Detalle de Acuerdos */}
          <div className={`bg-slate-100 dark:bg-neutral-800/90 px-4 py-3 border-b ${BORDE_TABLA} flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider`}>
            <div className="flex items-center gap-2">
              <User size={15} className="text-slate-500 shrink-0" />
              <span>DETALLE DE ACUERDOS POR EMPLEADO</span>
            </div>
            <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] sm:text-xs text-right">
              {seccionesAcuerdos.especiales.length + seccionesAcuerdos.suspensiones.length} emp. &middot;{" "}
              {totalSolicitudes}{" "}
              {totalSolicitudes === 1 ? "acuerdo" : "acuerdos"}
            </span>
          </div>

          {seccionesAcuerdos.especiales.length === 0 && seccionesAcuerdos.suspensiones.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-sm">
                No hay acuerdos de permiso especial o suspensión IGSS que coincidan con la búsqueda
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <div className={`divide-y ${BORDE_TABLA} min-w-[700px] w-full`}>
                {/* 1. SECCIÓN: ACUERDOS DE PERMISO ESPECIAL */}
                {seccionesAcuerdos.especiales.length > 0 && (
                  <>
                    <div className="bg-purple-50/90 dark:bg-purple-950/40 px-4 py-2 border-b border-t first:border-t-0 border-slate-300 dark:border-neutral-700 flex items-center justify-between text-[11px] font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider sticky left-0 z-10">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span>
                        <span>ACUERDOS DE PERMISO ESPECIAL</span>
                      </div>
                      <span className="text-purple-700 dark:text-purple-400 font-semibold text-[10px] sm:text-[11px]">
                        {seccionesAcuerdos.especiales.length} emp. &middot;{" "}
                        {seccionesAcuerdos.especiales.reduce((acc, e) => acc + e.permisos.length, 0)}{" "}
                        {seccionesAcuerdos.especiales.reduce((acc, e) => acc + e.permisos.length, 0) === 1 ? "acuerdo" : "acuerdos"}
                      </span>
                    </div>

                    {seccionesAcuerdos.especiales.map((emp, index) =>
                      renderFilaEmpleado(emp, index)
                    )}
                  </>
                )}

                {/* 2. SECCIÓN: ACUERDOS DE SUSPENSIÓN IGSS */}
                {seccionesAcuerdos.suspensiones.length > 0 && (
                  <>
                    <div className="bg-amber-50/90 dark:bg-amber-950/40 px-4 py-2 border-b border-t first:border-t-0 border-slate-300 dark:border-neutral-700 flex items-center justify-between text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider sticky left-0 z-10">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                        <span>ACUERDOS DE SUSPENSIÓN IGSS</span>
                      </div>
                      <span className="text-amber-700 dark:text-amber-400 font-semibold text-[10px] sm:text-[11px]">
                        {seccionesAcuerdos.suspensiones.length} emp. &middot;{" "}
                        {seccionesAcuerdos.suspensiones.reduce((acc, e) => acc + e.permisos.length, 0)}{" "}
                        {seccionesAcuerdos.suspensiones.reduce((acc, e) => acc + e.permisos.length, 0) === 1 ? "acuerdo" : "acuerdos"}
                      </span>
                    </div>

                    {seccionesAcuerdos.suspensiones.map((emp, index) =>
                      renderFilaEmpleado(emp, seccionesAcuerdos.especiales.length + index)
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VISTA HABITUAL DE PERMISOS E IGSS */
        <div className={`bg-white dark:bg-neutral-900 border ${BORDE_TABLA} rounded-xl shadow-sm overflow-hidden`}>
          {/* Encabezado General del Detalle */}
          <div className={`bg-slate-100 dark:bg-neutral-800/90 px-4 py-3 border-b ${BORDE_TABLA} flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider`}>
            <div className="flex items-center gap-2">
              <User size={15} className="text-slate-500 shrink-0" />
              <span>DETALLE DE PERMISOS POR EMPLEADO</span>
            </div>
            <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] sm:text-xs text-right">
              {empleadosAgrupados.length} emp. &middot; {totalSolicitudes}{" "}
              {modoTipoPermiso === "igss"
                ? totalSolicitudes === 1
                  ? "permiso IGSS"
                  : "permisos IGSS"
                : totalSolicitudes === 1
                  ? "permiso"
                  : "permisos"}
            </span>
          </div>

          {/* Sin datos */}
          {empleadosAgrupados.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-sm">
                {modoTipoPermiso === "igss"
                  ? "No hay permisos del IGSS que coincidan con la búsqueda"
                  : "No hay permisos que coincidan con la búsqueda"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <div className={`divide-y ${BORDE_TABLA} min-w-[700px] w-full`}>
                {empleadosAgrupados.map((emp, index) => renderFilaEmpleado(emp, index))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal para ver el permiso en detalle */}
      <PreviewPermiso
        permiso={permisoSeleccionado}
        isOpen={!!permisoSeleccionado}
        onClose={() => setPermisoSeleccionado(null)}
      />

      {/* Modal para ver el detalle de inasistencias */}
      <ModalInasistenciasEmpleado
        datos={inasistenciasModalDatos}
        isOpen={!!inasistenciasModalDatos}
        onClose={() => setInasistenciasModalDatos(null)}
        rangoTexto={
          fechaInicio && fechaFin
            ? `${fechaInicio} al ${fechaFin}`
            : undefined
        }
      />
    </div>
  );
}
