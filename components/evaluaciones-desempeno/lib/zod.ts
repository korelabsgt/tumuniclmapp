import { z } from "zod";

export const tipoVistaEvaluacionesSchema = z.enum(["propia", "jefe", "rrhh"]);
export type TipoVistaEvaluaciones = z.infer<typeof tipoVistaEvaluacionesSchema>;

export const tipoEvaluacionSchema = z.enum([
  "auto",
  "subordinado_a_jefe",
  "jefe_a_subordinado",
]);
export type TipoEvaluacion = z.infer<typeof tipoEvaluacionSchema>;

export const ETIQUETAS_TIPO: Record<TipoEvaluacion, string> = {
  auto: "Autoevaluación",
  subordinado_a_jefe: "Evaluación al jefe",
  jefe_a_subordinado: "Evaluación de subordinado",
};

export const dirigidoAAspectoSchema = z.enum(["empleado", "jefe"]);
export type DirigidoAAspecto = z.infer<typeof dirigidoAAspectoSchema>;

export const ETIQUETAS_DIRIGIDO_A: Record<DirigidoAAspecto, string> = {
  empleado: "Empleados",
  jefe: "Jefes",
};

export const PUNTUACION_POR_LETRA = {
  A: 20,
  B: 16,
  C: 12,
  D: 8,
  E: 4,
} as const;

export const LETRAS_CALIFICACION = ["A", "B", "C", "D", "E"] as const;

export const OPCIONES_DEFAULT = LETRAS_CALIFICACION.map((letra) => ({
  letra_calificacion: letra,
  descripcion: "",
  valor_puntuacion: PUNTUACION_POR_LETRA[letra],
}));

export function opcionesPorDefecto(): Array<{
  letra_calificacion: string;
  descripcion: string;
  valor_puntuacion: number;
}> {
  return OPCIONES_DEFAULT.map((o) => ({ ...o }));
}

export const MAX_NIVELES_POR_ASPECTO = 26;
export const MAX_LONGITUD_ETIQUETA_NIVEL = 8;

export function puntajeSugeridoParaNivel(indice: number): number {
  return Math.max(0, 20 - indice * 4);
}

export function siguienteEtiquetaNivel(
  opciones: { letra_calificacion: string }[],
): string {
  const usadas = new Set(
    opciones.map((o) => o.letra_calificacion.trim().toUpperCase()),
  );
  for (let code = 65; code <= 90; code += 1) {
    const letra = String.fromCharCode(code);
    if (!usadas.has(letra)) return letra;
  }
  for (let n = 1; n < 100; n += 1) {
    const etiqueta = String(n);
    if (!usadas.has(etiqueta)) return etiqueta;
  }
  return "";
}

export function normalizarOpciones(
  opciones: {
    id?: string;
    letra_calificacion: string;
    descripcion: string;
    valor_puntuacion?: number;
  }[],
): Array<{
  id?: string;
  letra_calificacion: string;
  descripcion: string;
  valor_puntuacion: number;
}> {
  return opciones.map((o, index) => {
    const puntaje =
      typeof o.valor_puntuacion === "number"
        ? o.valor_puntuacion
        : Number(o.valor_puntuacion);
    return {
      ...(o.id ? { id: o.id } : {}),
      letra_calificacion: o.letra_calificacion.trim(),
      descripcion: o.descripcion.trim(),
      valor_puntuacion: Number.isFinite(puntaje)
        ? puntaje
        : puntajeSugeridoParaNivel(index),
    };
  });
}

export const fechaDiaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

const evaluacionDatosBaseSchema = z.object({
  nombre: z.string().trim().min(1),
  fecha_inicio: fechaDiaSchema,
  fecha_fin: fechaDiaSchema,
});

