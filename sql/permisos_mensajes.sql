CREATE TABLE IF NOT EXISTS public.permisos_mensajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permiso_id UUID NOT NULL REFERENCES public.permisos_empleado(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  evento TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  leido_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_permisos_mensajes_user_pendiente
  ON public.permisos_mensajes (user_id, created_at)
  WHERE leido_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_permisos_mensajes_permiso_id
  ON public.permisos_mensajes (permiso_id);

ALTER TABLE public.permisos_mensajes ENABLE ROW LEVEL SECURITY;

CREATE POLICY permisos_mensajes_select_authenticated ON public.permisos_mensajes
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY permisos_mensajes_update_authenticated ON public.permisos_mensajes
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
