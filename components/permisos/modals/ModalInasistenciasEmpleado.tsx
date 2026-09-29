import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  CalendarX2,
  CheckCircle2,
  User,
  Building2,
  Briefcase,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ModalPortal } from "@/components/ui/modal-portal";
import { DatosInasistenciasEmpleado } from "../lib/inasistencias";

interface Props {
  datos: DatosInasistenciasEmpleado | null;
  isOpen: boolean;
  onClose: () => void;
  rangoTexto?: string;
}

function formatearFechaFalta(fechaStr: string): string {
  const d = parseISO(fechaStr);
  const texto = format(d, "eee dd/MM/yy", { locale: es });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function ModalInasistenciasEmpleado({
  datos,
  isOpen,
  onClose,
  rangoTexto,
}: Props) {
  const [paginaActual, setPaginaActual] = useState(1);
  const FILAS_POR_PAGINA = 20;

  // Reiniciar a página 1 cuando cambia el usuario o se abre el modal
  useEffect(() => {
    if (isOpen) {
      setPaginaActual(1);
    }
  }, [isOpen, datos?.userId]);

  const total = datos?.fechas?.length || 0;

  // Ordenar fechas en orden descendente
  const fechasOrdenadas = useMemo(() => {
    if (!datos?.fechas) return [];
    return [...datos.fechas].sort((a, b) => b.localeCompare(a));
  }, [datos?.fechas]);

  const totalPaginas = Math.max(1, Math.ceil(total / FILAS_POR_PAGINA));
  const inicioIndice = (paginaActual - 1) * FILAS_POR_PAGINA;
  const finIndice = inicioIndice + FILAS_POR_PAGINA;
  const fechasPaginadas = fechasOrdenadas.slice(inicioIndice, finIndice);

  if (!isOpen || !datos) return null;

  return (
    <ModalPortal open={isOpen} onClose={onClose} className="p-0 sm:p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-none sm:rounded-2xl shadow-2xl w-full h-full sm:h-auto sm:max-h-[88vh] sm:max-w-lg flex flex-col overflow-hidden border-0 sm:border border-slate-200 dark:border-neutral-800">
        {/* HEADER */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3 border-b border-slate-200 dark:border-neutral-800 bg-slate-50/80 dark:bg-neutral-800/50 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className={`p-1.5 sm:p-2 rounded-xl shrink-0 ${
                total > 0
                  ? "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400"
                  : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
              }`}
            >
              {total > 0 ? (
                <CalendarX2 className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-neutral-100 truncate">
                  Registro de Inasistencias
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] shrink-0 ${
                    total > 0
                      ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border border-red-200 dark:border-red-900/50"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50"
                  }`}
                >
                  {total} {total === 1 ? "falta" : "faltas"}
                </span>
              </div>
              {rangoTexto && (
                <p className="text-[10px] font-medium text-slate-500 dark:text-neutral-400 truncate">
                  Período: {rangoTexto}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-white dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-xl transition-colors border border-slate-200 dark:border-neutral-700 shadow-sm cursor-pointer shrink-0 ml-1"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* INFO EMPLEADO */}
        <div className="px-4 sm:px-5 py-2 bg-slate-100/70 dark:bg-neutral-800/60 border-b border-slate-200 dark:border-neutral-800 flex flex-col gap-1 shrink-0">
          <div className="flex items-center gap-2">
            <User size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-neutral-100">
              {datos.nombre}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 text-[10.5px] sm:text-[11px] text-slate-600 dark:text-neutral-300">
            {datos.oficina && (
              <div className="flex items-start gap-1.5">
                <Building2 size={12} className="text-slate-400 shrink-0 mt-0.5" />
                <span className="leading-tight break-words flex-1">{datos.oficina}</span>
              </div>
            )}
            {datos.puesto && (
              <div className="flex items-start gap-1.5">
                <Briefcase size={12} className="text-slate-400 shrink-0 mt-0.5" />
                <span className="leading-tight break-words flex-1">{datos.puesto}</span>
              </div>
            )}
          </div>
        </div>

        {/* CONTENIDO / TABLA DE INASISTENCIAS */}
        <div className="p-3 flex-1 overflow-y-auto">
          {total === 0 ? (
            <div className="py-12 px-4 text-center bg-slate-50 dark:bg-neutral-800/30 rounded-xl border border-dashed border-slate-200 dark:border-neutral-700 flex flex-col items-center justify-center gap-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 opacity-85" />
              <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-neutral-200">
                ¡Sin inasistencias en este período!
              </p>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 max-w-xs">
                El empleado cuenta con marcajes, permisos, acuerdos, comisiones o asuetos registrados en todos los días hábiles.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-neutral-700 rounded-xl overflow-hidden shadow-xs bg-white dark:bg-neutral-900">
              {/* Encabezado de la tabla */}
              <div className="grid grid-cols-[3.5rem_1fr_auto] items-center bg-slate-100/90 dark:bg-neutral-800 px-3 py-1.5 border-b border-slate-200 dark:border-neutral-700 text-[10.5px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                <span className="text-center font-mono">No.</span>
                <span>Fecha</span>
                <span className="text-right pr-1">Detalle</span>
              </div>

              {/* Filas de la tabla paginadas */}
              <div className="divide-y divide-slate-200 dark:divide-neutral-800">
                {fechasPaginadas.map((fechaStr, index) => {
                  const fechaFormateada = formatearFechaFalta(fechaStr);
                  const numeroGlobal = inicioIndice + index + 1;

                  return (
                    <div
                      key={fechaStr}
                      className="grid grid-cols-[3.5rem_1fr_auto] items-center px-3 py-1.5 text-xs hover:bg-slate-50/80 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      {/* Columna No. */}
                      <span className="text-center font-mono font-semibold text-slate-400 dark:text-neutral-500 text-[11px]">
                        {String(numeroGlobal).padStart(2, "0")}
                      </span>

                      {/* Columna Fecha con formato 'Vie 04/09/26' */}
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs">
                          {fechaFormateada}
                        </span>
                      </div>

                      {/* Columna Detalle */}
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 border border-red-200/80 dark:border-red-900/50">
                          Sin marcaje
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* BARRA DE PAGINACIÓN */}
        {total > 0 && (
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-neutral-800/60 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between text-xs text-slate-600 dark:text-neutral-400 shrink-0">
            <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">
              Mostrando {inicioIndice + 1}-{Math.min(finIndice, total)} de {total}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={paginaActual <= 1}
                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Página anterior"
              >
                <ChevronLeft size={13} />
              </button>
              <span className="px-1.5 font-mono font-bold text-[11px] text-slate-700 dark:text-neutral-200">
                {paginaActual}/{totalPaginas}
              </span>
              <button
                type="button"
                disabled={paginaActual >= totalPaginas}
                onClick={() =>
                  setPaginaActual((p) => Math.min(totalPaginas, p + 1))
                }
                className="p-1.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Página siguiente"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalPortal>
  );
}
