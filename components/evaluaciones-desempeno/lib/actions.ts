"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/utils/supabase/server";
import {
  ACCION_ERRORES,
  actualizarEvaluacionSchema,
  cambiarActivoEvaluacionSchema,
  crearEvaluacionSchema,
  dirigidoAAspectoSchema,
  duplicarEvaluacionSchema,
  guardarAspectosSchema,
  guardarEvaluacionSchema,
  mensajeErrorZodGuardarEvaluacion,
  tipoEvaluacionSchema,
  tipoVistaEvaluacionesSchema,
  type AccionResultado,
  type AspectoEvaluacion,
  type AspectoInput,
  type DependenciaNodo,
  type DirigidoAAspecto,
  type EvaluacionPlantilla,
  type LlenarEvaluacionPayload,
  type OpcionAspecto,
  type PendienteEnvio,
  type PendienteEvaluacion,
  type PerfilEvaluaciones,
  type ResultadoPersona,
  type TipoEvaluacion,
  type TipoVistaEvaluaciones,
} from "./zod";
import {
  esJefeDeDependencia,
  esJefeUsuario,
  idsSubordinados,
  obtenerJefeId,
  ubicacionLaboralUsuario,
} from "./jerarquia";
import { filasAnonimasDesdeTotales, filasExternasDesdeTotales } from "./anonimato";
import { resolverTipoEvaluacion } from "./tipo-contexto";
import {
  fechaCalendarioAGuardar,
  fechaDiaDeDb,
  formularioEnVigencia,
} from "./fechas";
import { itemPorSlug } from "./slug";
import { normalizarOpciones, prepararPayloadGuardarAspectos, mensajeErrorZodGuardarAspectos } from "./zod";
import {
  maximoPosible,
  normalizarACien,
  promedioPorClave,
  rangoParaPuntaje,
  totalDeMapa,
} from "./rangos";

const ROLES_RRHH = ["RRHH", "SECRETARIO", "SUPER"];
type UsuarioOrg = {
  user_id: string;
  nombre: string;
  dependencia_id: string | null;
  activo: boolean;
};

type EvaluacionRow = {
  id: string;
  formulario_id: string;
  evaluador_id: string;
  evaluado_id: string;
  tipo_evaluacion: string;
  esta_completada: boolean;
  fecha_creacion: string;
};

type DetalleRow = {
  evaluacion_id: string;
  aspecto_id: string;
  opcion_id: string;
  puntuacion_obtenida: number;
  fecha_creacion: string;
};

function fail(
  code: keyof typeof ACCION_ERRORES,
  detalle?: string,
): AccionResultado {
  return { ok: false, code, message: detalle ?? ACCION_ERRORES[code] };
}

function mensajeErrorDb(
  error: { code?: string; message?: string },
  contexto: string,
): string {
  const msg = error.message ?? "";
  if (error.code === "23502") {
    const columna = msg.match(/column "([^"]+)"/)?.[1];
    if (columna) {
      return `${contexto}. Error de base de datos (campo «${columna}»).`;
    }
    return `${contexto}. Error de base de datos al guardar.`;
  }
  if (error.code === "23503") {
    return `${contexto}. Hay respuestas vinculadas que impiden modificar los desempeños.`;
  }
  if (error.code === "42501" || msg.toLowerCase().includes("permission")) {
    return `${contexto}. No tienes permiso en la base de datos.`;
  }
  if (msg.includes("opciones_aspecto")) {
    return `${contexto}. Revisa etiquetas, descripciones y puntajes de cada nivel.`;
  }
  if (msg.includes("aspectos_evaluacion")) {
    return `${contexto}. Revisa título y descripción de cada desempeño.`;
  }
  if (msg.includes("detalle_evaluaciones")) {
    return `${contexto}. No se pudieron guardar las respuestas de la evaluación.`;
  }
  if (msg.includes("evaluaciones")) {
    return `${contexto}. No se pudo registrar la evaluación.`;
  }
  if (process.env.NODE_ENV === "development" && msg) {
    return `${contexto}. (${msg})`;
  }
  return contexto;
}

function ok(id?: string): AccionResultado {
  return id ? { ok: true, id } : { ok: true };
}

function parseTipo(value: unknown): TipoEvaluacion | null {
  const parsed = tipoEvaluacionSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function parseDirigidoA(value: unknown): DirigidoAAspecto {
  const parsed = dirigidoAAspectoSchema.safeParse(value);
  return parsed.success ? parsed.data : "empleado";
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function rolDeUsuario(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("usuarios_roles")
    .select("roles (nombre)")
    .eq("user_id", userId);
  const nombres =
    data
      ?.map((item) => {
        const roles = item.roles as { nombre?: string } | { nombre?: string }[] | null;
        if (!roles) return null;
        if (Array.isArray(roles)) return roles[0]?.nombre ?? null;
        return roles.nombre ?? null;
      })
      .filter((n): n is string => Boolean(n)) ?? [];
  return nombres.find((n) => ROLES_RRHH.includes(n)) ?? nombres[0] ?? null;
}

function esRolRRHH(rol: string | null): boolean {
  return ROLES_RRHH.includes(rol ?? "");
}

async function sesion() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null as null };
  return { supabase, user };
}

