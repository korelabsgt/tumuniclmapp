"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-toastify";
import { modalActionMessage } from "@/components/ui/modal-toast";
import Cargando from "@/components/ui/animations/Cargando";
import { CintilloInstitucional } from "@/components/ui/cintillo-institucional";
import {
  EVAL_ACCENT_TEXT,
  EVAL_CINTILLO_CLASS,
  EVAL_EMPTY,
  EVAL_SECTION_CARD,
  EVAL_SECTION_HEAD,
  EVAL_SECTION_PAD,
  EVAL_SECTION_TITLE,
  EVAL_TOOLBAR_SAVE_BTN,
} from "./lib/ui";
import { useMutacionesEvaluacion, useParaLlenar } from "./lib/hooks";
import { swalExitoEvaluacion } from "./lib/swal-eval";
import {
  guardarEvaluacionSchema,
  mensajeErrorZodGuardarEvaluacion,
  mensajeFaltantesEvaluacion,
  payloadGuardarEvaluacion,
  type TipoVistaEvaluaciones,
} from "./lib/zod";
import { EvalPasoTimeline } from "./EvalPasoTimeline";

type AspectoFormulario = {
  id: string;
  titulo: string;
  descripcion: string;
  opciones: {
    id: string;
    letra_calificacion: string;
    descripcion: string;
    valor_puntuacion: number;
  }[];
};

type Props = {
  tipoVista: TipoVistaEvaluaciones;
  formularioId: string;
  evaluadoId: string;
  onVolver: () => void;
};

const PASO_EASE = [0.4, 0, 0.2, 1] as const;
const OPCION_TRANS =
  "transition-[background-color,border-color,color,box-shadow] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]";