export const crearEvaluacionSchema = evaluacionDatosBaseSchema.refine(
  (d) => d.fecha_fin >= d.fecha_inicio,
  {
    message: "La fecha de finalización debe ser igual o posterior al inicio.",
    path: ["fecha_fin"],
  },
);
export type CrearEvaluacionValues = z.infer<typeof crearEvaluacionSchema>;

export const actualizarEvaluacionSchema = evaluacionDatosBaseSchema
  .extend({ id: z.string().uuid() })
  .refine((d) => d.fecha_fin >= d.fecha_inicio, {
    message: "La fecha de finalización debe ser igual o posterior al inicio.",
    path: ["fecha_fin"],
  });
export type ActualizarEvaluacionValues = z.infer<
  typeof actualizarEvaluacionSchema
>;

export const cambiarActivoEvaluacionSchema = z.object({
  id: z.string().uuid(),
  activo: z.boolean(),
});
export type CambiarActivoEvaluacionValues = z.infer<
  typeof cambiarActivoEvaluacionSchema
>;

export const duplicarEvaluacionSchema = z
  .object({
    id: z.string().uuid(),
    fecha_inicio: fechaDiaSchema,
    fecha_fin: fechaDiaSchema,
  })
  .refine((d) => d.fecha_fin >= d.fecha_inicio, {
    message: "La fecha de finalización debe ser igual o posterior al inicio.",
    path: ["fecha_fin"],
  });
export type DuplicarEvaluacionValues = z.infer<typeof duplicarEvaluacionSchema>;

export const opcionInputSchema = z.object({
  id: z.string().uuid().optional(),
  letra_calificacion: z.string().trim().min(1).max(MAX_LONGITUD_ETIQUETA_NIVEL),
  descripcion: z.string().trim().min(1),
  valor_puntuacion: z.coerce.number().finite(),
});
export type OpcionInput = z.infer<typeof opcionInputSchema>;

export const aspectoInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    titulo: z.string().trim().min(1),
    descripcion: z.string().trim().min(1),
    dirigido_a: dirigidoAAspectoSchema,
    opciones: z
      .array(opcionInputSchema)
      .min(1)
      .max(MAX_NIVELES_POR_ASPECTO),
  })
  .superRefine((data, ctx) => {
    const vistos = new Set<string>();
    data.opciones.forEach((op, index) => {
      const clave = op.letra_calificacion.trim().toLowerCase();
      if (vistos.has(clave)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Las etiquetas de nivel deben ser únicas.",
          path: ["opciones", index, "letra_calificacion"],
        });
      }
      vistos.add(clave);
    });
  });
export type AspectoInput = z.infer<typeof aspectoInputSchema>;

export const guardarAspectosSchema = z.object({
  formulario_id: z.string().uuid(),
  aspectos: z.array(aspectoInputSchema).min(1),
});
export type GuardarAspectosValues = z.infer<typeof guardarAspectosSchema>;

export type ErrorOpcionDesempeno = {
  letra?: string;
  descripcion?: string;
  puntaje?: string;
};

export type ErrorAspectoDesempeno = {
  titulo?: string;
  descripcion?: string;
  opciones?: Record<number, ErrorOpcionDesempeno>;
  general?: string;
};

export type ErroresDesempenosForm = {
  aspectos: Record<number, ErrorAspectoDesempeno>;
  general?: string;
};

export function erroresVaciosDesempenos(): ErroresDesempenosForm {
  return { aspectos: {} };
}

export function tieneErroresDesempenos(errores: ErroresDesempenosForm): boolean {
  if (errores.general) return true;
  return Object.values(errores.aspectos).some(
    (a) =>
      Boolean(a.titulo || a.descripcion || a.general) ||
      Object.values(a.opciones ?? {}).some(
        (o) => Boolean(o.letra || o.descripcion || o.puntaje),
      ),
  );
}

export function primerIndiceAspectoConError(
  errores: ErroresDesempenosForm,
): number | null {
  const indices = Object.keys(errores.aspectos)
    .map(Number)
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
  return indices[0] ?? null;
}

