"use client";

import { useState } from "react";
import { useActionState } from "react";
import { signInAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAGE_BG_CLASS } from "@/components/layout/chrome";
import { CintilloInstitucional } from "@/components/ui/cintillo-institucional";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Eye, EyeOff, User } from "lucide-react";
import { motion } from "framer-motion";
import { Typewriter } from "react-simple-typewriter";
import Image from "next/image";
import {
  correoDesdeUsuario,
  extraerUsuario,
} from "@/utils/auth/usuarioCorreo";

const initialState = {
  type: null,
  message: "",
};

const inputClass =
  "h-12 rounded-xl border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-1 focus-visible:ring-[#0066cc] focus-visible:ring-offset-0 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus-visible:ring-blue-400 [&:-webkit-autofill]:[-webkit-text-fill-color:#18181b] [&:-webkit-autofill]:shadow-[0_0_0_1000px_#fff_inset] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:white] dark:[&:-webkit-autofill]:shadow-[0_0_0_1000px_#18181b_inset]";

export function LoginForm() {
  const [state, formAction] = useActionState(signInAction, initialState);
  const [verPassword, setVerPassword] = useState(false);
  const [usuarioValue, setUsuarioValue] = useState(() =>
    extraerUsuario(state?.email || ""),
  );
  const [passwordValue, setPasswordValue] = useState("");

  const correoCompleto = correoDesdeUsuario(usuarioValue);

  return (
    <div
      className={`relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden px-4 py-10 transition-colors ${PAGE_BG_CLASS}`}
    >
      <DotPattern
        width={22}
        height={22}
        cx={1}
        cy={1}
        cr={0.85}
        className="text-gray-400/45 dark:text-zinc-600/45"
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative w-full max-w-[400px] rounded-3xl border border-zinc-200 bg-zinc-50 px-7 py-8 shadow-xl transition-colors dark:border-zinc-700 dark:bg-zinc-800 dark:shadow-black/50 sm:px-8 sm:py-9"
      >
        <div className="mb-6 flex flex-col items-center">
          <Image
            src="/images/logo-muni.png"
            alt="Logo Municipalidad de Concepción Las Minas"
            height={220}
            width={220}
            priority
            className="h-auto w-full max-w-[220px] object-contain"
          />
          <h1 className="mt-4 text-center text-[1.65rem] font-bold leading-tight tracking-tight text-[#0066cc] dark:text-blue-400 sm:text-[1.85rem]">
            Bienvenido de nuevo
          </h1>
        </div>

        <CintilloInstitucional className="mb-6 rounded-full" />

        <form action={formAction} className="flex flex-col gap-5">
          {state?.type === "error" && (
            <div className="flex min-h-[50px] items-center justify-center rounded-xl border border-red-200 bg-red-100 p-3 text-center text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-300">
              <Typewriter
                words={[state.message || ""]}
                loop={1}
                cursor
                cursorStyle="_"
                typeSpeed={40}
                key={state.message}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-sm font-semibold text-zinc-800 dark:text-white"
            >
              Usuario
            </Label>
            <input type="hidden" name="email" value={correoCompleto} />
            <Input
              id="email"
              type="text"
              inputMode="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Tu usuario"
              required
              className={inputClass}
              value={usuarioValue}
              onChange={(e) => setUsuarioValue(extraerUsuario(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "@" || e.key === " ") {
                  e.preventDefault();
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-sm font-semibold text-zinc-800 dark:text-white"
            >
              Contraseña
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={verPassword ? "text" : "password"}
                required
                className={`${inputClass} pr-11`}
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setVerPassword(!verPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-white"
                aria-label="Mostrar/Ocultar contraseña"
              >
                {verPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <SubmitButton
            pendingText="Verificando..."
            className="mt-1 h-12 w-full cursor-pointer rounded-xl bg-zinc-200 text-base font-semibold text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
          >
            <User size={18} strokeWidth={2} />
            Entrar ahora
          </SubmitButton>
        </form>
      </motion.div>
    </div>
  );
}
