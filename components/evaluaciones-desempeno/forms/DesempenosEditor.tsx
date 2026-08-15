"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Plus,
  Trash2,
} from "lucide-react";
import { ModalLabel } from "@/components/ui/general-modal";
import { cn } from "@/lib/utils";
import { EvalAnimatedAccordionSlot } from "../EvalAnimatedAccordionSlot";
import { EvalRolTabBar } from "../EvalRolTabBar";
import { accordionPanelTransition } from "../lib/accordion-motion";
import { useAccordionSequence } from "../lib/useAccordionSequence";
import {
  EVAL_ACCORDION_CHEVRON,
  EVAL_ACCORDION_CHEVRON_OPEN,
  EVAL_ACCORDION_INDEX,
  EVAL_ACCORDION_INDEX_OPEN,
  EVAL_ACCORDION_ITEM,
  EVAL_ACCORDION_LIST,
  EVAL_ACCORDION_PANEL,
  EVAL_ACCORDION_TITLE,
  EVAL_ACCORDION_TITLE_OPEN,
  EVAL_ACCORDION_TRIGGER,
  EVAL_ACCORDION_TRIGGER_OPEN,
  EVAL_ADD_NIVEL_BTN,
  EVAL_ADD_NIVEL_WRAP,
  EVAL_ASPECT_ACTION_BTN,
  EVAL_ASPECT_ACTION_DELETE,
  EVAL_ASPECT_ACTIONS,
  EVAL_ASPECT_BODY,
  EVAL_ASPECT_FIELD_WRAP,
  EVAL_ACCENT_TEXT,
  EVAL_EMPTY,
  EVAL_ERROR_TEXT,
  EVAL_FIELD_CLASS,
  EVAL_FIELD_ERROR_RING,
  EVAL_NIVEL_CELL_DELETE,
  EVAL_NIVEL_CELL_DESC,
  EVAL_NIVEL_CELL_LETTER,
  EVAL_NIVEL_CELL_PTS,
  EVAL_NIVEL_DELETE_BTN,
  EVAL_NIVEL_FIELD_CLASS,
  EVAL_NIVEL_LETTER_CLASS,
  EVAL_NIVEL_ROW,
  EVAL_NIVEL_ROW_TOOLS,
  EVAL_NIVELES_BAND,
  EVAL_NIVELES_HEAD,
  EVAL_NIVELES_HEAD_TITLE,
  EVAL_NIVELES_HEADER_CELL,
  EVAL_NIVELES_HEADER_ROW,
  EVAL_NIVELES_HINT,
  EVAL_NIVELES_TABLE,
  EVAL_NIVEL_TEXTAREA_CLASS,
  EVAL_SECTION_HEAD,
  EVAL_SECTION_PAD,
  EVAL_SECTION_TITLE,
  EVAL_TOOLBAR_OUTLINE_BTN,
  EVAL_TOOLBAR_SAVE_BTN,
  EVAL_TEXTAREA_CLASS,
} from "../lib/ui";
import { useMutacionesEvaluacion } from "../lib/hooks";
import {
  MAX_LONGITUD_ETIQUETA_NIVEL,
  MAX_NIVELES_POR_ASPECTO,
  erroresDesdeMensajeServidor,
  erroresDesdeZodGuardarAspectos,
  erroresVaciosDesempenos,
  opcionesPorDefecto,
  prepararPayloadGuardarAspectos,
  primerIndiceAspectoConError,
  puntajeSugeridoParaNivel,
  recolectarErroresAspectos,
  guardarAspectosSchema,
  siguienteEtiquetaNivel,
  tieneErroresDesempenos,
  ETIQUETAS_DIRIGIDO_A,
  type AspectoInput,
  type DirigidoAAspecto,
  type ErroresDesempenosForm,
  type EvaluacionPlantilla,
} from "../lib/zod";

function CampoError({ mensaje }: { mensaje?: string }) {
  if (!mensaje) return null;
  return <p className={EVAL_ERROR_TEXT}>{mensaje}</p>;
}

