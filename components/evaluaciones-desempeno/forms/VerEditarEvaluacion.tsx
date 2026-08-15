"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BarChart3, ClipboardList, Pencil } from "lucide-react";
import { toast } from "react-toastify";
import { Switch } from "@/components/ui/Switch";
import { modalActionMessage } from "@/components/ui/modal-toast";
import { cn } from "@/lib/utils";
import {
  EVAL_DETAIL_FIELD_LABEL,
  EVAL_DETAIL_FIELD_VALUE,
  EVAL_EDIT_BTN,
  EVAL_FOOTER_ACTION_W,
  EVAL_FOOTER_DELETE,
  EVAL_FOOTER_STATUS,
  EVAL_FOOTER_STATUS_ACTIVE,
  EVAL_FOOTER_STATUS_INACTIVE,
  EVAL_SECTION_CARD,
  EVAL_SECTION_HEAD,
  EVAL_SECTION_TITLE,
} from "../lib/ui";
import { useMutacionesEvaluacion } from "../lib/hooks";
import { confirmarEliminarEvaluacion } from "../lib/confirmarEliminacion";
import { formatearFechaCorta, formularioEnVigencia } from "../lib/fechas";
import Cargando from "@/components/ui/animations/Cargando";
import { EvalTabBar } from "../EvalTabBar";
import { TablaResultadosPorDependencia } from "../TablaResultadosPorDependencia";
import {
  type EvaluacionPlantilla,
  type ResultadoPersona,
} from "../lib/zod";
import { DesempenosEditor } from "./DesempenosEditor";
import { EvaluacionFormModal } from "./EvaluacionFormModal";

type PestanaDetalle = "plantilla" | "resultados";

type Props = {
  evaluacion: EvaluacionPlantilla;
  onVolver: () => void;
  onNombreActualizado?: (id: string, nombre: string) => void;
  resultados?: ResultadoPersona[];
  loadingResultados?: boolean;
  onSeleccionarResultado?: (resultado: ResultadoPersona) => void;
};

function FilaDato({
  etiqueta,
  valor,
  className,
  valorClassName,
}: {
  etiqueta: string;
  valor: string;
  className?: string;
  valorClassName?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <p className={EVAL_DETAIL_FIELD_LABEL}>{etiqueta}</p>
      <p className={cn(EVAL_DETAIL_FIELD_VALUE, valorClassName)}>{valor}</p>
    </div>
  );
}