export function recolectarErroresAspectos(
  aspectos: AspectoInput[],
): ErroresDesempenosForm {
  const errores: ErroresDesempenosForm = { aspectos: {} };

  aspectos.forEach((aspecto, aspectoIndex) => {
    const campo: ErrorAspectoDesempeno = { opciones: {} };

    if (!aspecto.titulo.trim()) {
      campo.titulo = "Escribe un título.";
    }
    if (!aspecto.descripcion.trim()) {
      campo.descripcion = "Escribe la descripción.";
    }

    const etiquetas = new Map<string, number[]>();
    aspecto.opciones.forEach((op, opIndex) => {
      const opError: ErrorOpcionDesempeno = {};
      const etiqueta = op.letra_calificacion.trim();

      if (!etiqueta) {
        opError.letra = "Escribe la etiqueta del nivel.";
      } else if (etiqueta.length > MAX_LONGITUD_ETIQUETA_NIVEL) {
        opError.letra = `Máximo ${MAX_LONGITUD_ETIQUETA_NIVEL} caracteres.`;
      } else {
        const clave = etiqueta.toLowerCase();
        const lista = etiquetas.get(clave) ?? [];
        lista.push(opIndex);
        etiquetas.set(clave, lista);
      }

      if (!op.descripcion.trim()) {
        opError.descripcion = "Escribe la descripción del nivel.";
      }
      if (!Number.isFinite(Number(op.valor_puntuacion))) {
        opError.puntaje = "Escribe un puntaje válido.";
      }

      if (opError.letra || opError.descripcion || opError.puntaje) {
        campo.opciones![opIndex] = opError;
      }
    });

    etiquetas.forEach((indices) => {
      if (indices.length < 2) return;
      indices.forEach((opIndex) => {
        const actual = campo.opciones?.[opIndex] ?? {};
        campo.opciones![opIndex] = {
          ...actual,
          letra: "Cada etiqueta debe ser única.",
        };
      });
    });

    if (
      campo.titulo ||
      campo.descripcion ||
      campo.general ||
      Object.keys(campo.opciones ?? {}).length > 0
    ) {
      errores.aspectos[aspectoIndex] = campo;
    }
  });

  return errores;
}

export function erroresDesdeZodGuardarAspectos(
  error: z.ZodError,
): ErroresDesempenosForm {
  const errores = erroresVaciosDesempenos();

  error.issues.forEach((issue) => {
    const path = issue.path;
    if (path[0] === "aspectos" && typeof path[1] === "number") {
      const aspectoIndex = path[1];
      const campo = errores.aspectos[aspectoIndex] ?? { opciones: {} };
      errores.aspectos[aspectoIndex] = campo;
      if (!campo.opciones) campo.opciones = {};

      if (path[2] === "titulo") {
        campo.titulo = "Escribe un título.";
      } else if (path[2] === "descripcion") {
        campo.descripcion = "Escribe la descripción.";
      } else if (path[2] === "opciones" && typeof path[3] === "number") {
        const opIndex = path[3];
        const opError = campo.opciones[opIndex] ?? {};
        if (path[4] === "letra_calificacion") {
          opError.letra =
            issue.message.includes("únicas") || issue.message.includes("unique")
              ? "Cada etiqueta debe ser única."
              : `Etiqueta inválida (máx. ${MAX_LONGITUD_ETIQUETA_NIVEL} caracteres).`;
        } else if (path[4] === "descripcion") {
          opError.descripcion = "Escribe la descripción del nivel.";
        } else if (path[4] === "valor_puntuacion") {
          opError.puntaje = "Escribe un puntaje válido.";
        }
        campo.opciones[opIndex] = opError;
      } else if (
        issue.message.includes("únicas") ||
        issue.message.includes("unique")
      ) {
        campo.general = "Las etiquetas de nivel deben ser distintas.";
      }
    } else if (path[0] === "formulario_id") {
      errores.general =
        "La evaluación no es válida. Vuelve a abrirla desde la lista.";
    } else {
      errores.general = issue.message || ACCION_ERRORES.DATOS_INVALIDOS;
    }
  });

  return errores;
}

