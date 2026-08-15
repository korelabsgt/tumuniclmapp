"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCORDION_CONTENT_MS, ACCORDION_EASE } from "./lib/accordion-motion";
import {
  EVAL_ENTRAR_BTN,
  EVAL_PANEL,
  EVAL_STATUS_PENDING,
  EVAL_TABLE_PILL,
  EVAL_TD_NAME,
  EVAL_TD_PILL,
  EVAL_TH,
  EVAL_TH_CENTER,
  EVAL_THEAD_ROW,
  EVAL_TR,
} from "./lib/ui";
import { ETIQUETAS_TIPO, type PendienteEvaluacion } from "./lib/zod";
import { formatearFechaHoraInstante } from "./lib/fechas";
import { pillDesdePendienteCompletado } from "./lib/resultado-puntajes";

const COLS_TABLA =
  "grid grid-cols-[3rem_minmax(0,1fr)_14rem_6rem] items-center";

const COLS_FILA_PERSONA =
  "grid grid-cols-[minmax(0,1fr)_minmax(11rem,auto)] items-center";

type GrupoFormulario = {
  formulario_id: string;
  formulario_nombre: string;
  formulario_fecha_inicio: string;
  tipo_evaluacion: PendienteEvaluacion["tipo_evaluacion"];
  items: PendienteEvaluacion[];
};

type Props = {
  pendientes: PendienteEvaluacion[];
  onSeleccionar: (pendiente: PendienteEvaluacion) => void;
  onVerCompletada?: (pendiente: PendienteEvaluacion) => void;
  etiquetaConteo?: string;
  abrirMasNuevaPorDefecto?: boolean;
};

function agruparPorFormulario(
  pendientes: PendienteEvaluacion[],
): GrupoFormulario[] {
  const map = new Map<string, GrupoFormulario>();

  for (const pendiente of pendientes) {
    const existente = map.get(pendiente.formulario_id);
    if (existente) {
      existente.items.push(pendiente);
      continue;
    }
    map.set(pendiente.formulario_id, {
      formulario_id: pendiente.formulario_id,
      formulario_nombre: pendiente.formulario_nombre,
      formulario_fecha_inicio: pendiente.formulario_fecha_inicio,
      tipo_evaluacion: pendiente.tipo_evaluacion,
      items: [pendiente],
    });
  }

  return [...map.values()]
    .map((grupo) => ({
      ...grupo,
      items: [...grupo.items].sort((a, b) =>
        a.evaluado_nombre.localeCompare(b.evaluado_nombre, "es"),
      ),
    }))
    .sort((a, b) => {
      const porFecha = b.formulario_fecha_inicio.localeCompare(
        a.formulario_fecha_inicio,
      );
      if (porFecha !== 0) return porFecha;
      return a.formulario_nombre.localeCompare(b.formulario_nombre, "es");
    });
}

function agruparPorDependencia(
  pendientes: PendienteEvaluacion[],
): [string, PendienteEvaluacion[]][] {
  const map = new Map<string, PendienteEvaluacion[]>();

  for (const pendiente of pendientes) {
    const dependencia =
      pendiente.evaluado_dependencia?.trim() || "Sin dependencia";
    const lista = map.get(dependencia) ?? [];
    lista.push(pendiente);
    map.set(dependencia, lista);
  }

  return [...map.entries()].sort(([a], [b]) => {
    if (a === "Sin dependencia") return 1;
    if (b === "Sin dependencia") return -1;
    return a.localeCompare(b, "es");
  });
}

function formularioAbiertoInicial(
  grupos: GrupoFormulario[],
  abrirMasNuevaPorDefecto: boolean,
): string | null {
  if (grupos.length === 0 || !abrirMasNuevaPorDefecto) return null;
  return grupos[0]?.formulario_id ?? null;
}

