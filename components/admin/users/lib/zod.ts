import { z } from "zod";

export const RESET_PASSWORD_ERRORES = {
  NO_SESSION: "Debe iniciar sesión.",
  FORBIDDEN: "No tiene permiso para esta acción.",
  INVALID: "Revise los datos del formulario.",
  TOKEN_INVALIDO: "El enlace está inactivo. Solicite uno nuevo.",
  UPDATE_FAILED: "No se pudo actualizar la contraseña.",
  USER_NOT_FOUND: "Usuario no encontrado.",
} as const;

export type CodigoResetPassword = keyof typeof RESET_PASSWORD_ERRORES;

const REQUISITO_PASSWORD =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const generarLinkSchema = z.object({
  userId: z.string().uuid(),
});

export const cambiarContrasenaAdminSchema = z
  .object({
    userId: z.string().uuid(),
    nueva: z.string().regex(REQUISITO_PASSWORD, RESET_PASSWORD_ERRORES.INVALID),
    confirmar: z.string().min(1),
  })
  .refine((d) => d.nueva === d.confirmar, {
    message: RESET_PASSWORD_ERRORES.INVALID,
    path: ["confirmar"],
  });

export const restablecerConTokenSchema = z
  .object({
    token: z.string().min(16),
    nueva: z.string().regex(REQUISITO_PASSWORD, RESET_PASSWORD_ERRORES.INVALID),
    confirmar: z.string().min(1),
  })
  .refine((d) => d.nueva === d.confirmar, {
    message: RESET_PASSWORD_ERRORES.INVALID,
    path: ["confirmar"],
  });

export const validarTokenSchema = z.object({
  token: z.string().min(16),
});
