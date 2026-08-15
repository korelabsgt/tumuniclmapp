"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronsRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResultadoPersona } from "./lib/zod";
import { formatearFechaInstanteCorta } from "./lib/fechas";
import { formatoEtiquetaRango, pillPrincipalResultado } from "./lib/resultado-puntajes";
import { ACCORDION_CONTENT_MS, ACCORDION_EASE } from "./lib/accordion-motion";
import {
  EVAL_DEPT_COUNT_BADGE,
  EVAL_DEPT_COUNT_BADGE_CLOSED,
  EVAL_DEPT_COUNT_BADGE_OPEN,
  EVAL_DEPT_COUNT_LABEL,
  EVAL_EMPTY,
  EVAL_ENTRAR_BTN,
  EVAL_PANEL,
  EVAL_SEARCH_FIELD,
  EVAL_SEARCH_WRAP,
  EVAL_TABLE_PILL,
  EVAL_TD_DATE,
  EVAL_TD_PILL,
  EVAL_TH,
  EVAL_TH_CENTER,
  EVAL_THEAD_ROW,
  EVAL_TOOLBAR,
  EVAL_TR,
} from "./lib/ui";

const COLS_TABLA =
  "grid grid-cols-[3.5rem_minmax(0,1fr)_18%_22%_14%] items-center";

type Props = {
  resultados: ResultadoPersona[];
  onSeleccionar: (resultado: ResultadoPersona) => void;
};

function ordenarPorJefeYNombre(items: ResultadoPersona[]): ResultadoPersona[] {
  return [...items].sort((a, b) => {
    if (a.evaluado_es_jefe !== b.evaluado_es_jefe) {
      return a.evaluado_es_jefe ? -1 : 1;
    }
    return a.evaluado_nombre.localeCompare(b.evaluado_nombre, "es");
  });
}

function agruparPorDependencia(
  resultados: ResultadoPersona[],
): [string, ResultadoPersona[]][] {
  const map = new Map<string, ResultadoPersona[]>();

  for (const resultado of resultados) {
    const dependencia = resultado.evaluado_dependencia?.trim() || "Sin dependencia";
    const lista = map.get(dependencia) ?? [];
    lista.push(resultado);
    map.set(dependencia, lista);
  }

  const grupos = [...map.entries()].sort(([a], [b]) => {
    if (a === "Sin dependencia") return 1;
    if (b === "Sin dependencia") return -1;
    return a.localeCompare(b, "es");
  });

  return grupos.map(([dependencia, items]) => [
    dependencia,
    ordenarPorJefeYNombre(items),
  ]);
}

function PillResultado({
  puntaje,
  nombre,
  color,
}: {
  puntaje: number;
  nombre: string;
  color: string;
}) {
  return (
    <span
      className={`${EVAL_TABLE_PILL} border-transparent text-white`}
      style={{ backgroundColor: color }}
    >
      {puntaje} | {formatoEtiquetaRango(nombre)}
    </span>
  );
}

