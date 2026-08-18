-- Fecha en que la actividad se marcó como Completado (no se actualiza en otros cambios).
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.tasks.updated_at IS 'Instante en que la actividad pasó a estado Completado.';