export function VerEditarEvaluacion({
  evaluacion,
  onVolver,
  onNombreActualizado,
  resultados = [],
  loadingResultados = false,
  onSeleccionarResultado,
}: Props) {
  const params = useSearchParams();

  const { eliminar, cambiarActivo } = useMutacionesEvaluacion();
  const [modalDatos, setModalDatos] = useState(false);
  const [activoLocal, setActivoLocal] = useState(evaluacion.activo);

  const tieneResultados = !loadingResultados && resultados.length > 0;

  const pestanaInicial = useMemo((): PestanaDetalle => {
    const desdeUrl = params.get("pestana");
    if (desdeUrl === "plantilla") return "plantilla";
    if (desdeUrl === "resultados" && tieneResultados) return "resultados";
    return tieneResultados ? "resultados" : "plantilla";
  }, [params, tieneResultados]);

  const [pestana, setPestana] = useState<PestanaDetalle>(pestanaInicial);

  useEffect(() => {
    setActivoLocal(evaluacion.activo);
  }, [evaluacion.id]);

  useEffect(() => {
    setPestana(pestanaInicial);
  }, [evaluacion.id, pestanaInicial]);

  const pestanas = useMemo(() => {
    const plantilla = {
      id: "plantilla" as const,
      label: "Plantilla",
      icon: <ClipboardList className="h-4 w-4 shrink-0" />,
    };
    if (!tieneResultados) return [plantilla];
    return [
      {
        id: "resultados" as const,
        label: "Resultados",
        icon: <BarChart3 className="h-4 w-4 shrink-0" />,
        count: resultados.length,
      },
      plantilla,
    ];
  }, [resultados.length, tieneResultados]);

  const bloqueado = evaluacion.tiene_respuestas;
  const enVigencia = formularioEnVigencia(
    evaluacion.fecha_inicio,
    evaluacion.fecha_fin,
  );

  const toggleActivo = async (activo: boolean) => {
    if (cambiarActivo.isPending) return;
    const anterior = activoLocal;
    setActivoLocal(activo);
    const res = await cambiarActivo.mutateAsync({
      id: evaluacion.id,
      activo,
    });
    if (!res.ok) {
      setActivoLocal(anterior);
      toast.error(modalActionMessage(res.code, res.message));
      return;
    }
    toast.success(activo ? "Evaluación activada." : "Evaluación desactivada.");
  };

  const estadoTexto = activoLocal
    ? enVigencia
      ? "Activa"
      : "Activa, fuera de fechas"
    : "Inactiva";

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-0">
      {pestanas.length > 1 ? (
        <EvalTabBar
          tabs={pestanas}
          active={pestana}
          onChange={(id) => setPestana(id as PestanaDetalle)}
        />
      ) : null}

      {pestana === "plantilla" ? (
        <>
          <section className={EVAL_SECTION_CARD}>
            <div className={EVAL_SECTION_HEAD}>
              <h3 className={EVAL_SECTION_TITLE}>Datos de la evaluación</h3>
              <button
                type="button"
                onClick={() => setModalDatos(true)}
                className={EVAL_EDIT_BTN}
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </button>
            </div>
            <div className="flex flex-col gap-4 p-4 sm:p-5">
              {activoLocal && !enVigencia ? (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  No aparecerá en pendientes hasta estar dentro del rango de fechas.
                </p>
              ) : null}
              <div className="flex flex-col gap-4">
                <FilaDato
                  etiqueta="Nombre"
                  valor={evaluacion.nombre}
                  valorClassName="text-lg font-bold text-zinc-900 dark:text-white sm:text-xl"
                />
                <div className="flex items-end justify-between gap-4">
                  <FilaDato
                    etiqueta="Inicio"
                    valor={formatearFechaCorta(evaluacion.fecha_inicio)}
                  />
                  <FilaDato
                    className="items-end text-right"
                    etiqueta="Fin"
                    valor={formatearFechaCorta(evaluacion.fecha_fin)}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className={EVAL_SECTION_CARD}>
            <DesempenosEditor evaluacion={evaluacion} bloqueado={bloqueado} />
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              disabled={bloqueado || eliminar.isPending}
              onClick={async () => {
                const confirmado = await confirmarEliminarEvaluacion(
                  "Se eliminará esta evaluación y todos sus desempeños. Esta acción no se puede deshacer.",
                );
                if (!confirmado) return;
                const res = await eliminar.mutateAsync(evaluacion.id);
                if (!res.ok) {
                  toast.error(modalActionMessage(res.code, res.message));
                  return;
                }
                toast.success("Evaluación eliminada.");
                onVolver();
              }}
              className={`${EVAL_FOOTER_ACTION_W} ${EVAL_FOOTER_DELETE}`}
            >
              Eliminar evaluación
            </button>

            <div
              className={cn(
                EVAL_FOOTER_ACTION_W,
                EVAL_FOOTER_STATUS,
                activoLocal
                  ? EVAL_FOOTER_STATUS_ACTIVE
                  : EVAL_FOOTER_STATUS_INACTIVE,
                cambiarActivo.isPending && "opacity-70",
              )}
            >
              <p
                className={cn(
                  "min-w-0 truncate text-xs font-bold uppercase tracking-wide transition-colors duration-300",
                  activoLocal
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-zinc-500 dark:text-zinc-400",
                )}
              >
                {estadoTexto}
              </p>
              <Switch
                checked={activoLocal}
                disabled={cambiarActivo.isPending}
                onCheckedChange={(checked) => void toggleActivo(checked)}
                className="h-6 w-11 shrink-0 transition-colors duration-300 ease-out data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-red-400/80 dark:data-[state=checked]:bg-emerald-400 dark:data-[state=unchecked]:bg-red-400/70 [&>span]:transition-transform [&>span]:duration-300 [&>span]:ease-out"
              />
            </div>
          </div>
        </>
      ) : loadingResultados ? (
        <Cargando texto="Cargando resultados..." />
      ) : (
        <TablaResultadosPorDependencia
          resultados={resultados}
          onSeleccionar={(resultado) => onSeleccionarResultado?.(resultado)}
        />
      )}

      <EvaluacionFormModal
        open={modalDatos}
        onClose={() => setModalDatos(false)}
        evaluacion={evaluacion}
        onExito={onNombreActualizado}
      />
    </div>
  );
}