export function ListaPendientesEvaluacion({
  pendientes,
  onSeleccionar,
  onVerCompletada,
  etiquetaConteo = "Estado",
  abrirMasNuevaPorDefecto = false,
}: Props) {
  const grupos = useMemo(
    () => agruparPorFormulario(pendientes),
    [pendientes],
  );

  const gruposKey = useMemo(
    () => grupos.map((grupo) => grupo.formulario_id).join("|"),
    [grupos],
  );

  const [formularioAbierto, setFormularioAbierto] = useState<string | null>(
    () => formularioAbiertoInicial(grupos, abrirMasNuevaPorDefecto),
  );

  useEffect(() => {
    setFormularioAbierto(
      formularioAbiertoInicial(grupos, abrirMasNuevaPorDefecto),
    );
  }, [gruposKey, abrirMasNuevaPorDefecto, grupos]);

  if (pendientes.length === 0) {
    return null;
  }

  return (
    <div className={EVAL_PANEL}>
      <div className="overflow-x-auto pb-4">
        <div className="min-w-[40rem] text-left text-sm">
          <div className={cn(COLS_TABLA, EVAL_THEAD_ROW)}>
            <div className={EVAL_TH}>No.</div>
            <div className={EVAL_TH}>Evaluación</div>
            <div className={EVAL_TH}>Tipo</div>
            <div className={EVAL_TH_CENTER}>{etiquetaConteo}</div>
          </div>

          {grupos.map((grupo, index) => {
            const expandido = formularioAbierto === grupo.formulario_id;
            const dependencias = agruparPorDependencia(grupo.items);

            return (
              <div
                key={grupo.formulario_id}
                className="border-b border-zinc-200 last:border-b-0 dark:border-zinc-700"
              >
                <button
                  type="button"
                  aria-expanded={expandido}
                  onClick={() =>
                    setFormularioAbierto((actual) =>
                      actual === grupo.formulario_id
                        ? null
                        : grupo.formulario_id,
                    )
                  }
                  className={cn(
                    COLS_TABLA,
                    EVAL_TR,
                    "w-full border-b-0 text-left",
                    expandido &&
                      "bg-blue-50/60 dark:bg-blue-950/25 [&_p]:text-[#0066cc] dark:[&_p]:text-blue-400",
                  )}
                >
                  <div className="px-3 py-3 text-center text-sm font-semibold tabular-nums text-[#0066cc] dark:text-blue-400">
                    {index + 1}
                  </div>
                  <div className={`${EVAL_TD_NAME} min-w-0 truncate`}>{grupo.formulario_nombre}</div>
                  <div className="px-3 py-3 text-xs font-medium tracking-wide text-zinc-500 dark:text-zinc-400">
                    {ETIQUETAS_TIPO[grupo.tipo_evaluacion]}
                  </div>
                  <div className="px-3 py-3" aria-hidden />
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
                  <div
                    className={cn(
                      "border-t border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/30",
                      !expandido && "pointer-events-none",
                    )}
                  >
                    {dependencias.map(([dependencia, items]) => (
                      <div
                        key={`${grupo.formulario_id}-${dependencia}`}
                        className="border-b border-zinc-200 last:border-b-0 dark:border-zinc-700"
                      >
                        <div className="flex items-center gap-2 border-b border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-[#0066cc] dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-blue-400">
                          <ChevronDown
                            className="h-3.5 w-3.5 shrink-0 opacity-60"
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1">{dependencia}</span>
                          <span className="text-[10px] font-bold tabular-nums text-muted-foreground">
                            {items.length}
                          </span>
                        </div>

                        {items.map((pendiente) => (
                          <div
                            key={`${pendiente.formulario_id}-${pendiente.evaluado_id}`}
                            className={cn(
                              COLS_FILA_PERSONA,
                              "border-b border-zinc-100 px-4 py-2 last:border-b-0 dark:border-zinc-800",
                              pendiente.esta_completada && "opacity-90",
                            )}
                          >
                            <div className="flex min-w-0 flex-col gap-0.5 py-1">
                              <span
                                className={cn(
                                  "min-w-0 text-sm font-semibold",
                                  pendiente.esta_completada
                                    ? "text-zinc-600 dark:text-zinc-300"
                                    : "text-zinc-900 dark:text-white",
                                )}
                              >
                                {pendiente.evaluado_nombre}
                              </span>
                              {pendiente.esta_completada &&
                              pendiente.fecha_realizacion ? (
                                <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                                  {formatearFechaHoraInstante(
                                    pendiente.fecha_realizacion,
                                  )}
                                </span>
                              ) : null}
                            </div>
                            <div
                              className={cn(
                                EVAL_TD_PILL,
                                "flex items-center justify-end gap-2 py-1",
                              )}
                            >
                              {pendiente.esta_completada ? (
                                <>
                                  {(() => {
                                    const pill =
                                      pillDesdePendienteCompletado(pendiente);
                                    if (!pill) return null;
                                    return (
                                      <span
                                        className={`${EVAL_TABLE_PILL} shrink-0 border-transparent text-white`}
                                        style={{ backgroundColor: pill.color }}
                                      >
                                        {pill.puntaje} | {pill.rangoNombre}
                                      </span>
                                    );
                                  })()}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onVerCompletada?.(pendiente)
                                    }
                                    className={`${EVAL_TABLE_PILL} ${EVAL_ENTRAR_BTN} pointer-events-auto shrink-0 cursor-pointer`}
                                  >
                                    Entrar
                                    <ChevronsRight
                                      className="h-3.5 w-3.5"
                                      strokeWidth={2.5}
                                    />
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onSeleccionar(pendiente)}
                                  className={`${EVAL_TABLE_PILL} ${EVAL_STATUS_PENDING} pointer-events-auto cursor-pointer`}
                                >
                                  Pendiente
                                  <ChevronsRight
                                    className="h-3.5 w-3.5"
                                    strokeWidth={2.5}
                                  />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
