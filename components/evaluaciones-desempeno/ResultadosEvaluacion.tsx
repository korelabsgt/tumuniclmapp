"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { CintilloInstitucional } from "@/components/ui/cintillo-institucional";
import { cn } from "@/lib/utils";
import {
  ETIQUETAS_TIPO,
  type FilaAnonima,
  type OpcionElegidaResultado,
  type ResultadoPersona,
  type TipoEvaluacion,
  type TipoVistaEvaluaciones,
} from "./lib/zod";
import {
  claveDiaDeInstante,
  formatearFechaInstanteCorta,
  mesAnioDeInstante,
  resultadoCoincidePeriodo,
  type FiltroPeriodoTerminadas,
} from "./lib/fechas";
import {
  ACCORDION_EASE,
  accordionPanelTransition,
  accordionSlotTransition,
} from "./lib/accordion-motion";
import {
  pillPrincipalResultado,
  resumenPillsResultado,
} from "./lib/resultado-puntajes";
import { promedioPorClave } from "./lib/rangos";
import {
  EVAL_ACCENT_TEXT,
  EVAL_CINTILLO_CLASS,
  EVAL_LIST_ITEM,
  EVAL_SECTION_CARD,
  EVAL_SECTION_HEAD,
  EVAL_SECTION_PAD,
  EVAL_SECTION_TITLE,
  EVAL_TABLE_PILL,
  EVAL_TAB_ACTIVE,
  EVAL_TAB_BTN,
  EVAL_TAB_INACTIVE,
} from "./lib/ui";

const PUNTAJE_MAX_ASPECTO = 20;

const COLORES_SERIE = [
  "#0066cc",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
] as const;

type SerieEvaluacion = {
  id: string;
  color: string;
  etiqueta: string;
  puntajes: Record<string, number>;
  total: number | null;
};

type DatoGrafica = {
  id: string;
  nombre: string;
  valor: number;
  ancho: number;
  elegido: OpcionElegidaResultado | null;
  colorBarra?: string;
};

function puntajeAspecto(resultado: ResultadoPersona, aspectoId: string): number {
  const auto = resultado.auto?.[aspectoId];
  const equipo = resultado.equipo?.[aspectoId];
  if (auto != null && equipo != null) {
    return Math.round(((auto + equipo) / 2) * 10) / 10;
  }
  return auto ?? equipo ?? 0;
}

function datosGrafica(resultado: ResultadoPersona): DatoGrafica[] {
  return resultado.aspectos.map((aspecto) => {
    const valor = puntajeAspecto(resultado, aspecto.id);
    const ancho = Math.min(
      100,
      Math.round((valor / PUNTAJE_MAX_ASPECTO) * 100),
    );
    return {
      id: aspecto.id,
      nombre: aspecto.titulo,
      valor,
      ancho,
      elegido: aspecto.elegido,
    };
  });
}

function seriesEvaluacionRRHH(resultado: ResultadoPersona): SerieEvaluacion[] {
  const series: SerieEvaluacion[] = [];
  let colorIdx = 0;
  if (resultado.auto) {
    series.push({
      id: "auto",
      color: COLORES_SERIE[colorIdx]!,
      etiqueta: "Autoevaluación",
      puntajes: resultado.auto,
      total: resultado.auto_total,
    });
    colorIdx += 1;
  }
  for (const fila of resultado.filas_empleados ?? []) {
    series.push({
      id: `emp-${fila.indice}`,
      color: COLORES_SERIE[colorIdx % COLORES_SERIE.length]!,
      etiqueta: fila.evaluador_nombre?.trim() || `Evaluación ${fila.indice}`,
      puntajes: fila.por_aspecto,
      total: fila.total,
    });
    colorIdx += 1;
  }
  return series;
}

function LeyendaSeries({ series }: { series: SerieEvaluacion[] }) {
  if (series.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5">
      {series.map((serie) => (
        <div
          key={serie.id}
          className="flex max-w-full items-center gap-2"
          title={serie.etiqueta}
        >
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: serie.color }}
            aria-hidden
          />
          <span
            className="truncate text-xs font-semibold sm:text-sm"
            style={{ color: serie.color }}
          >
            {serie.etiqueta}
          </span>
        </div>
      ))}
    </div>
  );
}