export function erroresDesdeMensajeServidor(
  mensaje: string,
  aspectos: AspectoInput[],
): ErroresDesempenosForm {
  const errores = erroresVaciosDesempenos();
  const match = mensaje.match(/«([^»]+)»/);
  if (match) {
    const titulo = match[1]?.trim() ?? "";
    const aspectoIndex = aspectos.findIndex(
      (a) => a.titulo.trim().toLowerCase() === titulo.toLowerCase(),
    );
    if (aspectoIndex >= 0) {
      errores.aspectos[aspectoIndex] = { general: mensaje, opciones: {} };
      return errores;
    }
  }
  errores.general = mensaje;
  return errores;
}

export function mensajeValidacionAspectos(aspectos: AspectoInput[]): string | null {
  for (let i = 0; i < aspectos.length; i += 1) {
    const aspecto = aspectos[i]!;
    const nombre = aspecto.titulo.trim() || `Desempeño ${i + 1}`;
    if (!aspecto.titulo.trim()) {
      return `Completa el título de «${nombre}».`;
    }
    if (!aspecto.descripcion.trim()) {
      return `Completa la descripción de «${nombre}».`;
    }
    for (let j = 0; j < aspecto.opciones.length; j += 1) {
      const op = aspecto.opciones[j]!;
      const etiqueta = op.letra_calificacion.trim() || String(j + 1);
      if (!op.letra_calificacion.trim()) {
        return `En «${nombre}», completa la etiqueta del nivel ${j + 1}.`;
      }
      if (!op.descripcion.trim()) {
        return `En «${nombre}», completa la descripción del nivel ${etiqueta}.`;
      }
      if (!Number.isFinite(Number(op.valor_puntuacion))) {
        return `En «${nombre}», revisa el puntaje del nivel ${etiqueta}.`;
      }
    }
  }
  return null;
}

export function prepararPayloadGuardarAspectos(
  formularioId: string,
  aspectos: AspectoInput[],
): GuardarAspectosValues {
  return {
    formulario_id: formularioId,
    aspectos: aspectos.map((aspecto) => ({
      titulo: aspecto.titulo.trim(),
      descripcion: aspecto.descripcion.trim(),
      dirigido_a: aspecto.dirigido_a,
      opciones: normalizarOpciones(aspecto.opciones).map((o) => ({
        letra_calificacion: o.letra_calificacion,
        descripcion: o.descripcion,
        valor_puntuacion: o.valor_puntuacion,
      })),
    })),
  };
}

export function mensajeErrorZodGuardarAspectos(
  error: z.ZodError,
  aspectos: AspectoInput[],
): string {
  const issue = error.issues[0];
  if (!issue) return ACCION_ERRORES.DATOS_INVALIDOS;

  const path = issue.path;
  if (path[0] === "formulario_id") {
    return "La evaluación no es válida. Vuelve a abrirla desde la lista.";
  }

  if (path[0] === "aspectos" && typeof path[1] === "number") {
    const aspectoIndex = path[1];
    const aspecto = aspectos[aspectoIndex];
    const nombre = aspecto?.titulo.trim() || `Desempeño ${aspectoIndex + 1}`;

    if (path[2] === "titulo") {
      return `Completa el título de «${nombre}».`;
    }
    if (path[2] === "descripcion") {
      return `Completa la descripción de «${nombre}».`;
    }
    if (path[2] === "opciones" && typeof path[3] === "number") {
      const opIndex = path[3];
      const op = aspecto?.opciones[opIndex];
      const etiqueta = op?.letra_calificacion.trim() || String(opIndex + 1);
      if (path[4] === "letra_calificacion") {
        return `En «${nombre}», la etiqueta del nivel ${etiqueta} no es válida (máx. ${MAX_LONGITUD_ETIQUETA_NIVEL} caracteres).`;
      }
      if (path[4] === "descripcion") {
        return `En «${nombre}», completa la descripción del nivel ${etiqueta}.`;
      }
      if (path[4] === "valor_puntuacion") {
        return `En «${nombre}», el puntaje del nivel ${etiqueta} no es válido.`;
      }
    }
    if (issue.message.includes("únicas")) {
      return `En «${nombre}», las etiquetas de nivel deben ser distintas.`;
    }
  }

  return issue.message || ACCION_ERRORES.DATOS_INVALIDOS;
}

