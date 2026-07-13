import { createClient as createServiceClient } from "@supabase/supabase-js";
import { esTipoAcuerdo } from "@/components/permisos/types";
import { enviarPushBroadcast } from "@/lib/push/serverBroadcast";
import type { PerfilUsuario } from "@/components/permisos/acciones";

export type EventoPermisoNotificacion =
  | "creado"
  | "modificado"
  | "aprobado_jefe"
  | "aprobado_rrhh"
  | "rechazado_jefe"
  | "rechazado_rrhh";

type ActorPermiso = "empleado" | "jefe" | "rrhh";

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function obtenerJefeIdEmpleado(
  supabase: Awaited<ReturnType<typeof import("@/utils/supabase/server").createClient>>,
  empleadoUserId: string,
): Promise<string | null> {
  const { data: info } = await supabase
    .from("info_usuario")
    .select("dependencia_id")
    .eq("user_id", empleadoUserId)
    .maybeSingle();

  if (!info?.dependencia_id) return null;

  const { data: dep } = await supabase
    .from("dependencias")
    .select("parent_id, jefe_id")
    .eq("id", info.dependencia_id)
    .maybeSingle();

  if (!dep) return null;

  const oficinaId = dep.parent_id || info.dependencia_id;
  const { data: oficina } = await supabase
    .from("dependencias")
    .select("jefe_id")
    .eq("id", oficinaId)
    .maybeSingle();

  return oficina?.jefe_id || dep.jefe_id || null;
}

export async function obtenerIdsRRHH(
  supabase: Awaited<ReturnType<typeof import("@/utils/supabase/server").createClient>>,
): Promise<string[]> {
  const { data, error } = await supabase.rpc("obtener_ids_usuarios_por_rol", {
    roles_filtro: ["RRHH", "SECRETARIO", "SUPER"],
  });

  if (error || !data) return [];
  return data.map((u: { id: string }) => u.id);
}

function clasificarActor(
  perfil: PerfilUsuario,
  empleadoId: string,
  crearAprobadoRRHH: boolean,
): ActorPermiso {
  const esRRHH = ["RRHH", "SUPER", "SECRETARIO"].includes(perfil.rol || "");
  if (esRRHH && (crearAprobadoRRHH || empleadoId !== perfil.id)) {
    return "rrhh";
  }
  if (perfil.esJefe && empleadoId !== perfil.id) {
    return "jefe";
  }
  if (esRRHH) return "rrhh";
  return "empleado";
}

function urlPermiso(esAcuerdo: boolean, vista: "empleado" | "jefe" | "rrhh") {
  const base = esAcuerdo ? "/protected/permisos/acuerdos" : "/protected/permisos";
  if (vista === "jefe") return `${base}/jefe`;
  if (vista === "rrhh") return `${base}/rrhh`;
  return base;
}

function etiquetaRegistro(esAcuerdo: boolean) {
  return esAcuerdo ? "acuerdo municipal" : "permiso";
}

async function crearMensajesBloqueo(
  permisoId: string,
  userIds: string[],
  evento: EventoPermisoNotificacion,
  titulo: string,
  mensaje: string,
) {
  const unicos = [...new Set(userIds.filter(Boolean))];
  if (unicos.length === 0) return;

  const admin = getServiceSupabase();
  const rows = unicos.map((userId) => ({
    permiso_id: permisoId,
    user_id: userId,
    evento,
    titulo,
    mensaje,
  }));

  await admin.from("permisos_mensajes").insert(rows);
}

async function dispararNotificaciones(params: {
  permisoId: string;
  empleadoId: string;
  tipo: string;
  evento: EventoPermisoNotificacion;
  titulo: string;
  mensaje: string;
  pushIds: string[];
  bloqueoIds: string[];
  actorId: string;
  jefeId: string | null;
  rrhhIds: string[];
}) {
  const esAcuerdo = esTipoAcuerdo(params.tipo);
  const pushTargets = [...new Set(params.pushIds.filter((id) => id && id !== params.actorId))];
  const bloqueoTargets = [...new Set(params.bloqueoIds.filter((id) => id && id !== params.actorId))];

  await crearMensajesBloqueo(
    params.permisoId,
    bloqueoTargets,
    params.evento,
    params.titulo,
    params.mensaje,
  );

  const rrhhSet = new Set(params.rrhhIds);

  for (const userId of pushTargets) {
    let vista: "empleado" | "jefe" | "rrhh" = "empleado";
    if (rrhhSet.has(userId)) vista = "rrhh";
    else if (userId === params.jefeId) vista = "jefe";
    else if (userId !== params.empleadoId) vista = "jefe";

    await enviarPushBroadcast({
      title: params.titulo,
      message: params.mensaje,
      url: urlPermiso(esAcuerdo, vista),
      targetIds: [userId],
    });
  }
}

