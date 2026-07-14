"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Save, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { AcuerdoEmpleado } from "../types";
import { actualizarDiasSemanaAcuerdo } from "@/components/permisos/acciones";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { formatearRangoSemana } from "@/components/permisos/lib/fechas";
import {
  parseDiasAcuerdo,
  getSemanaKey,
  obtenerFechasDeSemana,
  listarSemanasEnRango,
  esFechaPasada,
  fechaHoyLocal,
  obtenerSemanaRegistro,
  HORA_ENTRADA_DEFECTO,
  HORA_SALIDA_DEFECTO,
  PASO_MINUTOS_HORARIO,
  redondearHorarioACincoMinutos,
  type DiasAcuerdoSemanal,
} from "../dias-acuerdo";

const claseInputHorario =
  "w-[4.5rem] max-w-[4.5rem] shrink-0 text-[10px] font-medium rounded-md border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-gray-800 dark:text-gray-200 px-0.5 py-1 text-center disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 [color-scheme:light] dark:[color-scheme:dark]";

interface FilaDia {
  fecha: string;
  activo: boolean;
  entrada: string;
  salida: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  acuerdo: AcuerdoEmpleado | null;
  onSuccess: () => void;
}

export default function ElegirDiasSemanaAcuerdo({
  isOpen,
  onClose,
  acuerdo,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [semanaIdx, setSemanaIdx] = useState(0);
  const [filas, setFilas] = useState<FilaDia[]>([]);
  const [asignadoPor, setAsignadoPor] = useState("");

  const diasData = useMemo(() => {
    if (!acuerdo) return null;
    const parsed = parseDiasAcuerdo(acuerdo.dias);
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      parsed.modo === "semanal"
    ) {
      return parsed as DiasAcuerdoSemanal;
    }
    return null;
  }, [acuerdo]);

  const semanas = useMemo(() => {
    if (!acuerdo) return [];
    return listarSemanasEnRango(acuerdo.inicio, acuerdo.fin);
  }, [acuerdo]);

  const semanaActual = semanas[semanaIdx] ?? "";
  const fechasSemana = useMemo(() => {
    if (!acuerdo || !semanaActual) return [];
    return obtenerFechasDeSemana(acuerdo.inicio, acuerdo.fin, semanaActual);
  }, [acuerdo, semanaActual]);

  useEffect(() => {
    if (!isOpen || !diasData || !semanaActual) return;
    const registro = obtenerSemanaRegistro(diasData, semanaActual);
    setAsignadoPor(registro?.asignadoPor ?? "");
    setFilas(
      fechasSemana.map((fecha) => {
        const existente = registro?.dias.find((d) => d.fecha === fecha);
        return {
          fecha,
          activo: !!existente,
          entrada: redondearHorarioACincoMinutos(
            existente?.entrada ?? HORA_ENTRADA_DEFECTO,
          ),
          salida: redondearHorarioACincoMinutos(
            existente?.salida ?? HORA_SALIDA_DEFECTO,
          ),
        };
      }),
    );
  }, [isOpen, diasData, semanaActual, fechasSemana]);

  useEffect(() => {
    if (!isOpen || !acuerdo) return;
    const hoy = format(new Date(), "yyyy-MM-dd");
    const idx = semanas.findIndex((s) => s === getSemanaKey(hoy));
    setSemanaIdx(idx >= 0 ? idx : 0);
  }, [isOpen, acuerdo, semanas]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen || !acuerdo || !diasData) return null;

  const cupo = diasData.cupoSemanal;
  const hoy = fechaHoyLocal();
  const semanaEditable = fechasSemana.some((f) => !esFechaPasada(f, hoy));
  const activos = filas.filter((f) => f.activo);

  const toastOpts = { position: "top-center" as const };

  const etiquetaSemana =
    fechasSemana.length > 0
      ? formatearRangoSemana(
          fechasSemana[0],
          fechasSemana[fechasSemana.length - 1],
        )
      : "";

  const toggleFila = (fecha: string) => {
    if (esFechaPasada(fecha, hoy)) {
      toast.warn("No puede modificar un día que ya pasó", toastOpts);
      return;
    }
    if (!semanaEditable) {
      toast.warn("Esta semana ya finalizó y no admite cambios", toastOpts);
      return;
    }

    const fila = filas.find((f) => f.fecha === fecha);
    if (!fila) return;

    if (fila.activo) {
      setFilas((prev) =>
        prev.map((f) =>
          f.fecha === fecha ? { ...f, activo: false } : f,
        ),
      );
      return;
    }

    const activosCount = filas.filter((f) => f.activo).length;
    if (activosCount >= cupo) {
      toast.warn(`Solo puede asignar ${cupo} días esta semana`, toastOpts);
      return;
    }

    setFilas((prev) =>
      prev.map((f) =>
        f.fecha === fecha
          ? {
              ...f,
              activo: true,
              entrada: redondearHorarioACincoMinutos(
                f.entrada || HORA_ENTRADA_DEFECTO,
              ),
              salida: redondearHorarioACincoMinutos(
                f.salida || HORA_SALIDA_DEFECTO,
              ),
            }
          : f,
      ),
    );
  };

  const actualizarHorario = (
    fecha: string,
    campo: "entrada" | "salida",
    valor: string,
    redondear = false,
  ) => {
    if (esFechaPasada(fecha, hoy)) return;
    const horario = redondear ? redondearHorarioACincoMinutos(valor) : valor;
    setFilas((prev) =>
      prev.map((f) =>
        f.fecha === fecha ? { ...f, [campo]: horario } : f,
      ),
    );
  };

  const handleGuardar = async () => {
    if (!semanaEditable) {
      toast.warn("Esta semana ya finalizó y no admite cambios", toastOpts);
      return;
    }
    if (activos.length === 0) {
      toast.warn("Asigne al menos un día", toastOpts);
      return;
    }
    if (activos.length > cupo) {
      toast.warn(`Máximo ${cupo} días por semana`, toastOpts);
      return;
    }
    if (activos.some((f) => f.entrada >= f.salida)) {
      toast.warn("La hora de entrada debe ser anterior a la de salida", toastOpts);
      return;
    }

    setLoading(true);
    try {
      await actualizarDiasSemanaAcuerdo(
        acuerdo.id,
        semanaActual,
        activos.map((f) => ({
          fecha: f.fecha,
          entrada: redondearHorarioACincoMinutos(f.entrada),
          salida: redondearHorarioACincoMinutos(f.salida),
        })),
      );
      toast.success("Días asignados correctamente", toastOpts);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al guardar", toastOpts);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm overscroll-none">
      <div className="bg-white dark:bg-neutral-900 rounded-none sm:rounded-lg shadow-xl w-full sm:w-fit sm:max-w-[calc(100vw-2rem)] border border-gray-200 dark:border-neutral-800 flex flex-col max-h-[100dvh] sm:max-h-[90vh] overflow-hidden overscroll-none">
        <div className="shrink-0 flex items-start justify-between gap-3 p-4 border-b border-gray-100 dark:border-neutral-800">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Asignar días de la semana
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {cupo} día{cupo > 1 ? "s" : ""} laboral{cupo > 1 ? "es" : ""}/semana (lun–vie)
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{acuerdo.tipo}</p>
            {acuerdo.usuario?.nombre && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 font-medium">
                {acuerdo.usuario.nombre}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 p-4 flex flex-col gap-4 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={semanaIdx <= 0}
              onClick={() => setSemanaIdx((i) => Math.max(0, i - 1))}
              className="flex items-center justify-center p-2 rounded-md border-2 border-zinc-400 dark:border-zinc-500 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-center flex-1">
              {etiquetaSemana}
            </span>
            <button
              type="button"
              disabled={semanaIdx >= semanas.length - 1}
              onClick={() =>
                setSemanaIdx((i) => Math.min(semanas.length - 1, i + 1))
              }
              className="flex items-center justify-center p-2 rounded-md border-2 border-zinc-400 dark:border-zinc-500 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {asignadoPor && asignadoPor !== "—" && (
            <p className="text-xs text-muted-foreground">
              Última asignación por:{" "}
              <span className="font-semibold text-foreground">{asignadoPor}</span>
            </p>
          )}

          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
            {semanaEditable
              ? `Asigne ${cupo} día${cupo > 1 ? "s" : ""} con horario (${activos.length}/${cupo})`
              : "Esta semana ya finalizó. Solo puede consultar la asignación."}
          </p>

          <div className="flex justify-center overflow-x-hidden">
            <div className="rounded-lg border border-gray-200 dark:border-neutral-700 overflow-hidden w-fit max-w-full">
            <div className="grid grid-cols-[6.25rem_4.5rem_4.5rem] gap-2 px-3 py-2 bg-slate-50 dark:bg-neutral-800/80 text-[10px] font-bold uppercase tracking-wide text-muted-foreground justify-items-center">
              <span className="text-center">Día</span>
              <span className="text-center">Entrada</span>
              <span className="text-center">Salida</span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-neutral-800">
              {filas.map((fila) => {
                const pasada = esFechaPasada(fila.fecha, hoy);
                const bloqueada = pasada || !semanaEditable;
                const label = format(parseISO(fila.fecha), "EEE d MMM", {
                  locale: es,
                });
                return (
                  <div
                    key={fila.fecha}
                    className={cn(
                      "grid grid-cols-[6.25rem_4.5rem_4.5rem] gap-2 px-3 py-2 items-center justify-items-center",
                      fila.activo && "bg-blue-50/50 dark:bg-blue-950/20",
                      bloqueada && "opacity-60",
                    )}
                  >
                    <button
                      type="button"
                      disabled={bloqueada}
                      onClick={() => toggleFila(fila.fecha)}
                      className={cn(
                        "w-[6.25rem] shrink-0 text-center text-xs font-bold capitalize rounded-md border-2 px-2 py-1.5 transition-colors cursor-pointer whitespace-nowrap",
                        fila.activo
                          ? "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20 border-blue-600 dark:border-blue-400"
                          : "text-gray-600 bg-white dark:text-gray-300 dark:bg-neutral-950 border-gray-200 dark:border-neutral-700 hover:border-blue-400 dark:hover:border-blue-400",
                        bloqueada && "cursor-not-allowed",
                      )}
                    >
                      {label}
                    </button>
                    <input
                      type="time"
                      step={PASO_MINUTOS_HORARIO * 60}
                      value={fila.entrada}
                      disabled={!fila.activo || bloqueada}
                      onChange={(e) =>
                        actualizarHorario(fila.fecha, "entrada", e.target.value)
                      }
                      onBlur={(e) =>
                        actualizarHorario(
                          fila.fecha,
                          "entrada",
                          e.target.value,
                          true,
                        )
                      }
                      className={claseInputHorario}
                    />
                    <input
                      type="time"
                      step={PASO_MINUTOS_HORARIO * 60}
                      value={fila.salida}
                      disabled={!fila.activo || bloqueada}
                      onChange={(e) =>
                        actualizarHorario(fila.fecha, "salida", e.target.value)
                      }
                      onBlur={(e) =>
                        actualizarHorario(
                          fila.fecha,
                          "salida",
                          e.target.value,
                          true,
                        )
                      }
                      className={claseInputHorario}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        </div>

        <div className="shrink-0 flex flex-wrap items-center justify-end gap-2 p-4 border-t border-gray-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 h-10 px-4 text-sm font-bold text-zinc-600 bg-zinc-50 dark:text-zinc-300 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors border-2 border-zinc-500 dark:border-zinc-400 cursor-pointer"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={loading || !semanaEditable}
            className="flex items-center justify-center gap-1.5 h-10 px-4 text-sm font-bold text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md transition-colors border-2 border-blue-600 dark:border-blue-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Guardar asignación
          </button>
        </div>
      </div>
    </div>
  );
}
