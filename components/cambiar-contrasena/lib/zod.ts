import { z } from "zod";

const REQUISITO_PASSWORD =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const CAMBIAR_CONTRASENA_ERRORES = {
  NO_SESSION: "Debe iniciar sesión.",
  WRONG_PASSWORD: "La contraseña actual no es correcta.",
  SAME_PASSWORD: "La nueva contraseña debe ser distinta a la actual.",
  UPDATE_FAILED: "No se pudo actualizar la contraseña.",
  INVALID: "Revise los datos del formulario.",
} as const;

export type CodigoCambiarContrasena = keyof typeof CAMBIAR_CONTRASENA_ERRORES;

export const cambiarContrasenaSchema = z
  .object({
    exigirActual: z.boolean(),
    actual: z.string().optional(),
    nueva: z
      .string()
      .regex(REQUISITO_PASSWORD, CAMBIAR_CONTRASENA_ERRORES.INVALID),
    confirmar: z.string().min(1, CAMBIAR_CONTRASENA_ERRORES.INVALID),
  })
  .superRefine((datos, ctx) => {
    if (datos.nueva !== datos.confirmar) {
      ctx.addIssue({
        code: "custom",
        message: CAMBIAR_CONTRASENA_ERRORES.INVALID,
        path: ["confirmar"],
      });
    }
    if (!datos.exigirActual) {
      return;
    }
    if (!datos.actual) {
      ctx.addIssue({
        code: "custom",
        message: CAMBIAR_CONTRASENA_ERRORES.INVALID,
        path: ["actual"],
      });
      return;
    }
    if (datos.nueva === datos.actual) {
      ctx.addIssue({
        code: "custom",
        message: CAMBIAR_CONTRASENA_ERRORES.SAME_PASSWORD,
        path: ["nueva"],
      });
    }
  });

export type CambiarContrasenaInput = z.infer<typeof cambiarContrasenaSchema>;
