"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/lib/database.types";
import {
  COPIAR_ANIO_ERRORES,
  copiarDependenciasPasoSchema,
  type CopiarAnioError,
  type CopiarAnioPasoResultado,
} from "./zod";

type DependenciaRow = Database["public"]["Tables"]["dependencias"]["Row"];
type DependenciaInsert = Database["public"]["Tables"]["dependencias"]["Insert"];
type ContratoInsert = Database["public"]["Tables"]["contrato"]["Insert"];
type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

const ROLES_PERMITIDOS = new Set(["SUPER", "SECRETARIO"]);

function anioGuatemala(): number {
  return Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Guatemala",
      year: "numeric",
    }).format(new Date()),
  );
}

function fail(
  code: keyof typeof COPIAR_ANIO_ERRORES,
  detalle?: string,
): CopiarAnioError {
  return { ok: false, code, message: detalle ?? COPIAR_ANIO_ERRORES[code] };
}

function mensajeErrorCopia(
  error: { code?: string; message?: string } | null | undefined,
  contexto: string,
): string {
  const codigo = error?.code ?? "";
  const msg = (error?.message ?? "").toLowerCase();
  if (codigo === "23503") {
    return `${contexto} Hay una relación que impide guardar el registro.`;
  }
  if (codigo === "23505") {
    return `${contexto} Ya existe un registro duplicado.`;
  }
  if (codigo === "23502") {
    const col = (error?.message ?? "").match(/column "([^"]+)"/i)?.[1];
    if (col === "fecha_inicio") {
      return `${contexto} Falta la fecha de inicio del contrato.`;
    }
    return `${contexto} Falta un dato obligatorio.`;
  }
  if (codigo === "42501" || msg.includes("permission") || msg.includes("rls")) {
    return `${contexto} No tiene permiso para guardar.`;
  }
  if (
    codigo === "57014" ||
    msg.includes("abort") ||
    msg.includes("timeout") ||
    msg.includes("timed out")
  ) {
    return `${contexto} La operación tardó demasiado. Intente de nuevo.`;
  }
  return contexto;
}

function lotesDe<T>(items: T[], tamano: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < items.length; i += tamano) {
    lotes.push(items.slice(i, i + tamano));
  }
  return lotes;
}

function perteneceAlAnio(
  fila: DependenciaRow,
  anio: number,
  anioActual: number,
): boolean {
  return (fila.anio ?? anioActual) === anio;
}

function profundidad(
  id: string,
  porId: Map<string, DependenciaRow>,
  memo: Map<string, number>,
  pila: Set<string>,
): number {
  const cache = memo.get(id);
  if (cache !== undefined) return cache;
  if (pila.has(id)) {
    memo.set(id, 0);
    return 0;
  }
  const fila = porId.get(id);
  if (!fila || !fila.parent_id || !porId.has(fila.parent_id)) {
    memo.set(id, 0);
    return 0;
  }
  pila.add(id);
  const valor = profundidad(fila.parent_id, porId, memo, pila) + 1;
  pila.delete(id);
  memo.set(id, valor);
  return valor;
}

function claveJerarquica(
  fila: DependenciaRow,
  porId: Map<string, DependenciaRow>,
): string {
  const partes: string[] = [];
  const vistos = new Set<string>();
  let actual: DependenciaRow | undefined = fila;
  while (actual && !vistos.has(actual.id)) {
    vistos.add(actual.id);
    partes.unshift(`${actual.no ?? ""}|${actual.nombre.trim()}`);
    actual = actual.parent_id ? porId.get(actual.parent_id) : undefined;
  }
  return partes.join("/");
}

function mapaOrigenADestino(
  origen: DependenciaRow[],
  destino: DependenciaRow[],
): Record<string, string> {
  const porIdDest = new Map(destino.map((fila) => [fila.id, fila]));
  const destPorClave = new Map<string, string[]>();
  for (const fila of destino) {
    const clave = claveJerarquica(fila, porIdDest);
    const lista = destPorClave.get(clave) ?? [];
    lista.push(fila.id);
    destPorClave.set(clave, lista);
  }
  const porIdOrigen = new Map(origen.map((fila) => [fila.id, fila]));
  const mapa: Record<string, string> = {};
  for (const fila of origen) {
    const clave = claveJerarquica(fila, porIdOrigen);
    const candidatos = destPorClave.get(clave);
    if (!candidatos || candidatos.length === 0) continue;
    const destId = candidatos.shift();
    if (!destId) continue;
    mapa[fila.id] = destId;
  }
  return mapa;
}

