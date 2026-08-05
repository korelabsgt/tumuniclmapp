"use client";

import {
  formatearFechaFiltro,
  getRangoMes,
  getSemanasDelMes,
} from "@/components/permisos/lib/fechas";
import type { ModoFiltroPermisos } from "@/components/permisos/lib/hooks-queries";
import Calendario from "@/components/ui/Calendario";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowRight, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import React, { useMemo } from "react";

type ModoFecha = "dia" | "semana" | "rango";

type SetFecha = (fecha: string) => void;

export type ControlesModoMes = {
  setModoFiltro: (modo: ModoFiltroPermisos) => void;
  setFechaInicio: SetFecha;
  setFechaFin: SetFecha;
};

export function aplicarModoMes({
  setModoFiltro,
  setFechaInicio,
  setFechaFin,
}: ControlesModoMes) {
  const rango = getRangoMes(format(new Date(), "yyyy-MM"));
  setModoFiltro("semana");
  setFechaInicio(rango.inicio);
  setFechaFin(rango.fin);
}

interface Props {
  modoFiltro: ModoFiltroPermisos;
  fechaSeleccionada: string;
  fechaInicio: string;
  fechaFin: string;
  setModoFiltro: (modo: ModoFiltroPermisos) => void;
  setFechaSeleccionada: SetFecha;
  setFechaInicio: SetFecha;
  setFechaFin: SetFecha;
  alCambiarModo?: () => void;
}

const controlClass =
  "appearance-none [&::-ms-expand]:hidden bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-lg px-2 sm:px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold focus:outline-none focus:border-blue-400 transition-all shadow-sm cursor-pointer dark:text-gray-200";

const flechaMesClass =
  "flex items-center justify-center shrink-0 h-[30px] w-7 rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors shadow-sm cursor-pointer";

