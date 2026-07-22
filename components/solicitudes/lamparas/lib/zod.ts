import { z } from "zod";

// Schema principal para solicitudes de lámparas (lectura desde solicitudes_municipales)
export const solicitudLamparaSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string(),
  tipo_solicitud: z.literal("lamparas"),
  estado: z.enum(["pendiente", "completado", "en_revision"]),
  fecha_solicitud: z.string().nullable(),
  fecha_terminado: z.string().nullable(),

  // Quién reportó / creó la solicitud (la recepcionista)
  solicitante_uid: z.string().uuid().nullable(),
  solicitante: z
    .object({
      nombre: z.string(),
    })
    .nullable()
    .optional(),

  // Jefe que aprobó (si aplica)
  aprobado_jefe_uid: z.string().uuid().nullable(),

  // Electricista asignado
  asignado_a_uid: z.string().uuid().nullable(),
  asignado: z
    .object({
      nombre: z.string(),
    })
    .nullable()
    .optional(),

  // Datos del reporte ciudadano
  telefono_contacto: z.string().nullable(),
  nombre_responsable: z.string().nullable(),
  ubicacion: z.string().nullable(),
  cantidad_elementos: z.number().nullable(),
  comentarios: z.string().nullable(),
  checklists: z.any().nullable(), // jsonb
  fecha_inicio: z.string().nullable(),
  fecha_fin: z.string().nullable(),
  aldea: z.string().nullable(),
  caserio: z.string().nullable(),
});

export type SolicitudLampara = z.infer<typeof solicitudLamparaSchema>;

// Schema para la creación de una solicitud
export const crearSolicitudLamparaSchema = z.object({
  nombre_responsable: z
    .string()
    .min(1, "El nombre del responsable es requerido"),
  telefono_contacto: z.string().optional(),
  ubicacion: z.string().min(1, "La ubicación es requerida"),
  cantidad_elementos: z.number().min(1, "La cantidad debe ser al menos 1"),
  comentarios: z.string().optional(),
  asignado_a_uid: z.string().uuid().optional().or(z.literal("")),
  checklists: z
    .object({
      cambio_bombilla: z.boolean().default(false),
      revision_lampara: z.boolean().default(false),
      cambio_lampara: z.boolean().default(false),
      lampara_nueva: z.boolean().default(false),
    })
    .optional(),
  aldea: z.string().optional(),
  caserio: z.string().optional(),
});

export type CrearSolicitudLamparaValues = z.infer<
  typeof crearSolicitudLamparaSchema
>;
