"use server";

import { createClient } from "@/utils/supabase/server";
import supabaseAdmin from "@/utils/supabase/admin";
import { enviarPushBroadcast } from "@/lib/push/serverBroadcast";

export type MensajeActividadConcejo = {
  id: string;
  task_id: string;
  evento: string;
  titulo: string;
  mensaje: string;
  created_at: string;
};

function formatearFechaGuatemala(iso: string) {
  const fecha = new Date(iso);
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Guatemala",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(fecha);

  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";

  const dias: Record<string, string> = {
    Sun: "Dom",
    Mon: "Lun",
    Tue: "Mar",
    Wed: "Mié",
    Thu: "Jue",
    Fri: "Vie",
    Sat: "Sáb",
  };

  const dia = dias[valor("weekday")] ?? valor("weekday");
  const periodo = valor("dayPeriod").replace(/\./g, "").toUpperCase();
  return `${dia} ${valor("day")}/${valor("month")}/${valor("year")}, ${valor("hour")}:${valor("minute")} ${periodo}`;
}

async function esActividadConcejo(taskId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tareas_concejo_actividades")
    .select("id")
    .eq("task_id", taskId)
    .limit(1);

  if (error) {
    console.error("Error comprobando enlace de concejo:", error);
    return false;
  }

  return (data ?? []).length > 0;
}

async function crearMensajesYPush(params: {
  taskId: string;
  userIds: string[];
  evento: "completada" | "revisada_concejo";
  titulo: string;
  mensaje: string;
  url: string;
}) {
  const userIds = [...new Set(params.userIds.filter(Boolean))];
  if (userIds.length === 0) return;

  const filas = userIds.map((userId) => ({
    task_id: params.taskId,
    user_id: userId,
    evento: params.evento,
    titulo: params.titulo,
    mensaje: params.mensaje,
  }));

  const { error } = await supabaseAdmin.from("actividades_concejo_mensajes").insert(filas);
  if (error) {
    console.error("Error guardando aviso de actividad del concejo:", error);
    return;
  }

  await enviarPushBroadcast({
    title: params.titulo,
    message: params.mensaje,
    url: params.url,
    targetIds: userIds,
  });
}

export async function notificarActividadConcejoCompletada(
  taskId: string,
  completadaEn: string,
  actorId: string | null,
) {
  try {
    if (!(await esActividadConcejo(taskId))) return;

    const supabase = await createClient();
    const { data: tarea } = await supabase
      .from("tasks")
      .select("title")
      .eq("id", taskId)
      .maybeSingle();

    const { data: secretarios, error } = await supabase.rpc("obtener_ids_usuarios_por_rol", {
      roles_filtro: ["SECRETARIO"],
    });

    if (error || !secretarios) {
      console.error("Error obteniendo secretarios:", error);
      return;
    }

    const tituloActividad =
      typeof tarea?.title === "string" && tarea.title.trim()
        ? tarea.title.trim()
        : "Actividad del concejo";
    const fecha = formatearFechaGuatemala(completadaEn);

    const ids = (secretarios as { id: string }[])
      .map((usuario) => usuario.id)
      .filter((id) => id && id !== actorId);

    await crearMensajesYPush({
      taskId,
      userIds: ids,
      evento: "completada",
      titulo: "Actividad del concejo completada",
      mensaje: `"${tituloActividad}" se completó el ${fecha}.`,
      url: "/protected/concejo",
    });
  } catch (error) {
    console.error("Error notificando actividad del concejo completada:", error);
  }
}

export async function notificarActividadConcejoRevisada(
  taskId: string,
  revisadaEn: string,
  actorId: string | null,
) {
  try {
    if (!(await esActividadConcejo(taskId))) return;

    const supabase = await createClient();
    const { data: tarea } = await supabase
      .from("tasks")
      .select("title, assigned_to")
      .eq("id", taskId)
      .maybeSingle();

    const { data: miembros } = await supabase
      .from("act_miembros")
      .select("id_user")
      .eq("id_act", taskId);

    const ids = new Set<string>();
    if (typeof tarea?.assigned_to === "string" && tarea.assigned_to) {
      ids.add(tarea.assigned_to);
    }
    for (const miembro of miembros ?? []) {
      if (typeof miembro.id_user === "string" && miembro.id_user) {
        ids.add(miembro.id_user);
      }
    }
    if (actorId) ids.delete(actorId);

    const tituloActividad =
      typeof tarea?.title === "string" && tarea.title.trim()
        ? tarea.title.trim()
        : "Actividad del concejo";
    const fecha = formatearFechaGuatemala(revisadaEn);

    await crearMensajesYPush({
      taskId,
      userIds: [...ids],
      evento: "revisada_concejo",
      titulo: "Actividad revisada por el Concejo",
      mensaje: `"${tituloActividad}" fue revisada por el Concejo Municipal el ${fecha}.`,
      url: "/protected/actividades",
    });
  } catch (error) {
    console.error("Error notificando revisión de actividad del concejo:", error);
  }
}

export async function obtenerMensajePendienteActividadConcejo() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false as const, data: null };

  const { data, error } = await supabase
    .from("actividades_concejo_mensajes")
    .select("id, task_id, evento, titulo, mensaje, created_at")
    .eq("user_id", user.id)
    .is("leido_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error consultando aviso de actividad del concejo:", error);
    return { success: false as const, data: null };
  }

  return {
    success: true as const,
    data: (data as MensajeActividadConcejo | null) ?? null,
  };
}

export async function confirmarMensajeActividadConcejo(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false as const, error: "No autenticado" };

  const leidoAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("actividades_concejo_mensajes")
    .update({ leido_at: leidoAt })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("leido_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Error confirmando aviso de actividad del concejo:", error);
    return { success: false as const, error: "No se pudo marcar como leído" };
  }

  if (!data) {
    return { success: false as const, error: "No se pudo marcar como leído" };
  }

  return { success: true as const, leido_at: leidoAt };
}