export async function notificarCreacionPermiso(params: {
  supabase: Awaited<ReturnType<typeof import("@/utils/supabase/server").createClient>>;
  perfil: PerfilUsuario;
  permisoId: string;
  empleadoId: string;
  tipo: string;
  crearAprobadoRRHH: boolean;
}) {
  const { supabase, perfil, permisoId, empleadoId, tipo, crearAprobadoRRHH } =
    params;
  const esAcuerdo = esTipoAcuerdo(tipo);
  const etiqueta = etiquetaRegistro(esAcuerdo);
  const actor = clasificarActor(perfil, empleadoId, crearAprobadoRRHH);
  const jefeId = await obtenerJefeIdEmpleado(supabase, empleadoId);
  const rrhhIds = await obtenerIdsRRHH(supabase);

  const titulo = esAcuerdo ? "Nuevo acuerdo municipal" : "Nueva solicitud de permiso";
  const mensaje = `Se registró un ${etiqueta} que requiere su atención.`;

  if (actor === "empleado") {
    await dispararNotificaciones({
      permisoId,
      empleadoId,
      tipo,
      evento: "creado",
      titulo,
      mensaje,
      actorId: perfil.id,
      pushIds: jefeId ? [jefeId] : [],
      bloqueoIds: jefeId ? [jefeId] : [],
      jefeId,
      rrhhIds,
    });
    return;
  }

  if (actor === "jefe") {
    await dispararNotificaciones({
      permisoId,
      empleadoId,
      tipo,
      evento: "creado",
      titulo,
      mensaje: `Su jefe registró un ${etiqueta} a su nombre.`,
      actorId: perfil.id,
      pushIds: [empleadoId, ...rrhhIds],
      bloqueoIds: [empleadoId, ...rrhhIds],
      jefeId,
      rrhhIds,
    });
    return;
  }

  await dispararNotificaciones({
    permisoId,
    empleadoId,
    tipo,
    evento: "creado",
    titulo,
    mensaje: `RRHH registró un ${etiqueta} ${crearAprobadoRRHH ? "aprobado" : ""} a su nombre.`,
    actorId: perfil.id,
    pushIds: [empleadoId, ...(jefeId ? [jefeId] : [])],
    bloqueoIds: [empleadoId, ...(jefeId ? [jefeId] : [])],
    jefeId,
    rrhhIds,
  });
}

export async function notificarModificacionPermiso(params: {
  supabase: Awaited<ReturnType<typeof import("@/utils/supabase/server").createClient>>;
  perfil: PerfilUsuario;
  permisoId: string;
  empleadoId: string;
  tipo: string;
}) {
  const { supabase, perfil, permisoId, empleadoId, tipo } = params;
  const esAcuerdo = esTipoAcuerdo(tipo);
  const etiqueta = etiquetaRegistro(esAcuerdo);
  const jefeId = await obtenerJefeIdEmpleado(supabase, empleadoId);
  const rrhhIds = await obtenerIdsRRHH(supabase);

  const destinatarios = [
    empleadoId,
    ...(jefeId ? [jefeId] : []),
    ...rrhhIds,
  ];

  await dispararNotificaciones({
    permisoId,
    empleadoId,
    tipo,
    evento: "modificado",
    titulo: esAcuerdo ? "Acuerdo actualizado" : "Permiso actualizado",
    mensaje: `Se modificó un ${etiqueta} en el que usted está involucrado.`,
    actorId: perfil.id,
    pushIds: destinatarios,
    bloqueoIds: destinatarios,
    jefeId,
    rrhhIds,
  });
}