export async function obtenerPerfilEvaluaciones(): Promise<PerfilEvaluaciones | null> {
  const { supabase, user } = await sesion();
  if (!user) return null;
  const rol = await rolDeUsuario(supabase, user.id);
  const { data: info } = await supabase
    .from("info_usuario")
    .select("nombre, esjefe, dependencia_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: oficinas } = await supabase
    .from("dependencias")
    .select("id, nombre")
    .eq("jefe_id", user.id);
  const oficinasACargo =
    oficinas?.map((o) => ({
      id: String(o.id),
      nombre: String(o.nombre ?? ""),
    })) ?? [];
  const infoRow = info as {
    nombre?: string | null;
    esjefe?: boolean | null;
    dependencia_id?: string | null;
  } | null;
  return {
    id: user.id,
    nombre: infoRow?.nombre || "Usuario",
    rol,
    esJefe: Boolean(infoRow?.esjefe) || oficinasACargo.length > 0,
    dependenciaId: infoRow?.dependencia_id ?? null,
    oficinasACargo,
  };
}

async function cargarDependencias(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<DependenciaNodo[]> {
  const { data } = await supabase
    .from("dependencias")
    .select("id, nombre, parent_id, es_puesto, no, jefe_id")
    .order("no", { ascending: true });
  return (data ?? []).map((d) => ({
    id: String(d.id),
    nombre: String(d.nombre ?? ""),
    parent_id: d.parent_id ? String(d.parent_id) : null,
    es_puesto: typeof d.es_puesto === "boolean" ? d.es_puesto : null,
    no: typeof d.no === "number" ? d.no : null,
    jefe_id: d.jefe_id ? String(d.jefe_id) : null,
  }));
}

async function cargarUsuarios(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<UsuarioOrg[]> {
  const { data } = await supabase
    .from("info_usuario")
    .select("user_id, nombre, dependencia_id, activo");
  return (data ?? []).map((u) => ({
    user_id: String(u.user_id),
    nombre: String(u.nombre ?? "Sin nombre"),
    dependencia_id: u.dependencia_id ? String(u.dependencia_id) : null,
    activo: u.activo !== false,
  }));
}

function mapOpcion(raw: Record<string, unknown>): OpcionAspecto {
  return {
    id: String(raw.id),
    aspecto_id: String(raw.aspecto_id),
    letra_calificacion: String(raw.letra_calificacion ?? ""),
    descripcion: String(raw.descripcion ?? ""),
    valor_puntuacion: num(raw.valor_puntuacion),
  };
}

function mapAspecto(raw: Record<string, unknown>): AspectoEvaluacion {
  const opcionesRaw = Array.isArray(raw.opciones_aspecto)
    ? raw.opciones_aspecto
    : [];
  return {
    id: String(raw.id),
    formulario_id: String(raw.formulario_id ?? ""),
    titulo: String(raw.titulo ?? ""),
    descripcion: String(raw.descripcion ?? ""),
    dirigido_a: parseDirigidoA(raw.dirigido_a),
    fecha_creacion: String(raw.fecha_creacion ?? ""),
    opciones: [...opcionesRaw]
      .sort((a, b) =>
        String((a as Record<string, unknown>).fecha_creacion ?? "").localeCompare(
          String((b as Record<string, unknown>).fecha_creacion ?? ""),
        ),
      )
      .map((o) => mapOpcion(o as Record<string, unknown>)),
  };
}

function mapPlantilla(
  raw: Record<string, unknown>,
  tieneRespuestas: boolean,
): EvaluacionPlantilla | null {
  const aspectosRaw = Array.isArray(raw.aspectos_evaluacion)
    ? raw.aspectos_evaluacion
    : [];
  return {
    id: String(raw.id),
    nombre: String(raw.nombre ?? ""),
    activo: Boolean(raw.activo),
    fecha_inicio: fechaDiaDeDb(raw.fecha_inicio),
    fecha_fin: fechaDiaDeDb(raw.fecha_fin),
    fecha_creacion: String(raw.fecha_creacion ?? ""),
    aspectos: aspectosRaw
      .map((a) => mapAspecto(a as Record<string, unknown>))
      .sort((a, b) => a.fecha_creacion.localeCompare(b.fecha_creacion)),
    tiene_respuestas: tieneRespuestas,
  };
}

const PLANTILLA_SELECT = `
  id, nombre, activo, fecha_inicio, fecha_fin, fecha_creacion,
  aspectos_evaluacion (
    id, formulario_id, titulo, descripcion, dirigido_a, fecha_creacion,
    opciones_aspecto (id, aspecto_id, letra_calificacion, descripcion, valor_puntuacion, fecha_creacion)
  )
`;

async function idsConRespuestas(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Set<string>> {
  const { data } = await supabase.from("evaluaciones").select("formulario_id");
  return new Set(
    (data ?? [])
      .map((e) => (e.formulario_id ? String(e.formulario_id) : ""))
      .filter(Boolean),
  );
}

async function cargarPlantillas(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<EvaluacionPlantilla[]> {
  const { data } = await supabase
    .from("formularios_evaluacion")
    .select(PLANTILLA_SELECT)
    .order("fecha_creacion", { ascending: false });
  const usados = await idsConRespuestas(supabase);
  return (data ?? [])
    .map((row) =>
      mapPlantilla(row as Record<string, unknown>, usados.has(String(row.id))),
    )
    .filter((f): f is EvaluacionPlantilla => f !== null);
}

export async function listarEvaluaciones(): Promise<EvaluacionPlantilla[]> {
  const perfil = await obtenerPerfilEvaluaciones();
  if (!perfil || !esRolRRHH(perfil.rol)) return [];
  const { supabase } = await sesion();
  return cargarPlantillas(supabase);
}

export async function obtenerEvaluacionPorId(
  id: string,
): Promise<EvaluacionPlantilla | null> {
  const perfil = await obtenerPerfilEvaluaciones();
  if (!perfil || !esRolRRHH(perfil.rol)) return null;
  const { supabase } = await sesion();
  const { data } = await supabase
    .from("formularios_evaluacion")
    .select(PLANTILLA_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const usados = await idsConRespuestas(supabase);
  return mapPlantilla(
    data as Record<string, unknown>,
    usados.has(String(data.id)),
  );
}

export async function obtenerEvaluacionPorSlug(
  slug: string,
): Promise<EvaluacionPlantilla | null> {
  const plantillas = await listarEvaluaciones();
  return itemPorSlug(plantillas, slug) ?? null;
}

export async function crearEvaluacion(input: unknown): Promise<AccionResultado> {
  try {
    const perfil = await obtenerPerfilEvaluaciones();
    if (!perfil) return fail("NO_SESION");
    if (!esRolRRHH(perfil.rol)) return fail("NO_PERMITIDO");
    const parsed = crearEvaluacionSchema.safeParse(input);
    if (!parsed.success) return fail("DATOS_INVALIDOS");
    const { supabase } = await sesion();
    const { data, error } = await supabase
      .from("formularios_evaluacion")
      .insert({
        nombre: parsed.data.nombre,
        fecha_inicio: fechaCalendarioAGuardar(parsed.data.fecha_inicio),
        fecha_fin: fechaCalendarioAGuardar(parsed.data.fecha_fin),
        activo: false,
      })
      .select("id")
      .single();
    if (error || !data) return fail("DATOS_INVALIDOS");
    return ok(String(data.id));
  } catch {
    return fail("DATOS_INVALIDOS");
  }
}

export async function actualizarEvaluacion(
  input: unknown,
): Promise<AccionResultado> {
  try {
    const perfil = await obtenerPerfilEvaluaciones();
    if (!perfil) return fail("NO_SESION");
    if (!esRolRRHH(perfil.rol)) return fail("NO_PERMITIDO");
    const parsed = actualizarEvaluacionSchema.safeParse(input);
    if (!parsed.success) return fail("DATOS_INVALIDOS");
    const { supabase } = await sesion();
    const { error } = await supabase
      .from("formularios_evaluacion")
      .update({
        nombre: parsed.data.nombre,
        fecha_inicio: fechaCalendarioAGuardar(parsed.data.fecha_inicio),
        fecha_fin: fechaCalendarioAGuardar(parsed.data.fecha_fin),
      })
      .eq("id", parsed.data.id);
    if (error) return fail("DATOS_INVALIDOS");
    return ok(parsed.data.id);
  } catch {
    return fail("DATOS_INVALIDOS");
  }
}

export async function cambiarActivoEvaluacion(
  input: unknown,
): Promise<AccionResultado> {
  try {
    const perfil = await obtenerPerfilEvaluaciones();
    if (!perfil) return fail("NO_SESION");
    if (!esRolRRHH(perfil.rol)) return fail("NO_PERMITIDO");
    const parsed = cambiarActivoEvaluacionSchema.safeParse(input);
    if (!parsed.success) return fail("DATOS_INVALIDOS");
    const { supabase } = await sesion();
    const { error } = await supabase
      .from("formularios_evaluacion")
      .update({ activo: parsed.data.activo })
      .eq("id", parsed.data.id);
    if (error) return fail("DATOS_INVALIDOS");
    return ok(parsed.data.id);
  } catch {
    return fail("DATOS_INVALIDOS");
  }
}

export async function eliminarEvaluacion(
  formularioId: string,
): Promise<AccionResultado> {
  try {
    const perfil = await obtenerPerfilEvaluaciones();
    if (!perfil) return fail("NO_SESION");
    if (!esRolRRHH(perfil.rol)) return fail("NO_PERMITIDO");
    const { supabase } = await sesion();
    const { count } = await supabase
      .from("evaluaciones")
      .select("id", { count: "exact", head: true })
      .eq("formulario_id", formularioId);
    if ((count ?? 0) > 0) return fail("TIENE_EVALUACIONES");
    const { error } = await supabase
      .from("formularios_evaluacion")
      .delete()
      .eq("id", formularioId);
    if (error) return fail("DATOS_INVALIDOS");
    return ok();
  } catch {
    return fail("DATOS_INVALIDOS");
  }
}

export async function duplicarEvaluacion(
  input: unknown,
): Promise<AccionResultado> {
  try {
    const perfil = await obtenerPerfilEvaluaciones();
    if (!perfil) return fail("NO_SESION");
    if (!esRolRRHH(perfil.rol)) return fail("NO_PERMITIDO");
    const parsed = duplicarEvaluacionSchema.safeParse(input);
    if (!parsed.success) return fail("DATOS_INVALIDOS");
    const origen = await obtenerEvaluacionPorId(parsed.data.id);
    if (!origen) return fail("NO_ENCONTRADO");
    const { supabase } = await sesion();
    const { data: nuevoForm, error: errorForm } = await supabase
      .from("formularios_evaluacion")
      .insert({
        nombre: `${origen.nombre} (copia)`,
        fecha_inicio: fechaCalendarioAGuardar(parsed.data.fecha_inicio),
        fecha_fin: fechaCalendarioAGuardar(parsed.data.fecha_fin),
        activo: false,
      })
      .select("id")
      .single();
    if (errorForm || !nuevoForm) {
      return fail(
        "DATOS_INVALIDOS",
        mensajeErrorDb(
          errorForm ?? {},
          "No se pudo duplicar la evaluación",
        ),
      );
    }
    const nuevoFormId = String(nuevoForm.id);
    const ahora = new Date().toISOString();
    for (const aspecto of origen.aspectos) {
      const aspectoId = randomUUID();
      const { error: errorAspecto } = await supabase
        .from("aspectos_evaluacion")
        .insert({
          id: aspectoId,
          formulario_id: nuevoFormId,
          titulo: aspecto.titulo,
          descripcion: aspecto.descripcion,
          dirigido_a: aspecto.dirigido_a,
          fecha_creacion: ahora,
        });
      if (errorAspecto) {
        await supabase.from("formularios_evaluacion").delete().eq("id", nuevoFormId);
        return fail(
          "DATOS_INVALIDOS",
          mensajeErrorDb(
            errorAspecto,
            `No se pudo copiar «${aspecto.titulo}»`,
          ),
        );
      }
      if (aspecto.opciones.length === 0) continue;
      const { error: errorOps } = await supabase.from("opciones_aspecto").insert(
        aspecto.opciones.map((opcion) => ({
          id: randomUUID(),
          aspecto_id: aspectoId,
          letra_calificacion: opcion.letra_calificacion,
          descripcion: opcion.descripcion,
          valor_puntuacion: opcion.valor_puntuacion,
          fecha_creacion: ahora,
        })),
      );
      if (errorOps) {
        await supabase.from("formularios_evaluacion").delete().eq("id", nuevoFormId);
        return fail(
          "DATOS_INVALIDOS",
          mensajeErrorDb(
            errorOps,
            `No se pudieron copiar los niveles de «${aspecto.titulo}»`,
          ),
        );
      }
    }
    return ok(nuevoFormId);
  } catch {
    return fail("DATOS_INVALIDOS");
  }
}

export async function guardarAspectos(input: unknown): Promise<AccionResultado> {
  try {
    const perfil = await obtenerPerfilEvaluaciones();
    if (!perfil) return fail("NO_SESION");
    if (!esRolRRHH(perfil.rol)) return fail("NO_PERMITIDO");
    if (
      typeof input !== "object" ||
      input === null ||
      !("formulario_id" in input) ||
      !("aspectos" in input)
    ) {
      return fail("DATOS_INVALIDOS", "No se recibieron los desempeños a guardar.");
    }

    const raw = input as { formulario_id: unknown; aspectos: AspectoInput[] };
    const payload = prepararPayloadGuardarAspectos(
      String(raw.formulario_id),
      raw.aspectos,
    );
    const parsed = guardarAspectosSchema.safeParse(payload);
    if (!parsed.success) {
      return fail(
        "DATOS_INVALIDOS",
        mensajeErrorZodGuardarAspectos(parsed.error, raw.aspectos),
      );
    }

    const { supabase } = await sesion();
    const { count } = await supabase
      .from("evaluaciones")
      .select("id", { count: "exact", head: true })
      .eq("formulario_id", parsed.data.formulario_id);
    if ((count ?? 0) > 0) return fail("TIENE_EVALUACIONES");

    const { data: aspectosExistentes, error: errorLista } = await supabase
      .from("aspectos_evaluacion")
      .select("id")
      .eq("formulario_id", parsed.data.formulario_id);
    if (errorLista) {
      console.error("guardarAspectos:listar", errorLista);
      return fail(
        "DATOS_INVALIDOS",
        mensajeErrorDb(errorLista, "No se pudieron leer los desempeños actuales"),
      );
    }

    const idsAnteriores = (aspectosExistentes ?? []).map((a) => String(a.id));
    const idsNuevos: string[] = [];
    const ahora = new Date().toISOString();

    const revertirNuevos = async () => {
      if (idsNuevos.length === 0) return;
      await supabase.from("aspectos_evaluacion").delete().in("id", idsNuevos);
      idsNuevos.length = 0;
    };

    for (const aspecto of parsed.data.aspectos) {
      const aspectoId = randomUUID();
      const { data: creado, error } = await supabase
        .from("aspectos_evaluacion")
        .insert({
          id: aspectoId,
          formulario_id: parsed.data.formulario_id,
          titulo: aspecto.titulo,
          descripcion: aspecto.descripcion,
          dirigido_a: aspecto.dirigido_a,
          fecha_creacion: ahora,
        })
        .select("id")
        .single();
      if (error || !creado) {
        console.error("guardarAspectos:insertAspecto", error);
        await revertirNuevos();
        return fail(
          "DATOS_INVALIDOS",
          mensajeErrorDb(error ?? {}, `No se pudo guardar «${aspecto.titulo}»`),
        );
      }

      idsNuevos.push(String(creado.id));

      const { error: errorOps } = await supabase.from("opciones_aspecto").insert(
        normalizarOpciones(aspecto.opciones).map((o) => ({
          id: randomUUID(),
          aspecto_id: creado.id,
          letra_calificacion: o.letra_calificacion,
          descripcion: o.descripcion,
          valor_puntuacion: o.valor_puntuacion,
          fecha_creacion: ahora,
        })),
      );
      if (errorOps) {
        console.error("guardarAspectos:insertOpciones", errorOps);
        await revertirNuevos();
        return fail(
          "DATOS_INVALIDOS",
          mensajeErrorDb(
            errorOps,
            `No se pudieron guardar los niveles de «${aspecto.titulo}»`,
          ),
        );
      }
    }

    if (idsAnteriores.length > 0) {
      const { error: deleteError } = await supabase
        .from("aspectos_evaluacion")
        .delete()
        .in("id", idsAnteriores);
      if (deleteError) {
        console.error("guardarAspectos:deleteAnteriores", deleteError);
        return fail(
          "DATOS_INVALIDOS",
          mensajeErrorDb(
            deleteError,
            "Los desempeños nuevos se guardaron pero no se pudieron reemplazar los anteriores",
          ),
        );
      }
    }

    return ok(parsed.data.formulario_id);
  } catch (e) {
    console.error("guardarAspectos", e);
    return fail(
      "DATOS_INVALIDOS",
      "No se pudieron guardar los desempeños. Intenta de nuevo.",
    );
  }
}

async function cargarEvaluaciones(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<EvaluacionRow[]> {
  const { data } = await supabase
    .from("evaluaciones")
    .select(
      "id, formulario_id, evaluador_id, evaluado_id, tipo_evaluacion, esta_completada, fecha_creacion",
    );
  return (data ?? [])
    .filter((e) => e.formulario_id)
    .map((e) => ({
      id: String(e.id),
      formulario_id: String(e.formulario_id),
      evaluador_id: String(e.evaluador_id),
      evaluado_id: String(e.evaluado_id),
      tipo_evaluacion: String(e.tipo_evaluacion),
      esta_completada: Boolean(e.esta_completada),
      fecha_creacion: String(e.fecha_creacion ?? ""),
    }));
}

async function cargarDetalles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  evaluacionIds: string[],
): Promise<DetalleRow[]> {
  if (evaluacionIds.length === 0) return [];
  const { data } = await supabase
    .from("detalle_evaluaciones")
    .select(
      "evaluacion_id, aspecto_id, opcion_id, puntuacion_obtenida, fecha_creacion",
    )
    .in("evaluacion_id", evaluacionIds);
  return (data ?? []).map((d) => ({
    evaluacion_id: String(d.evaluacion_id),
    aspecto_id: String(d.aspecto_id),
    opcion_id: String(d.opcion_id),
    puntuacion_obtenida: num(d.puntuacion_obtenida),
    fecha_creacion: String(d.fecha_creacion ?? ""),
  }));
}

type OpcionHistorica = {
  letra: string;
  descripcion: string;
};

async function cargarOpcionesHistoricas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  opcionIds: string[],
): Promise<Map<string, OpcionHistorica>> {
  const unicos = [...new Set(opcionIds.filter(Boolean))];
  if (unicos.length === 0) return new Map();
  const { data } = await supabase
    .from("opciones_aspecto")
    .select("id, letra_calificacion, descripcion")
    .in("id", unicos);
  return new Map(
    (data ?? []).map((o) => [
      String(o.id),
      {
        letra: String(o.letra_calificacion ?? ""),
        descripcion: String(o.descripcion ?? ""),
      },
    ]),
  );
}

function elegidoDesdeDetalle(
  det: DetalleRow,
  aspecto: AspectoEvaluacion,
  opcionesHistoricas: Map<string, OpcionHistorica>,
): OpcionHistorica | null {
  const historica = opcionesHistoricas.get(det.opcion_id);
  if (historica) return historica;

  const opcion =
    aspecto.opciones.find((o) => o.id === det.opcion_id) ??
    aspecto.opciones.find(
      (o) => num(o.valor_puntuacion) === num(det.puntuacion_obtenida),
    );
  if (!opcion) return null;
  return {
    letra: opcion.letra_calificacion,
    descripcion: opcion.descripcion,
  };
}

function hallarEvaluacion(
  filas: EvaluacionRow[],
  evaluadorId: string,
  evaluadoId: string,
  formularioId: string,
): EvaluacionRow | undefined {
  return filas.find(
    (e) =>
      e.evaluador_id === evaluadorId &&
      e.evaluado_id === evaluadoId &&
      e.formulario_id === formularioId,
  );
}

function dirigidoAParaRol(evaluadoEsJefe: boolean): DirigidoAAspecto {
  return evaluadoEsJefe ? "jefe" : "empleado";
}

function aspectosParaRol(
  form: EvaluacionPlantilla,
  evaluadoEsJefe: boolean,
): AspectoEvaluacion[] {
  const objetivo = dirigidoAParaRol(evaluadoEsJefe);
  return form.aspectos.filter((a) => a.dirigido_a === objetivo);
}

function plantillaParaRol(
  form: EvaluacionPlantilla,
  evaluadoEsJefe: boolean,
): EvaluacionPlantilla {
  return { ...form, aspectos: aspectosParaRol(form, evaluadoEsJefe) };
}

function puedeLlenar(params: {
  tipoVista: TipoVistaEvaluaciones;
  form: EvaluacionPlantilla;
  evaluadoId: string;
  perfil: PerfilEvaluaciones;
  deps: DependenciaNodo[];
  usuarios: UsuarioOrg[];
}): boolean {
  const { tipoVista, form, evaluadoId, perfil, deps, usuarios } = params;
  if (!form.activo) return false;
  if (!formularioEnVigencia(form.fecha_inicio, form.fecha_fin)) return false;
  const tipo = resolverTipoEvaluacion({
    tipoVista,
    evaluadorId: perfil.id,
    evaluadoId,
    dependenciaId: perfil.dependenciaId,
    oficinasACargo: perfil.oficinasACargo,
    deps,
    usuarios,
  });
  if (!tipo) return false;
  return aspectosParaRol(form, esJefeUsuario(evaluadoId, deps)).length > 0;
}

export async function obtenerPendientes(
  tipoVistaRaw: string,
): Promise<PendienteEvaluacion[]> {
  const parsedVista = tipoVistaEvaluacionesSchema.safeParse(tipoVistaRaw);
  if (!parsedVista.success) return [];
  const tipoVista = parsedVista.data;
  const perfil = await obtenerPerfilEvaluaciones();
  if (!perfil) return [];
  if (tipoVista === "rrhh") return [];
  const { supabase } = await sesion();
  const [deps, usuarios, plantillas, evaluaciones] = await Promise.all([
    cargarDependencias(supabase),
    cargarUsuarios(supabase),
    cargarPlantillas(supabase),
    cargarEvaluaciones(supabase),
  ]);
  const activas = plantillas.filter(
    (p) =>
      p.activo &&
      p.aspectos.length > 0 &&
      formularioEnVigencia(p.fecha_inicio, p.fecha_fin),
  );
  const completadas = evaluaciones.filter((e) => e.esta_completada);
  const detallesCompletadas = await cargarDetalles(
    supabase,
    completadas.map((e) => e.id),
  );
  const detallesPorEval = new Map<string, DetalleRow[]>();
  for (const detalle of detallesCompletadas) {
    const lista = detallesPorEval.get(detalle.evaluacion_id) ?? [];
    lista.push(detalle);
    detallesPorEval.set(detalle.evaluacion_id, lista);
  }
  const nombres = new Map(usuarios.map((u) => [u.user_id, u.nombre]));
  const pendientes: PendienteEvaluacion[] = [];

  const puntajeCompletada = (
    form: EvaluacionPlantilla,
    evaluadoEsJefe: boolean,
    evaluacionId: string,
  ) => {
    const aspectos = plantillaParaRol(form, evaluadoEsJefe).aspectos;
    const porAspecto = mapaPuntajes(
      detallesPorEval.get(evaluacionId) ?? [],
      aspectos,
    );
    const total = totalDeMapa(porAspecto);
    const max = maximoPosible(aspectos);
    const rango = rangoParaPuntaje(normalizarACien(total, max));
    return {
      puntaje_total: total,
      rango_nombre: rango?.nombre ?? null,
      rango_color: rango?.color ?? null,
    };
  };

  const push = (
    form: EvaluacionPlantilla,
    evaluadoId: string,
    evaluadoNombre: string,
    evaluadoEsJefe: boolean,
    tipoEvaluacion: TipoEvaluacion,
  ) => {
    if (aspectosParaRol(form, evaluadoEsJefe).length === 0) return;
    const existente = hallarEvaluacion(
      evaluaciones,
      perfil.id,
      evaluadoId,
      form.id,
    );
    const evaluado = usuarios.find((u) => u.user_id === evaluadoId);
    const ubicacion = ubicacionLaboralUsuario(
      evaluado?.dependencia_id ?? null,
      deps,
    );
    if (existente?.esta_completada) {
      const puntaje = puntajeCompletada(form, evaluadoEsJefe, existente.id);
      pendientes.push({
        formulario_id: form.id,
        formulario_nombre: form.nombre,
        formulario_fecha_inicio: form.fecha_inicio,
        tipo_evaluacion: tipoEvaluacion,
        evaluado_id: evaluadoId,
        evaluado_nombre: evaluadoNombre,
        evaluado_dependencia: ubicacion.dependencia,
        evaluacion_id: existente.id,
        es_borrador: false,
        esta_completada: true,
        puntaje_total: puntaje.puntaje_total,
        rango_nombre: puntaje.rango_nombre,
        rango_color: puntaje.rango_color,
        fecha_realizacion: fechaRealizacionDeEvaluaciones(
          [existente],
          detallesPorEval,
        ),
      });
      return;
    }
    pendientes.push({
      formulario_id: form.id,
      formulario_nombre: form.nombre,
      formulario_fecha_inicio: form.fecha_inicio,
      tipo_evaluacion: tipoEvaluacion,
      evaluado_id: evaluadoId,
      evaluado_nombre: evaluadoNombre,
      evaluado_dependencia: ubicacion.dependencia,
      evaluacion_id: existente?.id ?? null,
      es_borrador: Boolean(existente && !existente.esta_completada),
      esta_completada: false,
      puntaje_total: null,
      rango_nombre: null,
      rango_color: null,
      fecha_realizacion: null,
    });
  };

  const soyJefe = esJefeUsuario(perfil.id, deps);

  for (const form of activas) {
    push(form, perfil.id, perfil.nombre, soyJefe, "auto");

    if (soyJefe) {
      const subIds = idsSubordinados(
        perfil.id,
        perfil.oficinasACargo.map((o) => o.id),
        deps,
        usuarios.filter((u) => u.activo),
      );
      const porId = new Map(usuarios.map((u) => [u.user_id, u]));
      for (const subId of subIds) {
        const sub = porId.get(subId);
        if (sub) {
          push(
            form,
            subId,
            sub.nombre,
            esJefeUsuario(subId, deps),
            "jefe_a_subordinado",
          );
        }
      }
    } else {
      const jefeId = obtenerJefeId(perfil.id, perfil.dependenciaId, deps);
      if (jefeId) {
        push(
          form,
          jefeId,
          nombres.get(jefeId) ?? "Jefe",
          esJefeUsuario(jefeId, deps),
          "subordinado_a_jefe",
        );
      }
    }
  }

  return pendientes;
}

export async function obtenerParaLlenar(
  tipoVistaRaw: string,
  formularioId: string,
  evaluadoId: string,
): Promise<LlenarEvaluacionPayload | null> {
  const parsedVista = tipoVistaEvaluacionesSchema.safeParse(tipoVistaRaw);
  if (!parsedVista.success) return null;
  const perfil = await obtenerPerfilEvaluaciones();
  if (!perfil) return null;
  const { supabase } = await sesion();
  const [deps, usuarios, plantillas, evaluaciones] = await Promise.all([
    cargarDependencias(supabase),
    cargarUsuarios(supabase),
    cargarPlantillas(supabase),
    cargarEvaluaciones(supabase),
  ]);
  const form = plantillas.find((f) => f.id === formularioId);
  if (!form || form.aspectos.length === 0) return null;
  if (
    !puedeLlenar({
      tipoVista: parsedVista.data,
      form,
      evaluadoId,
      perfil,
      deps,
      usuarios,
    })
  ) {
    return null;
  }
  const existente = hallarEvaluacion(
    evaluaciones,
    perfil.id,
    evaluadoId,
    form.id,
  );
  const detalles = existente
    ? await cargarDetalles(supabase, [existente.id])
    : [];
  const respuestas: Record<string, string> = {};
  for (const d of detalles) {
    respuestas[d.aspecto_id] = d.opcion_id;
  }
  const evaluado = usuarios.find((u) => u.user_id === evaluadoId);
  const ubicacion = ubicacionLaboralUsuario(
    evaluado?.dependencia_id ?? null,
    deps,
  );
  const formParaRol = plantillaParaRol(form, esJefeUsuario(evaluadoId, deps));
  return {
    formulario: formParaRol,
    evaluado_id: evaluadoId,
    evaluado_nombre: evaluado?.nombre ?? "Evaluado",
    evaluado_puesto: ubicacion.puesto,
    evaluado_dependencia: ubicacion.dependencia,
    evaluacion_id: existente?.id ?? null,
    esta_completada: Boolean(existente?.esta_completada),
    respuestas,
  };
}

export async function guardarEvaluacion(
  tipoVistaRaw: string,
  input: unknown,
): Promise<AccionResultado> {
  try {
    const parsedVista = tipoVistaEvaluacionesSchema.safeParse(tipoVistaRaw);
    if (!parsedVista.success) return fail("NO_PERMITIDO");
    const parsed = guardarEvaluacionSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        "DATOS_INVALIDOS",
        mensajeErrorZodGuardarEvaluacion(parsed.error),
      );
    }
    const perfil = await obtenerPerfilEvaluaciones();
    if (!perfil) return fail("NO_SESION");
    const { supabase } = await sesion();
    const [deps, usuarios, plantillas, evaluaciones] = await Promise.all([
      cargarDependencias(supabase),
      cargarUsuarios(supabase),
      cargarPlantillas(supabase),
      cargarEvaluaciones(supabase),
    ]);
    const form = plantillas.find((f) => f.id === parsed.data.formulario_id);
    if (!form) return fail("NO_ENCONTRADO");
    if (form.aspectos.length === 0) return fail("SIN_ASPECTOS");
    if (
      !puedeLlenar({
        tipoVista: parsedVista.data,
        form,
        evaluadoId: parsed.data.evaluado_id,
        perfil,
        deps,
        usuarios,
      })
    ) {
      return fail("EVALUADO_INVALIDO");
    }
    const existente = hallarEvaluacion(
      evaluaciones,
      perfil.id,
      parsed.data.evaluado_id,
      form.id,
    );
    if (existente?.esta_completada) return fail("YA_COMPLETADA");
    const tipoEvaluacion = resolverTipoEvaluacion({
      tipoVista: parsedVista.data,
      evaluadorId: perfil.id,
      evaluadoId: parsed.data.evaluado_id,
      dependenciaId: perfil.dependenciaId,
      oficinasACargo: perfil.oficinasACargo,
      deps,
      usuarios,
    });
    if (!tipoEvaluacion) return fail("EVALUADO_INVALIDO");
    const formRol = plantillaParaRol(
      form,
      esJefeUsuario(parsed.data.evaluado_id, deps),
    );
    if (formRol.aspectos.length === 0) return fail("SIN_ASPECTOS");
    const opcionPorId = new Map(
      formRol.aspectos.flatMap((a) => a.opciones.map((o) => [o.id, o] as const)),
    );
    const aspectoIds = new Set(formRol.aspectos.map((a) => a.id));
    const respuestasValidas = parsed.data.respuestas.filter((r) => {
      const opcion = opcionPorId.get(r.opcion_id);
      return (
        aspectoIds.has(r.aspecto_id) &&
        opcion &&
        opcion.aspecto_id === r.aspecto_id
      );
    });
    if (parsed.data.respuestas.length > respuestasValidas.length) {
      return fail(
        "DATOS_INVALIDOS",
        "Hay respuestas que ya no son válidas. Vuelve a abrir la evaluación y selecciona de nuevo.",
      );
    }
    if (parsed.data.completar) {
      const cubiertos = new Set(respuestasValidas.map((r) => r.aspecto_id));
      const faltantes = formRol.aspectos.filter((aspecto) => !cubiertos.has(aspecto.id));
      if (faltantes.length > 0) {
        const nombres = faltantes.map((aspecto) => `«${aspecto.titulo}»`).join(", ");
        return fail(
          "ASPECTOS_INCOMPLETOS",
          faltantes.length === 1
            ? `Debes calificar ${nombres}.`
            : `Debes calificar todos los desempeños. Faltan: ${nombres}.`,
        );
      }
    }
    let evaluacionId = existente?.id;
    if (!evaluacionId) {
      const { data, error } = await supabase
        .from("evaluaciones")
        .insert({
          formulario_id: form.id,
          evaluador_id: perfil.id,
          evaluado_id: parsed.data.evaluado_id,
          tipo_evaluacion: tipoEvaluacion,
          esta_completada: parsed.data.completar,
        })
        .select("id")
        .single();
      if (error || !data) {
        return fail(
          "DATOS_INVALIDOS",
          mensajeErrorDb(error ?? {}, "No se pudo registrar la evaluación"),
        );
      }
      evaluacionId = String(data.id);
    } else {
      const { error } = await supabase
        .from("evaluaciones")
        .update({ esta_completada: parsed.data.completar })
        .eq("id", evaluacionId);
      if (error) {
        return fail(
          "DATOS_INVALIDOS",
          mensajeErrorDb(error, "No se pudo actualizar la evaluación"),
        );
      }
    }
    if (respuestasValidas.length > 0) {
      const { error } = await supabase.from("detalle_evaluaciones").upsert(
        respuestasValidas.map((r) => {
          const opcion = opcionPorId.get(r.opcion_id);
          return {
            evaluacion_id: evaluacionId,
            aspecto_id: r.aspecto_id,
            opcion_id: r.opcion_id,
            puntuacion_obtenida: opcion?.valor_puntuacion ?? 0,
          };
        }),
        { onConflict: "evaluacion_id,aspecto_id" },
      );
      if (error) {
        return fail(
          "DATOS_INVALIDOS",
          mensajeErrorDb(error, "No se pudieron guardar las respuestas"),
        );
      }
    }
    return ok(evaluacionId);
  } catch {
    return fail(
      "DATOS_INVALIDOS",
      "No se pudo guardar la evaluación. Intenta de nuevo.",
    );
  }
}

function mapaPuntajes(
  detalles: DetalleRow[],
  aspectos: AspectoEvaluacion[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const aspecto of aspectos) {
    const det = detalles.find((d) => d.aspecto_id === aspecto.id);
    if (det) out[aspecto.id] = det.puntuacion_obtenida;
  }
  return out;
}

function fechaRealizacionDeEvaluaciones(
  evaluaciones: EvaluacionRow[],
  detallesPorEval: Map<string, DetalleRow[]>,
): string | null {
  const fechas: string[] = [];
  for (const evaluacion of evaluaciones) {
    const detalles = detallesPorEval.get(evaluacion.id) ?? [];
    for (const detalle of detalles) {
      if (detalle.fecha_creacion) fechas.push(detalle.fecha_creacion);
    }
    if (detalles.length === 0 && evaluacion.fecha_creacion) {
      fechas.push(evaluacion.fecha_creacion);
    }
  }
  if (fechas.length === 0) return null;
  return fechas.sort((a, b) => b.localeCompare(a))[0] ?? null;
}

function mapaElecciones(
  evaluacionesOrden: EvaluacionRow[],
  detallesPorEval: Map<string, DetalleRow[]>,
  aspectos: AspectoEvaluacion[],
  opcionesHistoricas: Map<string, OpcionHistorica>,
): Record<string, OpcionHistorica> {
  const out: Record<string, OpcionHistorica> = {};
  for (const aspecto of aspectos) {
    for (const evaluacion of evaluacionesOrden) {
      const det = (detallesPorEval.get(evaluacion.id) ?? []).find(
        (fila) => fila.aspecto_id === aspecto.id,
      );
      if (!det) continue;
      const elegido = elegidoDesdeDetalle(det, aspecto, opcionesHistoricas);
      if (elegido) {
        out[aspecto.id] = elegido;
        break;
      }
    }
  }
  return out;
}

function armarResultado(params: {
  evaluadoId: string;
  evaluadoNombre: string;
  evaluadoPuesto: string | null;
  evaluadoDependencia: string | null;
  evaluadoEsJefe: boolean;
  form: EvaluacionPlantilla;
  evaluaciones: EvaluacionRow[];
  detallesPorEval: Map<string, DetalleRow[]>;
  opcionesHistoricas: Map<string, OpcionHistorica>;
  nombres: Map<string, string>;
}): ResultadoPersona {
  const {
    evaluadoId,
    evaluadoNombre,
    evaluadoPuesto,
    evaluadoDependencia,
    evaluadoEsJefe,
    form,
    evaluaciones,
    detallesPorEval,
    opcionesHistoricas,
    nombres,
  } = params;
  const delEvaluado = evaluaciones.filter(
    (e) =>
      e.evaluado_id === evaluadoId &&
      e.formulario_id === form.id &&
      e.esta_completada,
  );
  const autoEval = delEvaluado.find(
    (e) => parseTipo(e.tipo_evaluacion) === "auto",
  );
  const otras = delEvaluado.filter(
    (e) => parseTipo(e.tipo_evaluacion) !== "auto",
  );
  const auto = autoEval
    ? mapaPuntajes(detallesPorEval.get(autoEval.id) ?? [], form.aspectos)
    : null;
  const filasBrutas = otras.map((e) => {
    const por_aspecto = mapaPuntajes(
      detallesPorEval.get(e.id) ?? [],
      form.aspectos,
    );
    return {
      evaluacion_id: e.id,
      evaluador_id: e.evaluador_id,
      tipo_evaluacion: parseTipo(e.tipo_evaluacion),
      por_aspecto,
      total: totalDeMapa(por_aspecto),
    };
  });
  const filasExternasBrutas = filasBrutas.filter((fila) =>
    evaluadoEsJefe
      ? fila.tipo_evaluacion === "subordinado_a_jefe"
      : fila.tipo_evaluacion === "jefe_a_subordinado",
  );
  const empleadosPromedio =
    filasExternasBrutas.length > 0
      ? promedioPorClave(filasExternasBrutas.map((f) => f.por_aspecto))
      : null;
  const equipo =
    filasBrutas.length > 0
      ? promedioPorClave(filasBrutas.map((f) => f.por_aspecto))
      : null;
  const autoTotal = auto ? totalDeMapa(auto) : null;
  const equipoTotal = equipo ? totalDeMapa(equipo) : null;
  const externoTotal = empleadosPromedio
    ? totalDeMapa(empleadosPromedio)
    : null;
  let totalPromedio = 0;
  if (autoTotal !== null && externoTotal !== null) {
    totalPromedio = Math.round(((autoTotal + externoTotal) / 2) * 10) / 10;
  } else if (autoTotal !== null) {
    totalPromedio = autoTotal;
  } else if (externoTotal !== null) {
    totalPromedio = externoTotal;
  }
  const max = maximoPosible(form.aspectos);
  const normalizado = normalizarACien(totalPromedio, max);
  const evaluacionesEleccion = [
    ...(autoEval ? [autoEval] : []),
    ...otras,
  ];
  const elecciones = mapaElecciones(
    evaluacionesEleccion,
    detallesPorEval,
    form.aspectos,
    opcionesHistoricas,
  );
  const fecha_realizacion = fechaRealizacionDeEvaluaciones(
    delEvaluado,
    detallesPorEval,
  );
  const tipos_evaluacion = [
    ...new Set(
      delEvaluado
        .map((e) => parseTipo(e.tipo_evaluacion))
        .filter((t): t is TipoEvaluacion => t !== null),
    ),
  ];
  return {
    evaluado_id: evaluadoId,
    evaluado_nombre: evaluadoNombre,
    evaluado_puesto: evaluadoPuesto,
    evaluado_dependencia: evaluadoDependencia,
    evaluado_es_jefe: evaluadoEsJefe,
    formulario_id: form.id,
    formulario_nombre: form.nombre,
    tipos_evaluacion,
    aspectos: form.aspectos.map((a) => ({
      id: a.id,
      titulo: a.titulo,
      descripcion: a.descripcion,
      elegido: elecciones[a.id] ?? null,
    })),
    filas_anonimas: filasAnonimasDesdeTotales(filasBrutas),
    filas_empleados: filasExternasDesdeTotales(filasExternasBrutas, nombres),
    empleados_promedio: empleadosPromedio,
    empleados_total: empleadosPromedio ? totalDeMapa(empleadosPromedio) : null,
    auto,
    auto_total: autoTotal,
    equipo,
    equipo_total: equipoTotal,
    total_promedio: totalPromedio,
    rango: rangoParaPuntaje(normalizado),
    fecha_realizacion,
  };
}

export async function obtenerResultados(
  tipoVistaRaw: string,
  evaluadoFiltro?: string | null,
): Promise<ResultadoPersona[]> {
  const parsedVista = tipoVistaEvaluacionesSchema.safeParse(tipoVistaRaw);
  if (!parsedVista.success) return [];
  const tipoVista = parsedVista.data;
  const perfil = await obtenerPerfilEvaluaciones();
  if (!perfil) return [];
  if (tipoVista === "jefe" && !perfil.esJefe) return [];
  if (tipoVista === "rrhh" && !esRolRRHH(perfil.rol)) return [];
  const { supabase } = await sesion();
  const [deps, usuarios, plantillas, evaluaciones] = await Promise.all([
    cargarDependencias(supabase),
    cargarUsuarios(supabase),
    cargarPlantillas(supabase),
    cargarEvaluaciones(supabase),
  ]);
  const completadas = evaluaciones.filter((e) => e.esta_completada);
  const detalles = await cargarDetalles(
    supabase,
    completadas.map((e) => e.id),
  );
  const detallesPorEval = new Map<string, DetalleRow[]>();
  for (const d of detalles) {
    const lista = detallesPorEval.get(d.evaluacion_id) ?? [];
    lista.push(d);
    detallesPorEval.set(d.evaluacion_id, lista);
  }
  const opcionesHistoricas = await cargarOpcionesHistoricas(
    supabase,
    detalles.map((d) => d.opcion_id),
  );
  const nombres = new Map(usuarios.map((u) => [u.user_id, u.nombre]));
  const evaluadoIds = new Set<string>();

  if (tipoVista === "propia") {
    evaluadoIds.add(perfil.id);
    for (const e of completadas) {
      if (e.evaluador_id !== perfil.id) continue;
      const tipo = parseTipo(e.tipo_evaluacion);
      if (tipo === "subordinado_a_jefe" || tipo === "jefe_a_subordinado") {
        evaluadoIds.add(e.evaluado_id);
      }
    }
  } else if (tipoVista === "jefe") {
    evaluadoIds.add(perfil.id);
    for (const id of idsSubordinados(
      perfil.id,
      perfil.oficinasACargo.map((o) => o.id),
      deps,
      usuarios.filter((u) => u.activo),
    )) {
      evaluadoIds.add(id);
    }
  } else {
    for (const e of completadas) evaluadoIds.add(e.evaluado_id);
  }

  if (evaluadoFiltro) {
    if (!evaluadoIds.has(evaluadoFiltro) && tipoVista !== "rrhh") return [];
    evaluadoIds.clear();
    evaluadoIds.add(evaluadoFiltro);
  }

  const usuariosPorId = new Map(usuarios.map((u) => [u.user_id, u]));

  const resultados: ResultadoPersona[] = [];
  for (const evaluadoId of evaluadoIds) {
    const usuario = usuariosPorId.get(evaluadoId);
    const ubicacion = ubicacionLaboralUsuario(
      usuario?.dependencia_id ?? null,
      deps,
    );
    const formsIds = new Set(
      completadas
        .filter((e) => e.evaluado_id === evaluadoId)
        .map((e) => e.formulario_id),
    );
    for (const formId of formsIds) {
      const form = plantillas.find((f) => f.id === formId);
      if (!form) continue;
      const evaluadoEsJefe = esJefeDeDependencia(
        evaluadoId,
        ubicacion.dependencia,
        deps,
      );
      const resultado = armarResultado({
        evaluadoId,
        evaluadoNombre: nombres.get(evaluadoId) ?? "Evaluado",
        evaluadoPuesto: ubicacion.puesto,
        evaluadoDependencia: ubicacion.dependencia,
        evaluadoEsJefe,
        form: plantillaParaRol(form, evaluadoEsJefe),
        evaluaciones: completadas,
        detallesPorEval,
        opcionesHistoricas,
        nombres,
      });
      if (
        resultado.auto ||
        resultado.equipo ||
        resultado.filas_anonimas.length > 0 ||
        resultado.filas_empleados.length > 0
      ) {
        resultados.push(resultado);
      }
    }
  }
  return resultados;
}

export async function listarPendientesEnvio(): Promise<PendienteEnvio[]> {
  const perfil = await obtenerPerfilEvaluaciones();
  if (!perfil || !esRolRRHH(perfil.rol)) return [];
  const { supabase } = await sesion();
  const [deps, usuarios, plantillas, evaluaciones] = await Promise.all([
    cargarDependencias(supabase),
    cargarUsuarios(supabase),
    cargarPlantillas(supabase),
    cargarEvaluaciones(supabase),
  ]);
  const activas = plantillas.filter(
    (p) =>
      p.activo &&
      p.aspectos.length > 0 &&
      formularioEnVigencia(p.fecha_inicio, p.fecha_fin),
  );
  const activos = usuarios.filter((u) => u.activo);
  const nombres = new Map(activos.map((u) => [u.user_id, u.nombre]));
  const out: PendienteEnvio[] = [];

  const falta = (
    form: EvaluacionPlantilla,
    evaluadorId: string,
    evaluadoId: string,
  ) => {
    const ev = hallarEvaluacion(evaluaciones, evaluadorId, evaluadoId, form.id);
    return !ev?.esta_completada;
  };

  const push = (
    form: EvaluacionPlantilla,
    evaluadorId: string,
    evaluadorNombre: string,
    evaluadoId: string,
    evaluadoNombre: string,
    tipoEvaluacion: TipoEvaluacion,
  ) => {
    if (aspectosParaRol(form, esJefeUsuario(evaluadoId, deps)).length === 0) {
      return;
    }
    if (!falta(form, evaluadorId, evaluadoId)) return;
    out.push({
      formulario_id: form.id,
      formulario_nombre: form.nombre,
      tipo_evaluacion: tipoEvaluacion,
      evaluador_id: evaluadorId,
      evaluador_nombre: evaluadorNombre,
      evaluado_id: evaluadoId,
      evaluado_nombre: evaluadoNombre,
    });
  };

  for (const form of activas) {
    for (const u of activos) {
      const soyJefe = esJefeUsuario(u.user_id, deps);
      push(form, u.user_id, u.nombre, u.user_id, u.nombre, "auto");

      if (soyJefe) {
        const oficinas = deps
          .filter((d) => d.jefe_id === u.user_id)
          .map((d) => d.id);
        const subs = idsSubordinados(u.user_id, oficinas, deps, activos);
        for (const subId of subs) {
          const sub = activos.find((s) => s.user_id === subId);
          if (!sub) continue;
          push(
            form,
            u.user_id,
            u.nombre,
            subId,
            sub.nombre,
            "jefe_a_subordinado",
          );
        }
      } else {
        const jefeId = obtenerJefeId(u.user_id, u.dependencia_id, deps);
        if (jefeId) {
          push(
            form,
            u.user_id,
            u.nombre,
            jefeId,
            nombres.get(jefeId) ?? "Jefe",
            "subordinado_a_jefe",
          );
        }
      }
    }
  }
  return out;
}
