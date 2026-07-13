-- Modalidades de días en acuerdos municipales (campo dias JSONB en permisos_empleado)
--
-- 1) null / vacío: todos los días del rango inicio-fin
-- 2) { "modo": "recurrente", "diasSemana": [1,3], "fechas": ["2026-06-01", ...] }
--    Días fijos cada semana; fechas se generan automáticamente en el rango
-- 3) { "modo": "semanal", "cupoSemanal": 2, "semanas": { "2026-W24": ["2026-06-09"] }, "historial": [] }
--    El empleado elige N días por semana; cambios anteriores quedan en historial
--
-- Legacy: array [0,1,2] de días de semana (0=domingo) sigue soportado

ALTER TABLE public.permisos_empleado
ADD COLUMN IF NOT EXISTS dias JSONB;