function FiltroSeriesRRHH({
  incluirPersonal,
  seriesOtras,
  empleadosActivos,
  onModoAutoevaluacion,
  onAlternarTodos,
  onToggleEmpleado,
}: {
  incluirPersonal: boolean;
  seriesOtras: SerieEvaluacion[];
  empleadosActivos: Set<string>;
  onModoAutoevaluacion: () => void;
  onAlternarTodos: () => void;
  onToggleEmpleado: (id: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const todosSeleccionados =
    incluirPersonal &&
    seriesOtras.length > 0 &&
    seriesOtras.every((serie) => empleadosActivos.has(serie.id));

  const etiquetaDesplegable = (() => {
    if (!incluirPersonal) return "Todos";
    if (seriesOtras.length === 0) return "Todos";
    if (todosSeleccionados) return "Todos";
    if (empleadosActivos.size === 0) return "Ninguno";
    if (empleadosActivos.size === 1) {
      const unica = seriesOtras.find((serie) => empleadosActivos.has(serie.id));
      return unica?.etiqueta ?? "1 evaluador";
    }
    return `${empleadosActivos.size} evaluadores`;
  })();

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
    <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
      <button
        type="button"
        onClick={onModoAutoevaluacion}
        className={cn(
          EVAL_TAB_BTN,
          "px-3 py-2 text-[11px] lg:text-xs",
          !incluirPersonal ? EVAL_TAB_ACTIVE : EVAL_TAB_INACTIVE,
        )}
      >
        Autoevaluación
      </button>
      <div ref={contenedorRef} className="relative">
        <button
          type="button"
          onClick={() => setAbierto((prev) => !prev)}
          className={cn(
            EVAL_TAB_BTN,
            "gap-1 px-3 py-2 text-[11px] lg:text-xs",
            incluirPersonal ? EVAL_TAB_ACTIVE : EVAL_TAB_INACTIVE,
          )}
          aria-expanded={abierto}
          aria-haspopup="listbox"
        >
          <span className="max-w-[9rem] truncate sm:max-w-[12rem]">
            {etiquetaDesplegable}
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-transform",
              abierto && "rotate-180",
            )}
            strokeWidth={2.5}
          />
        </button>
        {abierto ? (
          <div
            role="listbox"
            aria-label="Evaluaciones del personal"
            className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[min(16rem,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-zinc-50 p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
          >
            <button
              type="button"
              role="option"
              aria-selected={todosSeleccionados}
              onClick={onAlternarTodos}
              className={cn(
                "flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 text-left text-xs font-bold uppercase tracking-wide transition-colors",
                todosSeleccionados ? EVAL_TAB_ACTIVE : EVAL_TAB_INACTIVE,
              )}
            >
              Todos
              {todosSeleccionados ? (
                <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
              ) : null}
            </button>
            {seriesOtras.length > 0 ? (
              <div className="mt-1 flex flex-col gap-0.5 border-t border-zinc-200 pt-1 dark:border-zinc-700">
                {seriesOtras.map((serie) => {
                  const activo = incluirPersonal && empleadosActivos.has(serie.id);
                  return (
                    <button
                      key={serie.id}
                      type="button"
                      role="option"
                      aria-selected={activo}
                      onClick={() => onToggleEmpleado(serie.id)}
                      className={cn(
                        "flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 text-left text-xs font-semibold transition-colors",
                        activo ? EVAL_TAB_ACTIVE : EVAL_TAB_INACTIVE,
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: serie.color }}
                          aria-hidden
                        />
                        <span
                          className="min-w-0 truncate"
                          style={{ color: activo ? serie.color : undefined }}
                        >
                          {serie.etiqueta}
                        </span>
                      </span>
                      {activo ? (
                        <Check
                          className="h-3.5 w-3.5 shrink-0"
                          strokeWidth={2.5}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function datosGraficaDesdePuntajes(
  resultado: ResultadoPersona,
  puntajes: Record<string, number> | null,
  colorBarra?: string,
): DatoGrafica[] {
  if (!puntajes) return [];
  return resultado.aspectos.map((aspecto) => {
    const valor = puntajes[aspecto.id] ?? 0;
    const ancho = Math.min(
      100,
      Math.round((valor / PUNTAJE_MAX_ASPECTO) * 100),
    );
    return {
      id: aspecto.id,
      nombre: aspecto.titulo,
      valor,
      ancho,
      elegido: aspecto.elegido,
      colorBarra,
    };
  });
}

function encabezadoAspectoTabla(titulo: string) {
  const palabras = titulo.trim().split(/\s+/).filter(Boolean);
  if (palabras.length <= 1) {
    return <span className="block whitespace-normal leading-tight">{titulo}</span>;
  }
  const mitad = Math.ceil(palabras.length / 2);
  return (
    <span className="block whitespace-normal leading-[1.2]">
      <span className="block">{palabras.slice(0, mitad).join(" ")}</span>
      <span className="block">{palabras.slice(mitad).join(" ")}</span>
    </span>
  );
}

function TablaPuntajesDetalle({
  aspectos,
  filas,
  promedio,
  promedioTotal,
  etiquetaPromedio = "Promedio",
  anchoCompleto = false,
}: {
  aspectos: ResultadoPersona["aspectos"];
  filas: {
    clave: string;
    color: string;
    etiqueta: string;
    puntajes: Record<string, number>;
    total: number | null;
  }[];
  promedio?: Record<string, number> | null;
  promedioTotal?: number | null;
  etiquetaPromedio?: string;
  anchoCompleto?: boolean;
}) {
  if (filas.length === 0 && !promedio) return null;

  const thClass =
    "px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground lg:px-4";
  const thTotalClass = cn(
    thClass,
    "font-extrabold text-zinc-900 dark:text-zinc-100",
  );
  const tdNumeroAzul =
    "font-semibold tabular-nums text-[#0066cc] dark:text-blue-400";

  const anchoEvaluacion = "14%";
  const anchoTotal = "7%";
  const anchoAspecto =
    aspectos.length > 0
      ? `${(100 - 14 - 7) / aspectos.length}%`
      : "0%";

  const minTabla =
    aspectos.length > 0
      ? `${8.5 + aspectos.length * 5.5 + 3.5}rem`
      : "20rem";

  return (
    <div className="w-full max-w-full overflow-x-auto overscroll-x-contain rounded-2xl border border-zinc-200 dark:border-zinc-700">
      <table
        className="w-full table-fixed text-left text-xs lg:text-sm"
        style={{ minWidth: anchoCompleto ? minTabla : undefined }}
      >
        <colgroup>
          <col style={{ width: anchoEvaluacion }} />
          {aspectos.map((aspecto) => (
            <col key={aspecto.id} style={{ width: anchoAspecto }} />
          ))}
          <col style={{ width: anchoTotal }} />
        </colgroup>
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/50">
            <th className={thClass}>Evaluación</th>
            {aspectos.map((aspecto) => (
              <th key={aspecto.id} className={thClass}>
                {encabezadoAspectoTabla(aspecto.titulo)}
              </th>
            ))}
            <th className={thTotalClass}>Total</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr
              key={fila.clave}
              className="border-b border-zinc-100 dark:border-zinc-800"
            >
              <td className="px-3 py-2.5 text-xs font-semibold leading-snug text-zinc-800 dark:text-zinc-100 lg:px-4">
                <span className="block whitespace-normal">{fila.etiqueta}</span>
              </td>
              {aspectos.map((aspecto) => (
                <td
                  key={aspecto.id}
                  className="whitespace-nowrap px-3 py-2.5 tabular-nums lg:px-4"
                >
                  {fila.puntajes[aspecto.id] ?? "—"}
                </td>
              ))}
              <td
                className={cn(
                  "whitespace-nowrap px-3 py-2.5 lg:px-4",
                  tdNumeroAzul,
                )}
              >
                {fila.total ?? "—"}
              </td>
            </tr>
          ))}
          {promedio ? (
            <tr className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/60">
              <td className="px-3 py-2.5 text-[10px] font-extrabold uppercase leading-snug tracking-wide text-zinc-900 dark:text-zinc-100 lg:px-4">
                <span className="block whitespace-normal">{etiquetaPromedio}</span>
              </td>
              {aspectos.map((aspecto) => (
                <td
                  key={aspecto.id}
                  className={cn(
                    "whitespace-nowrap px-3 py-2.5 lg:px-4",
                    tdNumeroAzul,
                  )}
                >
                  {promedio[aspecto.id] ?? "—"}
                </td>
              ))}
              <td
                className={cn(
                  "whitespace-nowrap px-3 py-2.5 lg:px-4",
                  tdNumeroAzul,
                  "font-extrabold",
                )}
              >
                {promedioTotal ?? "—"}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function TablaEvaluadoresAnonimos({
  aspectos,
  filas,
  promedio,
  promedioTotal,
  colores,
  anchoCompleto = false,
}: {
  aspectos: ResultadoPersona["aspectos"];
  filas: FilaAnonima[];
  promedio: Record<string, number> | null;
  promedioTotal: number | null;
  colores?: string[];
  anchoCompleto?: boolean;
}) {
  const inicioColor = colores?.length ? 1 : 0;
  return (
    <TablaPuntajesDetalle
      aspectos={aspectos}
      anchoCompleto={anchoCompleto}
      filas={filas.map((fila, i) => ({
        clave: String(fila.indice),
        color:
          colores?.[inicioColor + i] ??
          COLORES_SERIE[(inicioColor + i) % COLORES_SERIE.length]!,
        etiqueta: fila.evaluador_nombre?.trim() || String(fila.indice),
        puntajes: fila.por_aspecto,
        total: fila.total,
      }))}
      promedio={promedio}
      promedioTotal={promedioTotal}
    />
  );
}

function filasTablaDesdeSeries(series: SerieEvaluacion[]) {
  return series.map((serie) => ({
    clave: serie.id,
    color: serie.color,
    etiqueta: serie.etiqueta,
    puntajes: serie.puntajes,
    total: serie.total,
  }));
}

function promedioTablaDesdeSeries(series: SerieEvaluacion[]): {
  puntajes: Record<string, number>;
  total: number;
} | null {
  if (series.length === 0) return null;
  const puntajes = promedioPorClave(series.map((serie) => serie.puntajes));
  const totales = series
    .map((serie) => serie.total)
    .filter((total): total is number => total != null);
  if (totales.length === 0) return null;
  const total =
    Math.round(
      (totales.reduce((acc, valor) => acc + valor, 0) / totales.length) * 10,
    ) / 10;
  return { puntajes, total };
}

function GraficaAspectos({
  datos,
  colorBarra,
  acciones,
  subtitulo,
}: {
  datos: DatoGrafica[];
  colorBarra?: string;
  acciones?: ReactNode;
  subtitulo?: string;
}) {
  const [expandidoId, setExpandidoId] = useState<string | null>(null);

  if (datos.length === 0) return null;

  return (
    <section className={EVAL_SECTION_CARD}>
      <div className={EVAL_SECTION_HEAD}>
        <div className="min-w-0 flex-1">
          <h3 className={EVAL_SECTION_TITLE}>Puntaje por desempeño</h3>
          {subtitulo ? (
            <p className="mt-1 text-xs text-muted-foreground">{subtitulo}</p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Toca una barra para ver la opción elegida.
            </p>
          )}
        </div>
        {acciones}
      </div>
      <div className={`${EVAL_SECTION_PAD} flex flex-col gap-5 py-5`}>
        <div className="mb-1 grid grid-cols-[minmax(0,1fr)_4rem] gap-3 px-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <span>Desempeño</span>
          <span className="text-right">Pts.</span>
        </div>
        {datos.map((item) => {
          const expandido = expandidoId === item.id;
          const barraColor = item.colorBarra ?? colorBarra ?? "#10b981";
          return (
            <div key={item.id}>
              <button
                type="button"
                onClick={() =>
                  setExpandidoId(expandido ? null : item.id)
                }
                aria-expanded={expandido}
                className="w-full cursor-pointer rounded-xl text-left transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0066cc] focus-visible:ring-offset-2 dark:hover:bg-zinc-900/40 dark:focus-visible:ring-blue-400"
              >
                <div className="mb-2 grid grid-cols-[minmax(0,1fr)_4rem] items-center gap-3 px-1">
                  <span className="truncate text-sm font-bold uppercase text-zinc-800 dark:text-zinc-100">
                    {item.nombre}
                  </span>
                  <span
                    className="text-right text-lg font-extrabold tabular-nums"
                    style={{ color: barraColor }}
                  >
                    {item.valor}
                  </span>
                </div>
                <div
                  className="h-4 overflow-hidden rounded-full"
                  style={{ backgroundColor: `${barraColor}18` }}
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{
                      width: `${item.ancho}%`,
                      backgroundColor: barraColor,
                    }}
                  />
                </div>
              </button>
              <div
                className="grid ease-[cubic-bezier(0.4,0,0.2,1)]"
                style={{
                  gridTemplateRows: expandido ? "1fr" : "0fr",
                  transition: accordionPanelTransition,
                }}
                aria-hidden={!expandido}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/50">
                    {item.elegido ? (
                      item.elegido.descripcion.trim() ? (
                        <p className="text-sm font-bold leading-relaxed text-zinc-800 dark:text-zinc-100">
                          {item.elegido.descripcion}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Esta opción no tiene descripción en la plantilla de
                          evaluación.
                        </p>
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No hay descripción disponible para esta calificación.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function GraficaComparativaAspectos({
  aspectos,
  series,
  acciones,
  subtitulo,
  aviso,
}: {
  aspectos: ResultadoPersona["aspectos"];
  series: SerieEvaluacion[];
  acciones?: ReactNode;
  subtitulo?: string;
  aviso?: string;
}) {
  if (series.length === 0 && !aviso) return null;

  return (
    <section className={EVAL_SECTION_CARD}>
      <div className={EVAL_SECTION_HEAD}>
        <div className="min-w-0 flex-1">
          <h3 className={EVAL_SECTION_TITLE}>Comparativa por desempeño</h3>
          {subtitulo ? (
            <p className="mt-1 text-xs text-muted-foreground">{subtitulo}</p>
          ) : null}
        </div>
        {acciones}
      </div>
      <div className={`${EVAL_SECTION_PAD} flex flex-col gap-6 py-5`}>
        {aviso ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            {aviso}
          </p>
        ) : null}
        {series.length > 0 ? <LeyendaSeries series={series} /> : null}
        {aspectos.map((aspecto) => (
          <div key={aspecto.id}>
            <p className="mb-3 truncate text-sm font-bold uppercase text-zinc-800 dark:text-zinc-100">
              {aspecto.titulo}
            </p>
            <motion.div layout className="flex flex-col gap-3">
              <AnimatePresence initial={false} mode="popLayout">
                {series.map((serie) => {
                  const valor = serie.puntajes[aspecto.id] ?? 0;
                  const ancho = Math.min(
                    100,
                    Math.round((valor / PUNTAJE_MAX_ASPECTO) * 100),
                  );
                  return (
                    <motion.div
                      key={serie.id}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{
                        opacity: accordionSlotTransition.opacity,
                        height: {
                          duration: accordionSlotTransition.layout.duration,
                          ease: ACCORDION_EASE,
                        },
                        layout: accordionSlotTransition.layout,
                      }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-3">
                        <div
                          className="h-3 overflow-hidden rounded-full"
                          style={{ backgroundColor: `${serie.color}18` }}
                        >
                          <motion.div
                            className="h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${ancho}%` }}
                            transition={{
                              duration: 0.5,
                              ease: ACCORDION_EASE,
                            }}
                            style={{ backgroundColor: serie.color }}
                          />
                        </div>
                        <motion.span
                          className="text-right text-sm font-extrabold tabular-nums"
                          animate={{ color: serie.color }}
                          transition={{
                            duration: 0.35,
                            ease: ACCORDION_EASE,
                          }}
                        >
                          {valor}
                        </motion.span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          </div>
        ))}
      </div>
    </section>
  );
}

function VistaContenidoRRHH({
  grafica,
  tabla,
  nota,
}: {
  grafica: ReactNode;
  tabla: ReactNode;
  nota?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-6">
      {nota}
      <div className="w-full">{grafica}</div>
      <div className="w-full min-w-0">{tabla}</div>
    </div>
  );
}

function ResumenPuntajesEvaluacion({
  resultado,
}: {
  resultado: ResultadoPersona;
}) {
  const pills = resumenPillsResultado(resultado);

  if (pills.length === 0) return null;

  return (
    <div className="flex w-full max-w-md shrink-0 self-center overflow-hidden rounded-xl border border-zinc-200 shadow-sm dark:border-zinc-700 sm:max-w-none sm:w-auto sm:self-auto">
      {pills.map((pill, index) => (
        <div
          key={pill.tipo}
          className={cn(
            "flex min-w-0 flex-1 flex-col items-center justify-center px-2 py-2.5 text-center sm:min-w-[6.75rem] sm:px-3",
            index > 0 && "border-l border-zinc-200 dark:border-zinc-700",
          )}
          style={{
            backgroundColor: pill.colorFondo,
            color: pill.color,
          }}
        >
          <span
            className="w-full truncate text-[8px] font-bold uppercase leading-tight tracking-wider sm:text-[9px]"
            title={pill.etiqueta}
          >
            {pill.etiqueta}
          </span>
          <span className="mt-0.5 whitespace-nowrap text-[10px] font-bold uppercase tracking-wide sm:text-xs">
            {pill.puntaje} | {pill.rangoNombre}
          </span>
        </div>
      ))}
    </div>
  );
}

function tiposEtiquetaResultado(
  resultado: ResultadoPersona,
  opciones: {
    incrustado?: boolean;
    tipoVista?: TipoVistaEvaluaciones;
    perfilId?: string | null;
  },
): TipoEvaluacion[] {
  const { incrustado, tipoVista, perfilId } = opciones;
  if (incrustado || tipoVista === "rrhh" || !perfilId || !tipoVista) {
    return resultado.tipos_evaluacion;
  }
  if (tipoVista === "propia") {
    if (resultado.evaluado_id !== perfilId) {
      return ["subordinado_a_jefe"];
    }
    return resultado.tipos_evaluacion.filter(
      (t) => t === "auto" || t === "jefe_a_subordinado",
    );
  }
  if (tipoVista === "jefe") {
    if (resultado.evaluado_id !== perfilId) {
      return ["jefe_a_subordinado"];
    }
    return resultado.tipos_evaluacion.filter(
      (t) => t === "auto" || t === "jefe_a_subordinado",
    );
  }
  return resultado.tipos_evaluacion;
}

export function DetalleResultadoEvaluacion({
  resultado,
  incrustado = false,
  tipoVista,
  perfilId = null,
}: {
  resultado: ResultadoPersona;
  incrustado?: boolean;
  tipoVista?: TipoVistaEvaluaciones;
  perfilId?: string | null;
}) {
  const esRRHH = tipoVista === "rrhh";
  const usarGraficasRRHH = esRRHH || tipoVista === "propia";
  const grafica = datosGrafica(resultado);
  const tiposEtiqueta = tiposEtiquetaResultado(resultado, {
    incrustado,
    tipoVista,
    perfilId,
  });

  const seriesRRHH = useMemo(
    () => seriesEvaluacionRRHH(resultado),
    [resultado],
  );

  const serieAuto = useMemo(
    () => seriesRRHH.find((serie) => serie.id === "auto") ?? null,
    [seriesRRHH],
  );

  const seriesOtras = useMemo(
    () => seriesRRHH.filter((serie) => serie.id !== "auto"),
    [seriesRRHH],
  );

  const tieneOtras = seriesOtras.length > 0;

  const [incluirPersonal, setIncluirPersonal] = useState(true);
  const [empleadosActivos, setEmpleadosActivos] = useState<Set<string>>(
    () => new Set(seriesOtras.map((serie) => serie.id)),
  );

  useEffect(() => {
    setIncluirPersonal(tieneOtras);
    setEmpleadosActivos(new Set(seriesOtras.map((serie) => serie.id)));
  }, [
    resultado.evaluado_id,
    resultado.formulario_id,
    tieneOtras,
    seriesOtras,
  ]);

  const seriesVisibles = useMemo(() => {
    if (!incluirPersonal) {
      if (serieAuto) return [serieAuto];
      return seriesOtras.filter((serie) => empleadosActivos.has(serie.id));
    }
    const visibles: SerieEvaluacion[] = [];
    if (serieAuto) visibles.push(serieAuto);
    if (incluirPersonal) {
      for (const serie of seriesOtras) {
        if (empleadosActivos.has(serie.id)) visibles.push(serie);
      }
    }
    return visibles;
  }, [serieAuto, incluirPersonal, seriesOtras, empleadosActivos]);

  const avisoSinAutoevaluacion =
    !serieAuto && seriesOtras.length > 0
      ? "Aún no se ha realizado la autoevaluación."
      : undefined;

  const alternarTodos = () => {
    setIncluirPersonal(true);
    const todosActivos = seriesOtras.every((serie) =>
      empleadosActivos.has(serie.id),
    );
    if (todosActivos) {
      setEmpleadosActivos(new Set());
      return;
    }
    setEmpleadosActivos(new Set(seriesOtras.map((serie) => serie.id)));
  };

  const activarSoloPropia = () => {
    setIncluirPersonal(false);
  };

  const alternarEmpleado = (id: string) => {
    if (!incluirPersonal) {
      setIncluirPersonal(true);
      setEmpleadosActivos(new Set([id]));
      return;
    }

    setEmpleadosActivos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const tieneContenidoRRHH = seriesRRHH.length > 0;

  const subtituloGrafica =
    seriesOtras.length > 0
      ? resultado.evaluado_es_jefe
        ? "La autoevaluación se muestra en azul; los demás colores son evaluaciones del equipo al jefe."
        : "La autoevaluación se muestra en azul; los demás colores son la evaluación del jefe."
      : undefined;

  const promedioTabla = useMemo(
    () => promedioTablaDesdeSeries(seriesVisibles),
    [seriesVisibles],
  );

  const filtrosGrafica = tieneOtras ? (
    <FiltroSeriesRRHH
      incluirPersonal={incluirPersonal}
      seriesOtras={seriesOtras}
      empleadosActivos={empleadosActivos}
      onModoAutoevaluacion={activarSoloPropia}
      onAlternarTodos={alternarTodos}
      onToggleEmpleado={alternarEmpleado}
    />
  ) : undefined;

  return (
    <div
      className={cn(
        "relative flex w-full flex-col",
        esRRHH ? "gap-4" : "gap-6",
      )}
    >
      <div className="flex flex-col">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold tracking-tight text-[#0066cc] dark:text-blue-400 sm:text-2xl">
              {resultado.formulario_nombre}
            </h2>
            {tiposEtiqueta.length > 0 ? (
              <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                {tiposEtiqueta.map((tipo) => (
                  <span
                    key={tipo}
                    className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0066cc] dark:border-zinc-600 dark:bg-zinc-800 dark:text-blue-400"
                  >
                    {ETIQUETAS_TIPO[tipo]}
                  </span>
                ))}
              </div>
            ) : null}
            <p
              className={cn(
                "font-bold text-zinc-900 dark:text-white",
                incrustado
                  ? "mt-3 text-2xl sm:text-3xl"
                  : "mt-2 text-base sm:text-lg",
              )}
            >
              {resultado.evaluado_nombre}
            </p>
            {resultado.evaluado_puesto ? (
              <p className="mt-2 text-sm font-semibold text-muted-foreground">
                {resultado.evaluado_puesto}
              </p>
            ) : null}
            {resultado.evaluado_dependencia ? (
              <p className={`mt-1.5 text-sm font-semibold ${EVAL_ACCENT_TEXT}`}>
                {resultado.evaluado_dependencia}
              </p>
            ) : null}
          </div>
          <ResumenPuntajesEvaluacion resultado={resultado} />
        </div>
        <div
          className={cn(
            "flex justify-center",
            esRRHH ? "pt-4" : "pt-6",
          )}
        >
          <CintilloInstitucional className={EVAL_CINTILLO_CLASS} />
        </div>
      </div>

      {usarGraficasRRHH && tieneContenidoRRHH ? (
        <div className="flex w-full flex-col gap-6">
          {seriesVisibles.length > 0 || avisoSinAutoevaluacion ? (
            <VistaContenidoRRHH
              grafica={
                <GraficaComparativaAspectos
                  aspectos={resultado.aspectos}
                  series={seriesVisibles}
                  acciones={tieneOtras ? filtrosGrafica : undefined}
                  subtitulo={subtituloGrafica}
                  aviso={avisoSinAutoevaluacion}
                />
              }
              tabla={
                seriesVisibles.length > 0 ? (
                  <TablaPuntajesDetalle
                    aspectos={resultado.aspectos}
                    anchoCompleto
                    filas={filasTablaDesdeSeries(seriesVisibles)}
                    promedio={
                      seriesVisibles.length > 1
                        ? promedioTabla?.puntajes
                        : undefined
                    }
                    promedioTotal={
                      seriesVisibles.length > 1 ? promedioTabla?.total : undefined
                    }
                    etiquetaPromedio="Promedio total"
                  />
                ) : null
              }
            />
          ) : null}
        </div>
      ) : usarGraficasRRHH ? (
        <p className="text-sm text-muted-foreground">
          No hay evaluaciones registradas para esta persona.
        </p>
      ) : (
        <>
          {resultado.filas_anonimas.length > 0 ? (
            <TablaEvaluadoresAnonimos
              aspectos={resultado.aspectos}
              filas={resultado.filas_anonimas}
              promedio={resultado.equipo}
              promedioTotal={resultado.equipo_total}
            />
          ) : null}
          <GraficaAspectos datos={grafica} />
        </>
      )}
    </div>
  );
}

type ListaProps = {
  resultados: ResultadoPersona[];
  titulo?: string;
  mostrarFecha?: boolean;
  periodoFiltro?: FiltroPeriodoTerminadas | null;
  mostrarNombreFormulario?: boolean;
  onSeleccionar: (resultado: ResultadoPersona) => void;
};

export function ordenarResultadosPorFecha(
  resultados: ResultadoPersona[],
): ResultadoPersona[] {
  return [...resultados].sort((a, b) =>
    (b.fecha_realizacion ?? "").localeCompare(a.fecha_realizacion ?? ""),
  );
}

export function ListaResultadosEvaluacion({
  resultados,
  titulo,
  mostrarFecha = false,
  periodoFiltro = null,
  mostrarNombreFormulario = true,
  onSeleccionar,
}: ListaProps) {
  const resultadosFiltrados = useMemo(() => {
    if (!mostrarFecha || !periodoFiltro) return resultados;
    return resultados.filter((resultado) =>
      resultadoCoincidePeriodo(resultado.fecha_realizacion, periodoFiltro),
    );
  }, [resultados, mostrarFecha, periodoFiltro]);

  const gruposPorFecha = useMemo(() => {
    const orden: string[] = [];
    const map = new Map<string, ResultadoPersona[]>();
    for (const resultado of resultadosFiltrados) {
      const clave =
        claveDiaDeInstante(resultado.fecha_realizacion) ?? "sin-fecha";
      if (!map.has(clave)) {
        map.set(clave, []);
        orden.push(clave);
      }
      map.get(clave)!.push(resultado);
    }
    return orden.map((clave) => ({
      clave,
      etiqueta:
        clave === "sin-fecha"
          ? "Sin fecha"
          : formatearFechaInstanteCorta(
              map.get(clave)![0]!.fecha_realizacion ?? "",
            ),
      items: map.get(clave)!,
    }));
  }, [resultadosFiltrados]);

  if (resultados.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no hay resultados para mostrar.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {titulo ? (
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {titulo}
        </h3>
      ) : null}
      {resultadosFiltrados.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay resultados para el período seleccionado.
        </p>
      ) : (
        gruposPorFecha.map((grupo) => (
          <div key={grupo.clave} className="flex flex-col gap-3">
            {mostrarFecha ? (
              <div className="flex items-center gap-3 pt-1">
                <span
                  className={`shrink-0 text-xs font-bold uppercase tracking-wide ${EVAL_ACCENT_TEXT}`}
                >
                  {grupo.etiqueta}
                </span>
                <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
              </div>
            ) : null}
            {grupo.items.map((resultado) => (
              <button
                key={`${resultado.formulario_id}-${resultado.evaluado_id}`}
                type="button"
                onClick={() => onSeleccionar(resultado)}
                className={`${EVAL_LIST_ITEM} items-center gap-4`}
              >
                <div className="min-w-0 flex-1 text-left">
                  {mostrarNombreFormulario ? (
                    <>
                      <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {resultado.formulario_nombre}
                      </p>
                      <p className="truncate text-base font-bold text-zinc-900 dark:text-white sm:text-lg">
                        {resultado.evaluado_nombre}
                      </p>
                    </>
                  ) : (
                    <p className="truncate text-base font-bold text-zinc-900 dark:text-white sm:text-lg">
                      {resultado.evaluado_nombre}
                    </p>
                  )}
                  {!mostrarNombreFormulario && resultado.evaluado_puesto ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {resultado.evaluado_puesto}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 self-center">
                  {(() => {
                    const pill = pillPrincipalResultado(resultado);
                    if (!pill) {
                      return (
                        <span
                          className={`${EVAL_TABLE_PILL} border-transparent bg-[#0066cc] text-white dark:bg-blue-500`}
                        >
                          {resultado.total_promedio}
                        </span>
                      );
                    }
                    return (
                      <span
                        className={`${EVAL_TABLE_PILL} border-transparent text-white`}
                        style={{ backgroundColor: pill.color }}
                      >
                        {pill.puntaje} | {pill.rangoNombre}
                      </span>
                    );
                  })()}
                </div>
              </button>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
