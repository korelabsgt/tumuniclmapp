-- Varios puntos pueden apuntar a la misma actividad.
-- es_origen = true: punto donde nació. Borrar ese punto elimina la actividad.
-- es_origen = false: revisión. Borrar ese punto solo quita el enlace.

ALTER TABLE public.tareas_concejo_actividades
  ADD COLUMN IF NOT EXISTS es_origen boolean NOT NULL DEFAULT true;

ALTER TABLE public.tareas_concejo_actividades
  DROP CONSTRAINT IF EXISTS tareas_concejo_actividades_task_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tca_task_punto
  ON public.tareas_concejo_actividades (task_id, tarea_concejo_id);