function fechaDia(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const dia = valor.split("T")[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : null;
}

function esRenglon011(renglon: string | null | undefined): boolean {
  const valor = (renglon ?? "").trim();
  return valor === "011" || valor.startsWith("011");
}

async function exigirPermiso(): Promise<
  { ok: true; supabase: SupabaseServer } | CopiarAnioError
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("NO_SESION");
  const { data: rolesData } = await supabase
    .from("usuarios_roles")
    .select("roles (nombre)")
    .eq("user_id", user.id);
  const rolesUsuario = (rolesData ?? []).flatMap((item) => {
    const roles = item.roles as
      | { nombre: string }
      | { nombre: string }[]
      | null;
    if (!roles) return [];
    return Array.isArray(roles) ? roles.map((r) => r.nombre) : [roles.nombre];
  });
  if (!rolesUsuario.some((nombre) => ROLES_PERMITIDOS.has(nombre))) {
    return fail("NO_PERMITIDO");
  }
  return { ok: true, supabase };
}

async function cargarOrigen(
  supabase: SupabaseServer,
  anioOrigen: number,
): Promise<{ ok: true; origen: DependenciaRow[] } | CopiarAnioError> {
  const anioActual = anioGuatemala();
  let origenQuery = supabase.from("dependencias").select("*").limit(5000);
  origenQuery =
    anioOrigen === anioActual
      ? origenQuery.or(`anio.eq.${anioOrigen},anio.is.null`)
      : origenQuery.eq("anio", anioOrigen);
  const { data: origenBruto, error: errorLectura } = await origenQuery;
  if (errorLectura || !origenBruto) {
    return fail(
      "ERROR_LECTURA",
      mensajeErrorCopia(
        errorLectura,
        "No se pudieron leer las dependencias de origen.",
      ),
    );
  }
  const origen = origenBruto.filter((fila) =>
    perteneceAlAnio(fila, anioOrigen, anioActual),
  );
  if (origen.length === 0) return fail("ORIGEN_VACIO");
  return { ok: true, origen };
}

function construirLotes(
  origen: DependenciaRow[],
  idNuevo: Map<string, string>,
): { porNivel: Map<number, DependenciaInsert[]>; niveles: number[] } {
  const idsOrigen = new Set(origen.map((fila) => fila.id));
  const porId = new Map(origen.map((fila) => [fila.id, fila]));
  const memo = new Map<string, number>();
  const porNivel = new Map<number, DependenciaInsert[]>();
  const anioDestinoPlaceholder = 0;

  origen.forEach((fila) => {
    const nivel = profundidad(fila.id, porId, memo, new Set());
    const parentId =
      fila.parent_id && idsOrigen.has(fila.parent_id)
        ? (idNuevo.get(fila.parent_id) ?? null)
        : null;
    const insert: DependenciaInsert = {
      id: idNuevo.get(fila.id),
      nombre: fila.nombre,
      parent_id: parentId,
      descripcion: fila.descripcion,
      no: fila.no,
      es_puesto: fila.es_puesto ?? false,
      salario: fila.salario,
      bonificacion: fila.bonificacion,
      renglon: fila.renglon,
      anio: anioDestinoPlaceholder,
      antiguedad: fila.antiguedad,
      representacion: fila.representacion,
      dietas: fila.dietas,
      unidades_tiempo: fila.unidades_tiempo,
      jefe_id: fila.jefe_id,
      isr: fila.isr,
      plan_prestaciones: fila.plan_prestaciones,
      prima: fila.prima,
    };
    const grupo = porNivel.get(nivel) ?? [];
    grupo.push(insert);
    porNivel.set(nivel, grupo);
  });

  return {
    porNivel,
    niveles: [...porNivel.keys()].sort((a, b) => a - b),
  };
}

