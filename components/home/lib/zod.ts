import { z } from 'zod';

// Schema para validar el formulario de configuración del portal
// Nota: portada_url y logo_url son paths de Supabase Storage (ej: "1234-abc.jpg"),
// no URLs completas, por eso se validan como strings simples.
export const configuracionPortalSchema = z.object({
  eslogan: z
    .string()
    .max(200, 'El eslogan no puede superar los 200 caracteres')
    .optional()
    .nullable(),

  portada_url: z
    .string()
    .optional()
    .nullable(),

  logo_url: z
    .string()
    .optional()
    .nullable(),
});

export type ConfiguracionPortalForm = z.infer<typeof configuracionPortalSchema>;

// Función helper para validar y retornar errores legibles
export function validarConfiguracionPortal(data: unknown):
  | { success: true; data: ConfiguracionPortalForm }
  | { success: false; errores: Record<string, string> } {
  const result = configuracionPortalSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errores: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const campo = issue.path[0]?.toString() ?? 'general';
    errores[campo] = issue.message;
  }

  return { success: false, errores };
}

// ─── Politicas ───────────────────────────────────────────────────────────────

export const politicaSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre de la política es obligatorio')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
});

export type PoliticaForm = z.infer<typeof politicaSchema>;

export function validarPolitica(data: unknown):
  | { success: true; data: PoliticaForm }
  | { success: false; errores: Record<string, string> } {
  const result = politicaSchema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  const errores: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const campo = issue.path[0]?.toString() ?? 'general';
    errores[campo] = issue.message;
  }
  return { success: false, errores };
}

// ─── Publicaciones ────────────────────────────────────────────────────────────

export const publicacionSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El título es obligatorio')
    .max(200, 'El título no puede superar los 200 caracteres'),

  descripcion: z
    .string()
    .min(1, 'La descripción es obligatoria'),

  año: z
    .number()
    .int()
    .min(2000, 'El año debe ser válido')
    .max(2100, 'El año debe ser válido'),

  orden: z
    .number()
    .int()
    .min(0)
    .default(0),

  politica_id: z
    .string()
    .uuid()
    .optional()
    .nullable(),

  imagenes: z.any().optional().nullable(),
  documentos: z.any().optional().nullable(),
  grafica_data: z.any().optional().nullable(),
});

export type PublicacionForm = z.infer<typeof publicacionSchema>;

export function validarPublicacion(data: unknown):
  | { success: true; data: PublicacionForm }
  | { success: false; errores: Record<string, string> } {
  const result = publicacionSchema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  const errores: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const campo = issue.path[0]?.toString() ?? 'general';
    errores[campo] = issue.message;
  }
  return { success: false, errores };
}
