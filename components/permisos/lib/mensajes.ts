"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function obtenerMensajePendientePermiso() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, data: null };

  const { data, error } = await supabase
    .from("permisos_mensajes")
    .select("id, permiso_id, evento, titulo, mensaje, created_at")
    .eq("user_id", user.id)
    .is("leido_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching permiso mensaje:", error);
    return { success: false, data: null };
  }

  return { success: true, data: data ?? null };
}

export async function confirmarMensajePermiso(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "No autenticado" };

  const leidoAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("permisos_mensajes")
    .update({ leido_at: leidoAt })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("leido_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Error confirming permiso mensaje:", error);
    return { success: false, error: error.message };
  }

  if (!data) {
    return { success: false, error: "No se pudo marcar como leído" };
  }

  revalidatePath("/protected/permisos", "layout");
  revalidatePath("/protected/permisos/acuerdos", "layout");
  return { success: true, leido_at: leidoAt };
}