export async function copiarDependenciasAnioPaso(
  payload: unknown,
): Promise<CopiarAnioPasoResultado> {
  try {
    const parsed = copiarDependenciasPasoSchema.safeParse(payload);
    if (!parsed.success) return fail("DATOS_INVALIDOS");

    const { anioOrigen, anioDestino, fase, nivel, mapaIds } = parsed.data;
    const permiso = await exigirPermiso();
    if (!permiso.ok) return permiso;
    const { supabase } = permiso;
    const anioActual = anioGuatemala();

    if (fase === "preparar") {
      let destinoQuery = supabase
        .from("dependencias")
        .select("id", { count: "exact", head: true });
      destinoQuery =
        anioDestino === anioActual
          ? destinoQuery.or(`anio.eq.${anioDestino},anio.is.null`)
          : destinoQuery.eq("anio", anioDestino);
      const { count: countDestino, error: errorDestino } = await destinoQuery;
      if (errorDestino) {
        return fail(
          "ERROR_LECTURA",
          mensajeErrorCopia(
            errorDestino,
            "No se pudo verificar si el año destino ya tiene dependencias.",
          ),
        );
      }
      const origenRes = await cargarOrigen(supabase, anioOrigen);
      if (!origenRes.ok) return origenRes;

      if ((countDestino ?? 0) > 0) {
        const destRes = await cargarOrigen(supabase, anioDestino);
        if (!destRes.ok) return destRes;
        const mapa = mapaOrigenADestino(origenRes.origen, destRes.origen);
        if (Object.keys(mapa).length === 0) return fail("DESTINO_OCUPADO");
        return {
          ok: true,
          fase: "preparar",
          mapaIds: mapa,
          niveles: 0,
          total: origenRes.origen.length,
        };
      }

      const mapa: Record<string, string> = {};
      origenRes.origen.forEach((fila) => {
        mapa[fila.id] = randomUUID();
      });
      const idNuevo = new Map(Object.entries(mapa));
      const { niveles } = construirLotes(origenRes.origen, idNuevo);
      return {
        ok: true,
        fase: "preparar",
        mapaIds: mapa,
        niveles: niveles.length,
        total: origenRes.origen.length,
      };
    }

    if (!mapaIds || Object.keys(mapaIds).length === 0) {
      return fail("DATOS_INVALIDOS");
    }

    const origenRes = await cargarOrigen(supabase, anioOrigen);
    if (!origenRes.ok) return origenRes;
    const idNuevo = new Map(Object.entries(mapaIds));
    const { porNivel, niveles } = construirLotes(origenRes.origen, idNuevo);

    if (fase === "estructura") {
      if (nivel === undefined || nivel < 0 || nivel >= niveles.length) {
        return fail("DATOS_INVALIDOS");
      }
      const claveNivel = niveles[nivel];
      const lote = (porNivel.get(claveNivel) ?? []).map((fila) => ({
        ...fila,
        anio: anioDestino,
      }));
      if (lote.length > 0) {
        const { error: errorInsert } = await supabase
          .from("dependencias")
          .insert(lote);
        if (errorInsert) {
          await supabase.from("dependencias").delete().eq("anio", anioDestino);
          return fail(
            "ERROR_ESTRUCTURA",
            mensajeErrorCopia(
              errorInsert,
              `No se pudo copiar el nivel ${nivel + 1} de la organización.`,
            ),
          );
        }
      }
      return {
        ok: true,
        fase: "estructura",
        nivel,
        niveles: niveles.length,
      };
    }

    const idsOrigenList = origenRes.origen.map((fila) => fila.id);
    const idsDestinoList = [
      ...new Set(
        origenRes.origen
          .map((fila) => idNuevo.get(fila.id))
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    type AsignadoFila = { user_id: string; dependencia_id: string | null };
    type ContratoFila = {
      user_id: string;
      dependencia_id: string | null;
      fecha_inicio: string | null;
      fecha_fin: string | null;
    };
    const asignados: AsignadoFila[] = [];
    const contratosOrigen: ContratoFila[] = [];
    const ocupadosDestino = new Set<string>();
    for (const lote of lotesDe(idsOrigenList, 200)) {
      const { data: asignadosLote } = await supabase
        .from("info_usuario")
        .select("user_id, dependencia_id")
        .in("dependencia_id", lote);
      if (asignadosLote) asignados.push(...asignadosLote);
      const { data: contratosLote } = await supabase
        .from("contrato")
        .select("user_id, dependencia_id, fecha_inicio, fecha_fin, created_at")
        .in("dependencia_id", lote)
        .order("created_at", { ascending: false });
      if (contratosLote) contratosOrigen.push(...contratosLote);
    }
    for (const lote of lotesDe(idsDestinoList, 200)) {
      const { data: destContratos } = await supabase
        .from("contrato")
        .select("dependencia_id")
        .in("dependencia_id", lote);
      for (const fila of destContratos ?? []) {
        if (fila.dependencia_id) ocupadosDestino.add(fila.dependencia_id);
      }
    }

    const renglonPorOrigen = new Map(
      origenRes.origen.map((fila) => [fila.id, fila.renglon]),
    );
    const fechasPorUsuario = new Map<
      string,
      { fecha_inicio: string | null; fecha_fin: string | null }
    >();
    const userIdsFecha = [
      ...new Set(
        [...contratosOrigen, ...asignados]
          .map((fila) => fila.user_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    for (const lote of lotesDe(userIdsFecha, 200)) {
      const { data: contratosUsuario } = await supabase
        .from("contrato")
        .select("user_id, fecha_inicio, fecha_fin, created_at")
        .in("user_id", lote)
        .not("fecha_inicio", "is", null)
        .order("created_at", { ascending: false });
      for (const fila of contratosUsuario ?? []) {
        if (!fila.user_id || fechasPorUsuario.has(fila.user_id)) continue;
        fechasPorUsuario.set(fila.user_id, {
          fecha_inicio: fila.fecha_inicio,
          fecha_fin: fila.fecha_fin,
        });
      }
    }

    const yaCopiado = new Set<string>();
    const contratosNuevos: ContratoInsert[] = [];

    const agregarAsignacion = (
      userId: string,
      origenDepId: string,
      fechas?: { fecha_inicio: string | null; fecha_fin: string | null },
    ) => {
      const nuevoDepId = idNuevo.get(origenDepId);
      if (!nuevoDepId) return;
      if (ocupadosDestino.has(nuevoDepId)) return;
      const clave = `${userId}:${nuevoDepId}`;
      if (yaCopiado.has(clave)) return;
      yaCopiado.add(clave);
      ocupadosDestino.add(nuevoDepId);
      const es011 = esRenglon011(renglonPorOrigen.get(origenDepId));
      const fechas011 = fechas ?? fechasPorUsuario.get(userId);
      const fila: ContratoInsert = {
        id: randomUUID(),
        user_id: userId,
        dependencia_id: nuevoDepId,
        fecha_inicio: es011
          ? (fechaDia(fechas011?.fecha_inicio) ?? `${anioDestino}-01-01`)
          : `${anioDestino}-01-01`,
      };
      if (es011) {
        const fechaFin = fechaDia(fechas011?.fecha_fin);
        if (fechaFin) fila.fecha_fin = fechaFin;
      } else {
        fila.fecha_fin = `${anioDestino}-12-31`;
      }
      contratosNuevos.push(fila);
    };

    for (const contrato of contratosOrigen) {
      if (!contrato.user_id || !contrato.dependencia_id) continue;
      agregarAsignacion(contrato.user_id, contrato.dependencia_id, {
        fecha_inicio: contrato.fecha_inicio,
        fecha_fin: contrato.fecha_fin,
      });
    }
    for (const asignado of asignados) {
      if (!asignado.user_id || !asignado.dependencia_id) continue;
      agregarAsignacion(asignado.user_id, asignado.dependencia_id);
    }

    if (contratosNuevos.length > 0) {
      for (const lote of lotesDe(contratosNuevos, 200)) {
        const { error: errorContratos } = await supabase
          .from("contrato")
          .insert(lote);
        if (errorContratos) {
          return fail(
            "ERROR_ASIGNACIONES",
            mensajeErrorCopia(
              errorContratos,
              "La estructura se copió, pero no se pudieron copiar las personas asignadas.",
            ),
          );
        }
      }
    }

    return {
      ok: true,
      fase: "asignaciones",
      copiadas: origenRes.origen.length,
      asignadas: contratosNuevos.length,
    };
  } catch (error) {
    const err = error as { message?: string } | undefined;
    return fail(
      "ERROR_COPIA",
      mensajeErrorCopia(
        { message: err?.message },
        "Ocurrió un problema al duplicar la organización.",
      ),
    );
  }
}