function claseCampo(base: string, invalido: boolean) {
  return invalido ? `${base} ${EVAL_FIELD_ERROR_RING}` : base;
}

function fusionarErroresDesempenos(
  base: ErroresDesempenosForm,
  extra: ErroresDesempenosForm,
): ErroresDesempenosForm {
  const aspectos = { ...base.aspectos };
  for (const [key, val] of Object.entries(extra.aspectos)) {
    const i = Number(key);
    const prev = aspectos[i] ?? { opciones: {} };
    aspectos[i] = {
      titulo: prev.titulo ?? val.titulo,
      descripcion: prev.descripcion ?? val.descripcion,
      general: prev.general ?? val.general,
      opciones: { ...prev.opciones, ...val.opciones },
    };
  }
  return {
    general: base.general ?? extra.general,
    aspectos,
  };
}

function TextareaAutoAltura({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const ajustarAltura = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    ajustarAltura();
  }, [value, ajustarAltura]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        requestAnimationFrame(ajustarAltura);
      }}
      className={className}
    />
  );
}

function aspectoVacio(dirigidoA: DirigidoAAspecto): AspectoInput {
  return {
    titulo: "",
    descripcion: "",
    dirigido_a: dirigidoA,
    opciones: opcionesPorDefecto(),
  };
}

function aspectosDesdeEvaluacion(
  evaluacion: EvaluacionPlantilla,
): AspectoInput[] {
  return evaluacion.aspectos.map((a) => ({
    id: a.id,
    titulo: a.titulo,
    descripcion: a.descripcion,
    dirigido_a: a.dirigido_a,
    opciones: a.opciones.map((o) => ({
      id: o.id,
      letra_calificacion: o.letra_calificacion,
      descripcion: o.descripcion,
      valor_puntuacion: o.valor_puntuacion,
    })),
  }));
}

function claveAspecto(aspecto: AspectoInput, index: number): string {
  return aspecto.id ?? `nuevo-${index}`;
}

type Props = {
  evaluacion: EvaluacionPlantilla;
  bloqueado: boolean;
};