export const respuestaSchema = z.object({
  aspecto_id: z.string().uuid(),
  opcion_id: z.string().uuid(),
});
export type RespuestaEvaluacion = z.infer<typeof respuestaSchema>;

export const guardarEvaluacionSchema = z.object({
  formulario_id: z.string().uuid(),
  evaluado_id: z.string().uuid(),
  respuestas: z.array(respuestaSchema),
  completar: z.boolean(),
});
export type GuardarEvaluacionValues = z.infer<typeof guardarEvaluacionSchema>;

export function mensajeErrorZodGuardarEvaluacion(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return ACCION_ERRORES.DATOS_INVALIDOS;

  const path = issue.path;
  if (path[0] === "formulario_id") {
    return "La evaluación no es válida. Vuelve a abrirla desde la lista.";
  }
  if (path[0] === "evaluado_id") {
    return "El evaluado no es válido. Vuelve a abrir la evaluación.";
  }
  if (path[0] === "respuestas") {
    if (typeof path[1] === "number") {
      const indice = path[1] + 1;
      if (path[2] === "aspecto_id" || path[2] === "opcion_id") {
        return `La respuesta del desempeño ${indice} no es válida. Vuelve a seleccionar las opciones.`;
      }
      return `Revisa la respuesta del desempeño ${indice}.`;
    }
    return ACCION_ERRORES.ASPECTOS_INCOMPLETOS;
  }

  return issue.message || ACCION_ERRORES.DATOS_INVALIDOS;
}

export function mensajeFaltantesEvaluacion(
  aspectos: { id: string; titulo: string }[],
  respuestas: Record<string, string | undefined>,
): string | null {
  const faltantes = aspectos.filter((aspecto) => !respuestas[aspecto.id]);
  if (faltantes.length === 0) return null;
  if (faltantes.length === 1) {
    return `Debes calificar «${faltantes[0]!.titulo}».`;
  }
  const nombres = faltantes.map((aspecto) => `«${aspecto.titulo}»`).join(", ");
  return `Debes calificar todos los desempeños. Faltan: ${nombres}.`;
}

export function payloadGuardarEvaluacion(
  formularioId: string,
  evaluadoId: string,
  aspectos: { id: string }[],
  respuestas: Record<string, string | undefined>,
  completar: boolean,
): GuardarEvaluacionValues {
  return {
    formulario_id: formularioId,
    evaluado_id: evaluadoId,
    respuestas: aspectos
      .filter((aspecto) => Boolean(respuestas[aspecto.id]))
      .map((aspecto) => ({
        aspecto_id: aspecto.id,
        opcion_id: respuestas[aspecto.id]!,
      })),
    completar,
  };
}

export const ACCION_ERRORES = {
  NO_SESION: "Inicia sesión para continuar.",
  NO_PERMITIDO: "No tienes permiso para esta acción.",
  DATOS_INVALIDOS: "Revisa los datos del formulario.",
  NO_ENCONTRADO: "No se encontró el registro.",
  YA_COMPLETADA: "Esta evaluación ya fue enviada.",
  ASPECTOS_INCOMPLETOS: "Debes calificar todos los desempeños.",
  TIENE_EVALUACIONES:
    "No se puede modificar una evaluación que ya tiene respuestas enviadas.",
  SIN_ASPECTOS: "Esta evaluación aún no tiene desempeños configurados.",
  EVALUADO_INVALIDO: "No puedes evaluar a esta persona.",
} as const;

