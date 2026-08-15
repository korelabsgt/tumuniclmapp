import { ACCION_ERRORES } from "@/components/evaluaciones-desempeno/lib/zod";

export const MODAL_ACTION_ERRORS: Record<string, string> = {
  ...ACCION_ERRORES,
};

export function modalActionMessage(code: string, fallback: string): string {
  const mensaje = fallback.trim();
  if (mensaje) return mensaje;
  return MODAL_ACTION_ERRORS[code] ?? "No se pudo completar la acción.";
}
