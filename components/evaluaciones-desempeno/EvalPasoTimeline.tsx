"use client";

import { Check, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  total: number;
  actual: number;
  completados: boolean[];
  seleccionables: boolean[];
  onSeleccionar: (index: number) => void;
  onAnterior: () => void;
  onSiguiente: () => void;
  puedeAnterior: boolean;
  puedeSiguiente: boolean;
  deshabilitado?: boolean;
};

const FLECHA_BTN =
  "relative z-20 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-500 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-200";

function LineaConector({ activa }: { activa: boolean }) {
  return (
    <span
      aria-hidden
      className="relative mx-2 h-0.5 w-10 overflow-hidden rounded-full bg-zinc-200 sm:mx-3 sm:w-14 md:w-16 dark:bg-zinc-700"
    >
      <span
        className={cn(
          "absolute inset-0 origin-left rounded-full bg-[#0066cc] dark:bg-blue-400",
          "transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
          activa ? "scale-x-100" : "scale-x-0",
        )}
      />
    </span>
  );
}

export function EvalPasoTimeline({
  total,
  actual,
  completados,
  seleccionables,
  onSeleccionar,
  onAnterior,
  onSiguiente,
  puedeAnterior,
  puedeSiguiente,
  deshabilitado = false,
}: Props) {
  if (total <= 0) return null;

  return (
    <nav
      aria-label="Progreso de la evaluación"
      className="mx-auto grid w-full max-w-2xl grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-x-3 sm:grid-cols-[3rem_minmax(0,1fr)_3rem] sm:gap-x-5"
    >
      <button
        type="button"
        onClick={onAnterior}
        disabled={!puedeAnterior || deshabilitado}
        aria-label="Desempeño anterior"
        className={`${FLECHA_BTN} justify-self-start`}
      >
        <ChevronsLeft className="h-6 w-6" strokeWidth={2.5} />
      </button>

      <ol className="flex min-w-0 items-center justify-center px-1 sm:px-2">
        {Array.from({ length: total }, (_, index) => {
          const paso = index + 1;
          const esActual = index === actual;
          const esCompletado = completados[index] ?? false;
          const esSeleccionable = seleccionables[index] ?? false;
          const esUltimoPaso = index === total - 1;
          const lineaActiva = index < actual;

          return (
            <li key={paso} className="flex items-center">
              <button
                type="button"
                disabled={deshabilitado || !esSeleccionable}
                onClick={() => onSeleccionar(index)}
                aria-current={esActual ? "step" : undefined}
                aria-label={`Desempeño ${paso}${esCompletado ? ", respondido" : ""}${!esSeleccionable ? ", bloqueado" : ""}`}
                className={cn(
                  "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold tabular-nums transition-[background-color,border-color,color,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] sm:h-10 sm:w-10",
                  esSeleccionable && !deshabilitado && "cursor-pointer",
                  (!esSeleccionable || deshabilitado) && "cursor-not-allowed opacity-50",
                  esActual &&
                    "border-[#0066cc] bg-[#0066cc] text-white opacity-100 dark:border-blue-400 dark:bg-blue-500",
                  !esActual &&
                    esCompletado &&
                    esSeleccionable &&
                    "border-[#0066cc] bg-[#0066cc]/10 text-[#0066cc] dark:border-blue-400 dark:bg-blue-400/15 dark:text-blue-400",
                  !esActual &&
                    esCompletado &&
                    !esSeleccionable &&
                    "border-zinc-300 bg-zinc-100 text-zinc-400 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-500",
                  !esActual &&
                    !esCompletado &&
                    esSeleccionable &&
                    "border-zinc-300 bg-white text-zinc-500 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:bg-zinc-700/80",
                  !esActual &&
                    !esCompletado &&
                    !esSeleccionable &&
                    "border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-600",
                )}
              >
                {esCompletado && !esActual ? (
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  paso
                )}
              </button>

              {!esUltimoPaso ? <LineaConector activa={lineaActiva} /> : null}
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={onSiguiente}
        disabled={!puedeSiguiente || deshabilitado}
        aria-label="Siguiente desempeño"
        className={cn(
          FLECHA_BTN,
          "justify-self-end",
          !deshabilitado &&
            puedeSiguiente &&
            "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white",
        )}
      >
        <ChevronsRight className="h-6 w-6" strokeWidth={2.5} />
      </button>
    </nav>
  );
}
