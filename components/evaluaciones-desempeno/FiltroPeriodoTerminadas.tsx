"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  anioActualGuatemala,
  etiquetaFiltroPeriodo,
  type FiltroPeriodoTerminadas,
} from "./lib/fechas";
import {
  EVAL_ACCENT_TEXT,
  EVAL_OUTLINE_BTN,
  EVAL_TAB_ACTIVE,
  EVAL_TAB_INACTIVE,
} from "./lib/ui";

const MESES: { valor: number; etiqueta: string }[] = [
  { valor: 1, etiqueta: "Ene" },
  { valor: 2, etiqueta: "Feb" },
  { valor: 3, etiqueta: "Mar" },
  { valor: 4, etiqueta: "Abr" },
  { valor: 5, etiqueta: "May" },
  { valor: 6, etiqueta: "Jun" },
  { valor: 7, etiqueta: "Jul" },
  { valor: 8, etiqueta: "Ago" },
  { valor: 9, etiqueta: "Sep" },
  { valor: 10, etiqueta: "Oct" },
  { valor: 11, etiqueta: "Nov" },
  { valor: 12, etiqueta: "Dic" },
];

const ANIOS_ATRAS = 5;

type Props = {
  value: FiltroPeriodoTerminadas;
  onChange: (value: FiltroPeriodoTerminadas) => void;
};

export function FiltroPeriodoTerminadas({ value, onChange }: Props) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const anioActual = anioActualGuatemala();
  const anioMin = anioActual - ANIOS_ATRAS;
  const puedeAnterior = value.anio > anioMin;
  const puedeSiguiente = value.anio < anioActual;

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (evento: MouseEvent) => {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(evento.target as Node)
      ) {
        setAbierto(false);
      }
    };
    const cerrarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", cerrar);
    document.addEventListener("keydown", cerrarTecla);
    return () => {
      document.removeEventListener("mousedown", cerrar);
      document.removeEventListener("keydown", cerrarTecla);
    };
  }, [abierto]);

  return (
    <div ref={contenedorRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAbierto((prev) => !prev)}
        className={EVAL_OUTLINE_BTN}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        aria-label="Filtrar por período"
      >
        <CalendarDays className="h-4 w-4" />
        {etiquetaFiltroPeriodo(value)}
      </button>
      {abierto ? (
        <div
          role="dialog"
          aria-label="Seleccionar período"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-zinc-50 p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
        >
          <div className="flex items-center justify-between gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-700">
            <button
              type="button"
              disabled={!puedeAnterior}
              onClick={() =>
                onChange({ ...value, anio: value.anio - 1 })
              }
              className={cn(
                "flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl transition-colors",
                EVAL_TAB_INACTIVE,
                !puedeAnterior && "cursor-not-allowed opacity-40",
              )}
              aria-label="Año anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span
              className={`text-lg font-bold tabular-nums ${EVAL_ACCENT_TEXT}`}
            >
              {value.anio}
            </span>
            <button
              type="button"
              disabled={!puedeSiguiente}
              onClick={() =>
                onChange({ ...value, anio: value.anio + 1 })
              }
              className={cn(
                "flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl transition-colors",
                EVAL_TAB_INACTIVE,
                !puedeSiguiente && "cursor-not-allowed opacity-40",
              )}
              aria-label="Año siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                onChange({ ...value, mes: null });
                setAbierto(false);
              }}
              className={cn(
                "h-9 cursor-pointer rounded-xl px-3 text-xs font-bold uppercase tracking-wide transition-colors",
                value.mes == null ? EVAL_TAB_ACTIVE : EVAL_TAB_INACTIVE,
              )}
            >
              Todo el año
            </button>
            <div className="grid grid-cols-4 gap-1.5">
              {MESES.map((mes) => {
                const activo = value.mes === mes.valor;
                return (
                  <button
                    key={mes.valor}
                    type="button"
                    onClick={() => {
                      onChange({ ...value, mes: mes.valor });
                      setAbierto(false);
                    }}
                    className={cn(
                      "h-9 cursor-pointer rounded-xl text-xs font-bold uppercase tracking-wide transition-colors",
                      activo ? EVAL_TAB_ACTIVE : EVAL_TAB_INACTIVE,
                    )}
                  >
                    {mes.etiqueta}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