export function DesempenosEditor({ evaluacion, bloqueado }: Props) {
  const { aspectos } = useMutacionesEvaluacion();
  const [aspectosLocal, setAspectosLocal] = useState<AspectoInput[]>(() =>
    aspectosDesdeEvaluacion(evaluacion),
  );
  const [tabRol, setTabRol] = useState<DirigidoAAspecto>("empleado");
  const {
    toggle,
    openAccordion,
    closeAccordion,
    resetAccordion,
    getSlotMotion,
    isExpanded,
    isAnimating,
    openAccordionId,
  } = useAccordionSequence();
  const [errores, setErrores] = useState<ErroresDesempenosForm>(() =>
    erroresVaciosDesempenos(),
  );

  const firmaAspectos = useMemo(
    () =>
      evaluacion.aspectos
        .map(
          (a, i) =>
            `${a.id ?? ""}:${i}:${a.dirigido_a}:${a.titulo}:${a.descripcion}:${a.opciones.length}`,
        )
        .join("|"),
    [evaluacion.aspectos],
  );

  useEffect(() => {
    setAspectosLocal(aspectosDesdeEvaluacion(evaluacion));
    resetAccordion();
    setErrores(erroresVaciosDesempenos());
  }, [evaluacion.id, firmaAspectos, resetAccordion]);

  const aspectosVisibles = useMemo(
    () =>
      aspectosLocal
        .map((aspecto, realIndex) => ({ aspecto, realIndex }))
        .filter(({ aspecto }) => aspecto.dirigido_a === tabRol),
    [aspectosLocal, tabRol],
  );

  const abrirAspectoConErrores = (erroresForm: ErroresDesempenosForm) => {
    const indice = primerIndiceAspectoConError(erroresForm);
    if (indice === null) return;
    const aspecto = aspectosLocal[indice];
    if (!aspecto) return;
    setTabRol(aspecto.dirigido_a);
    openAccordion(claveAspecto(aspecto, indice));
  };

  const limpiarErrorAspecto = (aspectoIndex: number) => {
    setErrores((prev) => {
      if (!prev.aspectos[aspectoIndex]) return prev;
      const aspectosErr = { ...prev.aspectos };
      delete aspectosErr[aspectoIndex];
      return { ...prev, aspectos: aspectosErr };
    });
  };

  const mover = (posVisible: number, dir: -1 | 1) => {
    const destVisible = posVisible + dir;
    if (destVisible < 0 || destVisible >= aspectosVisibles.length) return;
    const actual = aspectosVisibles[posVisible];
    const otro = aspectosVisibles[destVisible];
    if (!actual || !otro) return;
    const next = [...aspectosLocal];
    next[actual.realIndex] = otro.aspecto;
    next[otro.realIndex] = actual.aspecto;
    setAspectosLocal(next);
    openAccordion(claveAspecto(actual.aspecto, otro.realIndex));
  };

  const agregar = () => {
    const nuevo = aspectoVacio(tabRol);
    const next = [...aspectosLocal, nuevo];
    setAspectosLocal(next);
    openAccordion(claveAspecto(nuevo, next.length - 1));
  };

  const guardar = async () => {
    const payload = prepararPayloadGuardarAspectos(evaluacion.id, aspectosLocal);
    let erroresForm = recolectarErroresAspectos(aspectosLocal);

    const validacionZod = guardarAspectosSchema.safeParse(payload);
    if (!validacionZod.success) {
      erroresForm = fusionarErroresDesempenos(
        erroresForm,
        erroresDesdeZodGuardarAspectos(validacionZod.error),
      );
    }

    if (tieneErroresDesempenos(erroresForm)) {
      setErrores(erroresForm);
      abrirAspectoConErrores(erroresForm);
      return;
    }

    setErrores(erroresVaciosDesempenos());

    const res = await aspectos.mutateAsync(payload);
    if (!res.ok) {
      const erroresServidor = erroresDesdeMensajeServidor(
        res.message,
        aspectosLocal,
      );
      setErrores(erroresServidor);
      abrirAspectoConErrores(erroresServidor);
      return;
    }
    toast.success("Desempeños guardados.");
    closeAccordion();
  };

  return (
    <div className="flex flex-col">
      <div className={EVAL_SECTION_HEAD}>
        <h3 className={EVAL_SECTION_TITLE}>Desempeños a evaluar</h3>
      </div>

      {bloqueado ? (
        <p className={`${EVAL_SECTION_PAD} border-b border-zinc-200 py-2 text-xs text-amber-700 dark:border-zinc-700 dark:text-amber-300`}>
          Ya hay respuestas enviadas. Los desempeños no se pueden modificar.
        </p>
      ) : null}

      <div className={EVAL_SECTION_PAD}>
        <EvalRolTabBar
          active={tabRol}
          onChange={(rol) => {
            setTabRol(rol);
            closeAccordion();
          }}
        />
      </div>

      {aspectosVisibles.length === 0 ? (
        <p className={`${EVAL_EMPTY} ${EVAL_SECTION_PAD} border-b border-zinc-200 py-6 dark:border-zinc-700`}>
          No hay desempeños para {ETIQUETAS_DIRIGIDO_A[tabRol].toLowerCase()}.
          Agrega desempeños como Liderazgo, Trabajo en equipo, etc. Cada uno con
          niveles A–E (20, 16, 12, 8, 4).
        </p>
      ) : (
        <div className={EVAL_ACCORDION_LIST}>
          {aspectosVisibles.map(({ aspecto, realIndex }, posVisible) => {
            const index = realIndex;
            const key = claveAspecto(aspecto, index);
            const expandido = isExpanded(key);
            const tituloVisible =
              aspecto.titulo.trim() || `Desempeño ${posVisible + 1}`;
            const errAspecto = errores.aspectos[index];

            return (
              <EvalAnimatedAccordionSlot
                key={key}
                motionState={getSlotMotion(key)}
              >
              <div className={EVAL_ACCORDION_ITEM}>
                <button
                  type="button"
                  disabled={isAnimating}
                  onClick={() => toggle(key)}
                  className={cn(
                    EVAL_ACCORDION_TRIGGER,
                    expandido && EVAL_ACCORDION_TRIGGER_OPEN,
                  )}
                >
                  <span
                    className={cn(
                      EVAL_ACCORDION_INDEX,
                      expandido && EVAL_ACCORDION_INDEX_OPEN,
                    )}
                  >
                    {posVisible + 1}
                  </span>
                  <span
                    className={cn(
                      EVAL_ACCORDION_TITLE,
                      expandido && EVAL_ACCORDION_TITLE_OPEN,
                    )}
                  >
                    {tituloVisible}
                  </span>
                  <ChevronDown
                    className={cn(
                      EVAL_ACCORDION_CHEVRON,
                      expandido && EVAL_ACCORDION_CHEVRON_OPEN,
                    )}
                  />
                </button>

                <div
                  className="grid overflow-hidden"
                  style={{
                    gridTemplateRows: expandido ? "1fr" : "0fr",
                    transition: accordionPanelTransition,
                  }}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className={EVAL_ACCORDION_PANEL}>
                    {bloqueado ? (
                      <>
                        <div className={EVAL_ASPECT_BODY}>
                        <p className="text-sm italic text-muted-foreground">
                          {aspecto.descripcion}
                        </p>
                        </div>
                        <div className={EVAL_NIVELES_BAND}>
                          <div className={EVAL_NIVELES_HEAD}>
                            <p className={EVAL_NIVELES_HEAD_TITLE}>Niveles</p>
                          </div>
                          <div className={EVAL_NIVELES_TABLE}>
                          <div className={EVAL_NIVELES_HEADER_ROW}>
                            <span className={`${EVAL_NIVELES_HEADER_CELL} text-center`}>
                              Nivel
                            </span>
                            <span className={EVAL_NIVELES_HEADER_CELL}>
                              Descripción
                            </span>
                            <span className={`${EVAL_NIVELES_HEADER_CELL} text-center`}>
                              Pts
                            </span>
                            <span className="sr-only">Acciones</span>
                          </div>
                          {aspecto.opciones.map((op, oi) => (
                            <div
                              key={`${key}-lectura-${oi}`}
                              className={EVAL_NIVEL_ROW}
                            >
                              <div className={EVAL_NIVEL_ROW_TOOLS}>
                                <span
                                  className={`${EVAL_NIVEL_CELL_LETTER} text-sm font-bold ${EVAL_ACCENT_TEXT}`}
                                >
                                  {op.letra_calificacion}
                                </span>
                                <span className={`${EVAL_NIVEL_CELL_PTS} text-sm font-semibold tabular-nums text-muted-foreground`}>
                                  {op.valor_puntuacion}
                                </span>
                                <span className={EVAL_NIVEL_CELL_DELETE} />
                              </div>
                              <span className={`${EVAL_NIVEL_CELL_DESC} whitespace-pre-wrap break-words text-sm text-zinc-700 dark:text-zinc-200`}>
                                {op.descripcion || "—"}
                              </span>
                            </div>
                          ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={EVAL_ASPECT_BODY}>
                        {errAspecto?.general ? (
                          <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                            {errAspecto.general}
                          </p>
                        ) : null}
                        <div className={EVAL_ASPECT_FIELD_WRAP}>
                          <ModalLabel>Título</ModalLabel>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            value={aspecto.titulo}
                            onChange={(e) => {
                              limpiarErrorAspecto(index);
                              setAspectosLocal((prev) =>
                                prev.map((a, i) =>
                                  i === index
                                    ? { ...a, titulo: e.target.value }
                                    : a,
                                ),
                              );
                            }}
                            className={claseCampo(
                              `${EVAL_FIELD_CLASS} min-w-0 flex-1`,
                              Boolean(errAspecto?.titulo),
                            )}
                          />
                            <div className={`${EVAL_ASPECT_ACTIONS} w-full sm:w-auto`}>
                          <button
                            type="button"
                            onClick={() => mover(posVisible, -1)}
                            disabled={posVisible === 0}
                            className={EVAL_ASPECT_ACTION_BTN}
                            aria-label="Subir desempeño"
                          >
                            <ArrowUp className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => mover(posVisible, 1)}
                            disabled={posVisible === aspectosVisibles.length - 1}
                            className={EVAL_ASPECT_ACTION_BTN}
                            aria-label="Bajar desempeño"
                          >
                            <ArrowDown className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAspectosLocal((prev) =>
                                prev.filter((_, i) => i !== index),
                              );
                              if (openAccordionId === key) closeAccordion();
                            }}
                            className={EVAL_ASPECT_ACTION_DELETE}
                            aria-label="Eliminar desempeño"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                            </div>
                          </div>
                          <CampoError mensaje={errAspecto?.titulo} />
                        </div>
                        <div className={EVAL_ASPECT_FIELD_WRAP}>
                          <ModalLabel>Descripción</ModalLabel>
                          <TextareaAutoAltura
                            value={aspecto.descripcion}
                            onChange={(descripcion) => {
                              limpiarErrorAspecto(index);
                              setAspectosLocal((prev) =>
                                prev.map((a, i) =>
                                  i === index ? { ...a, descripcion } : a,
                                ),
                              );
                            }}
                            className={claseCampo(
                              EVAL_TEXTAREA_CLASS,
                              Boolean(errAspecto?.descripcion),
                            )}
                          />
                          <CampoError mensaje={errAspecto?.descripcion} />
                        </div>
                        </div>
                        <div className={EVAL_NIVELES_BAND}>
                          <div className={EVAL_NIVELES_HEAD}>
                            <p className={EVAL_NIVELES_HEAD_TITLE}>Niveles</p>
                            <p className={EVAL_NIVELES_HINT}>
                              Por defecto A–E con puntajes 20, 16, 12, 8 y 4.
                            </p>
                          </div>
                          <div className={EVAL_NIVELES_TABLE}>
                          <div className={EVAL_NIVELES_HEADER_ROW}>
                            <span className={`${EVAL_NIVELES_HEADER_CELL} text-center`}>
                              Nivel
                            </span>
                            <span className={EVAL_NIVELES_HEADER_CELL}>
                              Descripción
                            </span>
                            <span className={`${EVAL_NIVELES_HEADER_CELL} text-center`}>
                              Pts
                            </span>
                            <span className="sr-only">Acciones</span>
                          </div>
                          {aspecto.opciones.map((op, oi) => {
                            const errOp = errAspecto?.opciones?.[oi];
                            return (
                            <div
                              key={`${key}-nivel-${oi}`}
                              className={EVAL_NIVEL_ROW}
                            >
                              <div className={EVAL_NIVEL_ROW_TOOLS}>
                              <div className={EVAL_NIVEL_CELL_LETTER}>
                                <input
                                  value={op.letra_calificacion}
                                  maxLength={MAX_LONGITUD_ETIQUETA_NIVEL}
                                  onChange={(e) => {
                                    limpiarErrorAspecto(index);
                                    setAspectosLocal((prev) =>
                                      prev.map((a, i) =>
                                        i === index
                                          ? {
                                              ...a,
                                              opciones: a.opciones.map((o, j) =>
                                                j === oi
                                                  ? {
                                                      ...o,
                                                      letra_calificacion:
                                                        e.target.value,
                                                    }
                                                  : o,
                                              ),
                                            }
                                          : a,
                                      ),
                                    );
                                  }}
                                  className={claseCampo(
                                    EVAL_NIVEL_LETTER_CLASS,
                                    Boolean(errOp?.letra),
                                  )}
                                />
                                <CampoError mensaje={errOp?.letra} />
                              </div>
                              <div className={EVAL_NIVEL_CELL_PTS}>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={op.valor_puntuacion}
                                  onChange={(e) => {
                                    limpiarErrorAspecto(index);
                                    setAspectosLocal((prev) =>
                                      prev.map((a, i) =>
                                        i === index
                                          ? {
                                              ...a,
                                              opciones: a.opciones.map((o, j) =>
                                                j === oi
                                                  ? {
                                                      ...o,
                                                      valor_puntuacion: Number(
                                                        e.target.value,
                                                      ),
                                                    }
                                                  : o,
                                              ),
                                            }
                                          : a,
                                      ),
                                    );
                                  }}
                                  className={claseCampo(
                                    EVAL_NIVEL_FIELD_CLASS,
                                    Boolean(errOp?.puntaje),
                                  )}
                                />
                                <CampoError mensaje={errOp?.puntaje} />
                              </div>
                              <div className={EVAL_NIVEL_CELL_DELETE}>
                              <button
                                type="button"
                                disabled={aspecto.opciones.length <= 1}
                                onClick={() => {
                                  limpiarErrorAspecto(index);
                                  setAspectosLocal((prev) =>
                                    prev.map((a, i) =>
                                      i === index
                                        ? {
                                            ...a,
                                            opciones: a.opciones.filter(
                                              (_, j) => j !== oi,
                                            ),
                                          }
                                        : a,
                                    ),
                                  );
                                }}
                                className={EVAL_NIVEL_DELETE_BTN}
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                              </div>
                              </div>
                              <div className={EVAL_NIVEL_CELL_DESC}>
                                <TextareaAutoAltura
                                  value={op.descripcion}
                                  onChange={(descripcion) => {
                                    limpiarErrorAspecto(index);
                                    setAspectosLocal((prev) =>
                                      prev.map((a, i) =>
                                        i === index
                                          ? {
                                              ...a,
                                              opciones: a.opciones.map((o, j) =>
                                                j === oi
                                                  ? { ...o, descripcion }
                                                  : o,
                                              ),
                                            }
                                          : a,
                                      ),
                                    );
                                  }}
                                  className={claseCampo(
                                    EVAL_NIVEL_TEXTAREA_CLASS,
                                    Boolean(errOp?.descripcion),
                                  )}
                                />
                                <CampoError mensaje={errOp?.descripcion} />
                              </div>
                            </div>
                          );
                          })}
                          </div>
                          <div className={EVAL_ADD_NIVEL_WRAP}>
                          <button
                            type="button"
                            disabled={
                              aspecto.opciones.length >= MAX_NIVELES_POR_ASPECTO
                            }
                            onClick={() =>
                              setAspectosLocal((prev) =>
                                prev.map((a, i) => {
                                  if (i !== index) return a;
                                  const etiqueta = siguienteEtiquetaNivel(
                                    a.opciones,
                                  );
                                  if (!etiqueta) return a;
                                  return {
                                    ...a,
                                    opciones: [
                                      ...a.opciones,
                                      {
                                        letra_calificacion: etiqueta,
                                        descripcion: "",
                                        valor_puntuacion:
                                          puntajeSugeridoParaNivel(
                                            a.opciones.length,
                                          ),
                                      },
                                    ],
                                  };
                                }),
                              )
                            }
                            className={EVAL_ADD_NIVEL_BTN}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Agregar nivel
                          </button>
                          </div>
                        </div>
                      </>
                    )}
                    </div>
                  </div>
                </div>
              </div>
              </EvalAnimatedAccordionSlot>
            );
          })}
        </div>
      )}

      {!bloqueado ? (
        <div className={`${EVAL_SECTION_PAD} flex flex-col gap-2 border-t border-zinc-200 bg-zinc-50 py-3.5 dark:border-zinc-700 dark:bg-zinc-900/40`}>
          {errores.general ? (
            <p className={`${EVAL_ERROR_TEXT} mb-2`}>{errores.general}</p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={agregar}
              className={`${EVAL_TOOLBAR_OUTLINE_BTN} w-full sm:w-auto`}
            >
              <Plus className="h-4 w-4" />
              Agregar desempeño para {ETIQUETAS_DIRIGIDO_A[tabRol].toLowerCase()}
            </button>
            {aspectosLocal.length > 0 ? (
              <button
                type="button"
                disabled={aspectos.isPending}
                onClick={() => void guardar()}
                className={`${EVAL_TOOLBAR_SAVE_BTN} w-full sm:min-w-[11rem] sm:w-auto`}
              >
                {aspectos.isPending ? "Guardando…" : "Guardar desempeños"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
