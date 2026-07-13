"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Save, Loader2, ChevronLeft, ChevronRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AcuerdoEmpleado } from "../types";
import { actualizarDiasSemanaAcuerdo } from "@/components/permisos/acciones";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  parseDiasAcuerdo,
  getSemanaKey,
  obtenerFechasDeSemana,
  listarSemanasEnRango,
  formatearFechaCorta,
  esFechaPasada,
  fechaHoyLocal,
  type DiasAcuerdoSemanal,
} from "../dias-acuerdo";

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
  const [seleccion, setSeleccion] = useState<string[]>([]);

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
    setSeleccion(diasData.semanas[semanaActual] ?? []);
  }, [isOpen, diasData, semanaActual]);

  useEffect(() => {
    if (!isOpen || !acuerdo) return;
    const hoy = format(new Date(), "yyyy-MM-dd");
    const idx = semanas.findIndex((s) => s === getSemanaKey(hoy));
    setSemanaIdx(idx >= 0 ? idx : 0);
  }, [isOpen, acuerdo, semanas]);

  if (!isOpen || !acuerdo || !diasData) return null;

  const cupo = diasData.cupoSemanal;
  const hoy = fechaHoyLocal();
  const semanaEditable = fechasSemana.some((f) => !esFechaPasada(f, hoy));

  const toastOpts = { position: "top-center" as const };

  const etiquetaSemana =
    fechasSemana.length > 0
      ? `${formatearFechaCorta(fechasSemana[0])} - ${formatearFechaCorta(fechasSemana[fechasSemana.length - 1])} · ${parseISO(fechasSemana[0]).getFullYear()}`
      : "";

  const toggleFecha = (fecha: string) => {
    if (esFechaPasada(fecha, hoy)) {
      toast.warn("No puede modificar un día que ya pasó", toastOpts);
      return;
    }
    if (!semanaEditable) {
      toast.warn("Esta semana ya finalizó y no admite cambios", toastOpts);
      return;
    }
    if (seleccion.includes(fecha)) {
      setSeleccion((prev) => prev.filter((f) => f !== fecha));
      return;
    }
    if (seleccion.length >= cupo) {
      toast.warn(`Solo puede elegir ${cupo} días esta semana`, toastOpts);
      return;
    }
    setSeleccion((prev) => [...prev, fecha].sort());
  };

  const handleGuardar = async () => {
    if (!semanaEditable) {
      toast.warn("Esta semana ya finalizó y no admite cambios", toastOpts);
      return;
    }
    if (seleccion.length === 0) {
      toast.warn("Seleccione al menos un día", toastOpts);
      return;
    }
    if (seleccion.length > cupo) {
      toast.warn(`Máximo ${cupo} días por semana`, toastOpts);
      return;
    }
    setLoading(true);
    try {
      await actualizarDiasSemanaAcuerdo(acuerdo.id, semanaActual, seleccion);
      toast.success("Días de la semana guardados", toastOpts);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al guardar", toastOpts);
    } finally {
      setLoading(false);
    }
  };

  const historialSemana = diasData.historial.filter(
    (h) => h.semana === semanaActual,
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-md border border-gray-200 dark:border-neutral-800 flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-neutral-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Elegir días de la semana
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {cupo} día{cupo > 1 ? "s" : ""} laboral{cupo > 1 ? "es" : ""}/semana (lun–vie) · {acuerdo.tipo}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={semanaIdx <= 0}
              onClick={() => setSemanaIdx((i) => Math.max(0, i - 1))}
              className="p-2 rounded-md border border-gray-200 dark:border-neutral-700 disabled:opacity-40"
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
              className="p-2 rounded-md border border-gray-200 dark:border-neutral-700 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
            {semanaEditable
              ? `Seleccione ${cupo} día${cupo > 1 ? "s" : ""} laboral${cupo > 1 ? "es" : ""} (lun–vie) (${seleccion.length}/${cupo})`
              : "Esta semana ya finalizó. Solo puede consultar su selección e historial."}
          </p>

          <div className="grid grid-cols-2 gap-2">
            {fechasSemana.map((fecha) => {
              const d = parseISO(fecha);
              const activo = seleccion.includes(fecha);
              const pasada = esFechaPasada(fecha, hoy);
              const bloqueada = pasada;
              const label = format(d, "EEE d MMM", { locale: es });
              return (
                <button
                  key={fecha}
                  type="button"
                  disabled={bloqueada}
                  onClick={() => toggleFecha(fecha)}
                  className={cn(
                    "py-2.5 px-2 text-xs font-bold rounded-lg border transition-all capitalize",
                    bloqueada && "cursor-not-allowed opacity-50",
                    activo
                      ? bloqueada
                        ? "bg-blue-600/70 text-white border-blue-600/70"
                        : "bg-blue-600 text-white border-blue-600"
                      : "bg-white dark:bg-neutral-950 border-gray-200 dark:border-neutral-700 hover:border-blue-400",
                    bloqueada && !activo && "hover:border-gray-200 dark:hover:border-neutral-700",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {historialSemana.length > 0 && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 mb-2">
                <History className="w-3.5 h-3.5" />
                Historial de cambios de esta semana
              </div>
              <ul className="grid grid-cols-3 gap-2">
                {historialSemana.map((h, i) => (
                  <li
                    key={`${h.guardadoAt}-${i}`}
                    className="text-[10px] leading-snug text-amber-700 dark:text-amber-400 rounded-md border border-amber-200/60 dark:border-amber-800/40 bg-white/60 dark:bg-neutral-950/40 p-2"
                  >
                    <span className="block font-semibold">
                      {h.fechas.map(formatearFechaCorta).join(", ")}
                    </span>
                    <span className="block text-amber-500/90 mt-0.5">
                      {format(parseISO(h.guardadoAt.substring(0, 10)), "d MMM", {
                        locale: es,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-100 dark:border-neutral-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            type="button"
            onClick={handleGuardar}
            disabled={loading || !semanaEditable}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Guardar semana
          </Button>
        </div>
      </div>
    </div>
  );
}
