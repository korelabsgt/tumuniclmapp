-- ================================================
-- 🗓️ TABLA DE ASUETOS GLOBALES
-- Aplica a todo el personal salvo dependencias excluidas
-- Solo RRHH puede crear/editar/eliminar asuetos
-- ================================================

CREATE TABLE IF NOT EXISTS public.asuetos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  dependencias_excluidas UUID[] NOT NULL DEFAULT '{}',
  creado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice por fecha para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_asuetos_fecha_inicio ON public.asuetos (fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_asuetos_fecha_fin ON public.asuetos (fecha_fin);

-- Habilitar RLS
ALTER TABLE public.asuetos ENABLE ROW LEVEL SECURITY;

-- Política: todos los usuarios autenticados pueden leer
CREATE POLICY "asuetos_select_authenticated"
ON public.asuetos
FOR SELECT
TO authenticated
USING (true);

-- Política: solo pueden insertar/actualizar/eliminar usuarios RRHH, SECRETARIO, SUPER
-- Esta verificación se hace en el servidor (Server Actions), la política permite a autenticados
CREATE POLICY "asuetos_all_authenticated"
ON public.asuetos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
