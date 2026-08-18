"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export type Asueto = {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  nombre: string;
  descripcion: string | null;
  dependencias_excluidas: string[];
  creado_por: string | null;
  created_at: string;
};

function normalizarExcluidas(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((id): id is string => typeof id === "string" && id.length > 0);
}

function parseDependenciasExcluidas(formData: FormData): string[] {
  const raw = formData.get("dependencias_excluidas");
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return normalizarExcluidas(parsed);
  } catch {
    return [];
  }
}

function mapAsueto(row: Record<string, unknown>): Asueto {
  return {
    id: String(row.id),
    fecha_inicio: String(row.fecha_inicio),
    fecha_fin: String(row.fecha_fin),
    nombre: String(row.nombre),
    descripcion: (row.descripcion as string | null) ?? null,
    dependencias_excluidas: normalizarExcluidas(row.dependencias_excluidas),
    creado_por: (row.creado_por as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

async function verificarRRHH(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("usuarios_roles")
    .select(`roles (nombre)`)
    .eq("user_id", userId);
  const roles =
    (data || []).flatMap((item) => {
      const rol = item.roles as { nombre?: string } | { nombre?: string }[] | null;
      if (!rol) return [];
      if (Array.isArray(rol)) return rol.map((r) => r.nombre).filter(Boolean);
      return rol.nombre ? [rol.nombre] : [];
    }) as string[];
  return roles.some((r) => ["RRHH", "SECRETARIO", "SUPER"].includes(r));
}

export async function obtenerAsuetos(anio?: number, mes?: number): Promise<Asueto[]> {
  const supabase = await createClient();
  let query = supabase
    .from("asuetos")
    .select("*")
    .order("fecha_inicio", { ascending: true });

  if (anio && mes) {
    const mesInicio = `${anio}-${String(mes).padStart(2, "0")}-01`;
    const lastDay = new Date(anio, mes, 0).getDate();
    const mesFin = `${anio}-${String(mes).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    query = query.lte("fecha_inicio", mesFin).gte("fecha_fin", mesInicio);
  }

  const { data, error } = await query;
  if (error) return [];
  return (data || []).map((row) => mapAsueto(row as Record<string, unknown>));
}

export async function obtenerAsuetosRango(
  rangoInicio: string,
  rangoFin: string,
): Promise<Asueto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("asuetos")
    .select("*")
    .lte("fecha_inicio", rangoFin)
    .gte("fecha_fin", rangoInicio)
    .order("fecha_inicio", { ascending: true });

  if (error) return [];
  return (data || []).map((row) => mapAsueto(row as Record<string, unknown>));
}

export async function crearAsueto(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autorizado" };

  const esRRHH = await verificarRRHH(supabase, user.id);
  if (!esRRHH) return { ok: false, error: "No tiene permisos para esta acción" };

  const fecha_inicio = formData.get("fecha_inicio") as string;
  const fecha_fin = formData.get("fecha_fin") as string;
  const nombre = formData.get("nombre") as string;
  const descripcion = formData.get("descripcion") as string;
  const dependencias_excluidas = parseDependenciasExcluidas(formData);

  if (!fecha_inicio || !fecha_fin || !nombre)
    return { ok: false, error: "Fecha inicio, fecha fin y nombre son requeridos" };

  if (fecha_fin < fecha_inicio)
    return { ok: false, error: "La fecha fin no puede ser anterior a la fecha inicio" };

  const { error } = await supabase.from("asuetos").insert({
    fecha_inicio,
    fecha_fin,
    nombre,
    descripcion: descripcion || null,
    dependencias_excluidas,
    creado_por: user.id,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/sigem/permisos/rrhh");
  revalidatePath("/sigem/mis-asistencias");
  return { ok: true };
}

export async function actualizarAsueto(
  id: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autorizado" };

  const esRRHH = await verificarRRHH(supabase, user.id);
  if (!esRRHH) return { ok: false, error: "No tiene permisos para esta acción" };

  const fecha_inicio = formData.get("fecha_inicio") as string;
  const fecha_fin = formData.get("fecha_fin") as string;
  const nombre = formData.get("nombre") as string;
  const descripcion = formData.get("descripcion") as string;
  const dependencias_excluidas = parseDependenciasExcluidas(formData);

  if (!fecha_inicio || !fecha_fin || !nombre)
    return { ok: false, error: "Fecha inicio, fecha fin y nombre son requeridos" };

  if (fecha_fin < fecha_inicio)
    return { ok: false, error: "La fecha fin no puede ser anterior a la fecha inicio" };

  const { error } = await supabase
    .from("asuetos")
    .update({
      fecha_inicio,
      fecha_fin,
      nombre,
      descripcion: descripcion || null,
      dependencias_excluidas,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/sigem/permisos/rrhh");
  revalidatePath("/sigem/mis-asistencias");
  return { ok: true };
}

export async function eliminarAsueto(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autorizado" };

  const esRRHH = await verificarRRHH(supabase, user.id);
  if (!esRRHH) return { ok: false, error: "No tiene permisos para esta acción" };

  const { error } = await supabase.from("asuetos").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/sigem/permisos/rrhh");
  revalidatePath("/sigem/mis-asistencias");
  return { ok: true };
}
