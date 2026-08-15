"use server";

import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import supabaseAdmin from "@/utils/supabase/admin";
import { obtenerFechaYFormatoGT } from "@/utils/formatoFechaGT";
import { registrarLogServer } from "@/utils/registrarLogServer";
import {
  RESET_PASSWORD_ERRORES,
  cambiarContrasenaAdminSchema,
  generarLinkSchema,
  restablecerConTokenSchema,
  validarTokenSchema,
  type CodigoResetPassword,
} from "./zod";

export type ResetPasswordResultado =
  | { ok: true }
  | { ok: false; code: CodigoResetPassword; message: string };

export type ValidarTokenResultado =
  | { ok: true; expiresAt: string }
  | { ok: false; code: CodigoResetPassword; message: string };

export type GenerarLinkResultado =
  | {
      ok: true;
      url: string;
      mensaje: string;
      expiraEnMs: number;
      expiresAt: string;
    }
  | { ok: false; code: CodigoResetPassword; message: string };

export type LinkActivoResultado =
  | { ok: true; expiresAt: string | null }
  | { ok: false; code: CodigoResetPassword; message: string };

const TTL_MS = 5 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function origenPublico(h: Headers) {
  const origin = h.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  if (!host) return "";
  return `${proto}://${host}`.replace(/\/$/, "");
}

function mensajeLink(url: string) {
  return [
    "🔐 *SIGEM-CLM*",
    "Municipalidad de Concepción Las Minas",
    "",
    "Hola 👋",
    "",
    "Le enviamos un enlace para restablecer su contraseña:",
    "",
    `🔗 ${url}`,
    "",
    "⏳ *Este enlace vence en 5 minutos.*",
    "",
    "Cualquier inconveniente o duda, comunicarse con el equipo de soporte técnico — DMTI.",
  ].join("\n");
}

async function sesionAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function marcarPasswordChangedAt(userId: string) {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  const meta = data.user?.app_metadata ?? {};
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...meta,
      password_changed_at: new Date().toISOString(),
    },
  });
}

export async function generarLinkRestablecer(
  payload: unknown,
): Promise<GenerarLinkResultado> {
  const parsed = generarLinkSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID",
      message: RESET_PASSWORD_ERRORES.INVALID,
    };
  }

  const editor = await sesionAdmin();
  if (!editor) {
    return {
      ok: false,
      code: "NO_SESSION",
      message: RESET_PASSWORD_ERRORES.NO_SESSION,
    };
  }

  const { userId } = parsed.data;
  const { data: authUser, error: errorUser } =
    await supabaseAdmin.auth.admin.getUserById(userId);
  if (errorUser || !authUser.user) {
    return {
      ok: false,
      code: "USER_NOT_FOUND",
      message: RESET_PASSWORD_ERRORES.USER_NOT_FOUND,
    };
  }

  const origen = origenPublico(await headers());
  if (!origen) {
    return {
      ok: false,
      code: "UPDATE_FAILED",
      message: RESET_PASSWORD_ERRORES.UPDATE_FAILED,
    };
  }

  const ahora = new Date().toISOString();
  await supabaseAdmin
    .from("password_reset_tokens")
    .update({ used_at: ahora })
    .eq("user_id", userId)
    .is("used_at", null);

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();

  const { error } = await supabaseAdmin.from("password_reset_tokens").insert({
    user_id: userId,
    token_hash: hashToken(token),
    expires_at: expiresAt,
    created_by: editor.id,
  });

  if (error) {
    return {
      ok: false,
      code: "UPDATE_FAILED",
      message: RESET_PASSWORD_ERRORES.UPDATE_FAILED,
    };
  }

  const url = `${origen}/restablecer-contrasena?token=${encodeURIComponent(token)}`;
  const { fecha } = obtenerFechaYFormatoGT();
  await registrarLogServer({
    accion: "LINK_RESTABLECER",
    descripcion: `Generó enlace de restablecimiento para ${authUser.user.email ?? userId}`,
    nombreModulo: "SISTEMA",
    fecha,
    user_id: editor.id,
  });

  return {
    ok: true,
    url,
    mensaje: mensajeLink(url),
    expiraEnMs: TTL_MS,
    expiresAt,
  };
}

export async function obtenerLinkActivo(
  payload: unknown,
): Promise<LinkActivoResultado> {
  const parsed = generarLinkSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID",
      message: RESET_PASSWORD_ERRORES.INVALID,
    };
  }

  const editor = await sesionAdmin();
  if (!editor) {
    return {
      ok: false,
      code: "NO_SESSION",
      message: RESET_PASSWORD_ERRORES.NO_SESSION,
    };
  }

  const { data } = await supabaseAdmin
    .from("password_reset_tokens")
    .select("expires_at")
    .eq("user_id", parsed.data.userId)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { ok: true, expiresAt: data?.expires_at ?? null };
}

