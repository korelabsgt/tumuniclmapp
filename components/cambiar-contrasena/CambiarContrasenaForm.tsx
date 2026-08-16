"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { CintilloInstitucional } from "@/components/ui/cintillo-institucional";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PasswordSection from "@/components/admin/users/forms/PasswordForm";
import { createClient } from "@/utils/supabase/client";
import { cambiarContrasena } from "./lib/actions";
import { usePasswordChangedAt } from "./lib/hooks";
import { formatearUltimoCambioContrasena } from "./lib/password-age";
import {
  CAMBIO_PASSWORD_CARD_CLASS,
  CAMBIO_PASSWORD_CARD_MENU_CLASS,
  CAMBIO_PASSWORD_INPUT_CLASS,
  CAMBIO_PASSWORD_LABEL_CLASS,
  CAMBIO_PASSWORD_SUBMIT_CLASS,
  CAMBIO_PASSWORD_TITLE_CLASS,
} from "./lib/ui";

const REQUISITO =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

type Props = {
  variant: "menu" | "bloqueo";
  onSuccess?: () => void;
};

export default function CambiarContrasenaForm({ variant, onSuccess }: Props) {
  const [actual, setActual] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [verActual, setVerActual] = useState(false);
  const [pending, setPending] = useState(false);
  const queryClient = useQueryClient();
  const { data: ultimoIso } = usePasswordChangedAt();
  const ultimoCambio = formatearUltimoCambioContrasena(ultimoIso ?? null);

  const exigeActual = variant === "menu";
  const prefix = variant === "menu" ? "menu-" : "bloqueo-";
  const idActual = `${prefix}password-actual`;
  const cumpleRequisitos = REQUISITO.test(password);
  const coinciden = password === confirmar;
  const distinta = password.length > 0 && password !== actual;
  const formularioValido = Boolean(
    password &&
      confirmar &&
      cumpleRequisitos &&
      coinciden &&
      (!exigeActual || (actual && distinta)),
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formularioValido || pending) return;

    setPending(true);
    const result = await cambiarContrasena({
      exigirActual: exigeActual,
      actual: exigeActual ? actual : undefined,
      nueva: password,
      confirmar,
    });
    setPending(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    const supabase = createClient();
    await supabase.auth.refreshSession();
    void queryClient.invalidateQueries({ queryKey: ["password-changed-at"] });
    toast.success("Contraseña actualizada.");
    setActual("");
    setPassword("");
    setConfirmar("");
    onSuccess?.();
  }

  return (
    <div
      className={
        variant === "menu"
          ? CAMBIO_PASSWORD_CARD_MENU_CLASS
          : CAMBIO_PASSWORD_CARD_CLASS
      }
    >
      <h2
        className={
          variant === "menu"
            ? "mb-4 text-left text-lg font-bold text-[#0066cc] dark:text-blue-400"
            : CAMBIO_PASSWORD_TITLE_CLASS
        }
      >
        {variant === "bloqueo"
          ? "Actualizar contraseña"
          : "Cambiar contraseña"}
      </h2>

      {variant === "bloqueo" ? (
        <>
          <div className="-mx-5 mb-4 flex justify-center sm:-mx-6">
            <Image
              src="/images/logo-muni.png"
              alt="Logo Municipalidad de Concepción Las Minas"
              height={220}
              width={400}
              priority
              className="h-auto w-full max-w-none object-contain"
            />
          </div>
          <CintilloInstitucional className="mb-6 rounded-full" />
          <p className="mb-4 text-center text-sm leading-snug text-muted-foreground">
            Por seguridad debe actualizarla ahora.
            <br />
            Se pedirá cada 90 días.
          </p>
        </>
      ) : null}

      <p className={variant === "menu" ? "mb-5" : "mb-5 text-center"}>
        <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Último cambio
        </span>
        <span className="mt-1 block text-sm font-semibold text-[#0066cc] dark:text-blue-400">
          {ultimoCambio}
        </span>
      </p>

      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        {exigeActual ? (
          <div className="space-y-2">
            <Label htmlFor={idActual} className={CAMBIO_PASSWORD_LABEL_CLASS}>
              Contraseña actual
            </Label>
            <div className="relative">
              <Input
                id={idActual}
                type={verActual ? "text" : "password"}
                name="password-actual"
                autoComplete="current-password"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                required
                className={`${CAMBIO_PASSWORD_INPUT_CLASS} pr-11`}
              />
              <button
                type="button"
                onClick={() => setVerActual((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-white"
                aria-label="Mostrar u ocultar contraseña actual"
              >
                {verActual ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        ) : null}

        <PasswordSection
          password={password}
          confirmar={confirmar}
          onPasswordChange={setPassword}
          onConfirmarChange={setConfirmar}
          inputClassName={`${CAMBIO_PASSWORD_INPUT_CLASS} pr-11`}
          labelClassName={CAMBIO_PASSWORD_LABEL_CLASS}
          passwordLabel="Nueva contraseña"
          idPrefix={prefix}
          passwordName="new-password"
          confirmarName="new-password-confirm"
          passwordAutoComplete="new-password"
          confirmarAutoComplete="new-password"
        />

        <button
          type="submit"
          disabled={!formularioValido || pending}
          className={CAMBIO_PASSWORD_SUBMIT_CLASS}
        >
          <KeyRound size={18} strokeWidth={2} />
          {pending ? "Guardando..." : "Guardar contraseña"}
        </button>
      </form>
    </div>
  );
}
