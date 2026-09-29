"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  ChevronRight,
  FileText,
  Printer,
} from "lucide-react";
import { PermisoEmpleado, esTipoAcuerdo } from "./types";
import { generarPdfReporteEmpleado } from "./pdfReporteEmpleado";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

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
  modoTipoPermiso?: "generales" | "igss";
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

function esIgss(tipo: string, descripcion?: string | null): boolean {
  const t = (tipo || "").toLowerCase();
  const d = (descripcion || "").toLowerCase();
  return t.includes("igss") || d.includes("igss");
}

export default function EstadisticasPermisos({
  permisos,
  searchTerm,
  modoTipoPermiso = "generales",
}: Props) {
  const [empleadosExpandidos, setEmpleadosExpandidos] = useState<
    Record<string, boolean>
  >({});

  // Filtrar permisos por tipo (Generales vs IGSS), excluyendo Vacaciones y Acuerdos
  const permisosFiltrados = useMemo(() => {
    return permisos.filter((p) => {
      if (esVacaciones(p.tipo, p.descripcion)) return false;
      if (esAcuerdo(p.tipo, p.descripcion)) return false;

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
        permisos: PermisoEmpleado[];
      }
    >();

    for (const p of permisosFiltrados) {
      const u = p.usuario;
      const userId = p.user_id || u?.id || "desconocido";
      const nombre = u?.nombre || "Empleado sin Nombre";
      const oficina = u?.oficina_nombre || "Sin Asignar";
      const puesto = u?.puesto_nombre || undefined;

      if (!mapa.has(userId)) {
        mapa.set(userId, {
          userId,
          nombre,
          oficina,
          puesto,
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

  const toggleExpandir = (userId: string) => {
    setEmpleadosExpandidos((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const totalSolicitudes = useMemo(() => {
    return empleadosAgrupados.reduce((acc, e) => acc + e.permisos.length, 0);
  }, [empleadosAgrupados]);

  return (
    <div className="space-y-4">
      {/* Contenedor Principal del Reporte Integrado */}
      <div className={`bg-white dark:bg-neutral-900 border ${BORDE_TABLA} rounded-xl shadow-sm overflow-hidden`}>
        {/* Encabezado General del Detalle */}
        <div className={`bg-slate-100 dark:bg-neutral-800/90 px-4 py-3 border-b ${BORDE_TABLA} flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider`}>
          <div className="flex items-center gap-2">
            <User size={15} className="text-slate-500 shrink-0" />
            <span>DETALLE DE PERMISOS POR EMPLEADO</span>
          </div>
          <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] sm:text-xs text-right">
            {empleadosAgrupados.length} empleado{empleadosAgrupados.length !== 1 ? "s" : ""} &middot; {totalSolicitudes}{" "}
            {modoTipoPermiso === "igss" ? "permiso IGSS" : "permiso general"}
            {totalSolicitudes !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Sin datos */}
        {empleadosAgrupados.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-sm">
              No hay permisos {modoTipoPermiso === "igss" ? "del IGSS" : "generales"} que coincidan con la búsqueda
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <div className={`divide-y ${BORDE_TABLA} min-w-[700px] w-full`}>
              {empleadosAgrupados.map((emp, index) => {
                const expandido = !!empleadosExpandidos[emp.userId];

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
                    <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400 mr-2">
                      {emp.permisos.length} permiso{emp.permisos.length !== 1 ? "s" : ""}
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
                                className={`${GRID_PERMISOS} ${COLOR_FILA} border-b ${BORDE_TABLA} last:border-b-0 hover:brightness-[0.98] dark:hover:brightness-110`}
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
                                    <span className="font-bold text-blue-600 dark:text-blue-400">
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
            })}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
