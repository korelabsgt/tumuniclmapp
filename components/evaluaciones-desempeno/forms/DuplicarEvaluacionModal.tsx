"use client";

import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "react-toastify";
import {
  ModalCancel,
  ModalFooter,
  ModalInput,
  ModalShell,
  ModalSubmit,
} from "@/components/ui/general-modal";
import { modalActionMessage } from "@/components/ui/modal-toast";
import { useMutacionesEvaluacion } from "../lib/hooks";
import { formatearRangoVigencia } from "../lib/fechas";
import {
  EVAL_DETAIL_FIELD,
  EVAL_DETAIL_FIELD_LABEL,
  EVAL_DETAIL_FIELD_VALUE,
  EVAL_SECTION_CARD,
  EVAL_SECTION_HEAD,
  EVAL_SECTION_TITLE,
} from "../lib/ui";
import type { EvaluacionPlantilla } from "../lib/zod";

type Props = {
  open: boolean;
  evaluacion: EvaluacionPlantilla | null;
  onClose: () => void;
  onExito?: (id: string, nombre: string) => void;
};

export function DuplicarEvaluacionModal({
  open,
  evaluacion,
  onClose,
  onExito,
}: Props) {
  const { duplicar } = useMutacionesEvaluacion();
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  useEffect(() => {
    if (!open || !evaluacion) return;
    setFechaInicio(evaluacion.fecha_inicio);
    setFechaFin(evaluacion.fecha_fin);
  }, [open, evaluacion]);

  const cerrar = () => {
    onClose();
  };

  return (
    <ModalShell
      open={open}
      onClose={cerrar}
      title="Duplicar evaluación"
      subtitle="Evaluaciones de desempeño"
      footer={
        <ModalFooter>
          <ModalCancel disabled={duplicar.isPending} onClick={cerrar} />
          <ModalSubmit
            form="duplicar-evaluacion-form"
            disabled={duplicar.isPending || !evaluacion}
          >
            {duplicar.isPending ? "Duplicando…" : "Duplicar evaluación"}
          </ModalSubmit>
        </ModalFooter>
      }
    >
      <form
        id="duplicar-evaluacion-form"
        className="flex flex-col gap-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!evaluacion) return;
          if (fechaFin < fechaInicio) {
            toast.warn(
              "La fecha de finalización debe ser igual o posterior al inicio.",
            );
            return;
          }
          const res = await duplicar.mutateAsync({
            id: evaluacion.id,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
          });
          if (!res.ok) {
            toast.error(modalActionMessage(res.code, res.message));
            return;
          }
          toast.success("Evaluación duplicada correctamente.");
          cerrar();
          if (res.id) {
            onExito?.(res.id, `${evaluacion.nombre} (copia)`);
          }
        }}
      >
        <section className={EVAL_SECTION_CARD}>
          <div className={EVAL_SECTION_HEAD}>
            <h3 className={EVAL_SECTION_TITLE}>Evaluación origen</h3>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-[#0066cc] dark:border-zinc-600 dark:bg-zinc-900 dark:text-blue-400">
              <Copy className="h-4 w-4" />
            </span>
          </div>
          <div className="flex flex-col gap-3 p-4 sm:p-5">
            <div className={EVAL_DETAIL_FIELD}>
              <p className={EVAL_DETAIL_FIELD_LABEL}>Nombre</p>
              <p className={EVAL_DETAIL_FIELD_VALUE}>
                {evaluacion?.nombre ?? "—"}
              </p>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Se copiarán todos los desempeños, niveles y descripciones. La copia
              quedará inactiva y servirá para autoevaluación, evaluación al jefe
              y evaluación de subordinados según quién la llene.
            </p>
          </div>
        </section>

        <section className={EVAL_SECTION_CARD}>
          <div className={EVAL_SECTION_HEAD}>
            <h3 className={EVAL_SECTION_TITLE}>Vigencia de la copia</h3>
          </div>
          <div className="flex flex-col gap-4 p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className={EVAL_DETAIL_FIELD}>
                <label
                  htmlFor="duplicar-eval-inicio"
                  className={EVAL_DETAIL_FIELD_LABEL}
                >
                  Fecha de inicio
                </label>
                <ModalInput
                  id="duplicar-eval-inicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div className={EVAL_DETAIL_FIELD}>
                <label
                  htmlFor="duplicar-eval-fin"
                  className={EVAL_DETAIL_FIELD_LABEL}
                >
                  Fecha de finalización
                </label>
                <ModalInput
                  id="duplicar-eval-fin"
                  type="date"
                  value={fechaFin}
                  min={fechaInicio || undefined}
                  onChange={(e) => setFechaFin(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            {fechaInicio && fechaFin && fechaFin >= fechaInicio ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-[#0066cc] dark:border-blue-800/80 dark:bg-blue-950/30 dark:text-blue-400">
                Vigencia: {formatearRangoVigencia(fechaInicio, fechaFin)}
              </div>
            ) : null}
          </div>
        </section>
      </form>
    </ModalShell>
  );
}
