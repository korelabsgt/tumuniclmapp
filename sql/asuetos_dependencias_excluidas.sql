-- ================================================
-- Exclusiones de dependencias en asuetos
-- Un asueto aplica a todo el personal EXCEPTO
-- usuarios cuya dependencia (o ancestro) esté excluida.
-- ================================================

ALTER TABLE public.asuetos
  ADD COLUMN IF NOT EXISTS dependencias_excluidas UUID[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.asuetos.dependencias_excluidas IS
  'IDs de dependencias excluidas del asueto. Usuarios bajo esa dependencia (o descendientes) no ven el asueto.';
