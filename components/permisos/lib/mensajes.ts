"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { obtenerPerfilUsuario } from "../acciones";
import { obtenerJefeIdEmpleado } from "./notificaciones";

async function usuarioPuedeVerBloqueoPermiso(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  permisoUserId: string,
  rol: string | null,
): Promise<boolean> {
  if (permisoUserId === userId) return true;
  if (rol === "RRHH") return true;
  const jefeId = await obtenerJefeIdEmpleado(supabase, permisoUserId);
  return jefeId === userId;
}

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

  if (!data) return { success: true, data: null };

  let empleadoNombre: string | null = null;
  let permisoTipo: string | null = null;

  const { data: permiso } = await supabase
    .from("permisos_empleado")
    .select("tipo, user_id")
    .eq("id", data.permiso_id)
    .maybeSingle();

  if (permiso) {
    permisoTipo = permiso.tipo ?? null;
    if (permiso.user_id) {
      const perfil = await obtenerPerfilUsuario();
      const puedeVer = perfil
        ? await usuarioPuedeVerBloqueoPermiso(
            supabase,
            user.id,
            permiso.user_id,
            perfil.rol,
          )
        : false;

      if (!puedeVer) {
        await supabase
          .from("permisos_mensajes")
          .update({ leido_at: new Date().toISOString() })
          .eq("id", data.id)
          .eq("user_id", user.id)
          .is("leido_at", null);
        return { success: true, data: null };
      }

      const { data: info } = await supabase
        .from("info_usuario")
        .select("nombre")
        .eq("user_id", permiso.user_id)
        .maybeSingle();
      empleadoNombre = info?.nombre?.trim() ?? null;
    }
  }

  return {
    success: true,
    data: {
      ...data,
      empleado_nombre: empleadoNombre,
      permiso_tipo: permisoTipo,
    },
  };
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
