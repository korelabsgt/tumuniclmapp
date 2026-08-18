'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import type { ActividadConcejo } from '@/components/concejo/agenda/lib/esquemas';
import {
  editarActividadConcejo,
} from '@/components/concejo/agenda/tareas/lib/actividades';
import { componerBitacoraActividad, formatearFechaBitacora } from '@/components/concejo/agenda/tareas/lib/bitacora';
import {
  ModalCancel,
  ModalFooter,
  ModalInput,
  ModalLabel,
  ModalShell,
  ModalSubmit,
  ModalTextarea,
} from '@/components/ui/general-modal';

const formatearFechaInput = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const enviarPushEncargado = async (titulo: string, mensaje: string, userId: string) => {
  try {
    await fetch('/api/push/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: titulo,
        message: mensaje,
        url: '/protected/actividades',
        targetIds: [userId],
      }),
    });
  } catch (e) {
    console.error('Error enviando push de actividad:', e);
  }
};

type EditarActividadModalProps = {
  open: boolean;
  actividad: ActividadConcejo | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function EditarActividadModal({
  open,
  actividad,
  onClose,
  onSaved,
}: EditarActividadModalProps) {
  const [title, setTitle] = useState('');
  const [notaNueva, setNotaNueva] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open || !actividad) return;
    setTitle(actividad.title);
    setNotaNueva('');
    setDueDate(formatearFechaInput(actividad.due_date));
  }, [open, actividad]);

  const guardar = async () => {
    if (!actividad) return;
    if (!title.trim() || !dueDate) {
      toast.warn('Completa el título y la fecha de la actividad.');
      return;
    }
    if (!actividad.assigned_to) {
      toast.warn('La actividad no tiene encargado asignado.');
      return;
    }

    const fechaAnterior = formatearFechaInput(actividad.due_date);
    if (fechaAnterior !== dueDate && new Date(dueDate) < new Date()) {
      toast.warn('La fecha límite no puede quedar en el pasado.');
      return;
    }

    setGuardando(true);
    try {
      const dueIso = new Date(dueDate).toISOString();
      const cambios: string[] = [];
      if (fechaAnterior !== dueDate) {
        cambios.push(
          `Fecha límite: ${formatearFechaBitacora(actividad.due_date)} → ${formatearFechaBitacora(dueIso)}`,
        );
      }

      const description = componerBitacoraActividad({
        nota: notaNueva,
        anterior: actividad.description,
        cambios,
      });

      await editarActividadConcejo(actividad.id, {
        title: title.trim(),
        description,
        due_date: dueIso,
        assigned_to: actividad.assigned_to,
      });

      await enviarPushEncargado(
        '📋 Actividad actualizada',
        `Se actualizó la actividad del Concejo: "${title.trim()}".`,
        actividad.assigned_to,
      );

      toast.success('Actividad actualizada.');
      onSaved();
      onClose();
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'Error al guardar la actividad.';
      toast.error(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Editar actividad"
      subtitle={actividad?.title}
      footer={
        <ModalFooter>
          <ModalCancel onClick={onClose} disabled={guardando}>
            Cancelar
          </ModalCancel>
          <ModalSubmit type="button" onClick={() => void guardar()} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </ModalSubmit>
        </ModalFooter>
      }
    >
      <div className="space-y-4">
        <div>
          <ModalLabel htmlFor="actividad-titulo">Título de la actividad</ModalLabel>
          <ModalInput
            id="actividad-titulo"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <ModalLabel htmlFor="actividad-fecha">Fecha límite</ModalLabel>
          <ModalInput
            id="actividad-fecha"
            type="datetime-local"
            value={dueDate}
            onChange={(e) => {
              const valor = e.target.value;
              const original = actividad ? formatearFechaInput(actividad.due_date) : '';
              if (valor !== original && new Date(valor) < new Date()) {
                toast.warn('La fecha límite no puede quedar en el pasado.');
                return;
              }
              setDueDate(valor);
            }}
            className="dark:[color-scheme:dark]"
          />
        </div>

        <div>
          <ModalLabel htmlFor="actividad-asignado">Asignado a</ModalLabel>
          <ModalInput
            id="actividad-asignado"
            value={actividad?.assignee_nombre || ''}
            readOnly
            disabled
          />
        </div>

        <div>
          <ModalLabel htmlFor="actividad-descripcion">Nueva nota</ModalLabel>
          <ModalTextarea
            id="actividad-descripcion"
            value={notaNueva}
            onChange={(e) => setNotaNueva(e.target.value)}
            rows={4}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Al guardar se agrega sola la fecha y hora actual, como bitácora.
          </p>
          {actividad?.description?.trim() ? (
            <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900/70">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Bitácora
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                {actividad.description}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </ModalShell>
  );
}