export function TablaResultadosPorDependencia({
  resultados,
  onSeleccionar,
}: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [dependenciaAbierta, setDependenciaAbierta] = useState<string | null>(
    null,
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return resultados;
    return resultados.filter(
      (r) =>
        r.evaluado_nombre.toLowerCase().includes(q) ||
        (r.evaluado_dependencia ?? "").toLowerCase().includes(q),
    );
  }, [resultados, busqueda]);

  const grupos = useMemo(
    () => agruparPorDependencia(filtrados),
    [filtrados],
  );

  const gruposKey = useMemo(
    () => grupos.map(([dependencia]) => dependencia).join("|"),
    [grupos],
  );

  useEffect(() => {
    setDependenciaAbierta(null);
  }, [gruposKey]);

  const toggleDependencia = (dependencia: string) => {
    setDependenciaAbierta((actual) =>
      actual === dependencia ? null : dependencia,
    );
  };

  if (resultados.length === 0) {
    return (
      <div className={EVAL_PANEL}>
        <p className={EVAL_EMPTY}>Aún no hay resultados para esta evaluación.</p>
      </div>
    );
  }

  return (
    <div className={EVAL_PANEL}>
      <div className={EVAL_TOOLBAR}>
        <div className={EVAL_SEARCH_WRAP}>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Nombre, dependencia..."
            className={EVAL_SEARCH_FIELD}
          />
        </div>
      </div>

      {grupos.length === 0 ? (
        <p className={EVAL_EMPTY}>No hay resultados con ese criterio.</p>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="min-w-[48rem] text-left text-sm">
            <div className={cn(COLS_TABLA, EVAL_THEAD_ROW)}>
              <div className={EVAL_TH}>No.</div>
              <div className={EVAL_TH}>Nombre</div>
              <div className={EVAL_TH}>Fecha</div>
              <div className={EVAL_TH_CENTER}>Resultado</div>
              <div className={EVAL_TH_CENTER}>Acciones</div>
            </div>

            {grupos.map(([dependencia, items]) => {
              const expandido = dependenciaAbierta === dependencia;

              return (
                <div
                  key={dependencia}
                  className="border-b border-zinc-200 last:border-b-0 dark:border-zinc-700"
                >
                  <button
                    type="button"
                    aria-expanded={expandido}
                    onClick={() => toggleDependencia(dependencia)}
                    className="flex w-full cursor-pointer items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-3 text-left text-xs font-bold uppercase tracking-widest text-[#0066cc] transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-blue-400 dark:hover:bg-zinc-900/80"
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform duration-300 ease-out",
                        expandido && "rotate-180",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">{dependencia}</span>
                    <span
                      className={cn(
                        EVAL_DEPT_COUNT_BADGE,
                        expandido
                          ? EVAL_DEPT_COUNT_BADGE_OPEN
                          : EVAL_DEPT_COUNT_BADGE_CLOSED,
                      )}
                    >
                      <span>{items.length}</span>
                      <span className={EVAL_DEPT_COUNT_LABEL}>
                        {items.length === 1 ? "evaluado" : "evaluados"}
                      </span>
                    </span>
                  </button>

                  <motion.div
                    initial={false}
                    animate={{
                      height: expandido ? "auto" : 0,
                      opacity: expandido ? 1 : 0,
                    }}
                    transition={{
                      height: {
                        duration: ACCORDION_CONTENT_MS / 1000,
                        ease: ACCORDION_EASE,
                      },
                      opacity: {
                        duration: ACCORDION_CONTENT_MS / 1000,
                        ease: ACCORDION_EASE,
                      },
                    }}
                    className="overflow-hidden"
                    aria-hidden={!expandido}
                  >
                    <div className={!expandido ? "pointer-events-none" : undefined}>
                      {items.map((resultado, index) => {
                        const esFilaJefe = index === 0;

                        return (
                          <div
                            key={resultado.evaluado_id}
                            role="button"
                            tabIndex={0}
                            onClick={() => onSeleccionar(resultado)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onSeleccionar(resultado);
                              }
                            }}
                            className={cn(
                              COLS_TABLA,
                              EVAL_TR,
                              esFilaJefe &&
                                "!bg-blue-50 shadow-[inset_4px_0_0_0_#0066cc] hover:!bg-blue-100/90 dark:!bg-blue-950/40 dark:shadow-[inset_4px_0_0_0_#60a5fa] dark:hover:!bg-blue-950/55",
                            )}
                          >
                            <div className="px-3 py-3 text-center text-sm font-semibold leading-none tabular-nums text-[#0066cc] dark:text-blue-400">
                              {index + 1}
                            </div>
                            <div className="px-3 py-3 text-sm font-semibold leading-none text-zinc-900 dark:text-white">
                              {resultado.evaluado_nombre}
                            </div>
                            <div className={`${EVAL_TD_DATE} leading-none`}>
                              {resultado.fecha_realizacion
                                ? formatearFechaInstanteCorta(
                                    resultado.fecha_realizacion,
                                  )
                                : "—"}
                            </div>
                            <div className={EVAL_TD_PILL}>
                              {(() => {
                                const pill = pillPrincipalResultado(resultado);
                                if (!pill) {
                                  return (
                                    <span className="text-base font-extrabold tabular-nums text-[#0066cc] dark:text-blue-400">
                                      {resultado.total_promedio}
                                    </span>
                                  );
                                }
                                return (
                                  <PillResultado
                                    puntaje={pill.puntaje}
                                    nombre={pill.rangoNombre}
                                    color={pill.color}
                                  />
                                );
                              })()}
                            </div>
                            <div className={EVAL_TD_PILL}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSeleccionar(resultado);
                                }}
                                className={`${EVAL_TABLE_PILL} ${EVAL_ENTRAR_BTN} pointer-events-auto cursor-pointer`}
                              >
                                Entrar
                                <ChevronsRight
                                  className="h-3.5 w-3.5"
                                  strokeWidth={2.5}
                                />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