function formatMes(yyyyMM: string) {
  const texto = format(parseISO(`${yyyyMM}-01`), "MMMM yyyy", { locale: es });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function FiltroFechaPermisos({
  modoFiltro,
  fechaSeleccionada,
  fechaInicio,
  fechaFin,
  setModoFiltro,
  setFechaSeleccionada,
  setFechaInicio,
  setFechaFin,
  alCambiarModo,
}: Props) {
  const [calendarDiaOpen, setCalendarDiaOpen] = React.useState(false);
  const [calendarMesOpen, setCalendarMesOpen] = React.useState(false);
  const [calendarInicioOpen, setCalendarInicioOpen] = React.useState(false);
  const [calendarFinOpen, setCalendarFinOpen] = React.useState(false);

  const mes = (fechaInicio || format(new Date(), "yyyy-MM-dd")).substring(0, 7);
  const rangoMes = useMemo(() => getRangoMes(mes), [mes]);
  const semanasDisponibles = useMemo(() => getSemanasDelMes(mes), [mes]);

  const seleccionarMesCompleto = (yyyyMM: string) => {
    const rango = getRangoMes(yyyyMM);
    setFechaInicio(rango.inicio);
    setFechaFin(rango.fin);
  };

  React.useEffect(() => {
    if (modoFiltro !== "semana") return;
    const esMesCompleto =
      fechaInicio === rangoMes.inicio && fechaFin === rangoMes.fin;
    const esSemana = semanasDisponibles.some(
      (s) => s.inicio === fechaInicio && s.fin === fechaFin,
    );
    if (!esMesCompleto && !esSemana) {
      setFechaInicio(rangoMes.inicio);
      setFechaFin(rangoMes.fin);
    }
  }, [
    modoFiltro,
    rangoMes,
    semanasDisponibles,
    fechaInicio,
    fechaFin,
    setFechaInicio,
    setFechaFin,
  ]);

  const cambiarMes = (delta: number) => {
    const [anio, numeroMes] = mes.split("-").map(Number);
    seleccionarMesCompleto(
      format(new Date(anio, numeroMes - 1 + delta, 1), "yyyy-MM"),
    );
  };

  const handleCambioModo = (modo: ModoFecha) => {
    alCambiarModo?.();
    if (modo === "semana") {
      aplicarModoMes({ setModoFiltro, setFechaInicio, setFechaFin });
      return;
    }
    setModoFiltro(modo);
  };

  const modoActual: ModoFecha =
    modoFiltro === "dia" || modoFiltro === "semana" || modoFiltro === "rango"
      ? modoFiltro
      : "semana";

  const renderSelectModo = (className: string) => (
    <select
      value={modoActual}
      onChange={(e) => handleCambioModo(e.target.value as ModoFecha)}
      className={cn(controlClass, "shrink-0 text-center", className)}
    >
      <option value="dia">Día</option>
      <option value="semana">Mes</option>
      <option value="rango">Rango</option>
    </select>
  );

  return (
    <div className="order-2 lg:order-none lg:col-start-1 lg:row-start-1 lg:justify-self-start flex-1 min-w-0 w-full flex flex-col items-center gap-1.5">
      {modoFiltro !== "pendientes" && (
        <div className="flex items-center gap-2 w-full min-w-0 lg:justify-center">
          {renderSelectModo("w-[4.75rem] min-w-[4.75rem] lg:hidden")}
        </div>
      )}

      <div className="flex items-center justify-center gap-1.5 w-full min-w-0">
        {renderSelectModo("hidden lg:block w-[4.75rem] min-w-[4.75rem]")}

        {modoFiltro === "dia" && (
          <Popover open={calendarDiaOpen} onOpenChange={setCalendarDiaOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  controlClass,
                  "flex items-center justify-center gap-1.5 min-w-0",
                )}
              >
                <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
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
                  setCalendarDiaOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        )}

        {modoFiltro === "semana" && (
          <>
            <select
              className={cn(
                controlClass,
                "text-center min-w-0 flex-1 max-w-[10rem] sm:max-w-[12rem]",
              )}
              onChange={(e) => {
                const idx = parseInt(e.target.value, 10);
                if (idx < 0) {
                  seleccionarMesCompleto(mes);
                  return;
                }
                const semana = semanasDisponibles[idx];
                if (semana) {
                  setFechaInicio(semana.inicio);
                  setFechaFin(semana.fin);
                }
              }}
              value={semanasDisponibles.findIndex(
                (s) => s.inicio === fechaInicio && s.fin === fechaFin,
              )}
            >
              <option value="-1">Todo el mes</option>
              {semanasDisponibles.map((semana, idx) => (
                <option key={semana.inicio} value={idx}>
                  {semana.label}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => cambiarMes(-1)}
                className={flechaMesClass}
                aria-label="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <Popover open={calendarMesOpen} onOpenChange={setCalendarMesOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      controlClass,
                      "flex items-center justify-center gap-1.5 min-w-0",
                    )}
                  >
                    <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">{formatMes(mes)}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendario
                    modo="mes"
                    fechaSeleccionada={fechaInicio || rangoMes.inicio}
                    onSelectDate={(date) => {
                      seleccionarMesCompleto(date.substring(0, 7));
                      setCalendarMesOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
              <button
                type="button"
                onClick={() => cambiarMes(1)}
                className={flechaMesClass}
                aria-label="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {modoFiltro === "rango" && (
          <div className="flex flex-1 min-w-0 items-center justify-center gap-1.5">
            <Popover
              open={calendarInicioOpen}
              onOpenChange={setCalendarInicioOpen}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    controlClass,
                    "flex items-center justify-center gap-1.5 flex-1 min-w-0 lg:min-w-[7.5rem] whitespace-nowrap text-center",
                  )}
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">
                    {formatearFechaFiltro(fechaInicio)}
                  </span>
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
            <ArrowRight className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
            <Popover open={calendarFinOpen} onOpenChange={setCalendarFinOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    controlClass,
                    "flex items-center justify-center gap-1.5 flex-1 min-w-0 lg:min-w-[7.5rem] whitespace-nowrap text-center",
                  )}
                >
                  <Calendar className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span className="truncate">
                    {formatearFechaFiltro(fechaFin)}
                  </span>
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
  );
}