export async function deshabilitarLinkRestablecer(
  payload: unknown,
): Promise<ResetPasswordResultado> {
  const parsed = generarLinkSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID",
      message: RESET_PASSWORD_ERRORES.INVALID,
    };
  }

  const editor = await sesionAdmin();
  if (!editor) {
    return {
      ok: false,
      code: "NO_SESSION",
      message: RESET_PASSWORD_ERRORES.NO_SESSION,
    };
  }

  const ahora = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("password_reset_tokens")
    .update({ used_at: ahora })
    .eq("user_id", parsed.data.userId)
    .is("used_at", null);

  if (error) {
    return {
      ok: false,
      code: "UPDATE_FAILED",
      message: RESET_PASSWORD_ERRORES.UPDATE_FAILED,
    };
  }

  const { fecha } = obtenerFechaYFormatoGT();
  await registrarLogServer({
    accion: "LINK_RESTABLECER_ANULADO",
    descripcion: `Anuló el enlace de restablecimiento de ${parsed.data.userId}`,
    nombreModulo: "SISTEMA",
    fecha,
    user_id: editor.id,
  });

  return { ok: true };
}

export async function cambiarContrasenaAdmin(
  payload: unknown,
): Promise<ResetPasswordResultado> {
  const parsed = cambiarContrasenaAdminSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID",
      message: RESET_PASSWORD_ERRORES.INVALID,
    };
  }

  const editor = await sesionAdmin();
  if (!editor) {
    return {
      ok: false,
      code: "NO_SESSION",
      message: RESET_PASSWORD_ERRORES.NO_SESSION,
    };
  }

  const { userId, nueva } = parsed.data;
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: nueva,
  });

  if (error) {
    return {
      ok: false,
      code: "UPDATE_FAILED",
      message: RESET_PASSWORD_ERRORES.UPDATE_FAILED,
    };
  }

  await marcarPasswordChangedAt(userId);

  const { fecha } = obtenerFechaYFormatoGT();
  await registrarLogServer({
    accion: "CAMBIO_CONTRASENA_ADMIN",
    descripcion: `Cambió la contraseña del usuario ${userId}`,
    nombreModulo: "SISTEMA",
    fecha,
    user_id: editor.id,
  });

  return { ok: true };
}

export async function validarTokenRestablecer(
  payload: unknown,
): Promise<ValidarTokenResultado> {
  const parsed = validarTokenSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      code: "TOKEN_INVALIDO",
      message: RESET_PASSWORD_ERRORES.TOKEN_INVALIDO,
    };
  }

  const { data } = await supabaseAdmin
    .from("password_reset_tokens")
    .select("id, expires_at, used_at")
    .eq("token_hash", hashToken(parsed.data.token))
    .maybeSingle();

  if (
    !data ||
    data.used_at ||
    new Date(data.expires_at).getTime() <= Date.now()
  ) {
    return {
      ok: false,
      code: "TOKEN_INVALIDO",
      message: RESET_PASSWORD_ERRORES.TOKEN_INVALIDO,
    };
  }

  return { ok: true, expiresAt: data.expires_at };
}

export async function restablecerContrasenaConToken(
  payload: unknown,
): Promise<ResetPasswordResultado> {
  const parsed = restablecerConTokenSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID",
      message: RESET_PASSWORD_ERRORES.INVALID,
    };
  }

  const { token, nueva } = parsed.data;
  const { data: fila } = await supabaseAdmin
    .from("password_reset_tokens")
    .select("id, user_id, expires_at, used_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (
    !fila ||
    fila.used_at ||
    new Date(fila.expires_at).getTime() <= Date.now()
  ) {
    return {
      ok: false,
      code: "TOKEN_INVALIDO",
      message: RESET_PASSWORD_ERRORES.TOKEN_INVALIDO,
    };
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(fila.user_id, {
    password: nueva,
  });

  if (error) {
    return {
      ok: false,
      code: "UPDATE_FAILED",
      message: RESET_PASSWORD_ERRORES.UPDATE_FAILED,
    };
  }

  await supabaseAdmin
    .from("password_reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", fila.id);

  await marcarPasswordChangedAt(fila.user_id);

  const { fecha } = obtenerFechaYFormatoGT();
  await registrarLogServer({
    accion: "RESTABLECER_CONTRASENA",
    descripcion: "-",
    nombreModulo: "SISTEMA",
    fecha,
    user_id: fila.user_id,
  });

  return { ok: true };
}
