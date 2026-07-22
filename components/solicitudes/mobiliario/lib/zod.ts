import { z } from 'zod';

// Schema principal para solicitudes de mobiliario (lectura desde solicitudes_municipales)
export const solicitudMobiliarioSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string(),
  tipo_solicitud: z.literal('mobiliario'),
  estado: z.enum(['pendiente', 'completado', 'en_revision']),
  fecha_solicitud: z.string().nullable(),
  fecha_terminado: z.string().nullable(),

  // Quién reportó / creó la solicitud (la recepcionista)
  solicitante_uid: z.string().uuid().nullable(),
  solicitante: z.object({
    nombre: z.string(),
  }).nullable().optional(),

  // Jefe que aprobó (si aplica)
  aprobado_jefe_uid: z.string().uuid().nullable(),

  // Operario asignado
  asignado_a_uid: z.string().uuid().nullable(),
  asignado: z.object({
    nombre: z.string(),
  }).nullable().optional(),

  // Datos del reporte ciudadano
  telefono_contacto: z.string().nullable(),
  nombre_responsable: z.string().nullable(),
  ubicacion: z.string().nullable(),
  cantidad_elementos: z.number().nullable(),
  comentarios: z.string().nullable(),
  checklists: z.any().nullable(), // jsonb
  fecha_inicio: z.string().nullable(),
  fecha_fin: z.string().nullable(),
  aldea: z.string().nullable().optional(),
  caserio: z.string().nullable().optional(),
});

export type SolicitudMobiliario = z.infer<typeof solicitudMobiliarioSchema>;

// Schema para la creación de una solicitud
export const crearSolicitudMobiliarioSchema = z.object({
    nombre_responsable: z.string().min(1, "El nombre es requerido"),
    telefono_contacto: z.string().optional(),
    ubicacion: z.string().min(1, "La ubicación es requerida"),
    fecha_inicio: z.string().min(1, "La fecha de inicio es requerida"),
    fecha_fin: z.string().optional(),
    aldea: z.string().optional(),
    caserio: z.string().optional(),
    checklists: z.object({
        items: z.array(z.object({
            cantidad: z.coerce.number().int().min(1),
            descripcion: z.string().min(1)
        })).min(1, "Debe agregar al menos un elemento de mobiliario")
    }).optional(),
});

export type CrearSolicitudMobiliarioValues = z.infer<typeof crearSolicitudMobiliarioSchema>;
