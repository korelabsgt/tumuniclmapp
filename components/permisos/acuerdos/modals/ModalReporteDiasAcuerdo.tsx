"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Calendar,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Layers,
  Printer,
} from "lucide-react";
import { format, parseISO, eachDayOfInterval, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { AcuerdoEmpleado } from "../types";
import {
  parseDiasAcuerdo,
  getModalidadAcuerdo,
  normalizarSemanaRegistro,
  generarFechasRecurrentes,
  esDiaLaboral,
  formatearHorario12h,
  getSemanaKey,
} from "../dias-acuerdo";
import {
  getCategoriaAcuerdo,
  getCategoriaAcuerdoLabel,
  getCategoriaAcuerdoBadgeClass,
  getCategoriaAcuerdoIcon,
} from "../categorias";
import { formatearFechaTarjeta } from "@/components/permisos/lib/fechas";
import { generarPdfReporteDiasAcuerdo } from "../pdfReporteDiasAcuerdo";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  acuerdo: AcuerdoEmpleado | null;
}

export interface DiaReporteItem {
  index: number;
  fecha: string;
  diaSemana: string;
  fechaFormateada: string;
  entrada: string;
  salida: string;
  horarioFormateado: string;
  semanaKey: string;
  semanaLabel: string;
  asignadoPor: string;
  asignadoEl?: string;
}

const ITEMS_POR_PAGINA = 10;