export async function notificarGestionPermiso(params: {
  supabase: Awaited<ReturnType<typeof import("@/utils/supabase/server").createClient>>;
  perfil: PerfilUsuario;
  permisoId: string;
  empleadoId: string;
  tipo: string;
  nuevoEstado: string;
}) {
  const { supabase, perfil, permisoId, empleadoId, tipo, nuevoEstado } = params;
  const esAcuerdo = esTipoAcuerdo(tipo);
  const etiqueta = etiquetaRegistro(esAcuerdo);
  const jefeId = await obtenerJefeIdEmpleado(supabase, empleadoId);
  const rrhhIds = await obtenerIdsRRHH(supabase);

  if (nuevoEstado === "aprobado_jefe") {
    await dispararNotificaciones({
      permisoId,
      empleadoId,
      tipo,
      evento: "aprobado_jefe",
      titulo: esAcuerdo ? "Acuerdo avalado por jefe" : "Permiso avalado por jefe",
      mensaje: `Un ${etiqueta} fue avalado por el jefe y requiere revisión de RRHH.`,
      actorId: perfil.id,
      pushIds: rrhhIds,
      bloqueoIds: rrhhIds,
      jefeId,
      rrhhIds,
    });
    return;
  }

  if (nuevoEstado === "aprobado") {
    await dispararNotificaciones({
      permisoId,
      empleadoId,
      tipo,
      evento: "aprobado_rrhh",
      titulo: esAcuerdo ? "Acuerdo aprobado" : "Permiso aprobado",
      mensaje: `Su ${etiqueta} fue aprobado por RRHH.`,
      actorId: perfil.id,
      pushIds: [empleadoId, ...(jefeId ? [jefeId] : [])],
      bloqueoIds: [empleadoId, ...(jefeId ? [jefeId] : [])],
      jefeId,
      rrhhIds,
    });
    return;
  }

  if (nuevoEstado === "rechazado_jefe") {
    await dispararNotificaciones({
      permisoId,
      empleadoId,
      tipo,
      evento: "rechazado_jefe",
      titulo: esAcuerdo ? "Acuerdo rechazado" : "Permiso rechazado",
      mensaje: `Su ${etiqueta} fue rechazado por el jefe de área.`,
      actorId: perfil.id,
      pushIds: [empleadoId],
      bloqueoIds: [empleadoId],
      jefeId,
      rrhhIds,
    });
    return;
  }

  if (nuevoEstado === "rechazado_rrhh") {
    await dispararNotificaciones({
      permisoId,
      empleadoId,
      tipo,
      evento: "rechazado_rrhh",
      titulo: esAcuerdo ? "Acuerdo rechazado" : "Permiso rechazado",
      mensaje: `Su ${etiqueta} fue rechazado por RRHH.`,
      actorId: perfil.id,
      pushIds: [empleadoId, ...(jefeId ? [jefeId] : [])],
      bloqueoIds: [empleadoId, ...(jefeId ? [jefeId] : [])],
      jefeId,
      rrhhIds,
    });
  }
}

export async function notificarEliminacionPermiso(params: {
  supabase: Awaited<ReturnType<typeof import("@/utils/supabase/server").createClient>>;
  perfil: PerfilUsuario;
  permisoId: string;
  empleadoId: string;
  tipo: string;
}) {
  const { supabase, perfil, permisoId, empleadoId, tipo } = params;
  const esAcuerdo = esTipoAcuerdo(tipo);
  const etiqueta = etiquetaRegistro(esAcuerdo);
  const jefeId = await obtenerJefeIdEmpleado(supabase, empleadoId);
  const rrhhIds = await obtenerIdsRRHH(supabase);

  const destinatarios = [
    empleadoId,
    ...(jefeId ? [jefeId] : []),
    ...rrhhIds,
  ];

  await dispararNotificaciones({
    permisoId,
    empleadoId,
    tipo,
    evento: "modificado",
    titulo: esAcuerdo ? "Acuerdo eliminado" : "Permiso eliminado",
    mensaje: `Se eliminó un ${etiqueta} del sistema.`,
    actorId: perfil.id,
    pushIds: destinatarios,
    bloqueoIds: destinatarios,
    jefeId,
    rrhhIds,
  });
}