function TarjetaAspectoPaso({
  aspecto,
  indice,
  seleccion,
  soloLectura,
  onSeleccionar,
}: {
  aspecto: AspectoFormulario;
  indice: number;
  seleccion: string | undefined;
  soloLectura: boolean;
  onSeleccionar?: (opcionId: string) => void;
}) {
  const opcionSel = aspecto.opciones.find((o) => o.id === seleccion);

  return (
    <section className={EVAL_SECTION_CARD}>
      <div className={EVAL_SECTION_HEAD}>
        <h3 className={EVAL_SECTION_TITLE}>
          {indice + 1}. {aspecto.titulo}
        </h3>
        <span className="rounded-lg bg-[#0066cc]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#0066cc] dark:bg-blue-400/15 dark:text-blue-400 sm:text-sm">
          {opcionSel?.letra_calificacion ?? "—"} · {opcionSel?.valor_puntuacion ?? 0} pts
        </span>
      </div>

      <p
        className={`border-b border-zinc-200 px-4 py-4 text-sm font-bold leading-relaxed dark:border-zinc-700 sm:px-5 ${EVAL_ACCENT_TEXT}`}
      >
        {aspecto.descripcion}
      </p>

      <div className="flex flex-col gap-3 p-4 sm:gap-3.5 sm:p-5">
        {aspecto.opciones.map((op) => {
          const activo = seleccion === op.id;
          return (
            <button
              key={op.id}
              type="button"
              disabled={soloLectura || !onSeleccionar}
              onClick={() => onSeleccionar?.(op.id)}
              className={`flex w-full cursor-pointer items-stretch overflow-hidden rounded-xl border text-left disabled:cursor-not-allowed ${OPCION_TRANS} ${
                activo
                  ? "border-[#0066cc] ring-1 ring-[#0066cc]/25 dark:border-blue-400 dark:ring-blue-400/25"
                  : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
              }`}
            >
              <div
                className={`flex w-12 shrink-0 flex-col items-center justify-center gap-1.5 self-stretch py-3 sm:w-14 ${OPCION_TRANS} ${
                  activo
                    ? "bg-[#0066cc] dark:bg-blue-500"
                    : "bg-[#0066cc]/10 dark:bg-blue-950/35"
                }`}
              >
                <span
                  className={`text-base font-bold ${OPCION_TRANS} ${
                    activo ? "text-white" : EVAL_ACCENT_TEXT
                  }`}
                >
                  {op.letra_calificacion}
                </span>
              </div>

              <div className="flex min-w-0 flex-1 items-center bg-white px-4 py-3 dark:bg-zinc-800">
                <span className="min-w-0 flex-1 text-sm font-bold leading-snug text-zinc-600 dark:text-zinc-300">
                  {op.descripcion}
                </span>
              </div>

              <div
                className={`flex w-12 shrink-0 flex-col items-center justify-center gap-1.5 self-stretch py-3 sm:w-14 ${OPCION_TRANS} ${
                  activo
                    ? "bg-[#0066cc] dark:bg-blue-500"
                    : "bg-[#0066cc]/10 dark:bg-blue-950/35"
                }`}
              >
                <span
                  className={`text-base font-bold tabular-nums leading-none ${OPCION_TRANS} ${
                    activo ? "text-white" : EVAL_ACCENT_TEXT
                  }`}
                >
                  {op.valor_puntuacion}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase leading-none tracking-wide ${OPCION_TRANS} ${
                    activo ? "text-white/90" : EVAL_ACCENT_TEXT
                  }`}
                >
                  pts
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function LlenadoFormulario({
  tipoVista,
  formularioId,
  evaluadoId,
  onVolver,
  inicial,
  evaluadoNombre,
  evaluadoPuesto,
  evaluadoDependencia,
  formularioNombre,
  aspectos,
  soloLectura,
}: {
  tipoVista: TipoVistaEvaluaciones;
  formularioId: string;
  evaluadoId: string;
  onVolver: () => void;
  inicial: Record<string, string>;
  evaluadoNombre: string;
  evaluadoPuesto: string | null;
  evaluadoDependencia: string | null;
  formularioNombre: string;
  aspectos: AspectoFormulario[];
  soloLectura: boolean;
}) {
  const { evaluacion } = useMutacionesEvaluacion();
  const [respuestas, setRespuestas] = useState<Record<string, string>>(inicial);
  const [pasoActual, setPasoActual] = useState(() => {
    const sinResponder = aspectos.findIndex((a) => !inicial[a.id]);
    return sinResponder === -1 ? 0 : sinResponder;
  });
  const [alturaPasoMax, setAlturaPasoMax] = useState(0);
  const medidorPasosRef = useRef<HTMLDivElement>(null);

  const medirAlturaPasos = useCallback(() => {
    const contenedor = medidorPasosRef.current;
    if (!contenedor) return;
    let max = 0;
    for (const hijo of contenedor.children) {
      max = Math.max(max, (hijo as HTMLElement).getBoundingClientRect().height);
    }
    if (max > 0) setAlturaPasoMax(Math.ceil(max));
  }, []);

  useLayoutEffect(() => {
    medirAlturaPasos();
    const contenedor = medidorPasosRef.current;
    if (!contenedor) return;
    const observador = new ResizeObserver(medirAlturaPasos);
    observador.observe(contenedor);
    window.addEventListener("resize", medirAlturaPasos);
    return () => {
      observador.disconnect();
      window.removeEventListener("resize", medirAlturaPasos);
    };
  }, [aspectos, medirAlturaPasos]);

  const totalPasos = aspectos.length;
  const aspecto = aspectos[pasoActual];
  const esPrimero = pasoActual === 0;
  const esUltimo = pasoActual === totalPasos - 1;

  const completados = useMemo(
    () => aspectos.map((a) => Boolean(respuestas[a.id])),
    [aspectos, respuestas],
  );

  const total = useMemo(() => {
    return aspectos.reduce((acc, item) => {
      const opcionId = respuestas[item.id];
      const opcion = item.opciones.find((o) => o.id === opcionId);
      return acc + (opcion?.valor_puntuacion ?? 0);
    }, 0);
  }, [aspectos, respuestas]);

  const enviar = async () => {
    const faltantes = mensajeFaltantesEvaluacion(aspectos, respuestas);
    if (faltantes) {
      toast.warn(faltantes);
      const indice = aspectos.findIndex((item) => !respuestas[item.id]);
      if (indice >= 0) setPasoActual(indice);
      return;
    }

    const values = payloadGuardarEvaluacion(
      formularioId,
      evaluadoId,
      aspectos,
      respuestas,
      true,
    );
    const validado = guardarEvaluacionSchema.safeParse(values);
    if (!validado.success) {
      toast.warn(mensajeErrorZodGuardarEvaluacion(validado.error));
      return;
    }

    const res = await evaluacion.mutateAsync({
      tipoVista,
      values: validado.data,
    });
    if (!res.ok) {
      toast.error(modalActionMessage(res.code, res.message));
      if (res.code === "ASPECTOS_INCOMPLETOS") {
        const indice = aspectos.findIndex((item) => !respuestas[item.id]);
        if (indice >= 0) setPasoActual(indice);
      }
      return;
    }
    await swalExitoEvaluacion(
      "Evaluación enviada",
      "Tu respuesta fue registrada correctamente.",
    );
    onVolver();
  };

  const pasoActualRespondido = completados[pasoActual] ?? false;

  const seleccionables = useMemo(
    () =>
      aspectos.map((_, index) => {
        if (soloLectura) return true;
        if (index <= pasoActual) return true;
        if (index === pasoActual + 1 && pasoActualRespondido) return true;
        return completados[index] ?? false;
      }),
    [aspectos, pasoActual, completados, pasoActualRespondido, soloLectura],
  );

  const irAnterior = () => {
    if (!esPrimero) setPasoActual((p) => p - 1);
  };

  const irSiguiente = () => {
    if (!aspecto || esUltimo) return;
    if (!pasoActualRespondido && !soloLectura) {
      toast.warn("Selecciona una opción para continuar.");
      return;
    }
    setPasoActual((p) => p + 1);
  };

  const seleccionarPaso = (index: number) => {
    if (index === pasoActual) return;
    if (index === pasoActual + 1 && !pasoActualRespondido && !soloLectura) {
      toast.warn("Selecciona una opción para continuar.");
      return;
    }
    if (!seleccionables[index]) {
      toast.warn("Completa los desempeños anteriores antes de continuar.");
      return;
    }
    setPasoActual(index);
  };

  if (!aspecto) {
    return (
      <div className={EVAL_EMPTY}>No hay desempeños configurados en esta evaluación.</div>
    );
  }

  const seleccion = respuestas[aspecto.id];
  const mostrarEnviar = esUltimo && Boolean(seleccion) && !soloLectura;

  return (
    <div className="relative mx-auto flex w-full flex-col">
      <div className="flex flex-col">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 text-center sm:text-left">
            <h2 className="text-xl font-bold tracking-tight text-[#0066cc] dark:text-blue-400 sm:text-2xl">
              {formularioNombre}
            </h2>
            <p className="mt-1.5 text-base font-bold text-zinc-900 dark:text-white sm:text-lg">
              {evaluadoNombre}
            </p>
            {evaluadoPuesto ? (
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                {evaluadoPuesto}
              </p>
            ) : null}
            {evaluadoDependencia ? (
              <p className={`mt-0.5 text-sm font-semibold ${EVAL_ACCENT_TEXT}`}>
                {evaluadoDependencia}
              </p>
            ) : null}
          </div>
          <div className="shrink-0 text-center sm:text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Total acumulado
            </p>
            <p className={`text-2xl font-bold tabular-nums ${EVAL_ACCENT_TEXT}`}>
              {total}
            </p>
          </div>
        </div>
        <div className="flex justify-center py-5 sm:py-6">
          <CintilloInstitucional className={EVAL_CINTILLO_CLASS} />
        </div>
      </div>

      <div
        ref={medidorPasosRef}
        className="pointer-events-none invisible absolute left-0 top-0 -z-10 w-full"
        aria-hidden
      >
        {aspectos.map((item, indice) => (
          <TarjetaAspectoPaso
            key={`medir-${item.id}`}
            aspecto={item}
            indice={indice}
            seleccion={respuestas[item.id]}
            soloLectura={soloLectura}
          />
        ))}
      </div>

      <div
        className="relative w-full"
        style={alturaPasoMax > 0 ? { minHeight: alturaPasoMax } : undefined}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={aspecto.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: PASO_EASE }}
            className="w-full"
          >
            <TarjetaAspectoPaso
              aspecto={aspecto}
              indice={pasoActual}
              seleccion={seleccion}
              soloLectura={soloLectura}
              onSeleccionar={(opcionId) =>
                setRespuestas((prev) => ({
                  ...prev,
                  [aspecto.id]: opcionId,
                }))
              }
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-4 flex flex-col gap-3">
      <EvalPasoTimeline
        total={totalPasos}
        actual={pasoActual}
        completados={completados}
        seleccionables={seleccionables}
        onSeleccionar={seleccionarPaso}
        onAnterior={irAnterior}
        onSiguiente={irSiguiente}
        puedeAnterior={!esPrimero}
        puedeSiguiente={!esUltimo}
        deshabilitado={soloLectura}
      />

      <AnimatePresence>
        {mostrarEnviar ? (
          <motion.div
            key="enviar-evaluacion"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.35, ease: PASO_EASE }}
            className={`${EVAL_SECTION_PAD} flex items-center justify-center border-t border-zinc-200 bg-zinc-50 pt-3 dark:border-zinc-700 dark:bg-zinc-900/40`}
          >
            <button
              type="button"
              disabled={evaluacion.isPending}
              onClick={() => void enviar()}
              className={`${EVAL_TOOLBAR_SAVE_BTN} w-full sm:min-w-[11rem] sm:w-auto`}
            >
              {evaluacion.isPending ? "Enviando…" : "Enviar evaluación"}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {soloLectura && !mostrarEnviar ? (
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
          Enviada
        </p>
      ) : null}
      </div>
    </div>
  );
}

export function FormularioEvaluacion({
  tipoVista,
  formularioId,
  evaluadoId,
  onVolver,
}: Props) {
  const { data, isLoading } = useParaLlenar(tipoVista, formularioId, evaluadoId);

  if (isLoading) return <Cargando texto="Cargando evaluación..." />;
  if (!data) {
    return (
      <div className={EVAL_EMPTY}>
        No se encontró esta evaluación o no tienes permiso para llenarla.
      </div>
    );
  }

  return (
    <LlenadoFormulario
      key={`${data.evaluacion_id ?? "nueva"}-${Object.keys(data.respuestas).length}`}
      tipoVista={tipoVista}
      formularioId={data.formulario.id}
      evaluadoId={data.evaluado_id}
      onVolver={onVolver}
      inicial={data.respuestas}
      evaluadoNombre={data.evaluado_nombre}
      evaluadoPuesto={data.evaluado_puesto}
      evaluadoDependencia={data.evaluado_dependencia}
      formularioNombre={data.formulario.nombre}
      aspectos={data.formulario.aspectos}
      soloLectura={data.esta_completada}
    />
  );
}
