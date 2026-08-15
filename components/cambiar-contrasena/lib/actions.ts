"use server";

import { createClient } from "@/utils/supabase/server";
import supabaseAdmin from "@/utils/supabase/admin";
import { obtenerFechaYFormatoGT } from "@/utils/formatoFechaGT";
import { registrarLogServer } from "@/utils/registrarLogServer";
import {
  CAMBIAR_CONTRASENA_ERRORES,
  cambiarContrasenaSchema,
  type CodigoCambiarContrasena,
} from "./zod";

export type CambiarContrasenaResultado =
  | { ok: true }
  | { ok: false; code: CodigoCambiarContrasena; message: string };

export async function cambiarContrasena(
  payload: unknown,
): Promise<CambiarContrasenaResultado> {
  const parsed = cambiarContrasenaSchema.safeParse(payload);
  if (!parsed.success) {
    const mismo = parsed.error.issues.some(
      (i) => i.message === CAMBIAR_CONTRASENA_ERRORES.SAME_PASSWORD,
    );
    const code: CodigoCambiarContrasena = mismo
      ? "SAME_PASSWORD"
      : "INVALID";
    return {
      ok: false,
      code,
      message: CAMBIAR_CONTRASENA_ERRORES[code],
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return {
        ok: false,
        code: "NO_SESSION",
        message: CAMBIAR_CONTRASENA_ERRORES.NO_SESSION,
      };
    }

    const { error: errorActual } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.actual,
    });

    if (errorActual) {
      return {
        ok: false,
        code: "WRONG_PASSWORD",
        message: CAMBIAR_CONTRASENA_ERRORES.WRONG_PASSWORD,
      };
    }

    const { error } = await supabase.auth.updateUser({
      password: parsed.data.nueva,
    });

    if (error) {
      const same =
        error.message.toLowerCase().includes("different") ||
        error.message.toLowerCase().includes("same");
      const code: CodigoCambiarContrasena = same
        ? "SAME_PASSWORD"
        : "UPDATE_FAILED";
      return {
        ok: false,
        code,
        message: CAMBIAR_CONTRASENA_ERRORES[code],
      };
    }

    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...user.app_metadata,
        password_changed_at: new Date().toISOString(),
      },
    });

    const { fecha } = obtenerFechaYFormatoGT();
    await registrarLogServer({
      accion: "CAMBIO_CONTRASENA",
      descripcion: "-",
      nombreModulo: "SISTEMA",
      fecha,
      user_id: user.id,
    });

    return { ok: true };
  } catch {
    return {
      ok: false,
      code: "UPDATE_FAILED",
      message: CAMBIAR_CONTRASENA_ERRORES.UPDATE_FAILED,
    };
  }
}
