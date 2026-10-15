CREATE TABLE IF NOT EXISTS public.actividades_concejo_mensajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  evento TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  leido_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_actividades_concejo_mensajes_user_pendiente
  ON public.actividades_concejo_mensajes (user_id, created_at)
  WHERE leido_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_actividades_concejo_mensajes_task_id
  ON public.actividades_concejo_mensajes (task_id);

ALTER TABLE public.actividades_concejo_mensajes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS actividades_concejo_mensajes_select_propio ON public.actividades_concejo_mensajes;
DROP POLICY IF EXISTS actividades_concejo_mensajes_update_propio ON public.actividades_concejo_mensajes;

CREATE POLICY actividades_concejo_mensajes_select_propio
  ON public.actividades_concejo_mensajes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY actividades_concejo_mensajes_update_propio
  ON public.actividades_concejo_mensajes
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
