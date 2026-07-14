"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { obtenerPerfilUsuario } from "../acciones";
import { obtenerJefeIdEmpleado } from "./notificaciones";
import type { LecturaNotificacion } from "../types";

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function puedeEliminarMensajes(rol: string | null): boolean {
  return ["RRHH", "SECRETARIO", "SUPER"].includes(rol || "");
}

function revalidarRutasLecturas() {
  revalidatePath("/protected/permisos", "layout");
  revalidatePath("/protected/permisos/acuerdos", "layout");
  revalidatePath("/protected/permisos/lecturas", "layout");
}

export type TipoVistaLecturas =
  | "mis_lecturas"
  | "gestion_jefe"
  | "gestion_rrhh";

type PermisoJoin = { tipo: string; user_id: string };

type MensajeRow = {
  id: string;
  permiso_id: string;
  user_id: string;
  evento: string;
  titulo: string;
  mensaje: string;
  created_at: string;
  leido_at: string | null;
  permisos_empleado: PermisoJoin | PermisoJoin[] | null;
};

type UsuarioRpc = {
  id: string;
  dependencia_id: string | null;
  oficina_nombre: string | null;
};

function unwrapPermiso(
  permiso: MensajeRow["permisos_empleado"],
): PermisoJoin | null {
  if (!permiso) return null;
  return Array.isArray(permiso) ? (permiso[0] ?? null) : permiso;
}

function usuarioEnOficinasJefe(
  usuario: UsuarioRpc,
  idsOficinas: string[],
  nombresOficinas: string[],
): boolean {
  const depId = usuario.dependencia_id;
  const depNombre = usuario.oficina_nombre?.toLowerCase().trim();
  return (
    (!!depId && idsOficinas.includes(depId)) ||
    (!!depNombre && nombresOficinas.includes(depNombre))
  );
}

export async function obtenerLecturasNotificaciones(
  tipoVista: TipoVistaLecturas,
): Promise<LecturaNotificacion[]> {
  const supabase = await createClient();
  const perfil = await obtenerPerfilUsuario();
  if (!perfil) return [];

  const esRRHH = ["RRHH", "SUPER", "SECRETARIO"].includes(perfil.rol || "");
  const idsOficinasJefe = perfil.oficinasACargo.map((o) => o.id);
  const nombresOficinasJefe = perfil.oficinasACargo.map((o) =>
    o.nombre.toLowerCase().trim(),
  );

  if (tipoVista === "gestion_rrhh" && !esRRHH) return [];
  if (tipoVista === "gestion_jefe" && idsOficinasJefe.length === 0) return [];

  const { data: mensajes, error } = await supabase
    .from("permisos_mensajes")
    .select(
      "id, permiso_id, user_id, evento, titulo, mensaje, created_at, leido_at, permisos_empleado ( tipo, user_id )",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching lecturas notificaciones:", error);
    return [];
  }

  const filas = (mensajes ?? []) as MensajeRow[];
  let idsPersonalJefe: Set<string> | null = null;

  if (tipoVista === "gestion_jefe") {
    const { data: usuarios } = await supabase.rpc("obtener_usuarios");
    const lista = (usuarios ?? []) as UsuarioRpc[];
    idsPersonalJefe = new Set(
      lista
        .filter((u) =>
          usuarioEnOficinasJefe(u, idsOficinasJefe, nombresOficinasJefe),
        )
        .map((u) => u.id),
    );
  }

  const visibles = filas.filter((fila) => {
    if (tipoVista === "mis_lecturas") return fila.user_id === perfil.id;
    if (tipoVista === "gestion_jefe") {
      return idsPersonalJefe?.has(fila.user_id) ?? false;
    }
    return true;
  });

  return visibles.map((fila) => {
    const permiso = unwrapPermiso(fila.permisos_empleado);
    return {
      id: fila.id,
      permiso_id: fila.permiso_id,
      user_id: fila.user_id,
      evento: fila.evento,
      titulo: fila.titulo,
      mensaje: fila.mensaje,
      created_at: fila.created_at,
      leido_at: fila.leido_at,
      permiso_tipo: permiso?.tipo ?? null,
      permiso_empleado_user_id: permiso?.user_id ?? null,
    };
  });
}

export async function eliminarMensajePermiso(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const perfil = await obtenerPerfilUsuario();
  if (!perfil || !puedeEliminarMensajes(perfil.rol)) {
    return { success: false, error: "Sin permiso para eliminar mensajes" };
  }

  const admin = getServiceSupabase();
  const { error } = await admin.from("permisos_mensajes").delete().eq("id", id);

  if (error) {
    console.error("Error deleting permiso mensaje:", error);
    return { success: false, error: "No se pudo eliminar el mensaje" };
  }

  revalidarRutasLecturas();
  return { success: true };
}

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

  revalidarRutasLecturas();
  return { success: true, leido_at: leidoAt };
}