export type AccionOk = { ok: true; id?: string };
export type AccionError = { ok: false; code: string; message: string };
export type AccionResultado = AccionOk | AccionError;

export type DependenciaNodo = {
  id: string;
  nombre: string;
  parent_id: string | null;
  es_puesto: boolean | null;
  no: number | null;
  jefe_id: string | null;
};

export type OficinaACargo = { id: string; nombre: string };

export type PerfilEvaluaciones = {
  id: string;
  nombre: string;
  rol: string | null;
  esJefe: boolean;
  dependenciaId: string | null;
  oficinasACargo: OficinaACargo[];
};

export type OpcionAspecto = {
  id: string;
  aspecto_id: string;
  letra_calificacion: string;
  descripcion: string;
  valor_puntuacion: number;
};

export type AspectoEvaluacion = {
  id: string;
  formulario_id: string;
  titulo: string;
  descripcion: string;
  dirigido_a: DirigidoAAspecto;
  fecha_creacion: string;
  opciones: OpcionAspecto[];
};

export type EvaluacionPlantilla = {
  id: string;
  nombre: string;
  activo: boolean;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_creacion: string;
  aspectos: AspectoEvaluacion[];
  tiene_respuestas: boolean;
};

export type PendienteEvaluacion = {
  formulario_id: string;
  formulario_nombre: string;
  formulario_fecha_inicio: string;
  tipo_evaluacion: TipoEvaluacion;
  evaluado_id: string;
  evaluado_nombre: string;
  evaluado_dependencia: string | null;
  evaluacion_id: string | null;
  es_borrador: boolean;
  esta_completada: boolean;
  puntaje_total: number | null;
  rango_nombre: string | null;
  rango_color: string | null;
  fecha_realizacion: string | null;
};

export type PendienteEnvio = {
  formulario_id: string;
  formulario_nombre: string;
  tipo_evaluacion: TipoEvaluacion;
  evaluador_id: string;
  evaluador_nombre: string;
  evaluado_id: string;
  evaluado_nombre: string;
};

export type RangoActuacion = {
  nombre: string;
  puntaje_hasta: number;
  color: string;
};

export type FilaAnonima = {
  indice: number;
  por_aspecto: Record<string, number>;
  total: number;
  evaluador_id?: string | null;
  evaluador_nombre?: string | null;
};

export type OpcionElegidaResultado = {
  letra: string;
  descripcion: string;
};

export type AspectoResultado = {
  id: string;
  titulo: string;
  descripcion: string;
  elegido: OpcionElegidaResultado | null;
};

export type ResultadoPersona = {
  evaluado_id: string;
  evaluado_nombre: string;
  evaluado_puesto: string | null;
  evaluado_dependencia: string | null;
  evaluado_es_jefe: boolean;
  formulario_id: string;
  formulario_nombre: string;
  tipos_evaluacion: TipoEvaluacion[];
  aspectos: AspectoResultado[];
  filas_anonimas: FilaAnonima[];
  filas_empleados: FilaAnonima[];
  empleados_promedio: Record<string, number> | null;
  empleados_total: number | null;
  auto: Record<string, number> | null;
  auto_total: number | null;
  equipo: Record<string, number> | null;
  equipo_total: number | null;
  total_promedio: number;
  rango: RangoActuacion | null;
  fecha_realizacion: string | null;
};

export type LlenarEvaluacionPayload = {
  formulario: EvaluacionPlantilla;
  evaluado_id: string;
  evaluado_nombre: string;
  evaluado_puesto: string | null;
  evaluado_dependencia: string | null;
  evaluacion_id: string | null;
  esta_completada: boolean;
  respuestas: Record<string, string>;
};
