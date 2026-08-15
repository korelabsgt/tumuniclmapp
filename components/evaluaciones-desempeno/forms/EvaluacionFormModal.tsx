"use client";

import { useEffect, useState } from "react";
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
import { hoyCalendarioGT } from "../lib/fechas";
import { EVAL_DETAIL_FIELD_LABEL } from "../lib/ui";
import type { EvaluacionPlantilla } from "../lib/zod";

type Props = {
  open: boolean;
  onClose: () => void;
  evaluacion?: EvaluacionPlantilla | null;
  onExito?: (id: string, nombre: string) => void;
};

export function EvaluacionFormModal({
  open,
  onClose,
  evaluacion = null,
  onExito,
}: Props) {
  const esEdicion = Boolean(evaluacion);
  const { crear, actualizar } = useMutacionesEvaluacion();
  const [nombre, setNombre] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  useEffect(() => {
    if (!open) return;
    if (evaluacion) {
      setNombre(evaluacion.nombre);
      setFechaInicio(evaluacion.fecha_inicio);
      setFechaFin(evaluacion.fecha_fin);
      return;
    }
    const hoy = hoyCalendarioGT();
    setNombre("");
    setFechaInicio(hoy);
    setFechaFin(hoy);
  }, [open, evaluacion]);

  const pendiente = esEdicion ? actualizar.isPending : crear.isPending;

  const cerrar = () => {
    onClose();
  };

  return (
    <ModalShell
      open={open}
      onClose={cerrar}
      title={esEdicion ? "Editar evaluación" : "Nueva evaluación"}
      subtitle="Evaluaciones de desempeño"
      footer={
        <ModalFooter>
          <ModalCancel disabled={pendiente} onClick={cerrar} />
          <ModalSubmit form="evaluacion-form-modal" disabled={pendiente}>
            {pendiente
              ? "Guardando…"
              : esEdicion
                ? "Guardar cambios"
                : "Crear evaluación"}
          </ModalSubmit>
        </ModalFooter>
      }
    >
      <form
        id="evaluacion-form-modal"
        className="flex flex-col gap-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (fechaFin < fechaInicio) {
            toast.warn(
              "La fecha de finalización debe ser igual o posterior al inicio.",
            );
            return;
          }

          if (esEdicion && evaluacion) {
            const res = await actualizar.mutateAsync({
              id: evaluacion.id,
              nombre,
              fecha_inicio: fechaInicio,
              fecha_fin: fechaFin,
            });
            if (!res.ok) {
              toast.error(modalActionMessage(res.code, res.message));
              return;
            }
            toast.success("Evaluación actualizada.");
            cerrar();
            onExito?.(evaluacion.id, nombre);
            return;
          }

          const res = await crear.mutateAsync({
            nombre,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
          });
          if (!res.ok) {
            toast.error(modalActionMessage(res.code, res.message));
            return;
          }
          toast.success("Evaluación creada. Agrega los desempeños a evaluar.");
          cerrar();
          if (res.id) onExito?.(res.id, nombre);
        }}
      >
        <div>
          <label
            htmlFor="eval-modal-nombre"
            className={EVAL_DETAIL_FIELD_LABEL}
          >
            Nombre
          </label>
          <ModalInput
            id="eval-modal-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="mt-2 border border-zinc-300 bg-white shadow-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="eval-modal-inicio"
              className={EVAL_DETAIL_FIELD_LABEL}
            >
              Fecha de inicio
            </label>
            <ModalInput
              id="eval-modal-inicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              required
              className="mt-2 border border-zinc-300 bg-white shadow-sm dark:border-zinc-600 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label
              htmlFor="eval-modal-fin"
              className={EVAL_DETAIL_FIELD_LABEL}
            >
              Fecha de finalización
            </label>
            <ModalInput
              id="eval-modal-fin"
              type="date"
              value={fechaFin}
              min={fechaInicio || undefined}
              onChange={(e) => setFechaFin(e.target.value)}
              required
              className="mt-2 border border-zinc-300 bg-white shadow-sm dark:border-zinc-600 dark:bg-zinc-900"
            />
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
