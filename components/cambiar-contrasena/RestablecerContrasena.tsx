"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { KeyRound } from "lucide-react";
import { CintilloInstitucional } from "@/components/ui/cintillo-institucional";
import { PAGE_BG_CLASS } from "@/components/layout/chrome";
import { DotPattern } from "@/components/ui/dot-pattern";
import PasswordSection from "@/components/admin/users/forms/PasswordForm";
import {
  restablecerContrasenaConToken,
  validarTokenRestablecer,
} from "@/components/admin/users/lib/actions";
import {
  CAMBIO_PASSWORD_CARD_CLASS,
  CAMBIO_PASSWORD_INPUT_CLASS,
  CAMBIO_PASSWORD_LABEL_CLASS,
  CAMBIO_PASSWORD_SUBMIT_CLASS,
  CAMBIO_PASSWORD_TITLE_CLASS,
} from "./lib/ui";

const REQUISITO =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function formatoRestante(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutos = Math.floor(total / 60);
  const segundos = total % 60;
  return `${minutos}:${segundos.toString().padStart(2, "0")}`;
}

export default function RestablecerContrasena() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [pending, setPending] = useState(false);
  const [listo, setListo] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());

  const { data: validez, isLoading } = useQuery({
    queryKey: ["validar-token-reset", token],
    queryFn: () => validarTokenRestablecer({ token }),
    enabled: token.length >= 16,
    staleTime: 0,
    retry: false,
  });

  const expiresAt = validez?.ok ? validez.expiresAt : null;
  const nombreUsuario = validez?.ok ? validez.nombre : "";
  const restanteMs = expiresAt
    ? Math.max(0, new Date(expiresAt).getTime() - ahora)
    : 0;
  const tokenVigente = Boolean(expiresAt) && restanteMs > 0;
  const tokenOk = Boolean(validez?.ok) && tokenVigente;
  const formularioValido =
    REQUISITO.test(password) && password === confirmar && password.length > 0;

  useEffect(() => {
    if (!tokenVigente) return;
    setAhora(Date.now());
    const timer = window.setInterval(() => setAhora(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [tokenVigente, expiresAt]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formularioValido || pending || !tokenOk) return;
    setPending(true);
    const result = await restablecerContrasenaConToken({
      token,
      nueva: password,
      confirmar,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Contraseña restablecida.");
    setListo(true);
  }

  return (
    <div
      className={`relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden px-4 py-10 ${PAGE_BG_CLASS}`}
    >
      <DotPattern
        width={22}
        height={22}
        cx={1}
        cy={1}
        cr={0.85}
        className="text-gray-400/45 dark:text-zinc-600/45"
      />
      <div className="relative flex w-full max-w-[400px] flex-col">
        <div className={CAMBIO_PASSWORD_CARD_CLASS}>
          <h1 className={CAMBIO_PASSWORD_TITLE_CLASS}>
            Restablecer contraseña
          </h1>
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

          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground">
              Verificando enlace...
            </p>
          ) : listo ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-sm text-muted-foreground">
                Ya puede iniciar sesión con su nueva contraseña.
              </p>
              <Link
                href="/"
                className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-zinc-200 text-sm font-semibold text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
              >
                Ir al inicio
              </Link>
            </div>
          ) : !tokenOk ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-sm text-muted-foreground">
                El enlace está inactivo. Solicite uno nuevo.
              </p>
              <Link
                href="/"
                className="text-sm font-semibold text-[#0066cc] hover:opacity-80 dark:text-blue-400"
              >
                Volver al inicio
              </Link>
            </div>
          ) : (
            <form className="flex flex-col gap-5" onSubmit={onSubmit}>
              {nombreUsuario ? (
                <p className="text-center text-sm leading-snug text-zinc-700 dark:text-zinc-200">
                  Hola,{" "}
                  <span className="font-semibold text-[#0066cc] dark:text-blue-400">
                    {nombreUsuario}
                  </span>
                  . Cree su nueva contraseña.
                </p>
              ) : null}
              <div className="flex items-center justify-between rounded-xl border border-[#0066cc]/25 bg-white px-4 py-2.5 dark:border-blue-400/30 dark:bg-zinc-900">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Tiempo restante
                </span>
                <span className="font-mono text-lg font-bold tabular-nums text-[#0066cc] dark:text-blue-400">
                  {formatoRestante(restanteMs)}
                </span>
              </div>
              <PasswordSection
                password={password}
                confirmar={confirmar}
                onPasswordChange={setPassword}
                onConfirmarChange={setConfirmar}
                inputClassName={`${CAMBIO_PASSWORD_INPUT_CLASS} pr-11`}
                labelClassName={CAMBIO_PASSWORD_LABEL_CLASS}
                passwordLabel="Nueva contraseña"
                idPrefix="reset-link-"
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
          )}
        </div>
      </div>
    </div>
  );
}
