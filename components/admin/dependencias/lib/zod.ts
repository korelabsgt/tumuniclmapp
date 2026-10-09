import { z } from "zod";

export const copiarDependenciasAnioSchema = z
  .object({
    anioOrigen: z.number().int().min(2000).max(2100),
    anioDestino: z.number().int().min(2000).max(2100),
  })
  .refine((v) => v.anioDestino !== v.anioOrigen, {
    message: "El año destino debe ser distinto al de origen.",
  });

export const copiarDependenciasPasoSchema = z
  .object({
    anioOrigen: z.number().int().min(2000).max(2100),
    anioDestino: z.number().int().min(2000).max(2100),
    fase: z.enum(["preparar", "estructura", "asignaciones"]),
    nivel: z.number().int().min(0).optional(),
    mapaIds: z.record(z.string(), z.string()).optional(),
  })
  .refine((v) => v.anioDestino !== v.anioOrigen, {
    message: "El año destino debe ser distinto al de origen.",
  });

export type CopiarDependenciasAnioValues = z.infer<
  typeof copiarDependenciasAnioSchema
>;

export const COPIAR_ANIO_ERRORES = {
  NO_SESION: "Inicie sesión para continuar.",
  NO_PERMITIDO: "No tiene permiso para copiar la organización.",
  DATOS_INVALIDOS: "Los años indicados no son válidos.",
  ORIGEN_VACIO: "No hay dependencias en el año de origen.",
  DESTINO_OCUPADO: "El año destino ya tiene dependencias. No se puede duplicar sobre un año ocupado.",
  ERROR_LECTURA: "No se pudieron leer las dependencias de origen.",
  ERROR_ESTRUCTURA: "No se pudo copiar la estructura de dependencias.",
  ERROR_ASIGNACIONES: "La estructura se copió, pero no se pudieron copiar las personas asignadas.",
  ERROR_COPIA: "No se pudo duplicar la organización.",
} as const;

export type CopiarAnioError = {
  ok: false;
  code: keyof typeof COPIAR_ANIO_ERRORES;
  message: string;
};

export type CopiarAnioPasoOk =
  | {
      ok: true;
      fase: "preparar";
      mapaIds: Record<string, string>;
      niveles: number;
      total: number;
    }
  | {
      ok: true;
      fase: "estructura";
      nivel: number;
      niveles: number;
    }
  | {
      ok: true;
      fase: "asignaciones";
      copiadas: number;
      asignadas: number;
    };

export type CopiarAnioPasoResultado = CopiarAnioPasoOk | CopiarAnioError;

export type CopiarAnioResultado =
  | { ok: true; copiadas: number; asignadas: number }
  | CopiarAnioError;