export default function ModalReporteDiasAcuerdo({
  isOpen,
  onClose,
  acuerdo,
}: Props) {
  const [paginaActual, setPaginaActual] = useState(1);

  // Resetear página al abrir o cambiar de acuerdo
  React.useEffect(() => {
    if (isOpen) {
      setPaginaActual(1);
    }
  }, [isOpen, acuerdo?.id]);

  const listaDias = useMemo<DiaReporteItem[]>(() => {
    if (!acuerdo) return [];

    const fInicioStr = acuerdo.inicio || (acuerdo as any).fecha_inicio;
    const fFinStr = acuerdo.fin || (acuerdo as any).fecha_fin;
    if (!fInicioStr || !fFinStr) return [];

    const rawDias = (acuerdo as any).dias_semana_json ?? acuerdo.dias;
    const parsedDias = parseDiasAcuerdo(rawDias);
    const modalidad = getModalidadAcuerdo(parsedDias);

    const resultados: {
      fecha: string;
      entrada: string;
      salida: string;
      semanaKey: string;
      asignadoPor: string;
      asignadoEl?: string;
    }[] = [];

    if (modalidad === "semanal" && parsedDias && "semanas" in parsedDias) {
      for (const [sKey, rawSemana] of Object.entries(parsedDias.semanas)) {
        const reg = normalizarSemanaRegistro(rawSemana);
        if (reg && Array.isArray(reg.dias)) {
          for (const d of reg.dias) {
            if (d && d.fecha) {
              resultados.push({
                fecha: d.fecha.substring(0, 10),
                entrada: d.entrada || "08:00",
                salida: d.salida || "16:00",
                semanaKey: sKey,
                asignadoPor: reg.asignadoPor || "—",
                asignadoEl: reg.asignadoEl,
              });
            }
          }
        }
      }
    } else if (
      modalidad === "recurrente" &&
      parsedDias &&
      "diasSemana" in parsedDias
    ) {
      const fechas =
        Array.isArray(parsedDias.fechas) && parsedDias.fechas.length > 0
          ? parsedDias.fechas
          : generarFechasRecurrentes(
              fInicioStr,
              fFinStr,
              parsedDias.diasSemana
            );
      for (const f of fechas) {
        resultados.push({
          fecha: f.substring(0, 10),
          entrada: parsedDias.entrada || "08:00",
          salida: parsedDias.salida || "16:00",
          semanaKey: getSemanaKey(f),
          asignadoPor: "Recurrente Fijo",
        });
      }
    } else {
      // Modalidad todos los días o regular
      try {
        const start = parseISO(fInicioStr.substring(0, 10));
        const end = parseISO(fFinStr.substring(0, 10));
        const entrada =
          parsedDias && "entrada" in parsedDias ? parsedDias.entrada : "08:00";
        const salida =
          parsedDias && "salida" in parsedDias ? parsedDias.salida : "16:00";

        for (const day of eachDayOfInterval({ start, end })) {
          if (esDiaLaboral(day)) {
            const f = format(day, "yyyy-MM-dd");
            resultados.push({
              fecha: f,
              entrada,
              salida,
              semanaKey: getSemanaKey(f),
              asignadoPor: "Horario Regular",
            });
          }
        }
      } catch {
        // Ignorar error de fechas
      }
    }

    // Ordenar del más próximo (reciente) al más antiguo
    resultados.sort((a, b) => b.fecha.localeCompare(a.fecha));

    // Mapear con metadatos legibles
    return resultados.map((item, idx) => {
      let diaSemana = "—";
      let fechaFormateada = item.fecha;
      let semanaLabel = item.semanaKey;

      try {
        const dObj = parseISO(item.fecha);
        const dRaw = format(dObj, "EEEE", { locale: es });
        diaSemana = `${dRaw.charAt(0).toUpperCase()}${dRaw.slice(1)}`;
        fechaFormateada = format(dObj, "dd 'de' MMMM, yyyy", { locale: es });

        const semIni = startOfWeek(dObj, { weekStartsOn: 1 });
        const semFin = endOfWeek(dObj, { weekStartsOn: 1 });
        semanaLabel = `${format(semIni, "dd MMM", { locale: es })} – ${format(semFin, "dd MMM", { locale: es })}`;
      } catch {
        // Fallback
      }

      return {
        index: idx + 1,
        fecha: item.fecha,
        diaSemana,
        fechaFormateada,
        entrada: item.entrada,
        salida: item.salida,
        horarioFormateado: `${formatearHorario12h(item.entrada)} – ${formatearHorario12h(item.salida)}`,
        semanaKey: item.semanaKey,
        semanaLabel,
        asignadoPor: item.asignadoPor,
        asignadoEl: item.asignadoEl,
      };
    });
  }, [acuerdo]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(listaDias.length / ITEMS_POR_PAGINA)
  );

  const diasPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    return listaDias.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [listaDias, paginaActual]);

  if (!isOpen || !acuerdo) return null;

  const codigoFormateado = `${acuerdo.id.substring(0, 3)}-${acuerdo.id.substring(3, 7)}`.toUpperCase();
  const catKey = getCategoriaAcuerdo(acuerdo);
  const CatIcon = getCategoriaAcuerdoIcon(catKey);
  const catLabel = getCategoriaAcuerdoLabel(catKey);
  const badgeClass = getCategoriaAcuerdoBadgeClass(catKey);

  const nombreEmpleado =
    acuerdo.usuario?.nombre || (acuerdo as any).nombre_completo || "Empleado";
  const puestoEmpleado =
    acuerdo.usuario?.puesto_nombre ||
    (acuerdo as any).puesto_empleado ||
    "Puesto no asignado";
  const oficinaEmpleado =
    acuerdo.usuario?.oficina_nombre ||
    (acuerdo as any).oficina_nombre ||
    "Dependencia";

  const totalDias = listaDias.length;
  const horarioGeneral = listaDias.length > 0 ? listaDias[0].horarioFormateado : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 h-full sm:h-auto max-h-none sm:max-h-[92vh] w-full max-w-none sm:max-w-2xl md:max-w-3xl lg:max-w-4xl rounded-none sm:rounded-2xl shadow-2xl flex flex-col border-0 sm:border border-gray-200 dark:border-neutral-800 relative transition-all duration-300 overflow-hidden">
        {/* Cabecera */}
        <div className="relative px-4 sm:px-6 pt-3.5 pb-3 sm:py-4 border-b border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0">
          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 sm:right-5 sm:top-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer shrink-0 z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-3 min-w-0 pr-7 sm:pr-8">
            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  Reporte de Días del Acuerdo
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-slate-300 text-[10px] sm:text-xs font-mono font-bold border border-slate-200 dark:border-neutral-700">
                  CÓD: {codigoFormateado}
                </span>
                {/* Badge visible en Desktop junto al código */}
                <span
                  className={cn(
                    "hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                    badgeClass
                  )}
                >
                  <CatIcon className="w-3 h-3 shrink-0" />
                  <span>{catLabel}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Fila nombre + badge (en móvil ocupa el 100% de ancho de la tarjeta) */}
          <div className="flex items-center justify-between gap-2 mt-2 w-full">
            <p className="text-xs font-bold text-gray-800 dark:text-neutral-100 truncate pr-2">
              {nombreEmpleado}
            </p>
            {/* Badge visible en Móvil totalmente pegado a la derecha debajo de la X */}
            <span
              className={cn(
                "inline-flex sm:hidden items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0",
                badgeClass
              )}
            >
              <CatIcon className="w-3 h-3 shrink-0" />
              <span>{catLabel}</span>
            </span>
          </div>

          <p className="text-[11px] text-gray-500 dark:text-neutral-400 mt-0.5 leading-snug">
            {puestoEmpleado} <span className="opacity-70">({oficinaEmpleado})</span>
          </p>
        </div>

        {/* Resumen con Total Días, Horario y Botón Imprimir */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50/80 dark:bg-neutral-900/60 border-b border-gray-200/80 dark:border-neutral-800 shrink-0 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-600 dark:text-neutral-300">
              Total de días utilizados:
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-extrabold text-xs">
              {totalDias} {totalDias === 1 ? "día" : "días"}
            </span>

            {horarioGeneral && (
              <>
                <span className="text-slate-300 dark:text-neutral-700 hidden sm:inline">•</span>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 font-mono text-[11px] font-medium text-slate-700 dark:text-neutral-200">
                  <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>{horarioGeneral}</span>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={async () => {
              const fInicioStr = acuerdo.inicio || (acuerdo as any).fecha_inicio;
              const fFinStr = acuerdo.fin || (acuerdo as any).fecha_fin;
              const rangoFechas = `${formatearFechaTarjeta(fInicioStr)} al ${formatearFechaTarjeta(fFinStr)}`;

              await generarPdfReporteDiasAcuerdo({
                codigo: codigoFormateado,
                categoriaLabel: catLabel,
                empleadoNombre: nombreEmpleado,
                puesto: puestoEmpleado,
                oficina: oficinaEmpleado,
                rangoFechas,
                horario: horarioGeneral,
                dias: listaDias,
              });
            }}
            title="Imprimir reporte de días del acuerdo"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 text-xs font-semibold shadow-sm transition-colors cursor-pointer shrink-0"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>

        {/* Contenido Tabla */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 min-h-[300px]">
          {diasPaginados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
              <Layers className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm font-semibold text-gray-600 dark:text-neutral-300">
                No hay días registrados para este acuerdo
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                El acuerdo no cuenta con fechas efectivas asignadas
              </p>
            </div>
          ) : (
            <div className="w-full rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700 font-bold text-slate-700 dark:text-neutral-200 text-center">
                    <th className="py-2.5 px-2 sm:px-4 text-center w-10 sm:w-16">No.</th>
                    <th className="py-2.5 px-2 sm:px-4 text-center w-28 sm:w-36">Fecha / Día</th>
                    <th className="py-2.5 px-2 sm:px-4 text-center">Asignado Por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                  {diasPaginados.map((item) => (
                    <tr
                      key={`${item.fecha}-${item.index}`}
                      className="hover:bg-blue-50/40 dark:hover:bg-neutral-800/50 transition-colors text-center"
                    >
                      <td className="py-2.5 px-2 sm:px-4 text-center font-mono text-xs text-slate-500 dark:text-neutral-400 font-bold">
                        {String(item.index).padStart(2, "0")}
                      </td>
                      <td className="py-2.5 px-2 sm:px-4 text-center">
                        <span className="font-semibold text-slate-800 dark:text-neutral-100 text-xs whitespace-nowrap">
                          {formatearFechaTarjeta(item.fecha)}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 sm:px-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <div className="inline-flex items-center justify-center gap-1.5 text-slate-700 dark:text-neutral-200 text-xs font-medium max-w-full">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[140px] sm:max-w-[240px]" title={item.asignadoPor}>
                              {item.asignadoPor}
                            </span>
                          </div>
                          {item.asignadoEl && (
                            <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-neutral-400 font-mono">
                              {formatearFechaTarjeta(item.asignadoEl)}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Paginación y Pie */}
        <div className="px-4 sm:px-6 py-3 border-t border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-gray-500 dark:text-neutral-400">
            {totalDias > 0 ? (
              <>
                Mostrando{" "}
                <span className="font-bold text-gray-700 dark:text-neutral-200">
                  {(paginaActual - 1) * ITEMS_POR_PAGINA + 1}
                </span>{" "}
                a{" "}
                <span className="font-bold text-gray-700 dark:text-neutral-200">
                  {Math.min(
                    paginaActual * ITEMS_POR_PAGINA,
                    totalDias
                  )}
                </span>{" "}
                de{" "}
                <span className="font-bold text-gray-700 dark:text-neutral-200">
                  {totalDias}
                </span>{" "}
                días
              </>
            ) : (
              "0 días"
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              disabled={paginaActual <= 1}
              aria-label="Página anterior"
              className="p-2 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-semibold px-2 text-slate-600 dark:text-neutral-300">
              {paginaActual} / {totalPaginas}
            </span>

            <button
              type="button"
              onClick={() =>
                setPaginaActual((p) => Math.min(totalPaginas, p + 1))
              }
              disabled={paginaActual >= totalPaginas}
              aria-label="Página siguiente"
              className="p-2 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
